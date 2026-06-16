import re
from datetime import datetime
from sqlmodel import Session, select
from models import Nota, ConexaoNota


def extrair_wikilinks(conteudo: str) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for match in re.findall(r'\[\[([^\]]+)\]\]', conteudo):
        title = match.split('|')[0].strip()
        if title and title not in seen:
            seen.add(title)
            result.append(title)
    return result


def processar_wikilinks(nota_id: int, conteudo: str | None, session: Session):
    if not conteudo:
        return
    existing = session.exec(
        select(ConexaoNota).where(
            ConexaoNota.nota_origem_id == nota_id,
            ConexaoNota.tipo == "wikilink",
        )
    ).all()
    for conn in existing:
        session.delete(conn)

    for title in extrair_wikilinks(conteudo):
        target = session.exec(
            select(Nota).where(Nota.titulo == title)
        ).first()
        if not target:
            target = session.exec(
                select(Nota).where(Nota.titulo.ilike(title))
            ).first()
        if target and target.id != nota_id:
            conn = ConexaoNota(
                nota_origem_id=nota_id,
                nota_destino_id=target.id,
                tipo="wikilink",
            )
            session.add(conn)


def criar_nota_resumo(conteudo_resumo: str, session: Session, contexto_nome: str | None = None) -> Nota:
    prefixo = f"Resumo Pomodoro ({contexto_nome})" if contexto_nome else "Resumo Pomodoro"
    nota = Nota(
        titulo=f"{prefixo} — {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        conteudo=conteudo_resumo,
    )
    session.add(nota)
    session.flush()
    processar_wikilinks(nota.id, conteudo_resumo, session)
    return nota
