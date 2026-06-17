import re
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_, SQLModel
from sqlalchemy import func
from sqlalchemy import text
from database import get_session
from urllib.parse import urlparse
from models import (
    Nota, NotaCreate, NotaRead, NotaUpdate,
    Pasta, PastaCreate, PastaRead,
    Tag, TagCreate, TagRead, TagUpdate, NotaTag,
    ConexaoNota, ConexaoNotaRead,
    TemplateNota, TemplateRead, TemplateBase,
    Flashcard, SessaoPomodoro,
)
from services import processar_wikilinks
from services.estatisticas import calcular_estatisticas
from datetime import datetime, date
from models import TipoObjeto
from pydantic import BaseModel

class BatchDeleteRequest(BaseModel):
    ids: list[int]

logger = logging.getLogger(__name__)

COVER_URL_REGEX = re.compile(r'!\[.*?\]\((.*?)\)')

def extrair_cover_url(conteudo: str, propriedades: dict | None = None) -> str | None:
    """Extrai a primeira URL de imagem do markdown. propriedades.cover_url tem precedência."""
    def is_valid_url(url: str) -> bool:
        try:
            parsed = urlparse(url)
            return bool(parsed.scheme and parsed.netloc)
        except Exception:
            return False
    
    if propriedades and propriedades.get('cover_url'):
        url = propriedades['cover_url']
        if is_valid_url(url):
            return url
    matches = COVER_URL_REGEX.findall(conteudo or '')
    for url in matches:
        if is_valid_url(url):
            return url
    return None

router = APIRouter()


def _yaml_quote(value: str) -> str:
    if any(c in value for c in ':#{}[]&*!|>%@`"\''):
        escaped = value.replace("'", "''")
        return f"'{escaped}'"
    return value


def _cleanup_nota_relations(nota_id: int, session: Session) -> None:
    for tag in session.exec(select(NotaTag).where(NotaTag.nota_id == nota_id)).all():
        session.delete(tag)
    for fc in session.exec(select(Flashcard).where(Flashcard.nota_id == nota_id)).all():
        fc.nota_id = None
        session.add(fc)
    for s in session.exec(select(SessaoPomodoro).where(SessaoPomodoro.resumo_nota_id == nota_id)).all():
        s.resumo_nota_id = None
        session.add(s)
    conns = session.exec(
        select(ConexaoNota).where(
            or_(ConexaoNota.nota_origem_id == nota_id, ConexaoNota.nota_destino_id == nota_id)
        )
    ).all()
    for c in conns:
        session.delete(c)

# ─── Pastas ───
@router.get("/pastas", response_model=list[PastaRead])
def list_pastas(session: Session = Depends(get_session)):
    return session.exec(select(Pasta)).all()

@router.post("/pastas", response_model=PastaRead)
def create_pasta(p: PastaCreate, session: Session = Depends(get_session)):
    if p.pai_id is not None and not session.get(Pasta, p.pai_id):
        raise HTTPException(status_code=404, detail="Pasta pai não encontrada")
    db = Pasta(**p.model_dump())
    session.add(db)
    try:
        session.commit()
        session.refresh(db)
    except Exception as e:
        session.rollback()
        logger.error("[notas.create_pasta] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao criar pasta")
    return db

# ─── Tags ───
@router.get("/tags", response_model=list[TagRead])
def list_tags(session: Session = Depends(get_session)):
    return session.exec(select(Tag)).all()

@router.post("/tags", response_model=TagRead)
def create_tag(t: TagCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Tag).where(Tag.nome == t.nome)).first()
    if existing:
        return existing
    db = Tag(**t.model_dump())
    session.add(db)
    try:
        session.commit()
        session.refresh(db)
    except Exception as e:
        session.rollback()
        logger.error("[notas.create_tag] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao criar tag")
    return db

# ─── Notas ───
@router.get("", response_model=list[NotaRead])
def list_notas(q: str | None = None, data: str | None = None, tag_ids: str | None = None, sort: str | None = None, session: Session = Depends(get_session)):
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
        return notas
    
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
    return session.exec(stmt.order_by(order)).all()

@router.post("", response_model=NotaRead)
def create_nota(n: NotaCreate, session: Session = Depends(get_session)):
    if n.pasta_id is not None and not session.get(Pasta, n.pasta_id):
        raise HTTPException(status_code=404, detail="Pasta não encontrada")
    if n.tipo_id is not None and not session.get(TipoObjeto, n.tipo_id):
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    db = Nota(**n.model_dump())
    db.cover_url = extrair_cover_url(db.conteudo, db.propriedades)
    session.add(db)
    session.flush()
    processar_wikilinks(db.id, db.conteudo, session)
    try:
        session.commit()
        session.refresh(db)
    except Exception as e:
        session.rollback()
        logger.error("[notas.create_nota] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao criar nota")
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
    try:
        session.commit()
        session.refresh(db)
    except Exception as e:
        session.rollback()
        logger.error("[notas.create_template] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao criar template")
    return db

