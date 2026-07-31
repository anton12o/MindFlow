def test_search_por_titulo_nota(client):
    client.post("/api/notas", json={"titulo": "Projeto Alpha", "conteudo": "Detalhes do projeto"})
    r = client.get("/api/search", params={"q": "Alpha"})
    assert r.status_code == 200
    data = r.json()
    assert len(data["notas"]) == 1
    assert data["notas"][0]["titulo"] == "Projeto Alpha"

def test_search_sem_resultados(client):
    r = client.get("/api/search", params={"q": "naoexiste"})
    assert r.status_code == 200
    data = r.json()
    assert data["notas"] == []
    assert data["tarefas"] == []
    assert data["flashcards"] == []
    assert data["habitos"] == []

def test_search_query_vazia_422(client):
    r = client.get("/api/search", params={"q": ""})
    assert r.status_code == 422

def test_search_todas_categorias(client):
    client.post("/api/notas", json={"titulo": "Nota comum", "conteudo": "conteudo"})
    client.post("/api/rotina/tarefas", json={"titulo": "Tarefa comum", "data": "2026-06-01"})
    client.post("/api/habitos", json={"nome": "Habito comum", "tipo": "binario"})
    client.post("/api/flashcards", json={"pergunta": "Pergunta comum?", "resposta": "Resposta comum"})
    r = client.get("/api/search", params={"q": "comum"})
    assert r.status_code == 200
    data = r.json()
    assert len(data["notas"]) == 1
    assert len(data["tarefas"]) == 1
    assert len(data["flashcards"]) == 1
    assert len(data["habitos"]) == 1

def test_search_limit(client):
    for i in range(5):
        client.post("/api/notas", json={"titulo": f"Nota {i}", "conteudo": "teste"})
    r = client.get("/api/search", params={"q": "Nota", "limit": 2})
    assert len(r.json()["notas"]) == 2

def test_search_fts_caracteres_especiais(client):
    client.post("/api/notas", json={"titulo": "C* (teste)", "conteudo": "conteudo com *"})
    r = client.get("/api/search", params={"q": "teste"})
    assert r.status_code == 200
    assert len(r.json()["notas"]) >= 1

def test_search_por_conteudo_nota(client):
    client.post("/api/notas", json={"titulo": "Qualquer", "conteudo": "palavra secreta no texto"})
    r = client.get("/api/search", params={"q": "secreta"})
    assert r.status_code == 200
    assert len(r.json()["notas"]) == 1


def test_search_fts_syntax_erro_fallback_like(client):
    client.post("/api/notas", json={"titulo": "Nota com asterisco", "conteudo": "conteudo especial"})
    r = client.get("/api/search", params={"q": "invalido*"})
    assert r.status_code == 200


def test_search_fts_unclosed_quotes(client):
    client.post("/api/notas", json={"titulo": "Nota entre aspas", "conteudo": "conteudo"})
    r = client.get("/api/search", params={"q": '"teste'})
    assert r.status_code == 200


def test_search_fts_long_query(client):
    client.post("/api/notas", json={"titulo": "Nota longa", "conteudo": "busca com query muito extensa"})
    q = "a " * 500
    r = client.get("/api/search", params={"q": q.strip()})
    assert r.status_code == 200


def test_search_fts_emoji(client):
    client.post("/api/notas", json={"titulo": "Nota 🧠", "conteudo": "emoji no conteudo 🔥"})
    r = client.get("/api/search", params={"q": "🧠"})
    assert r.status_code == 200


def test_search_fts_strip_special_chars(client):
    client.post("/api/notas", json={"titulo": "Nota segura", "conteudo": "teste"})
    r = client.get("/api/search", params={"q": "~^teste\"()*+-"})
    assert r.status_code == 200
    assert len(r.json()["notas"]) == 1


def test_search_fts_termo_unico_apos_sanitize(client):
    client.post("/api/notas", json={"titulo": "Unico termo", "conteudo": "so uma palavra"})
    r = client.get("/api/search", params={"q": "*"})
    assert r.status_code == 200
