import json
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile
from sqlmodel import Session, select, text
from database import engine
from models import (
    InboxItem, Habito, RegistroHabito, BlocoRotina, Tarefa,
    SessaoPomodoro, Nota, ConexaoNota, Pasta, Tag, NotaTag,
    Flashcard, TemplateNota, TipoObjeto, QuerySalva,
)

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
async def import_data(file: UploadFile):
    contents = await file.read()

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
                except Exception:
                    pass

                inseridos = 0
                atualizados = 0

                for record in dados:
                    record_id = record.get("id")
                    if record_id is not None and record_id in existing_ids:
                        atualizados += 1
                    else:
                        inseridos += 1

                    if nome_tabela == "conexoes_notas":
                        session.execute(
                            text("""
                                INSERT INTO conexoes_notas (nota_origem_id, nota_destino_id, tipo)
                                VALUES (:origem, :destino, :tipo)
                                ON CONFLICT(nota_origem_id, nota_destino_id, tipo)
                                DO UPDATE SET tipo = :tipo2
                            """),
                            {
                                "origem": record["nota_origem_id"],
                                "destino": record["nota_destino_id"],
                                "tipo": record.get("tipo", "wikilink"),
                                "tipo2": record.get("tipo", "wikilink"),
                            }
                        )
                    elif nome_tabela == "notas_tags":
                        session.execute(
                            text("""
                                INSERT INTO notas_tags (nota_id, tag_id)
                                VALUES (:nota_id, :tag_id)
                                ON CONFLICT(nota_id, tag_id) DO NOTHING
                            """),
                            {"nota_id": record["nota_id"], "tag_id": record["tag_id"]}
                        )
                    else:
                        instance = model_cls(**record)
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
        except Exception as e:
            session.rollback()
            logger.error("Erro ao importar dados: %s", e)
            raise HTTPException(500, f"Erro durante import — transação revertida: {e}")

    return {
        "sucesso": True,
        "importado_em": datetime.now().isoformat(),
        "tabelas": counts,
    }
