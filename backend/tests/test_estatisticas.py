from datetime import date, timedelta

from models import Nota
from services.estatisticas import calcular_estatisticas


def test_mes_sem_notas(session):
    result = calcular_estatisticas(6, 2026, session)
    assert result["total_mes"] == 0
    assert result["por_dia"] == {}
    assert result["ultimo_dia"] == 30


def test_ultimo_dia_fevereiro_nao_bissexto(session):
    result = calcular_estatisticas(2, 2025, session)
    assert result["ultimo_dia"] == 28


def test_ultimo_dia_fevereiro_bissexto(session):
    result = calcular_estatisticas(2, 2024, session)
    assert result["ultimo_dia"] == 29


def test_conta_notas_por_dia(session):
    hoje = date.today()
    mes = hoje.month
    ano = hoje.year
    dia_str = f"{ano:04d}-{mes:02d}-01"
    session.add(Nota(titulo="N1", conteudo="", criado_em=dia_str))
    session.add(Nota(titulo="N2", conteudo="", criado_em=dia_str))
    session.flush()

    result = calcular_estatisticas(mes, ano, session)
    assert result["total_mes"] == 2
    assert result["por_dia"].get("01") == 2


def test_streak_dias_consecutivos(session):
    hoje = date.today()
    for i in range(5):
        d = hoje - timedelta(days=i)
        session.add(Nota(titulo=f"N{i}", conteudo="", criado_em=d.isoformat()))
    session.flush()

    result = calcular_estatisticas(hoje.month, hoje.year, session)
    assert result["streak"] >= 1


def test_streak_sem_notas_hoje(session):
    hoje = date.today()
    for i in range(1, 4):
        d = hoje - timedelta(days=i)
        session.add(Nota(titulo=f"N{i}", conteudo="", criado_em=d.isoformat()))
    session.flush()

    result = calcular_estatisticas(hoje.month, hoje.year, session)
    assert result["streak"] == 0


def test_streak_limitado_365(session):
    hoje = date.today()
    for i in range(400):
        d = hoje - timedelta(days=i)
        session.add(Nota(titulo=f"N{i}", conteudo="", criado_em=d.isoformat()))
    session.flush()

    result = calcular_estatisticas(hoje.month, hoje.year, session)
    assert result["streak"] <= 366
