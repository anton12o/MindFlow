def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_security_headers(client):
    r = client.get("/api/health")
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"
    csp = r.headers.get("content-security-policy", "")
    assert "img-src 'self' data: https:" in csp


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


def test_get_tipo(client):
    r = client.post("/api/tipos", json={"nome": "TipoTeste", "icone": "📄"})
    tipo_id = r.json()["id"]

    r = client.get(f"/api/tipos/{tipo_id}")
    assert r.status_code == 200
    assert r.json()["nome"] == "TipoTeste"

    r = client.get("/api/tipos/99999")
    assert r.status_code == 404


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


def test_reorder_tarefas(client):
    r = client.post("/api/rotina/tarefas", json={"titulo": "T1", "data": "2026-01-01"})
    id1 = r.json()["id"]
    r = client.post("/api/rotina/tarefas", json={"titulo": "T2", "data": "2026-01-01"})
    id2 = r.json()["id"]

    r = client.patch("/api/rotina/tarefas/reorder", json=[{"id": id1, "ordem": 2}, {"id": id2, "ordem": 1}])
    assert r.status_code == 200

    r = client.get("/api/rotina/tarefas", params={"data": "2026-01-01"})
    tarefas = r.json()
    t1 = next(t for t in tarefas if t["id"] == id1)
    t2 = next(t for t in tarefas if t["id"] == id2)
    assert t1["ordem"] == 2
    assert t2["ordem"] == 1


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


def test_delete_sessoes(client):
    r = client.post("/api/pomodoro/sessoes", json={"duracao_min": 25})
    r = client.post("/api/pomodoro/sessoes", json={"duracao_min": 5})
    r = client.delete("/api/pomodoro/sessoes", params={"antes_de": "2099-12-31"})
    assert r.status_code == 200
    assert r.json()["deletadas"] == 2


def test_delete_sessoes_com_data(client):
    r = client.post("/api/pomodoro/sessoes", json={"duracao_min": 10})
    r = client.post("/api/pomodoro/sessoes", json={"duracao_min": 10})
    r = client.delete("/api/pomodoro/sessoes", params={"antes_de": "2020-01-01"})
    assert r.status_code == 200
    assert r.json()["deletadas"] == 0


def test_delete_sessoes_data_invalida_422(client):
    r = client.delete("/api/pomodoro/sessoes", params={"antes_de": "invalida"})
    assert r.status_code == 422


def test_notas_crud(client):
    r = client.post("/api/notas", json={"titulo": "Nota teste", "conteudo": "Conteúdo da nota"})
    assert r.status_code == 200
    nota_id = r.json()["id"]

    r = client.get(f"/api/notas/{nota_id}")
    assert r.json()["titulo"] == "Nota teste"

    r = client.patch(f"/api/notas/{nota_id}", json={"conteudo": "Atualizado"})
    assert r.json()["conteudo"] == "Atualizado"

    r = client.get("/api/notas")
    assert r.status_code == 200
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


def test_flashcards_update_delete(client):
    r = client.post("/api/flashcards", json={"pergunta": "Original?", "resposta": "Original"})
    assert r.status_code == 200
    card_id = r.json()["id"]

    r = client.patch(f"/api/flashcards/{card_id}", json={"pergunta": "Atualizada?", "resposta": "Atualizada"})
    assert r.status_code == 200
    assert r.json()["pergunta"] == "Atualizada?"

    r = client.delete(f"/api/flashcards/{card_id}")
    assert r.status_code == 200

    r = client.get("/api/flashcards")
    assert all(c["id"] != card_id for c in r.json())


def test_flashcards_update_404(client):
    r = client.patch("/api/flashcards/99999", json={"pergunta": "?"})
    assert r.status_code == 404


def test_flashcards_delete_404(client):
    r = client.delete("/api/flashcards/99999")
    assert r.status_code == 404


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


def test_create_template(client):
    r = client.post("/api/notas/templates", json={
        "nome": "Template teste", "conteudo": "Conteudo do template",
    })
    assert r.status_code == 200
    tid = r.json()["id"]

    r = client.get("/api/notas/templates")
    assert any(t["id"] == tid for t in r.json())


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

    r = client.get(f"/api/queries/{query_id}")
    assert r.status_code == 200
    assert r.json()["id"] == query_id

    r = client.get("/api/queries/99999")
    assert r.status_code == 404

    r = client.delete(f"/api/queries/{query_id}")
    assert r.status_code == 200

    r = client.delete("/api/queries/99999")
    assert r.status_code == 404


