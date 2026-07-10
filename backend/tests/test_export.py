def test_export_tarefas_feitas(client):
    resp = client.post("/api/rotina/tarefas", json={"titulo": "Feita", "data": "2026-01-01"})
    assert resp.status_code == 200
    tid = resp.json()["id"]
    client.patch(f"/api/rotina/tarefas/{tid}", json={"status": "feito"})
    r = client.get("/api/export/tarefas-feitas")
    assert r.status_code == 200
    assert str(tid) in r.text


def test_export_tarefas_feitas_filtro(client):
    r = client.get("/api/export/tarefas-feitas")
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
