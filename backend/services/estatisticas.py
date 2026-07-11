import calendar
import logging
from datetime import date, timedelta

from sqlmodel import Session, func, select

from models import Nota, RegistroHabito, SessaoPomodoro, Tarefa

logger = logging.getLogger(__name__)


def calcular_estatisticas(mes: int, ano: int, session: Session) -> dict:
    ultimo_dia = calendar.monthrange(ano, mes)[1]
    inicio = f"{ano:04d}-{mes:02d}-01"
    fim = f"{ano:04d}-{mes:02d}-{ultimo_dia:02d}~"
    stmt = select(Nota).where(Nota.criado_em >= inicio, Nota.criado_em < fim)
    notas = session.exec(stmt).all()

    por_dia: dict[str, int] = {}
    for n in notas:
        dia = n.criado_em[8:10]
        por_dia[dia] = por_dia.get(dia, 0) + 1

    limite = (date.today() - timedelta(days=365)).isoformat()
    todas = session.exec(
        select(Nota.criado_em).where(Nota.criado_em >= limite)
    ).all()
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


def calcular_heatmap_multi(mes: int, ano: int, session: Session) -> dict:
    ultimo_dia = calendar.monthrange(ano, mes)[1]
    inicio = f"{ano:04d}-{mes:02d}-01"
    fim = f"{ano:04d}-{mes:02d}-{ultimo_dia:02d}T23:59:59"

    por_dia: dict[str, dict] = {}
    for d in range(1, ultimo_dia + 1):
        por_dia[f"{d:02d}"] = {"notas": 0, "tarefas": 0, "pomodoros": 0, "minutos_foco": 0, "habitos": 0}

    notas = session.exec(select(func.substr(Nota.criado_em, 9, 2)).where(Nota.criado_em >= inicio, Nota.criado_em <= fim)).all()
    for dia in notas:
        if dia in por_dia:
            por_dia[dia]["notas"] += 1

    tarefas = session.exec(select(Tarefa.data).where(Tarefa.data >= inicio, Tarefa.data <= fim, Tarefa.status == "feito")).all()
    for data in tarefas:
        dia = data[8:10]
        if dia in por_dia:
            por_dia[dia]["tarefas"] += 1

    pomodoros = session.exec(
        select(func.substr(SessaoPomodoro.finalizado_em, 9, 2), SessaoPomodoro.duracao_min)
        .where(SessaoPomodoro.finalizado_em >= inicio, SessaoPomodoro.finalizado_em <= fim)
    ).all()
    for dia, dur in pomodoros:
        if dia in por_dia:
            por_dia[dia]["pomodoros"] += 1
            por_dia[dia]["minutos_foco"] += dur

    registros = session.exec(
        select(RegistroHabito.data).where(RegistroHabito.data >= inicio, RegistroHabito.data <= fim).distinct()
    ).all()
    for data in registros:
        dia = data[8:10]
        if dia in por_dia:
            por_dia[dia]["habitos"] += 1

    return {"por_dia": por_dia, "total_notas": len(notas), "ultimo_dia": ultimo_dia}
