import asyncio
import csv
import io
import json
import logging
import os
import re
import sqlite3
from datetime import date, datetime

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.exc import DataError, IntegrityError, OperationalError
from sqlmodel import Session, select, text

from database import engine
from models import (
    BlocoRotina,
    ConexaoNota,
    Flashcard,
    Habito,
    InboxItem,
    Nota,
    NotaTag,
    Pasta,
    QuerySalva,
    RegistroHabito,
    SessaoPomodoro,
    Tag,
    Tarefa,
    TemplateNota,
    TipoObjeto,
)
from rate_limiter import import_limiter
from services.frontmatter import extract_frontmatter

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024

TABELAS_CONHECIDAS: dict[str, type] = {
    "tipos_objeto": TipoObjeto,
    "pastas": Pasta,
    "tags": Tag,
    "habitos": Habito,
    "blocos_rotina": BlocoRotina,
    "notas": Nota,
    "inbox": InboxItem,
    "tarefas": Tarefa,
    "flashcards": Flashcard,
    "templates": TemplateNota,
    "queries_salvas": QuerySalva,
    "registros_habito": RegistroHabito,
    "sessoes_pomodoro": SessaoPomodoro,
    "conexoes_notas": ConexaoNota,
    "notas_tags": NotaTag,
}

ORDEM_IMPORT = [
    "tipos_objeto",
    "pastas",
    "tags",
    "habitos",
    "blocos_rotina",
    "notas",
    "inbox",
    "tarefas",
    "flashcards",
    "templates",
    "queries_salvas",
    "registros_habito",
    "sessoes_pomodoro",
    "conexoes_notas",
    "notas_tags",
]


_ISO_RE = re.compile(r'^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?')

def _convert_datetimes(record: dict) -> dict:
    for k, v in list(record.items()):
        if isinstance(v, str) and _ISO_RE.match(v):
            normalized = v.replace(' ', 'T')
            if 'T' in normalized:
                record[k] = datetime.fromisoformat(normalized)
            else:
                record[k] = date.fromisoformat(normalized)
    return record

def _topological_sort_pastas(pastas: list[dict]) -> list[dict]:
    ids = {p["id"] for p in pastas if p.get("id") is not None}
    children: dict[int, list[dict]] = {}
    in_degree: dict[int, int] = {}

    by_id: dict[int, dict] = {}
    for p in pastas:
        pid = p.get("id")
        if pid is None:
            continue
        by_id[pid] = p
        in_degree[pid] = in_degree.get(pid, 0)
        pai_id = p.get("pai_id")
        if pai_id is not None and pai_id in ids:
            in_degree[pid] = in_degree.get(pid, 0) + 1
            children.setdefault(pai_id, []).append(p)

    queue = [p for p in pastas if in_degree.get(p.get("id"), 0) == 0]
    result = []

    while queue:
        p = queue.pop(0)
        result.append(p)
        pid = p.get("id")
        for child in children.get(pid, []):
            cid = child["id"]
            in_degree[cid] -= 1
            if in_degree[cid] == 0:
                queue.append(child)

    for p in pastas:
        if p not in result:
            result.append(p)

    return result


