import json
import logging
import math
import re
from collections import Counter
from datetime import date, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlmodel import Session, SQLModel, or_, select

from cache import cache_clear, cache_get, cache_set
from database import get_session
from models import (
    ConexaoNota,
    ConexaoNotaRead,
    Flashcard,
    Nota,
    NotaCreate,
    NotaRead,
    NotaTag,
    NotaUpdate,
    Pasta,
    PastaCreate,
    PastaRead,
    SessaoPomodoro,
    Tag,
    TagCreate,
    TagRead,
    TagUpdate,
    TagWithCount,
    TemplateBase,
    TemplateNota,
    TemplateRead,
    TipoObjeto,
)
from services import processar_wikilinks
from services.estatisticas import calcular_estatisticas
from services.frontmatter import extract_frontmatter, inject_frontmatter
from services.metadata_index import metadata_index
from services.notes import cleanup_nota_relations, extrair_cover_url
from services.templates import _build_context, render_template

from .common import commit_with_handle


class BatchDeleteRequest(BaseModel):
    ids: list[int]

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Pastas ───
@router.get("/pastas", response_model=list[PastaRead])
def list_pastas(limit: int = Query(default=200, ge=1, le=1000), offset: int = Query(default=0, ge=0), session: Session = Depends(get_session)):
    key = f"pastas:{limit}:{offset}"
    cached = cache_get(key)
    if cached is not None:
        return cached
    result = session.exec(select(Pasta).offset(offset).limit(limit)).all()
    cache_set(key, result)
    return result

@router.post("/pastas", response_model=PastaRead)
def create_pasta(p: PastaCreate, session: Session = Depends(get_session)):
    if p.pai_id is not None and not session.get(Pasta, p.pai_id):
        raise HTTPException(status_code=404, detail="Pasta pai não encontrada")
    db = Pasta(**p.model_dump())
    session.add(db)
    commit_with_handle(session, db, "criar pasta")
    cache_clear("pastas:")
    return db

# ─── Tags ───
@router.get("/tags", response_model=list[TagWithCount])
def list_tags(limit: int = Query(default=200, ge=1, le=1000), offset: int = Query(default=0, ge=0), session: Session = Depends(get_session)):
    key = f"tags:{limit}:{offset}"
    c = cache_get(key)
    if c is not None:
        return c
    stmt = select(Tag.id, Tag.nome, Tag.cor, func.count(NotaTag.tag_id).label('contagem'))\
        .outerjoin(NotaTag, Tag.id == NotaTag.tag_id)\
        .group_by(Tag.id)\
        .order_by(func.count(NotaTag.tag_id).desc())\
        .offset(offset).limit(limit)
    rows = session.execute(stmt).all()
    result = [TagWithCount(id=row.id, nome=row.nome, cor=row.cor, contagem=row.contagem) for row in rows]
    cache_set(key, result)
    return result

@router.post("/tags", response_model=TagRead)
def create_tag(t: TagCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Tag).where(Tag.nome == t.nome)).first()
    if existing:
        return existing
    db = Tag(**t.model_dump())
    session.add(db)
    commit_with_handle(session, db, "criar tag")
    cache_clear("tags:")
    return db