@router.post("/templates/{template_id}/aplicar", response_model=NotaRead)
def aplicar_template(template_id: int, session: Session = Depends(get_session)):
    t = session.get(TemplateNota, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    conteudo = re.sub(r'\{\{data\}\}', date.today().isoformat(), t.conteudo)
    conteudo = re.sub(r'\{\{titulo\}\}', t.nome, conteudo)
    nota = Nota(titulo=t.nome, conteudo=conteudo, propriedades=t.propriedades.copy() if t.propriedades else {})
    session.add(nota)
    session.flush()
    if conteudo:
        processar_wikilinks(nota.id, conteudo, session)
    try:
        session.commit()
        session.refresh(nota)
    except Exception as e:
        session.rollback()
        logger.error("[notas.aplicar_template] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao aplicar template")
    return nota

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

@router.get("/{nota_id}", response_model=NotaRead)
def get_nota(nota_id: int, session: Session = Depends(get_session)):
    nota = session.get(Nota, nota_id)
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    nota.acessos = (nota.acessos or 0) + 1
    nota.ultimo_acesso = datetime.now().isoformat()
    session.add(nota)
    try:
        session.commit()
        session.refresh(nota)
    except Exception as e:
        session.rollback()
        logger.error("[notas.get_nota] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao registrar acesso")
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
    for k, v in data.items():
        setattr(db, k, v)
    # Re-extract cover_url if content or propriedades changed
    if "conteudo" in data or "propriedades" in data:
        db.cover_url = extrair_cover_url(db.conteudo, db.propriedades)
    session.add(db)
    session.flush()
    if "conteudo" in data:
        processar_wikilinks(db.id, db.conteudo, session)
    try:
        session.commit()
        session.refresh(db)
    except Exception as e:
        session.rollback()
        logger.error("[notas.update_nota] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao atualizar nota")
    return db

@router.delete("/{nota_id}")
def delete_nota(nota_id: int, session: Session = Depends(get_session)):
    n = session.get(Nota, nota_id)
    if not n:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    _cleanup_nota_relations(nota_id, session)
    session.delete(n)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error("[notas.delete_nota] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao excluir nota")
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
    deleted = 0
    for nota_id in ids:
        n = session.get(Nota, nota_id)
        if not n:
            continue
        session.delete(n)
        deleted += 1
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error("[notas.batch_delete_notas] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao excluir notas")
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
    yaml_lines = ["---"]
    for k, v in frontmatter.items():
        if v is None:
            continue
        if isinstance(v, list):
            yaml_lines.append(f"{k}:")
            for item in v:
                yaml_lines.append(f"  - {_yaml_quote(str(item))}")
        elif isinstance(v, str):
            yaml_lines.append(f"{k}: {_yaml_quote(v)}")
        else:
            yaml_lines.append(f"{k}: {v}")
    yaml_lines.append("---")
    body = n.conteudo or ""
    result = "\n".join(yaml_lines) + "\n\n" + body
    from fastapi import Response
    safe_filename = n.titulo.replace('"', "'").replace('\n', '')
    headers = {"Content-Disposition": f"attachment; filename=\"{safe_filename}.md\""}
    return Response(content=result, media_type="text/markdown", headers=headers)

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
    try:
        session.commit()
        session.refresh(nova)
    except Exception as e:
        session.rollback()
        logger.error("[notas.extrair_bloco] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao extrair bloco")
    return nova

@router.patch("/{nota_id}/favoritar", response_model=NotaRead)
def favoritar_nota(nota_id: int, session: Session = Depends(get_session)):
    nota = session.get(Nota, nota_id)
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    nota.favoritado = not nota.favoritado
    nota.atualizado_em = datetime.now().isoformat()
    session.add(nota)
    try:
        session.commit()
        session.refresh(nota)
    except Exception as e:
        session.rollback()
        logger.error("[notas.favoritar_nota] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao favoritar nota")
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
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error("[notas.delete_tag] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao excluir tag")
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
    try:
        session.commit()
        session.refresh(tag)
    except Exception as e:
        session.rollback()
        logger.error("[notas.update_tag] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao atualizar tag")
    return tag

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
    nt = session.exec(
        select(NotaTag).where(NotaTag.nota_id == nota_id, NotaTag.tag_id == tag_id)
    ).first()
    if not nt:
        raise HTTPException(status_code=404, detail="Tag não associada à nota")
    session.delete(nt)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error("[notas.remove_tag_from_nota] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao remover tag")
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
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error("[notas.delete_pasta] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao excluir pasta")
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
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error("[notas.add_tag_to_nota] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao adicionar tag")
    return {"ok": True}

@router.get("/{nota_id}/conexoes", response_model=list[ConexaoNotaRead])
def list_conexoes(nota_id: int, session: Session = Depends(get_session)):
    stmt = select(ConexaoNota).where(
        or_(ConexaoNota.nota_origem_id == nota_id, ConexaoNota.nota_destino_id == nota_id)
    )
    return session.exec(stmt).all()