def test_executar_query_com_mes_gantt(client):
    r = client.get("/api/tipos")
    tipos = r.json()
    nota_tipo = next(t for t in tipos if t["nome"] == "Nota")
    r = client.post("/api/queries", json={
        "nome": "Query mes", "tipo_objeto_id": nota_tipo["id"],
        "visualizacao": "calendario", "campo_agrupamento": "criado_em",
    })
    qid = r.json()["id"]
    r = client.post(f"/api/queries/{qid}/executar", params={"mes": "2026-06"})
    assert r.status_code == 200

    r = client.post(f"/api/queries/{qid}/executar", params={"mes": "invalido"})
    assert r.status_code == 422

    r = client.post(f"/api/queries/{qid}/executar", params={"gantt": "true"})
    assert r.status_code == 200


def test_executar_query_tipo_inexistente(client):
    r = client.post("/api/queries/99999/executar")
    assert r.status_code == 404


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


def test_integrity_unique_409():
    import asyncio
    import sqlite3

    from fastapi import Request
    from sqlalchemy.exc import IntegrityError

    from main import app
    handler = app.exception_handlers[IntegrityError]
    request = Request(scope={"type": "http", "method": "POST", "path": "/api/test", "headers": [], "query_string": b""})
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE t (x TEXT UNIQUE)")
    conn.execute("INSERT INTO t VALUES ('a')")
    try:
        conn.execute("INSERT INTO t VALUES ('a')")
    except sqlite3.IntegrityError as orig:
        exc = IntegrityError("INSERT", {}, orig)
    conn.close()
    import json
    resp = asyncio.run(handler(request, exc))
    assert resp.status_code == 409
    assert json.loads(resp.body)["detail"] == "Já existe um item com este nome."


def test_integrity_outro_500():
    import asyncio
    import sqlite3

    from fastapi import Request
    from sqlalchemy.exc import IntegrityError

    from main import app
    handler = app.exception_handlers[IntegrityError]
    request = Request(scope={"type": "http", "method": "POST", "path": "/api/test", "headers": [], "query_string": b""})
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE t (x TEXT NOT NULL)")
    try:
        conn.execute("INSERT INTO t (x) VALUES (NULL)")
    except sqlite3.IntegrityError as orig:
        exc = IntegrityError("INSERT", {}, orig)
    conn.close()
    import json
    resp = asyncio.run(handler(request, exc))
    assert resp.status_code == 500
    assert "Erro interno" in json.loads(resp.body)["detail"]


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


def test_tags_crud_completos(client):
    r = client.post("/api/notas/tags", json={"nome": "urgente", "cor": "#ff0000"})
    assert r.status_code == 200
    tag_id = r.json()["id"]

    r = client.get("/api/notas/tags")
    assert any(t["nome"] == "urgente" and t["contagem"] == 0 for t in r.json())

    r = client.patch(f"/api/notas/tags/{tag_id}", json={"nome": "prioritario"})
    assert r.json()["nome"] == "prioritario"

    r = client.delete(f"/api/notas/tags/{tag_id}")
    assert r.status_code == 200


def test_add_remove_tag_nota(client):
    r = client.post("/api/notas/tags", json={"nome": "tag-a", "cor": "#00ff00"})
    tag_id = r.json()["id"]
    r = client.post("/api/notas", json={"titulo": "Nota com tag"})
    nota_id = r.json()["id"]

    r = client.post(f"/api/notas/{nota_id}/tags/{tag_id}")
    assert r.status_code == 200

    r = client.get(f"/api/notas/{nota_id}/tags")
    assert any(t["id"] == tag_id for t in r.json())

    r = client.delete(f"/api/notas/{nota_id}/tags/{tag_id}")
    assert r.status_code == 200

    r = client.get(f"/api/notas/{nota_id}/tags")
    assert r.json() == []


def test_tags_by_ids(client):
    r = client.post("/api/notas/tags", json={"nome": "tag1"})
    tag1_id = r.json()["id"]
    r = client.post("/api/notas/tags", json={"nome": "tag2"})
    tag2_id = r.json()["id"]

    r = client.post("/api/notas", json={"titulo": "Nota A"})
    nota_a = r.json()["id"]
    r = client.post("/api/notas", json={"titulo": "Nota B"})
    nota_b = r.json()["id"]

    client.post(f"/api/notas/{nota_a}/tags/{tag1_id}")
    client.post(f"/api/notas/{nota_a}/tags/{tag2_id}")
    client.post(f"/api/notas/{nota_b}/tags/{tag1_id}")

    r = client.post("/api/notas/tags-by-ids", json=[nota_a, nota_b])
    assert r.status_code == 200
    data = r.json()
    assert str(nota_a) in data
    assert str(nota_b) in data
    assert len(data[str(nota_a)]) == 2
    assert len(data[str(nota_b)]) == 1


def test_merge_tags(client):
    r = client.post("/api/notas/tags", json={"nome": "src"})
    src_id = r.json()["id"]
    r = client.post("/api/notas/tags", json={"nome": "dst"})
    dst_id = r.json()["id"]

    r = client.post("/api/notas", json={"titulo": "Merge target"})
    nota_id = r.json()["id"]
    client.post(f"/api/notas/{nota_id}/tags/{src_id}")

    r = client.post("/api/notas/tags/merge", json={"origem_id": src_id, "destino_id": dst_id})
    assert r.status_code == 200

    r = client.get(f"/api/notas/{nota_id}/tags")
    assert any(t["id"] == dst_id for t in r.json())
    assert not any(t["id"] == src_id for t in r.json())


