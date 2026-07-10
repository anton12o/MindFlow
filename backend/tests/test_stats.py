from datetime import date, datetime, timedelta

from models import (
    BlocoRotina,
    Flashcard,
    Habito,
    InboxItem,
    Nota,
    RegistroHabito,
    SessaoPomodoro,
    Tarefa,
)


def test_dashboard_vazio(client):
    r = client.get("/api/stats/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert data["inbox_count"] == 0
    assert data["blocos"] == []
    assert data["tarefas"] == []
    assert data["habitos"] == []
    assert data["notas_hoje"] == []
    assert data["total_notas"] == 0
    assert data["total_tarefas"] == 0
    assert data["total_flashcards"] == 0
    assert data["total_sessoes"] == 0
    assert data["db_size_mb"] > 0


def test_dashboard_contagens(client, session):
    hoje = date.today().isoformat()
    agora = datetime.now().isoformat()

    session.add(InboxItem(conteudo="Item pendente"))
    session.add(InboxItem(conteudo="Item arquivado", arquivado=True))
    session.add(Nota(titulo="Nota A", conteudo="", criado_em=agora))
    session.add(Tarefa(titulo="Tarefa 1", data=hoje, status="pendente", prioridade="normal"))
    session.add(Tarefa(titulo="Tarefa 2", data=hoje, status="feito", prioridade="normal"))
    session.add(Habito(nome="Meditar", tipo="binario"))
    session.add(Habito(nome="Correr", tipo="binario"))
    session.add(BlocoRotina(titulo="Foco", hora_inicio="09:00", hora_fim="11:00", data_especifica=hoje))
    session.add(SessaoPomodoro(duracao_min=25, finalizado_em=agora, iniciado_em=agora))
    session.add(Flashcard(pergunta="Q1", resposta="A1"))
    session.commit()

    r = client.get("/api/stats/dashboard")
    assert r.status_code == 200
    data = r.json()

    assert data["inbox_count"] == 1
    assert len(data["blocos"]) == 1
    assert data["blocos"][0]["titulo"] == "Foco"
    assert len(data["tarefas"]) == 2
    assert len(data["habitos"]) == 2
    assert len(data["notas_hoje"]) == 1
    assert data["total_notas"] == 1
    assert data["total_tarefas"] == 2
    assert data["total_flashcards"] == 1
    assert data["total_sessoes"] == 1


def test_dashboard_habito_streak(client, session):
    hoje = date.today()
    h = Habito(nome="Ler", tipo="binario", cor="#3B82F6")
    session.add(h)
    session.flush()

    for i in range(5):
        d = (hoje - timedelta(days=i)).isoformat()
        session.add(RegistroHabito(habito_id=h.id, data=d))
    session.commit()

    r = client.get("/api/stats/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert len(data["habitos"]) == 1
    assert data["habitos"][0]["streak"] == 5
    assert data["habitos"][0]["feito_hoje"] is True


def test_dashboard_nota_hoje(client, session):
    hoje = date.today().isoformat()
    session.add(Nota(titulo="Diario", conteudo="", criado_em=f"{hoje}T12:00:00"))
    session.add(Nota(titulo="Nota velha", conteudo="", criado_em="2020-01-01T12:00:00"))
    session.commit()

    r = client.get("/api/stats/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert len(data["notas_hoje"]) == 1
    assert data["notas_hoje"][0]["titulo"] == "Diario"


def test_pomodoro_vazio(client):
    r = client.get("/api/stats/pomodoro")
    assert r.status_code == 200
    data = r.json()
    assert data["total_min_hoje"] == 0
    assert data["total_sessoes_hoje"] == 0
    assert data["streak_dias"] == 0


def test_pomodoro_com_sessoes(client, session):
    hoje = date.today()
    h = (hoje - timedelta(days=1)).isoformat()
    hoje_str = hoje.isoformat()

    session.add(SessaoPomodoro(
        duracao_min=25, finalizado_em=f"{hoje_str}T10:25:00",
        iniciado_em=f"{hoje_str}T10:00:00",
    ))
    session.add(SessaoPomodoro(
        duracao_min=30, finalizado_em=f"{hoje_str}T15:30:00",
        iniciado_em=f"{hoje_str}T15:00:00",
    ))
    session.add(SessaoPomodoro(
        duracao_min=25, finalizado_em=f"{h}T10:00:00",
        iniciado_em=f"{h}T09:00:00",
    ))
    session.add(SessaoPomodoro(
        duracao_min=25, iniciado_em=f"{hoje_str}T20:00:00",
        finalizado_em=None,
    ))
    session.commit()

    r = client.get("/api/stats/pomodoro")
    assert r.status_code == 200
    data = r.json()
    assert data["total_min_hoje"] == 55
    assert data["total_sessoes_hoje"] == 2
    assert data["streak_dias"] == 2


def test_weekly_vazio(client):
    r = client.get("/api/stats/weekly")
    assert r.status_code == 200
    data = r.json()
    assert data["offset"] == 0
    for periodo in ("semana", "semana_passada"):
        p = data[periodo]
        assert p["total_notas"] == 0
        assert p["total_tarefas"] == 0
        assert p["total_pomodoros"] == 0
        assert p["taxa_habitos"] == 0
    assert data["streak_atual"] == 0
    assert data["total_habitos_ativos"] == 0
    assert data["score"]["total"] == 0


def test_weekly_com_dados(client, session):
    hoje = date.today()
    hoje_str = hoje.isoformat()
    dias_desde_segunda = hoje.weekday()
    inicio_semana = hoje - timedelta(days=dias_desde_segunda)

    session.add(Nota(titulo="N1", conteudo="", criado_em=f"{hoje_str}T10:00:00"))
    session.add(Tarefa(titulo="T1", data=hoje_str, status="feito", prioridade="normal"))
    session.add(SessaoPomodoro(
        duracao_min=25, finalizado_em=f"{hoje_str}T10:25:00",
        iniciado_em=f"{hoje_str}T10:00:00",
    ))
    session.add(Habito(nome="Agua", tipo="binario", ativo=True))
    session.commit()

    r = client.get("/api/stats/weekly")
    assert r.status_code == 200
    data = r.json()

    assert data["semana"]["total_notas"] == 1
    assert data["semana"]["total_tarefas"] == 1
    assert data["semana"]["total_pomodoros"] == 1
    assert data["total_habitos_ativos"] >= 1
    assert data["streak_atual"] >= 1

    assert len(data["semana"]["dias"]) == 7
    primeiro_dia = data["semana"]["dias"][0]
    assert primeiro_dia["data"] == inicio_semana.isoformat()


def test_weekly_offset(client, session):
    hoje = date.today()
    dias_desde_segunda = hoje.weekday()
    inicio_semana = hoje - timedelta(days=dias_desde_segunda)
    semana_passada_inicio = inicio_semana - timedelta(days=7)

    session.add(Nota(titulo="N Sem passada", conteudo="",
                     criado_em=f"{semana_passada_inicio.isoformat()}T10:00:00"))
    session.commit()

    r = client.get("/api/stats/weekly?offset=-1")
    assert r.status_code == 200
    data = r.json()
    assert data["offset"] == -1
    assert data["semana"]["total_notas"] == 1

    r2 = client.get("/api/stats/weekly?offset=1")
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["offset"] == 1
    assert data2["semana"]["total_notas"] == 0


def test_weekly_score(client, session):
    hoje = date.today()
    dias_desde_segunda = hoje.weekday()
    inicio_semana = hoje - timedelta(days=dias_desde_segunda)
    ini = inicio_semana.isoformat()

    for i in range(20):
        d = (inicio_semana + timedelta(days=i % 7)).isoformat()
        session.add(Tarefa(titulo=f"T{i}", data=d, status="feito", prioridade="normal"))

    for i in range(10):
        session.add(Nota(titulo=f"N{i}", conteudo="", criado_em=f"{ini}T10:00:00"))

    session.add(SessaoPomodoro(
        duracao_min=300, finalizado_em=f"{ini}T05:00:00",
        iniciado_em=f"{ini}T00:00:00",
    ))

    h = Habito(nome="Teste", tipo="binario", ativo=True)
    session.add(h)
    session.flush()
    for i in range(7):
        d = (inicio_semana + timedelta(days=i)).isoformat()
        session.add(RegistroHabito(habito_id=h.id, data=d))
    session.commit()

    r = client.get("/api/stats/weekly")
    assert r.status_code == 200
    s = r.json()["score"]
    assert s["foco"] == 25
    assert s["tarefas"] == 25
    assert s["habitos"] == 25
    assert s["notas"] == 25
    assert s["total"] == 100


def test_flashcards_vazio(client):
    r = client.get("/api/stats/flashcards")
    assert r.status_code == 200
    data = r.json()
    assert data["total_cards"] == 0
    assert data["cards_hoje"] == 0
    assert data["cards_revisados_hoje"] == 0
    assert data["taxa_acerto_7d"] is None


def test_flashcards_stats(client, session):
    hoje = date.today()
    inicio_hoje = datetime(hoje.year, hoje.month, hoje.day)
    ha_7_dias = inicio_hoje - timedelta(days=7)

    session.add(Flashcard(pergunta="P1", resposta="A1",
                          proxima_revisao=hoje, ultima_revisao=inicio_hoje,
                          intervalo=5.0, facilidade=2.5))
    session.add(Flashcard(pergunta="P2", resposta="A2",
                          proxima_revisao=hoje, ultima_revisao=inicio_hoje,
                          intervalo=0.0, facilidade=2.5))
    session.add(Flashcard(pergunta="P3", resposta="A3",
                          proxima_revisao=hoje + timedelta(days=10),
                          ultima_revisao=ha_7_dias,
                          intervalo=3.0, facilidade=2.5))
    session.add(Flashcard(pergunta="P4", resposta="A4",
                          proxima_revisao=hoje, ultima_revisao=None))
    session.commit()

    r = client.get("/api/stats/flashcards")
    assert r.status_code == 200
    data = r.json()
    assert data["total_cards"] == 4
    assert data["cards_hoje"] == 3
    assert data["cards_revisados_hoje"] == 2
    assert data["taxa_acerto_7d"] is not None


def test_leitura_vazio(client):
    r = client.get("/api/stats/leitura")
    assert r.status_code == 200
    data = r.json()
    assert data["total_acessos"] == 0
    assert data["notas_lidas"] == 0
    assert data["top_notas"] == []
    assert data["streak_leitura"] == 0


def test_leitura_com_acessos(client, session):
    hoje = date.today()
    h_str = hoje.isoformat()

    session.add(Nota(titulo="Top 1", conteudo="", acessos=10,
                     ultimo_acesso=f"{h_str}T12:00:00", criado_em=h_str))
    session.add(Nota(titulo="Top 2", conteudo="", acessos=5,
                     ultimo_acesso=f"{h_str}T12:00:00", criado_em=h_str))
    session.add(Nota(titulo="Nao lida", conteudo="", acessos=0,
                     ultimo_acesso=None, criado_em=h_str))
    session.commit()

    r = client.get("/api/stats/leitura")
    assert r.status_code == 200
    data = r.json()
    assert data["total_acessos"] == 15
    assert data["notas_lidas"] == 2
    assert len(data["top_notas"]) == 2
    assert data["top_notas"][0]["titulo"] == "Top 1"
    assert data["top_notas"][0]["acessos"] == 10
    assert data["streak_leitura"] >= 1
