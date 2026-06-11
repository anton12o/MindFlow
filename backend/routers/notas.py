import re
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_, SQLModel
from sqlalchemy import text
from database import get_session
from models import (
    Nota, NotaCreate, NotaRead, NotaUpdate,
    Pasta, PastaCreate, PastaRead,
    Tag, TagCreate, TagRead, NotaTag,
    ConexaoNota, ConexaoNotaRead,
    TemplateNota, TemplateRead, TemplateBase,
    Flashcard, SessaoPomodoro,
)
from services import processar_wikilinks
from services.estatisticas import calcular_estatisticas
from datetime import datetime, date
from models import TipoObjeto

router = APIRouter()

# ─── Pastas ───
@router.get("/pastas", response_model=list[PastaRead])
def list_pastas(session: Session = Depends(get_session)):
    return session.exec(select(Pasta)).all()

@router.post("/pastas", response_model=PastaRead)
def create_pasta(p: PastaCreate, session: Session = Depends(get_session)):
    db = Pasta(**p.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

# ─── Tags ───
@router.get("/tags", response_model=list[TagRead])
def list_tags(session: Session = Depends(get_session)):
    return session.exec(select(Tag)).all()

@router.post("/tags", response_model=TagRead)
def create_tag(t: TagCreate, session: Session = Depends(get_session)):
    db = Tag(**t.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

# ─── Notas ───
@router.get("", response_model=list[NotaRead])
def list_notas(q: str | None = None, data: str | None = None, session: Session = Depends(get_session)):
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
        except Exception:
            ids = []
        notas_map = {n.id: n for n in session.exec(select(Nota).where(Nota.id.in_(ids))).all()}
        notas = [notas_map[i] for i in ids if i in notas_map]
        if data:
            notas = [n for n in notas if n.criado_em.startswith(data)]
        return notas
    stmt = select(Nota)
    if data:
        stmt = stmt.where(Nota.criado_em.startswith(data))
    return session.exec(stmt.order_by(Nota.atualizado_em.desc())).all()

@router.post("", response_model=NotaRead)
def create_nota(n: NotaCreate, session: Session = Depends(get_session)):
    db = Nota(**n.model_dump())
    session.add(db)
    session.flush()
    processar_wikilinks(db.id, db.conteudo, session)
    session.commit()
    session.refresh(db)
    return db

# Rotas com caminho fixo — devem vir ANTES de /{nota_id} para evitar conflito
@router.get("/grafo")
def get_grafo(session: Session = Depends(get_session)):
    notas = session.exec(select(Nota)).all()
    conexoes = session.exec(select(ConexaoNota)).all()
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
    session.commit()
    session.refresh(db)
    return db

@router.post("/templates/{template_id}/aplicar", response_model=NotaRead)
def aplicar_template(template_id: int, session: Session = Depends(get_session)):
    t = session.get(TemplateNota, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    conteudo = re.sub(r'\{\{data\}\}', date.today().isoformat(), t.conteudo)
    conteudo = re.sub(r'\{\{titulo\}\}', t.nome, conteudo)
    nota = Nota(titulo=t.nome, conteudo=conteudo, propriedades=(t.propriedades.copy() if t.propriedades else None))
    session.add(nota)
    session.flush()
    if conteudo:
        processar_wikilinks(nota.id, conteudo, session)
    session.commit()
    session.refresh(nota)
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

@router.get("/{nota_id}", response_model=NotaRead)
def get_nota(nota_id: int, session: Session = Depends(get_session)):
    nota = session.get(Nota, nota_id)
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    return nota

@router.patch("/{nota_id}", response_model=NotaRead)
def update_nota(nota_id: int, n: NotaUpdate, session: Session = Depends(get_session)):
    db = session.get(Nota, nota_id)
    if not db:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    data = n.model_dump(exclude_unset=True)
    data["atualizado_em"] = datetime.now().isoformat()
    for k, v in data.items():
        setattr(db, k, v)
    session.add(db)
    session.flush()
    if "conteudo" in data:
        processar_wikilinks(db.id, db.conteudo, session)
    session.commit()
    session.refresh(db)
    return db

@router.delete("/{nota_id}")
def delete_nota(nota_id: int, session: Session = Depends(get_session)):
    n = session.get(Nota, nota_id)
    if not n:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
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
    session.delete(n)
    session.commit()
    return {"ok": True}

class ExtrairInput(SQLModel):
    trecho: str
    tipo_id: int | None = None

@router.post("/{nota_id}/extrair", response_model=NotaRead)
def extrair_bloco(nota_id: int, body: ExtrairInput, session: Session = Depends(get_session)):
    original = session.get(Nota, nota_id)
    if not original:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    titulo = body.trecho.split('\n')[0][:60] or "Trecho extraído"
    nova = Nota(titulo=titulo.strip(), conteudo=body.trecho, tipo_id=body.tipo_id)
    session.add(nova)
    session.flush()
    original.conteudo += f"\n\n[[{nova.titulo}]]"
    session.add(original)
    processar_wikilinks(original.id, original.conteudo, session)
    session.commit()
    session.refresh(nova)
    return nova

@router.post("/{nota_id}/tags/{tag_id}")
def add_tag_to_nota(nota_id: int, tag_id: int, session: Session = Depends(get_session)):
    existing = session.exec(
        select(NotaTag).where(NotaTag.nota_id == nota_id, NotaTag.tag_id == tag_id)
    ).first()
    if existing:
        return {"ok": True}
    nt = NotaTag(nota_id=nota_id, tag_id=tag_id)
    session.add(nt)
    session.commit()
    return {"ok": True}

@router.get("/{nota_id}/conexoes", response_model=list[ConexaoNotaRead])
def list_conexoes(nota_id: int, session: Session = Depends(get_session)):
    stmt = select(ConexaoNota).where(
        or_(ConexaoNota.nota_origem_id == nota_id, ConexaoNota.nota_destino_id == nota_id)
    )
    return session.exec(stmt).all()