@router.post("")
async def import_data(file: UploadFile, _rl: None = Depends(import_limiter)):
    try:
        contents = await asyncio.wait_for(asyncio.to_thread(file.file.read), timeout=30)
    except TimeoutError:
        raise HTTPException(408, "Tempo limite excedido ao receber arquivo")

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, "Arquivo muito grande — limite de 50 MB")

    try:
        body = json.loads(contents)
    except json.JSONDecodeError:
        raise HTTPException(422, "Arquivo não é um JSON válido")

    tabelas_encontradas = [k for k in body if k in TABELAS_CONHECIDAS]
    if not tabelas_encontradas:
        raise HTTPException(
            422,
            "Nenhuma tabela conhecida encontrada no arquivo. "
            "As chaves esperadas são: " + ", ".join(TABELAS_CONHECIDAS.keys())
        )

    for nome_tabela in tabelas_encontradas:
        dados = body[nome_tabela]
        if not isinstance(dados, list):
            raise HTTPException(422, f"'{nome_tabela}' deve ser uma lista")
        for i, item in enumerate(dados):
            if not isinstance(item, dict):
                raise HTTPException(
                    422,
                    f"Item {i} em '{nome_tabela}' deve ser um objeto (dict)"
                )

    counts: dict[str, dict[str, int]] = {}

    with Session(engine) as session:
        try:
            for nome_tabela in ORDEM_IMPORT:
                dados = body.get(nome_tabela, [])
                if not dados:
                    counts[nome_tabela] = {"inseridos": 0, "atualizados": 0}
                    continue

                model_cls = TABELAS_CONHECIDAS[nome_tabela]

                if nome_tabela == "pastas":
                    dados = _topological_sort_pastas(dados)

                existing_ids: set[int] = set()
                try:
                    rows = session.exec(select(model_cls.id)).all()
                    existing_ids = set(rows)
                except (sqlite3.OperationalError, sqlite3.DatabaseError) as e:
                    logger.warning("ID pre-fetch para %s falhou (prosseguindo sem): %s", nome_tabela, e)

                inseridos = 0
                atualizados = 0

                for record in dados:
                    if nome_tabela == "notas_tags":
                        nt_nota_id = record.get("nota_id")
                        nt_tag_id = record.get("tag_id")
                        if nt_nota_id is None or nt_tag_id is None:
                            raise HTTPException(422, "Item em 'notas_tags' sem nota_id ou tag_id")
                        existing_nt = session.exec(
                            select(NotaTag).where(
                                NotaTag.nota_id == nt_nota_id,
                                NotaTag.tag_id == nt_tag_id,
                            )
                        ).first()
                        if existing_nt:
                            atualizados += 1
                        else:
                            inseridos += 1
                    else:
                        record_id = record.get("id")
                        if record_id is not None and record_id in existing_ids:
                            atualizados += 1
                        else:
                            inseridos += 1

                    if nome_tabela == "conexoes_notas":
                        origem = record.get("nota_origem_id")
                        destino = record.get("nota_destino_id")
                        if origem is None or destino is None:
                            raise HTTPException(422, "Item em 'conexoes_notas' sem nota_origem_id ou nota_destino_id")
                        session.execute(
                            text("""
                                INSERT INTO conexoes_notas (nota_origem_id, nota_destino_id, tipo)
                                VALUES (:origem, :destino, :tipo)
                                ON CONFLICT(nota_origem_id, nota_destino_id, tipo)
                                DO UPDATE SET tipo = :tipo2
                            """),
                            {
                                "origem": origem,
                                "destino": destino,
                                "tipo": record.get("tipo", "wikilink"),
                                "tipo2": record.get("tipo", "wikilink"),
                            }
                        )
                    elif nome_tabela == "notas_tags":
                        nt_nota_id = record.get("nota_id")
                        nt_tag_id = record.get("tag_id")
                        if nt_nota_id is None or nt_tag_id is None:
                            raise HTTPException(422, "Item em 'notas_tags' sem nota_id ou tag_id")
                        session.execute(
                            text("""
                                INSERT INTO notas_tags (nota_id, tag_id)
                                VALUES (:nota_id, :tag_id)
                                ON CONFLICT(nota_id, tag_id) DO NOTHING
                            """),
                            {"nota_id": nt_nota_id, "tag_id": nt_tag_id}
                        )
                    else:
                        instance = model_cls(**_convert_datetimes(record))
                        session.merge(instance)

                counts[nome_tabela] = {"inseridos": inseridos, "atualizados": atualizados}

            existing_nota_ids = set(
                row[0] for row in session.execute(select(Nota.id)).all()
            )
            for sessao in session.exec(select(SessaoPomodoro)).all():
                if sessao.resumo_nota_id is not None and sessao.resumo_nota_id not in existing_nota_ids:
                    sessao.resumo_nota_id = None
                    session.add(sessao)

            session.execute(text("INSERT INTO notas_fts(notas_fts) VALUES('rebuild')"))
            session.commit()
        except (DataError, IntegrityError, OperationalError) as e:
            session.rollback()
            logger.error("Erro ao importar dados: %s", e)
            raise HTTPException(500, f"Erro durante import — transação revertida: {e}")

    return {
        "sucesso": True,
        "importado_em": datetime.now().isoformat(),
        "tabelas": counts,
    }


