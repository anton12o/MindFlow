import logging
from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from database import get_session
from models import Nota, Tarefa, SessaoPomodoro, RegistroHabito, Habito, InboxItem, BlocoRotina

logger = logging.getLogger(__name__)
router = APIRouter()


def _calcular_streak(session: Session) -> int:
    desde = (date.today() - timedelta(days=365)).isoformat()
    notas = session.exec(select(Nota.criado_em).where(Nota.criado_em >= desde)).all()
    tarefas = session.exec(
        select(Tarefa.data).where(Tarefa.data >= desde, Tarefa.status == "concluida")
    ).all()
    sessoes = session.exec(
        select(SessaoPomodoro.finalizado_em).where(SessaoPomodoro.finalizado_em >= desde)
    ).all()
    registros = session.exec(
        select(RegistroHabito.data).where(RegistroHabito.data >= desde)
    ).all()

    dias_ativos: set[str] = set()
    for n in notas:
        dias_ativos.add(n[:10])
    for t in tarefas:
        dias_ativos.add(t)
    for s in sessoes:
        if s:
            dias_ativos.add(s[:10])
    for r in registros:
        dias_ativos.add(r)

    streak = 0
    d = date.today()
    while True:
        if d.isoformat() in dias_ativos:
            streak += 1
            d -= timedelta(days=1)
        else:
            break
    return streak


@router.get("/stats/dashboard")
def dashboard_stats(session: Session = Depends(get_session)):
    hoje = date.today().isoformat()

    # Inbox count
    inbox_count = session.exec(
        select(func.count(InboxItem.id)).where(InboxItem.arquivado.is_(False))
    ).one()

    # Blocos do dia
    blocos = session.exec(
        select(BlocoRotina).where(
            BlocoRotina.data_especifica == hoje
        )
    ).all()

    # Tarefas do dia
    tarefas = session.exec(
        select(Tarefa).where(Tarefa.data == hoje)
    ).all()

    # Habitos ativos + registros de hoje + streak
    habitos_ativos = session.exec(
        select(Habito).where(Habito.ativo.is_(True))
    ).all()
    habito_ids = [h.id for h in habitos_ativos]

    registros_hoje: set[int] = set()
    streak_por_habito: dict[int, int] = {}
    if habito_ids:
        # Today's registries
        rows_hoje = session.exec(
            select(RegistroHabito.habito_id).where(
                RegistroHabito.data == hoje,
                RegistroHabito.habito_id.in_(habito_ids),
            )
        ).all()
        registros_hoje = set(rows_hoje)

        # Streak: last 365 days
        desde = (date.today() - timedelta(days=365)).isoformat()
        all_rows = session.exec(
            select(RegistroHabito.habito_id, RegistroHabito.data).where(
                RegistroHabito.habito_id.in_(habito_ids),
                RegistroHabito.data >= desde,
            )
        ).all()
        dias_por_habito: dict[int, set[str]] = {}
        for hid, d in all_rows:
            if hid not in dias_por_habito:
                dias_por_habito[hid] = set()
            dias_por_habito[hid].add(d)

        for hid in habito_ids:
            streak = 0
            d = date.today()
            dias = dias_por_habito.get(hid, set())
            while d.isoformat() in dias:
                streak += 1
                d -= timedelta(days=1)
            streak_por_habito[hid] = streak

    # Notas de hoje (for journal check)
    notas_hoje = session.exec(
        select(Nota.id, Nota.titulo).where(Nota.criado_em >= hoje)
    ).all()

    return {
        "inbox_count": inbox_count,
        "blocos": [{
            "id": b.id,
            "titulo": b.titulo,
            "hora_inicio": b.hora_inicio,
            "hora_fim": b.hora_fim,
            "cor": b.cor,
        } for b in blocos],
        "tarefas": [{
            "id": t.id,
            "titulo": t.titulo,
            "status": t.status,
            "prioridade": t.prioridade,
        } for t in tarefas],
        "habitos": [{
            "id": h.id,
            "nome": h.nome,
            "cor": h.cor,
            "ativo": h.ativo,
            "feito_hoje": h.id in registros_hoje,
            "streak": streak_por_habito.get(h.id, 0),
        } for h in habitos_ativos],
        "notas_hoje": [{"id": n.id, "titulo": n.titulo} for n in notas_hoje],
        "data": hoje,
    }