def test_merge_tags_mesmo_id_400(client):
    r = client.post("/api/notas/tags", json={"nome": "m"})
    tid = r.json()["id"]
    r = client.post("/api/notas/tags/merge", json={"origem_id": tid, "destino_id": tid})
    assert r.status_code == 400


def test_batch_delete_notas(client):
    r = client.post("/api/notas", json={"titulo": "N1"})
    id1 = r.json()["id"]
    r = client.post("/api/notas", json={"titulo": "N2"})
    id2 = r.json()["id"]

    r = client.post("/api/notas/batch/delete", json={"ids": [id1, id2]})
    assert r.status_code == 200
    assert r.json()["deleted"] == 2

    r = client.get("/api/notas")
    notas = r.json()
    assert isinstance(notas, list)
    ids = {n["id"] for n in notas}
    assert id1 not in ids
    assert id2 not in ids


def test_favoritar_nota(client):
    r = client.post("/api/notas", json={"titulo": "Favoritável"})
    nota_id = r.json()["id"]

    r = client.patch(f"/api/notas/{nota_id}/favoritar")
    assert r.status_code == 200
    assert r.json()["favoritado"] is True

    r = client.patch(f"/api/notas/{nota_id}/favoritar")
    assert r.json()["favoritado"] is False


def test_sugerir_tags_tfidf(client):
    r = client.post("/api/notas/tags", json={"nome": "dev"})
    tag_id = r.json()["id"]

    r = client.post("/api/notas", json={"titulo": "Dev note", "conteudo": "codigo python django flask"})
    nota1 = r.json()["id"]
    client.post(f"/api/notas/{nota1}/tags/{tag_id}")

    r = client.post("/api/notas", json={"titulo": "Alvo", "conteudo": "codigo python django"})
    nota2 = r.json()["id"]

    r = client.post(f"/api/notas/{nota2}/sugerir-tags")
    assert r.status_code == 200
    sug = r.json()
    assert any(s["tag_id"] == tag_id for s in sug)


def test_sugerir_tags_nota_404(client):
    r = client.post("/api/notas/99999/sugerir-tags")
    assert r.status_code == 404


def test_nao_acessadas(client):
    r = client.post("/api/notas", json={"titulo": "Nunca acessada"})
    assert r.status_code == 200

    r = client.get("/api/notas/nao-acessadas", params={"dias": 365})
    assert r.status_code == 200
    assert any(n["titulo"] == "Nunca acessada" for n in r.json())


def test_notas_recentes(client):
    r = client.post("/api/notas", json={"titulo": "Acessada"})
    nota_id = r.json()["id"]
    client.get(f"/api/notas/{nota_id}")

    r = client.get("/api/notas/recentes")
    assert any(n["id"] == nota_id for n in r.json())


def test_random_nota(client):
    r = client.post("/api/notas", json={"titulo": "Sorteável"})
    r = client.get("/api/notas/random")
    assert r.status_code == 200
    assert r.json() is not None


def test_random_nota_vazio(client):
    r = client.get("/api/notas/random")
    assert r.json() is None


def test_export_nota_md(client):
    r = client.post("/api/notas", json={"titulo": "Export MD", "conteudo": "# Olá"})
    nota_id = r.json()["id"]

    r = client.get(f"/api/notas/{nota_id}/export/md")
    assert r.status_code == 200
    assert "text/markdown" in r.headers["content-type"]
    assert "# Olá" in r.text
    assert "Export MD" in r.text


def test_export_nota_json(client):
    r = client.post("/api/notas", json={"titulo": "Export JSON", "conteudo": "dados"})
    nota_id = r.json()["id"]

    r = client.get(f"/api/notas/{nota_id}/export/json")
    assert r.status_code == 200
    data = r.json()
    assert data["nota"]["titulo"] == "Export JSON"
    assert "tags" in data
    assert "conexoes" in data


def test_delete_pasta_nullifica_notas(client):
    r = client.post("/api/notas/pastas", json={"nome": "Pasta removível"})
    pasta_id = r.json()["id"]

    r = client.post("/api/notas", json={"titulo": "Nota na pasta", "pasta_id": pasta_id})
    nota_id = r.json()["id"]

    r = client.delete(f"/api/notas/pastas/{pasta_id}")
    assert r.status_code == 200

    r = client.get(f"/api/notas/{nota_id}")
    assert r.json()["pasta_id"] is None


def test_delete_tag_404(client):
    r = client.delete("/api/notas/tags/99999")
    assert r.status_code == 404


def test_add_tag_nota_404(client):
    r = client.post("/api/notas/99999/tags/99999")
    assert r.status_code == 404
