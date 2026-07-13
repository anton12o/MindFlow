import logging
import re
from datetime import datetime
from urllib.parse import urlparse

from sqlmodel import Session, or_, select

from models import ConexaoNota, Flashcard, Nota, NotaTag, SessaoPomodoro

logger = logging.getLogger(__name__)

COVER_URL_REGEX = re.compile(r'!\[.*?\]\((.*?)\)')
EXTENSOES_IMAGEM = frozenset({'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'})

def extrair_cover_url(conteudo: str, propriedades: dict | None = None) -> str | None:
    def is_valid_url(url: str) -> bool:
        try:
            parsed = urlparse(url)
            if not (parsed.scheme and parsed.netloc):
                return False
            path_lower = parsed.path.lower()
            ext = path_lower[path_lower.rfind('.'):] if '.' in path_lower else ''
            return not ext or ext in EXTENSOES_IMAGEM
        except ValueError:
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



def cleanup_nota_relations(nota_id: int, session: Session) -> None:
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

    titles = extrair_wikilinks(conteudo)
    if not titles:
        return

    targets = session.exec(
        select(Nota).where(Nota.titulo.in_(titles))
    ).all()

    found: dict[str, int] = {t.titulo: t.id for t in targets}

    remaining = [t for t in titles if t not in found]
    for title in remaining:
        escaped = title.replace('%', '\\%').replace('_', '\\_')
        target = session.exec(
            select(Nota).where(Nota.titulo.ilike(escaped, escape='\\'))
        ).first()
        if target and target.id != nota_id:
            found[title] = int(target.id)

    for title in titles:
        target_id = found.get(title)
        if target_id is not None and target_id != nota_id:
            session.add(ConexaoNota(
                nota_origem_id=nota_id,
                nota_destino_id=target_id,
                tipo="wikilink",
            ))


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
