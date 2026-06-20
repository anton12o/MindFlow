def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_inbox_crud(client):
    r = client.get("/api/inbox")
    assert r.status_code == 200
    assert r.json() == []

    r = client.post("/api/inbox", json={"conteudo": "testar app"})
    assert r.status_code == 200
    data = r.json()
    assert data["conteudo"] == "testar app"
    assert data["arquivado"] is False
    inbox_id = data["id"]

    r = client.get("/api/inbox")
    assert len(r.json()) == 1

    r = client.patch(f"/api/inbox/{inbox_id}", json={"conteudo": "atualizado"})
    assert r.status_code == 200
    assert r.json()["conteudo"] == "atualizado"

    r = client.delete(f"/api/inbox/{inbox_id}")
    assert r.status_code == 200

    r = client.get("/api/inbox")
    assert r.json() == []


def test_tipos_crud(client):
    r = client.post("/api/tipos", json={"nome": "Livro", "icone": "📚"})
    assert r.status_code == 200
    tipo_id = r.json()["id"]

    r = client.get("/api/tipos")
    assert any(t["nome"] == "Livro" for t in r.json())

    r = client.patch(f"/api/tipos/{tipo_id}", json={"nome": "E-book"})
    assert r.json()["nome"] == "E-book"

    r = client.delete(f"/api/tipos/{tipo_id}")
    assert r.status_code == 200


def test_delete_tipo_com_dependencias(client):
    r = client.post("/api/tipos", json={"nome": "Projeto", "icone": "📋"})
    tipo_id = r.json()["id"]

    r = client.post("/api/rotina/tarefas", json={
        "titulo": "Tarefa teste", "data": "2026-01-01", "tipo_id": tipo_id,
    })
    assert r.status_code == 200

    r = client.delete(f"/api/tipos/{tipo_id}")
    assert r.status_code == 409


def test_rotina_blocos(client):
    r = client.post("/api/rotina/blocos", json={
        "titulo": "Trabalho", "hora_inicio": "09:00", "hora_fim": "12:00",
        "recorrente": True, "dias_semana": "0,1,2,3,4",
    })
    assert r.status_code == 200
    bloco_id = r.json()["id"]

    r = client.get("/api/rotina/blocos", params={"data": "2026-06-08"})
    assert r.status_code == 200
    assert any(b["id"] == bloco_id for b in r.json())

    r = client.patch(f"/api/rotina/blocos/{bloco_id}", json={"titulo": "Trabalho foco"})
    assert r.json()["titulo"] == "Trabalho foco"


def test_rotina_data_invalida(client):
    r = client.get("/api/rotina/blocos", params={"data": "data-invalida"})
    assert r.status_code == 422


def test_tarefas_crud(client):
    r = client.post("/api/rotina/tarefas", json={"titulo": "Fazer café", "data": "2026-01-01"})
    assert r.status_code == 200
    tarefa_id = r.json()["id"]

    r = client.get("/api/rotina/tarefas", params={"data": "2026-01-01"})
    assert len(r.json()) == 1

    r = client.patch(f"/api/rotina/tarefas/{tarefa_id}", json={"status": "feito"})
    assert r.json()["status"] == "feito"

    r = client.delete(f"/api/rotina/tarefas/{tarefa_id}")
    assert r.status_code == 200


def test_pomodoro_crud(client):
    r = client.post("/api/pomodoro/sessoes", json={"duracao_min": 25})
    assert r.status_code == 200
    sessao_id = r.json()["id"]
    assert r.json()["finalizado_em"] is None

    r = client.patch(f"/api/pomodoro/sessoes/{sessao_id}/finalizar", json={})
    assert r.status_code == 200
    assert r.json()["finalizado_em"] is not None


def test_pomodoro_com_resumo(client):
    r = client.post("/api/pomodoro/sessoes", json={"duracao_min": 5})
    sessao_id = r.json()["id"]

    r = client.patch(f"/api/pomodoro/sessoes/{sessao_id}/finalizar", json={
        "conteudo_resumo": "Fiz progresso no projeto X",
        "contexto_nome": "Projeto X",
    })
    assert r.status_code == 200
    assert r.json()["resumo_nota_id"] is not None