@router.post("/markdown")
async def import_markdown(file: UploadFile, tipo_id: int = Form(1), pasta_id: int | None = Form(None), _rl: None = Depends(import_limiter)):
    try:
        contents = await asyncio.wait_for(asyncio.to_thread(file.file.read), timeout=30)
    except TimeoutError:
        raise HTTPException(408, "Tempo limite excedido")
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, "Arquivo muito grande")

    text = contents.decode("utf-8", errors="replace")
    props, body = extract_frontmatter(text)
    titulo = props.get("titulo") or os.path.splitext(file.filename or "importado.md")[0]
    tags_nomes = props.get("tags") or props.get("tag") or []
    if isinstance(tags_nomes, str):
        tags_nomes = [t.strip() for t in tags_nomes.split(",") if t.strip()]

    with Session(engine) as session:
        try:
            tag_ids = []
            for nome in tags_nomes:
                tag = session.exec(select(Tag).where(Tag.nome == nome)).first()
                if not tag:
                    tag = Tag(nome=nome)
                    session.add(tag)
                    session.flush()
                tag_ids.append(tag.id)

            nota = Nota(
                titulo=titulo,
                conteudo=body or text,
                tipo_id=tipo_id if tipo_id > 0 else None,
                pasta_id=pasta_id,
                propriedades={k: v for k, v in props.items() if k not in ("titulo", "tags", "tag")},
            )
            session.add(nota)
            session.flush()

            for tag_id in tag_ids:
                session.add(NotaTag(nota_id=nota.id, tag_id=tag_id))

            session.execute(text("INSERT INTO notas_fts(notas_fts) VALUES('rebuild')"))
            session.commit()
            return {"sucesso": True, "id": nota.id, "titulo": titulo}
        except (DataError, IntegrityError, OperationalError) as e:
            session.rollback()
            logger.error("Erro ao importar .md: %s", e)
            raise HTTPException(500, f"Erro ao importar markdown: {e}")


@router.post("/csv")
async def import_csv(file: UploadFile, tipo_id: int = Form(1), pasta_id: int | None = Form(None), _rl: None = Depends(import_limiter)):
    try:
        contents = await asyncio.wait_for(asyncio.to_thread(file.file.read), timeout=30)
    except TimeoutError:
        raise HTTPException(408, "Tempo limite excedido")
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, "Arquivo muito grande")

    text = contents.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(422, "CSV sem cabeçalho")

    colunas = reader.fieldnames
    titulo_col = "titulo" if "titulo" in colunas else colunas[0]

    with Session(engine) as session:
        try:
            importados = 0
            for row in reader:
                if not any(row.values()):
                    continue
                titulo = (row.get(titulo_col) or "").strip()
                if not titulo:
                    continue
                props = {k: v for k, v in row.items() if k != titulo_col and v}
                nota = Nota(titulo=titulo, conteudo="", tipo_id=tipo_id if tipo_id > 0 else None, pasta_id=pasta_id, propriedades=props)
                session.add(nota)
                importados += 1

            if importados == 0:
                raise HTTPException(422, "Nenhuma linha válida encontrada no CSV")

            session.execute(text("INSERT INTO notas_fts(notas_fts) VALUES('rebuild')"))
            session.commit()
            return {"sucesso": True, "importados": importados}
        except HTTPException:
            raise
        except (DataError, IntegrityError, OperationalError) as e:
            session.rollback()
            logger.error("Erro ao importar CSV: %s", e)
            raise HTTPException(500, f"Erro ao importar CSV: {e}")
