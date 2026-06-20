

def test_post_log_returns_200(client):
    r = client.post("/api/logs", json={
        "message": "Erro frontend",
        "stack": "Error: algo quebrou",
        "context": "TestComponent",
    })
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_post_log_minimal_payload(client):
    r = client.post("/api/logs", json={"message": "minimo"})
    assert r.status_code == 200


def test_logs_endpoint_list(client):
    r = client.get("/api/logs?n=5")
    assert r.status_code == 200
    data = r.json()
    assert "entries" in data
    assert "total" in data


def test_logs_level_filter(client):
    r = client.get("/api/logs?level=ERROR")
    assert r.status_code == 200