# ─── Notas ───
@router.get("/nao-acessadas", response_model=list[NotaRead])
def nao_acessadas(
    dias: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    from datetime import timedelta
    hoje = date.today()
    limite = hoje - timedelta(days=dias)
    notas = session.exec(
        select(Nota).where(
            Nota.ultimo_acesso.is_(None) | (Nota.ultimo_acesso < limite.isoformat())
        ).order_by(Nota.ultimo_acesso.asc().nullsfirst()).limit(limit)
    ).all()
    return notas


@router.get("", response_model=list[NotaRead])
def list_notas(
    q: str | None = None,
    data: str | None = None,
    tag_ids: str | None = None,
    sort: str | None = None,
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
):
    tag_id_list = []
    if tag_ids:
        for t in tag_ids.split(","):
            st = t.strip()
            if st.isdigit():
                tag_id_list.append(int(st))
            else:
                logger.warning("tag_id inválido ignorado na query: %s", st)

    if q:
        q = q.strip()
        if not q:
            return []
        tokens = [w.replace('"', '') for w in q.split() if w.strip()]
        if not tokens:
            return []
        fts_query = " AND ".join(f'"{t}"' for t in tokens)
        try:
            ids = [
                r[0] for r in session.execute(
                    text("SELECT rowid FROM notas_fts WHERE notas_fts MATCH :q ORDER BY rank"),
                    {"q": fts_query},
                ).all()
            ]
        except Exception as e:
            logger.warning("FTS5 query falhou (fallback para vazio): %s", e)
            ids = []
        notas_map = {n.id: n for n in session.exec(select(Nota).where(Nota.id.in_(ids))).all()}
        notas = [notas_map[i] for i in ids if i in notas_map]
        if data:
            notas = [n for n in notas if n.criado_em >= data and n.criado_em < data + "~"]
        if tag_id_list:
            # Filtrar notas que têm TODAS as tags (AND)
            stmt = select(NotaTag.nota_id).where(NotaTag.tag_id.in_(tag_id_list)).group_by(NotaTag.nota_id).having(func.count(NotaTag.tag_id) == len(tag_id_list))
            valid_nota_ids = set(session.exec(stmt).all())
            notas = [n for n in notas if n.id in valid_nota_ids]
            return notas[offset:offset + limit]

    stmt = select(Nota)
    if data:
        stmt = stmt.where(Nota.criado_em >= data, Nota.criado_em < data + "~")
    if tag_id_list:
        # Filtrar notas que têm TODAS as tags (AND)
        stmt = stmt.where(Nota.id.in_(
            select(NotaTag.nota_id).where(NotaTag.tag_id.in_(tag_id_list)).group_by(NotaTag.nota_id).having(func.count(NotaTag.tag_id) == len(tag_id_list))
        ))
    order = Nota.atualizado_em.desc()
    if sort == 'acessos':
        order = Nota.acessos.desc().nullslast()
    elif sort == 'titulo':
        order = Nota.titulo.asc()
    return session.exec(stmt.order_by(order).offset(offset).limit(limit)).all()

@router.post("", response_model=NotaRead)
def create_nota(n: NotaCreate, session: Session = Depends(get_session)):
    if n.pasta_id is not None and not session.get(Pasta, n.pasta_id):
        raise HTTPException(status_code=404, detail="Pasta não encontrada")
    if n.tipo_id is not None and not session.get(TipoObjeto, n.tipo_id):
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    data = n.model_dump()
    props_from_body = {}
    if data.get('conteudo'):
        fm_props, clean_content = extract_frontmatter(data['conteudo'])
        data['conteudo'] = clean_content
        props_from_body = fm_props
    request_props = data.get('propriedades') or {}
    merged = {**props_from_body, **request_props}
    data['propriedades'] = merged
    db = Nota(**data)
    db.cover_url = extrair_cover_url(db.conteudo, db.propriedades)
    session.add(db)
    session.flush()
    processar_wikilinks(db.id, db.conteudo, session)
    commit_with_handle(session, db, "criar nota")
    metadata_index.refresh_nota(db.id, session)
    return db

# Rotas com caminho fixo — devem vir ANTES de /{nota_id} para evitar conflito
@router.get("/grafo")
def get_grafo(session: Session = Depends(get_session)):
    notas = session.exec(select(Nota).limit(500)).all()
    ids = {n.id for n in notas}
    conexoes = session.exec(
        select(ConexaoNota).where(
            or_(ConexaoNota.nota_origem_id.in_(ids), ConexaoNota.nota_destino_id.in_(ids))
        ).limit(2000)
    ).all()
    tipos = {t.id: t for t in session.exec(select(TipoObjeto)).all()}
    return {
        "nodes": [{"id": n.id, "label": n.titulo, "tipo_id": n.tipo_id, "tipo_nome": tipos[n.tipo_id].nome if n.tipo_id and n.tipo_id in tipos else None} for n in notas],
        "links": [{"source": c.nota_origem_id, "target": c.nota_destino_id} for c in conexoes],
    }

@router.get("/templates", response_model=list[TemplateRead])
def list_templates(session: Session = Depends(get_session)):
    return session.exec(select(TemplateNota)).all()

@router.post("/templates", response_model=TemplateRead)
def create_template(t: TemplateBase, session: Session = Depends(get_session)):
    db = TemplateNota(**t.model_dump())
    session.add(db)
    commit_with_handle(session, db, "criar template")
    return db

@router.post("/templates/{template_id}/aplicar", response_model=NotaRead)
def aplicar_template(template_id: int, session: Session = Depends(get_session)):
    t = session.get(TemplateNota, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    context = _build_context(titulo=t.nome)
    conteudo = render_template(t.conteudo, context)
    props = t.propriedades.copy() if t.propriedades else {}
    nota = Nota(titulo=t.nome, conteudo=conteudo, propriedades=props)
    session.add(nota)
    session.flush()
    if conteudo:
        processar_wikilinks(nota.id, conteudo, session)
    metadata_index.refresh_nota(nota.id, session)
    commit_with_handle(session, nota, "aplicar template")
    return nota

@router.post("/from-wikilink", response_model=NotaRead)
def create_from_wikilink(body: dict, session: Session = Depends(get_session)):
    titulo = (body.get('titulo') or '').strip()
    if not titulo:
        raise HTTPException(status_code=400, detail="Título é obrigatório")
    if len(titulo) > 200:
        raise HTTPException(status_code=400, detail="Título muito longo (máx. 200 caracteres)")
    existing = session.exec(select(Nota).where(Nota.titulo == titulo)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Nota com este título já existe")
    nota = Nota(titulo=titulo, conteudo='')
    session.add(nota)
    session.flush()
    commit_with_handle(session, nota, "criar nota de wikilink")
    metadata_index.refresh_nota(nota.id, session)
    return nota


@router.get("/find-by-titulo")
def find_nota_by_titulo(titulo: str, session: Session = Depends(get_session)):
    nota = session.exec(select(Nota).where(Nota.titulo == titulo)).first()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    return nota


@router.get("/{nota_id}/explore")
def explore_nota(nota_id: int, session: Session = Depends(get_session)):
    import platform
    import tempfile
    from pathlib import Path
    n = session.get(Nota, nota_id)
    if not n:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    frontmatter = {"id": n.id, "titulo": n.titulo, "criado_em": n.criado_em, "atualizado_em": n.atualizado_em}
    if n.pasta_id:
        pasta = session.get(Pasta, n.pasta_id)
        frontmatter["pasta"] = pasta.nome if pasta else None
    tags_rows = session.exec(select(Tag).join(NotaTag).where(NotaTag.nota_id == nota_id)).all()
    if tags_rows:
        frontmatter["tags"] = [t.nome for t in tags_rows]
    body = inject_frontmatter(n.conteudo or '', frontmatter)
    safe_name = (n.titulo or '(sem titulo)').replace('/', '_').replace('\\', '_')[:100]
    tmp = Path(tempfile.gettempdir()) / f"{safe_name}.md"
    tmp.write_text(body, encoding='utf-8')
    import asyncio
    async def cleanup():
        await asyncio.sleep(300)
        try:
            tmp.unlink(missing_ok=True)
        except Exception:
            pass
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(cleanup())
    except RuntimeError:
        pass
    system = platform.system()
    if system == 'Windows':
        instructions = f'explorer /select,{tmp.resolve()}'
    elif system == 'Darwin':
        instructions = f'open -R {tmp.resolve()}'
    else:
        instructions = f'xdg-open {Path(tempfile.gettempdir())}'
    return {"tempFilePath": str(tmp.resolve()), "instructions": instructions}


@router.get("/estatisticas")
def estatisticas_notas(mes: int, ano: int, session: Session = Depends(get_session)):
    if mes < 1 or mes > 12:
        return {
            "por_dia": {},
            "total_mes": 0,
            "streak": 0,
            "ultimo_dia": 0,
        }
    return calcular_estatisticas(mes, ano, session)

@router.get("/recentes", response_model=list[NotaRead])
def notas_recentes(session: Session = Depends(get_session)):
    return session.exec(select(Nota).where(Nota.ultimo_acesso.isnot(None)).order_by(Nota.ultimo_acesso.desc()).limit(10)).all()

@router.get("/random", response_model=NotaRead | None)
def random_nota(session: Session = Depends(get_session)):
    return session.exec(
        select(Nota).order_by(func.random()).limit(1)
    ).first()

@router.get("/{nota_id}", response_model=NotaRead)
def get_nota(nota_id: int, session: Session = Depends(get_session)):
    nota = session.get(Nota, nota_id)
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    session.execute(
        text("UPDATE notas SET acessos = COALESCE(acessos, 0) + 1, ultimo_acesso = :now WHERE id = :id"),
        {"now": datetime.now().isoformat(), "id": nota_id}
    )
    session.commit()
    session.refresh(nota)
    return nota

@router.patch("/{nota_id}", response_model=NotaRead)
def update_nota(nota_id: int, n: NotaUpdate, session: Session = Depends(get_session)):
    db = session.get(Nota, nota_id)
    if not db:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    data = n.model_dump(exclude_unset=True)
    if "pasta_id" in data and data["pasta_id"] is not None and not session.get(Pasta, data["pasta_id"]):
        raise HTTPException(status_code=404, detail="Pasta não encontrada")
    if "tipo_id" in data and data["tipo_id"] is not None and not session.get(TipoObjeto, data["tipo_id"]):
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    data["atualizado_em"] = datetime.now().isoformat()
    props_from_body = {}
    if 'conteudo' in data and data['conteudo']:
        fm_props, clean_content = extract_frontmatter(data['conteudo'])
        data['conteudo'] = clean_content
        props_from_body = fm_props
    if props_from_body or 'propriedades' in data:
        existing_props = dict(db.propriedades or {})
        request_props = data.get('propriedades') or {}
        merged = {**existing_props, **props_from_body, **request_props}
        data['propriedades'] = merged
    for k, v in data.items():
        setattr(db, k, v)
    if "conteudo" in data or "propriedades" in data:
        db.cover_url = extrair_cover_url(db.conteudo, db.propriedades)
    session.add(db)
    session.flush()
    if "conteudo" in data:
        processar_wikilinks(db.id, db.conteudo, session)
    metadata_index.refresh_nota(db.id, session)
    commit_with_handle(session, db, "atualizar nota")
    return db

@router.delete("/{nota_id}")
def delete_nota(nota_id: int, session: Session = Depends(get_session)):
    n = session.get(Nota, nota_id)
    if not n:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    cleanup_nota_relations(nota_id, session)
    session.delete(n)
    commit_with_handle(session, context="excluir nota")
    return {"ok": True}

@router.post("/batch/delete")
def batch_delete_notas(body: BatchDeleteRequest, session: Session = Depends(get_session)):
    ids = body.ids
    all_tags = session.exec(select(NotaTag).where(NotaTag.nota_id.in_(ids))).all()
    for tag in all_tags:
        session.delete(tag)
    all_fc = session.exec(select(Flashcard).where(Flashcard.nota_id.in_(ids))).all()
    for fc in all_fc:
        fc.nota_id = None
        session.add(fc)
    all_sessoes = session.exec(select(SessaoPomodoro).where(SessaoPomodoro.resumo_nota_id.in_(ids))).all()
    for s in all_sessoes:
        s.resumo_nota_id = None
        session.add(s)
    all_conns = session.exec(
        select(ConexaoNota).where(
            or_(ConexaoNota.nota_origem_id.in_(ids), ConexaoNota.nota_destino_id.in_(ids))
        )
    ).all()
    for c in all_conns:
        session.delete(c)
    notas = session.exec(select(Nota).where(Nota.id.in_(ids))).all()
    for n in notas:
        session.delete(n)
    deleted = len(notas)
    commit_with_handle(session, context="excluir notas em lote")
    return {"ok": True, "deleted": deleted}

@router.get("/{nota_id}/export/md")
def export_nota_md(nota_id: int, session: Session = Depends(get_session)):
    n = session.get(Nota, nota_id)
    if not n:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    frontmatter = {
        "id": n.id,
        "titulo": n.titulo,
        "criado_em": n.criado_em,
        "atualizado_em": n.atualizado_em,
    }
    if n.pasta_id:
        pasta = session.get(Pasta, n.pasta_id)
        frontmatter["pasta"] = pasta.nome if pasta else None
    tags_rows = session.exec(
        select(Tag).join(NotaTag).where(NotaTag.nota_id == nota_id)
    ).all()
    if tags_rows:
        frontmatter["tags"] = [t.nome for t in tags_rows]
    result = inject_frontmatter(n.conteudo or '', frontmatter)
    from fastapi import Response
    safe_filename = (n.titulo or '(sem titulo)').replace('"', "'").replace('\n', '').strip()
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{quote(safe_filename)}.md"}
    return Response(content=result, media_type="text/markdown", headers=headers)

@router.get("/{nota_id}/export/json")
def export_nota_json(nota_id: int, session: Session = Depends(get_session)):
    n = session.get(Nota, nota_id)
    if not n:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    tags = session.exec(
        select(Tag).join(NotaTag).where(NotaTag.nota_id == nota_id)
    ).all()
    conexoes = session.exec(
        select(ConexaoNota).where(
            or_(ConexaoNota.nota_origem_id == nota_id, ConexaoNota.nota_destino_id == nota_id)
        )
    ).all()
    data = {
        "nota": n.model_dump(),
        "tags": [t.model_dump() for t in tags],
        "conexoes": [c.model_dump() for c in conexoes],
    }
    safe = (n.titulo or "nota").replace('"', "'").strip()
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{quote(safe)}.json"}
    from fastapi import Response
    return Response(content=json.dumps(data, indent=2, default=str), media_type="application/json", headers=headers)




class ExtrairInput(SQLModel):
    trecho: str
    tipo_id: int | None = None

@router.post("/{nota_id}/extrair", response_model=NotaRead)
def extrair_bloco(nota_id: int, body: ExtrairInput, session: Session = Depends(get_session)):
    original = session.get(Nota, nota_id)
    if not original:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    titulo = body.trecho.split('\n')[0][:60] or "Trecho extraído"
    if body.tipo_id is not None and not session.get(TipoObjeto, body.tipo_id):
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    nova = Nota(titulo=titulo.strip(), conteudo=body.trecho, tipo_id=body.tipo_id)
    nova.cover_url = extrair_cover_url(nova.conteudo, nova.propriedades)
    session.add(nova)
    session.flush()
    original.conteudo += f"\n\n[[{nova.titulo}]]"
    session.add(original)
    processar_wikilinks(original.id, original.conteudo, session)
    commit_with_handle(session, nova, "extrair bloco")
    return nova

@router.patch("/{nota_id}/favoritar", response_model=NotaRead)
def favoritar_nota(nota_id: int, session: Session = Depends(get_session)):
    nota = session.get(Nota, nota_id)
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    session.execute(
        text("UPDATE notas SET favoritado = NOT COALESCE(favoritado, 0), atualizado_em = :now WHERE id = :id"),
        {"now": datetime.now().isoformat(), "id": nota_id}
    )
    session.commit()
    session.refresh(nota)
    return nota

@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag não encontrada")
    nts = session.exec(select(NotaTag).where(NotaTag.tag_id == tag_id)).all()
    for nt in nts:
        session.delete(nt)
    session.delete(tag)
    commit_with_handle(session, context="excluir tag")
    cache_clear("tags:")
    return {"ok": True}

class MergeTagsBody(BaseModel):
    origem_id: int
    destino_id: int

@router.post("/tags/merge")
def merge_tags(body: MergeTagsBody, session: Session = Depends(get_session)):
    if body.origem_id == body.destino_id:
        raise HTTPException(status_code=400, detail="origem_id e destino_id devem ser diferentes")
    origem = session.get(Tag, body.origem_id)
    destino = session.get(Tag, body.destino_id)
    if not origem or not destino:
        raise HTTPException(status_code=404, detail="Tag não encontrada")
    assocs = session.exec(select(NotaTag).where(NotaTag.tag_id == body.origem_id)).all()
    for nt in assocs:
        existente = session.exec(select(NotaTag).where(
            NotaTag.nota_id == nt.nota_id, NotaTag.tag_id == body.destino_id
        )).first()
        if not existente:
            session.add(NotaTag(nota_id=nt.nota_id, tag_id=body.destino_id))
        session.delete(nt)
    session.delete(origem)
    commit_with_handle(session, context="mesclar tags")
    cache_clear("tags:")
    return {"ok": True}

@router.patch("/tags/{tag_id}", response_model=TagRead)
def update_tag(tag_id: int, t: TagUpdate, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag não encontrada")
    data = t.model_dump(exclude_unset=True)
    if "nome" in data and data["nome"] != tag.nome:
        existing = session.exec(select(Tag).where(Tag.nome == data["nome"])).first()
        if existing:
            raise HTTPException(status_code=409, detail="Tag com esse nome já existe")
    for k, v in data.items():
        setattr(tag, k, v)
    session.add(tag)
    commit_with_handle(session, tag, "atualizar tag")
    cache_clear("tags:")
    return tag

@router.post("/tags-by-ids")
def get_tags_for_notas(ids: list[int], session: Session = Depends(get_session)):
    rows = session.execute(
        select(NotaTag.nota_id, Tag.id, Tag.nome, Tag.cor)
        .join(Tag, NotaTag.tag_id == Tag.id)
        .where(NotaTag.nota_id.in_(ids))
    ).all()
    result: dict[int, list[dict]] = {}
    for nota_id, tid, nome, cor in rows:
        result.setdefault(nota_id, []).append({"id": tid, "nome": nome, "cor": cor})
    return result

@router.get("/{nota_id}/tags", response_model=list[TagRead])
def get_nota_tags(nota_id: int, session: Session = Depends(get_session)):
    nota = session.get(Nota, nota_id)
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    tags = session.exec(
        select(Tag).join(NotaTag).where(NotaTag.nota_id == nota_id)
    ).all()
    return tags

@router.delete("/{nota_id}/tags/{tag_id}")
def remove_tag_from_nota(nota_id: int, tag_id: int, session: Session = Depends(get_session)):
    if not session.get(Nota, nota_id):
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    if not session.get(Tag, tag_id):
        raise HTTPException(status_code=404, detail="Tag não encontrada")
    nt = session.exec(
        select(NotaTag).where(NotaTag.nota_id == nota_id, NotaTag.tag_id == tag_id)
    ).first()
    if not nt:
        raise HTTPException(status_code=404, detail="Tag não associada à nota")
    session.delete(nt)
    commit_with_handle(session, context="remover tag da nota")
    return {"ok": True}

@router.delete("/pastas/{pasta_id}")
def delete_pasta(pasta_id: int, session: Session = Depends(get_session)):
    pasta = session.get(Pasta, pasta_id)
    if not pasta:
        raise HTTPException(status_code=404, detail="Pasta não encontrada")
    notas = session.exec(select(Nota).where(Nota.pasta_id == pasta_id)).all()
    for n in notas:
        n.pasta_id = None
        session.add(n)
    session.delete(pasta)
    commit_with_handle(session, context="excluir pasta")
    cache_clear("pastas:")
    return {"ok": True}

@router.post("/{nota_id}/tags/{tag_id}")
def add_tag_to_nota(nota_id: int, tag_id: int, session: Session = Depends(get_session)):
    if not session.get(Nota, nota_id):
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    if not session.get(Tag, tag_id):
        raise HTTPException(status_code=404, detail="Tag não encontrada")
    existing = session.exec(
        select(NotaTag).where(NotaTag.nota_id == nota_id, NotaTag.tag_id == tag_id)
    ).first()
    if existing:
        return {"ok": True}
    nt = NotaTag(nota_id=nota_id, tag_id=tag_id)
    session.add(nt)
    commit_with_handle(session, context="adicionar tag a nota")
    return {"ok": True}

@router.get("/{nota_id}/conexoes", response_model=list[ConexaoNotaRead])
def list_conexoes(nota_id: int, limit: int = Query(default=200, ge=1, le=1000), offset: int = Query(default=0, ge=0), session: Session = Depends(get_session)):
    if not session.get(Nota, nota_id):
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    stmt = select(ConexaoNota).where(
        or_(ConexaoNota.nota_origem_id == nota_id, ConexaoNota.nota_destino_id == nota_id)
    )
    return session.exec(stmt.offset(offset).limit(limit)).all()

@router.get("/{nota_id}/relacionadas")
def notas_relacionadas(nota_id: int, limit: int = Query(default=5, ge=1, le=20), session: Session = Depends(get_session)):
    nota = session.get(Nota, nota_id)
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    tag_ids = [nt.tag_id for nt in session.exec(select(NotaTag.tag_id).where(NotaTag.nota_id == nota_id)).all()]
    if not tag_ids:
        return []
    related = session.exec(
        select(NotaTag.nota_id, func.count(NotaTag.tag_id).label("overlap"))
        .where(NotaTag.tag_id.in_(tag_ids), NotaTag.nota_id != nota_id)
        .group_by(NotaTag.nota_id)
        .order_by(func.count(NotaTag.tag_id).desc())
        .limit(limit)
    ).all()
    nota_ids = [r[0] for r in related]
    overlap_map = {r[0]: r[1] for r in related}
    notas = session.exec(select(Nota).where(Nota.id.in_(nota_ids))).all()
    tokens_origem = set(re.findall(r'\w+', (nota.conteudo or '').lower()))
    resultados = []
    for n in notas:
        tokens_alvo = set(re.findall(r'\w+', (n.conteudo or '').lower()))
        intersecao = tokens_origem & tokens_alvo
        jaccard = len(intersecao) / max(len(tokens_origem | tokens_alvo), 1)
        resultados.append({
            "id": n.id,
            "titulo": n.titulo,
            "tags_compartilhadas": overlap_map.get(n.id, 0),
            "similaridade": round(jaccard, 3),
        })
    resultados.sort(key=lambda x: (-x["tags_compartilhadas"], -x["similaridade"]))
    return resultados

@router.post("/{nota_id}/sugerir-tags")
def sugerir_tags(nota_id: int, session: Session = Depends(get_session)):
    nota = session.get(Nota, nota_id)
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    tokens = re.findall(r'\w+', (nota.conteudo or '').lower())
    if not tokens:
        return []
    tf_input = Counter(tokens)
    total = session.exec(select(func.count(Nota.id))).one()
    if not total:
        return []
    stmt = select(NotaTag.tag_id, Nota.conteudo).join(Nota, Nota.id == NotaTag.nota_id)
    rows = session.execute(stmt).all()
    tag_texts: dict[int, list[str]] = {}
    for tag_id, conteudo in rows:
        tag_texts.setdefault(tag_id, []).append(conteudo or '')
    tag_word_docs: dict[int, set[str]] = {}
    for tag_id, textos in tag_texts.items():
        tag_word_docs[tag_id] = set(re.findall(r'\w+', ' '.join(textos).lower()))
    input_words = set(tokens)
    idf: dict[str, float] = {}
    for word in input_words:
        containing = sum(1 for tw in tag_word_docs.values() if word in tw)
        idf[word] = math.log((total + 1) / (containing + 1)) + 1
    scores: list[dict] = []
    for tag_id, twords in tag_word_docs.items():
        score = sum(tf_input[w] * idf[w] for w in input_words if w in twords)
        if score > 0:
            scores.append({"tag_id": tag_id, "score": round(score, 2)})
    scores.sort(key=lambda x: -x['score'])
    return scores[:5]
