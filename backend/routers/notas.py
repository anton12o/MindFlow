import re
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, or_, SQLModel
from database import get_session
from models import (
    Nota, NotaCreate, NotaRead, NotaUpdate,
    Pasta, PastaCreate, PastaRead,
    Tag, TagCreate, TagRead, NotaTag,
    ConexaoNota, ConexaoNotaRead,
    TemplateNota, TemplateRead, TemplateBase,
)
from services import processar_wikilinks
from datetime import datetime

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
def list_notas(q: str | None = None, session: Session = Depends(get_session)):
    stmt = select(Nota)
    if q:
        stmt = stmt.where(Nota.titulo.contains(q) | Nota.conteudo.contains(q))
    return session.exec(stmt.order_by(Nota.atualizado_em.desc())).all()

@router.post("", response_model=NotaRead)
def create_nota(n: NotaCreate, session: Session = Depends(get_session)):
    db = Nota(**n.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    processar_wikilinks(db.id, db.conteudo, session)
    session.commit()
    return db

@router.get("/{nota_id}", response_model=NotaRead)
def get_nota(nota_id: int, session: Session = Depends(get_session)):
    return session.get(Nota, nota_id)

@router.patch("/{nota_id}", response_model=NotaRead)
def update_nota(nota_id: int, n: NotaUpdate, session: Session = Depends(get_session)):
    db = session.get(Nota, nota_id)
    if db:
        data = n.model_dump(exclude_unset=True)
        data["atualizado_em"] = datetime.now().isoformat()
        for k, v in data.items():
            setattr(db, k, v)
        session.add(db)
        session.commit()
        session.refresh(db)
        if "conteudo" in data:
            processar_wikilinks(db.id, db.conteudo, session)
            session.commit()
    return db

@router.delete("/{nota_id}")
def delete_nota(nota_id: int, session: Session = Depends(get_session)):
    n = session.get(Nota, nota_id)
    if n:
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
def extrair_bloco(nota_id: int, input: ExtrairInput, session: Session = Depends(get_session)):
    original = session.get(Nota, nota_id)
    if not original:
        return {"ok": False}
    titulo = input.trecho.split('\n')[0][:60] or "Trecho extraído"
    nova = Nota(titulo=titulo.strip(), conteudo=input.trecho, tipo_id=input.tipo_id)
    session.add(nova)
    session.commit()
    session.refresh(nova)
    original.conteudo += f"\n\n[[{nova.titulo}]]"
    session.add(original)
    session.commit()
    session.refresh(nova)
    return nova

@router.post("/{nota_id}/tags/{tag_id}")
def add_tag_to_nota(nota_id: int, tag_id: int, session: Session = Depends(get_session)):
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

@router.get("/grafo")
def get_grafo(session: Session = Depends(get_session)):
    notas = session.exec(select(Nota)).all()
    conexoes = session.exec(select(ConexaoNota)).all()
    from models import TipoObjeto
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
        return {"ok": False}
    from datetime import date
    conteudo = re.sub(r'\{\{data\}\}', date.today().isoformat(), t.conteudo)
    conteudo = re.sub(r'\{\{titulo\}\}', t.nome, conteudo)
    nota = Nota(titulo=t.nome, conteudo=conteudo, propriedades=t.propriedades.copy())
    session.add(nota)
    session.commit()
    session.refresh(nota)
    return nota