@router.get("/stats/weekly")
def weekly_stats(
    offset: int = Query(0, description="0=semana atual, -1=semana passada, 1=próxima semana"),
    session: Session = Depends(get_session),
):
    hoje = date.today()
    # Shift by offset weeks
    alvo = hoje + timedelta(weeks=offset)
    dias_desde_segunda = alvo.weekday()
    inicio_semana = alvo - timedelta(days=dias_desde_segunda)
    fim_semana = inicio_semana + timedelta(days=6)

    # Semana anterior
    inicio_semana_passada = inicio_semana - timedelta(days=7)
    fim_semana_passada = inicio_semana - timedelta(days=1)

    todos_habitos = session.exec(select(Habito).where(Habito.ativo.is_(True))).all()
    total_habitos = len(todos_habitos)

    def _stats_periodo(inicio: date, fim: date) -> dict:
        ini_str = inicio.isoformat()
        fim_str = fim.isoformat()
        fim_str_fim = fim_str + "T23:59:59"

        notas = session.exec(
            select(Nota).where(Nota.criado_em >= ini_str, Nota.criado_em <= fim_str_fim)
        ).all()
        tarefas = session.exec(
            select(Tarefa).where(
                Tarefa.data >= ini_str, Tarefa.data <= fim_str, Tarefa.status == "concluida"
            )
        ).all()
        sessoes = session.exec(
            select(SessaoPomodoro).where(
                SessaoPomodoro.finalizado_em >= ini_str,
                SessaoPomodoro.finalizado_em <= fim_str_fim,
            )
        ).all()

        dias = []
        d = inicio
        while d <= fim:
            ds = d.isoformat()
            notas_dia = [n for n in notas if n.criado_em[:10] == ds]
            tarefas_dia = [t for t in tarefas if t.data == ds]
            sessoes_dia = [s for s in sessoes if s.finalizado_em and s.finalizado_em[:10] == ds]
            dias.append({
                "data": ds,
                "notas": len(notas_dia),
                "tarefas": len(tarefas_dia),
                "pomodoros": len(sessoes_dia),
                "minutos_foco": sum(s.duracao_min for s in sessoes_dia),
            })
            d += timedelta(days=1)

        registros = session.exec(
            select(RegistroHabito.data, RegistroHabito.habito_id)
            .where(RegistroHabito.data >= ini_str, RegistroHabito.data <= fim_str)
        ).all()

        dias_habitos: dict[str, set[int]] = {}
        for r in registros:
            if r[0] not in dias_habitos:
                dias_habitos[r[0]] = set()
            dias_habitos[r[0]].add(r[1])

        habitos_cumpridos = 0
        total_habitos_possiveis = 0
        d = inicio
        while d <= fim:
            ds = d.isoformat()
            if total_habitos > 0:
                habitos_cumpridos += len(dias_habitos.get(ds, set()))
                total_habitos_possiveis += total_habitos
            d += timedelta(days=1)

        return {
            "inicio": ini_str,
            "fim": fim_str,
            "total_notas": len(notas),
            "total_tarefas": len(tarefas),
            "total_pomodoros": len(sessoes),
            "total_minutos_foco": sum(s.duracao_min for s in sessoes),
            "taxa_habitos": round(habitos_cumpridos / total_habitos_possiveis, 2)
                if total_habitos_possiveis > 0 else 0,
            "dias": dias,
        }

    semana = _stats_periodo(inicio_semana, fim_semana)
    semana_passada = _stats_periodo(inicio_semana_passada, fim_semana_passada)
    streak = _calcular_streak(session)

    # Score composto (0-100)
    score_foco = min(25, round(semana["total_minutos_foco"] / 300 * 25))  # 5h = 25
    score_tarefas = min(25, round(semana["total_tarefas"] / 20 * 25))  # 20 = 25
    score_habitos = round(semana["taxa_habitos"] * 25)  # 100% = 25
    score_notas = min(25, round(semana["total_notas"] / 10 * 25))  # 10 = 25
    score_total = score_foco + score_tarefas + score_habitos + score_notas

    return {
        "offset": offset,
        "semana": semana,
        "semana_passada": semana_passada,
        "streak_atual": streak,
        "total_habitos_ativos": total_habitos,
        "score": {
            "total": score_total,
            "foco": score_foco,
            "tarefas": score_tarefas,
            "habitos": score_habitos,
            "notas": score_notas,
        },
        "gerado_em": datetime.now().isoformat(),
    }
