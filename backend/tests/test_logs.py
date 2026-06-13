from logging_config import LOG_FILE, setup_logging

setup_logging()


def test_get_logs_vazio(client):
    if LOG_FILE.exists():
        LOG_FILE.write_text("", encoding="utf-8")
    r = client.get("/api/logs")
    assert r.status_code == 200
    data = r.json()
    assert data == {"entries": [], "total": 0}


def test_post_log(client):
    r = client.post("/api/logs", json={
        "message": "TypeError: x is undefined",
        "stack": "at Component (file.tsx:10)",
        "context": "Ideias.tsx",
        "url": "http://localhost:8000/ideias",
    })
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_get_logs_com_entrada(client):
    client.post("/api/logs", json={"message": "erro 1", "context": "test"})
    r = client.get("/api/logs?n=10")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert any("erro 1" in e["message"] or "[FRONTEND]" in e["message"] for e in data["entries"])


def test_get_logs_filtro_nivel(client):
    client.post("/api/logs", json={"message": "erro grave", "context": "test"})
    r = client.get("/api/logs?level=ERROR")
    assert r.status_code == 200
    data = r.json()
    for e in data["entries"]:
        assert e["level"] == "ERROR"


def test_logs_endpoint_sempre_ok(client):
    r = client.get("/api/logs")
    assert r.status_code == 200
    assert "entries" in r.json()


def test_delete_logs(client):
    client.post("/api/logs", json={"message": "para limpar", "context": "test"})
    r = client.get("/api/logs")
    assert r.json()["total"] >= 1
    r = client.delete("/api/logs")
    assert r.status_code == 200
    r = client.get("/api/logs")
    assert r.json()["total"] == 0
