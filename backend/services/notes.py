import re
from sqlmodel import Session, select
from models import Nota, ConexaoNota


def extrair_wikilinks(conteudo: str) -> list[str]:
    titles = re.findall(r'\[\[([^\]]+?)(?:\|([^\]]+))?\]\]', conteudo)
    seen: set[str] = set()
    result: list[str] = []
    for raw_title, _ in titles:
        title = raw_title.strip()
        if title and title not in seen:
            seen.add(title)
            result.append(title)
    return result


def processar_wikilinks(nota_id: int, conteudo: str, session: Session):
    existing = session.exec(
        select(ConexaoNota).where(ConexaoNota.nota_origem_id == nota_id)
    ).all()
    for conn in existing:
        session.delete(conn)

    for title in extrair_wikilinks(conteudo):
        target = session.exec(
            select(Nota).where(Nota.titulo == title)
        ).first()
        if target and target.id != nota_id:
            conn = ConexaoNota(
                nota_origem_id=nota_id,
                nota_destino_id=target.id,
                tipo="wikilink",
            )
            session.add(conn)