def test_notas_crud(client):
    r = client.post("/api/notas", json={"titulo": "Nota teste", "conteudo": "Conteúdo da nota"})
    assert r.status_code == 200
    nota_id = r.json()["id"]

    r = client.get(f"/api/notas/{nota_id}")
    assert r.json()["titulo"] == "Nota teste"

    r = client.patch(f"/api/notas/{nota_id}", json={"conteudo": "Atualizado"})
    assert r.json()["conteudo"] == "Atualizado"

    r = client.get("/api/notas")
    assert len(r.json()) == 1

    r = client.delete(f"/api/notas/{nota_id}")
    assert r.status_code == 200


def test_notas_wikilinks(client):
    r = client.post("/api/notas", json={"titulo": "Destino", "conteudo": "Nota alvo"})
    assert r.status_code == 200

    r = client.post("/api/notas", json={"titulo": "Origem", "conteudo": "Veja [[Destino]] aqui"})
    assert r.status_code == 200

    r = client.get("/api/notas/grafo")
    assert r.status_code == 200
    data = r.json()
    assert len(data["nodes"]) == 2
    assert len(data["links"]) >= 1


def test_notas_wikilink_inexistente(client):
    r = client.post("/api/notas", json={
        "titulo": "Link quebrado", "conteudo": "Veja [[Nota Inexistente]] aqui",
    })
    assert r.status_code == 200

    r = client.get(f"/api/notas/{r.json()['id']}/conexoes")
    assert r.json() == []


def test_flashcards_sm2(client):
    r = client.post("/api/flashcards", json={"pergunta": "Pergunta?", "resposta": "Resposta"})
    assert r.status_code == 200
    card_id = r.json()["id"]

    r = client.get("/api/flashcards/review")
    assert any(c["id"] == card_id for c in r.json())

    r = client.post(f"/api/flashcards/{card_id}/review", json={"qualidade": 3})
    assert r.status_code == 200
    assert r.json()["revisoes"] == 1


def test_flashcards_qualidade_invalida(client):
    r = client.post("/api/flashcards", json={"pergunta": "Q?", "resposta": "R"})
    card_id = r.json()["id"]

    r = client.post(f"/api/flashcards/{card_id}/review", json={"qualidade": 10})
    assert r.status_code == 422


def test_pastas_tags(client):
    r = client.post("/api/notas/pastas", json={"nome": "Pasta teste"})
    assert r.status_code == 200
    pasta_id = r.json()["id"]

    r = client.post("/api/notas/tags", json={"nome": "tag1", "cor": "#ff0000"})
    assert r.status_code == 200

    r = client.post("/api/notas", json={"titulo": "Nota na pasta", "pasta_id": pasta_id})
    assert r.status_code == 200


def test_templates(client):
    r = client.get("/api/notas/templates")
    assert r.status_code == 200
    templates = r.json()
    assert len(templates) > 0

    r = client.post(f"/api/notas/templates/{templates[0]['id']}/aplicar")
    assert r.status_code == 200
    assert r.json()["titulo"] is not None


def test_queries_salvas(client):
    r = client.get("/api/tipos")
    assert r.status_code == 200
    tipos = r.json()
    assert len(tipos) > 0

    r = client.post("/api/queries", json={
        "nome": "Minhas notas", "tipo_objeto_id": tipos[0]["id"], "visualizacao": "grid",
    })
    assert r.status_code == 200
    query_id = r.json()["id"]

    r = client.get("/api/queries")
    assert any(q["id"] == query_id for q in r.json())

    r = client.post(f"/api/queries/{query_id}/executar")
    assert r.status_code == 200


def test_export(client):
    r = client.get("/api/export")
    assert r.status_code == 200
    data = r.json()
    assert "inbox" in data
    assert "notas" in data
    assert "tipos_objeto" in data
    assert data["versao"] == "1.0"


def test_import(client):
    data = {
        "notas": [{"id": 999, "titulo": "Importada", "conteudo": "teste"}],
        "tipos_objeto": [{"id": 999, "nome": "TipoImp", "icone": "📄"}],
    }
    import json
    r = client.post("/api/import", files={
        "file": ("test.json", json.dumps(data), "application/json"),
    })
    assert r.status_code == 200
    result = r.json()
    assert result["sucesso"] is True


def test_insights(client):
    r = client.get("/api/notas/estatisticas", params={"mes": 6, "ano": 2026})
    assert r.status_code == 200


