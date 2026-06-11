from sqlmodel import Session, select
from models import Nota
from datetime import date, timedelta
import calendar
import logging

logger = logging.getLogger(__name__)


def calcular_estatisticas(mes: int, ano: int, session: Session) -> dict:
    stmt = select(Nota).where(Nota.criado_em.like(f"{ano:04d}-{mes:02d}%"))
    notas = session.exec(stmt).all()

    por_dia: dict[str, int] = {}
    for n in notas:
        dia = n.criado_em[8:10]
        por_dia[dia] = por_dia.get(dia, 0) + 1

    todas = session.exec(select(Nota.criado_em)).all()
    dias_com_nota: set[str] = set()
    for n in todas:
        dias_com_nota.add(n[:10])

    streak = 0
    d = date.today()
    while True:
        chave = d.isoformat()
        if chave in dias_com_nota:
            streak += 1
            d -= timedelta(days=1)
        else:
            break

    ultimo_dia = calendar.monthrange(ano, mes)[1]

    logger.info("Estatísticas %d/%d: %d notas, streak %d", mes, ano, len(notas), streak)

    return {
        "por_dia": por_dia,
        "total_mes": len(notas),
        "streak": streak,
        "ultimo_dia": ultimo_dia,
    }