def test_bloco_delete_nullifica_tarefa(client):
    r = client.post("/api/rotina/blocos", json={
        "titulo": "Bloco teste", "hora_inicio": "10:00", "hora_fim": "11:00",
    })
    bloco_id = r.json()["id"]

    r = client.post("/api/rotina/tarefas", json={
        "titulo": "Tarefa no bloco", "data": "2026-01-01", "bloco_id": bloco_id,
    })
    tarefa_id = r.json()["id"]

    r = client.delete(f"/api/rotina/blocos/{bloco_id}")
    assert r.status_code == 200

    r = client.get("/api/rotina/tarefas", params={"data": "2026-01-01"})
    tarefas = r.json()
    tarefa = next(t for t in tarefas if t["id"] == tarefa_id)
    assert tarefa["bloco_id"] is None


def test_delete_nota_limpa_associacoes(client):
    r = client.post("/api/notas", json={"titulo": "Deletável", "conteudo": "será deletada"})
    nota_id = r.json()["id"]

    r = client.post("/api/flashcards", json={
        "nota_id": nota_id, "pergunta": "P?", "resposta": "R",
    })
    card_id = r.json()["id"]

    r = client.post("/api/pomodoro/sessoes", json={
        "duracao_min": 5, "contexto_tipo": "nota", "contexto_id": nota_id,
    })
    sessao_id = r.json()["id"]
    r = client.patch(f"/api/pomodoro/sessoes/{sessao_id}/finalizar", json={"conteudo_resumo": "resumo"})

    r = client.delete(f"/api/notas/{nota_id}")
    assert r.status_code == 200

    r = client.get("/api/flashcards")
    cards = r.json()
    for c in cards:
        if c["id"] == card_id:
            assert c["nota_id"] is None


def test_extrair_bloco(client):
    r = client.post("/api/notas", json={
        "titulo": "Nota longa", "conteudo": "Trecho importante no meio da nota",
    })
    nota_id = r.json()["id"]

    r = client.post(f"/api/notas/{nota_id}/extrair", json={"trecho": "Trecho importante"})
    assert r.status_code == 200
    assert r.json()["id"] != nota_id
    assert "Trecho importante" in r.json()["conteudo"]


def test_pastas_com_hierarquia(client):
    r = client.post("/api/notas/pastas", json={"nome": "Pai"})
    pai_id = r.json()["id"]

    r = client.post("/api/notas/pastas", json={"nome": "Filho", "pai_id": pai_id})
    assert r.status_code == 200
    assert r.json()["pai_id"] == pai_id


def test_cria_nota_titulo_vazio_422(client, nota_payload):
    r = client.post("/api/notas", json=nota_payload(titulo=""))
    assert r.status_code == 422


def test_cria_tarefa_titulo_vazio_422(client, tarefa_payload):
    r = client.post("/api/rotina/tarefas", json=tarefa_payload(titulo=""))
    assert r.status_code == 422


def test_cria_habito_sem_nome_422(client, habito_payload):
    r = client.post("/api/habitos", json=habito_payload(nome=""))
    assert r.status_code == 422


def test_cria_habito_tipo_invalido_422(client, habito_payload):
    r = client.post("/api/habitos", json=habito_payload(tipo="invalido"))
    assert r.status_code == 422


def test_consulta_mes_invalido_422(client):
    r = client.post("/api/queries", json={"nome": "Q", "tipo_objeto_id": 999, "visualizacao": "grid"})
    assert r.status_code == 404


def test_batch_edit(client):
    r = client.get("/api/tipos")
    tipos = r.json()
    tarefa_tipo = next(t for t in tipos if t["nome"] == "Tarefa")

    r = client.post("/api/queries", json={
        "nome": "Batch query", "tipo_objeto_id": tarefa_tipo["id"], "visualizacao": "grid",
    })
    query_id = r.json()["id"]

    r = client.post("/api/rotina/tarefas", json={
        "titulo": "Tarefa batch 1", "data": "2026-01-01",
    })
    id1 = r.json()["id"]
    r = client.post("/api/rotina/tarefas", json={
        "titulo": "Tarefa batch 2", "data": "2026-01-01",
    })
    id2 = r.json()["id"]

    r = client.patch(f"/api/queries/{query_id}/batch", json={
        "ids": [id1, id2],
        "alteracoes": {"status": "feito"},
    })
    assert r.status_code == 200
