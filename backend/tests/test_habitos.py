def test_list_habitos_vazio(client):
    r = client.get("/api/habitos")
    assert r.status_code == 200
    assert r.json() == []

def test_create_habito(client):
    r = client.post("/api/habitos", json={"nome": "Beber agua", "tipo": "binario"})
    assert r.status_code == 200
    data = r.json()
    assert data["nome"] == "Beber agua"
    assert data["tipo"] == "binario"
    assert data["ativo"] is True
    assert data["id"] > 0

def test_list_habitos_com_item(client):
    client.post("/api/habitos", json={"nome": "Correr", "tipo": "binario"})
    r = client.get("/api/habitos")
    assert r.status_code == 200
    assert len(r.json()) == 1

def test_get_habito(client):
    r = client.post("/api/habitos", json={"nome": "Ler", "tipo": "binario"})
    habito_id = r.json()["id"]
    r = client.get(f"/api/habitos/{habito_id}")
    assert r.status_code == 200
    assert r.json()["nome"] == "Ler"

def test_get_habito_404(client):
    r = client.get("/api/habitos/99999")
    assert r.status_code == 404
    assert r.json()["detail"] == "Hábito não encontrado"

def test_update_habito(client):
    r = client.post("/api/habitos", json={"nome": "Meditar", "tipo": "binario"})
    habito_id = r.json()["id"]
    r = client.patch(f"/api/habitos/{habito_id}", json={"nome": "Meditar 10min"})
    assert r.status_code == 200
    assert r.json()["nome"] == "Meditar 10min"

def test_update_habito_404(client):
    r = client.patch("/api/habitos/99999", json={"nome": "Nope"})
    assert r.status_code == 404

def test_delete_habito(client):
    r = client.post("/api/habitos", json={"nome": "Deletavel", "tipo": "binario"})
    habito_id = r.json()["id"]
    r = client.delete(f"/api/habitos/{habito_id}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    r = client.get("/api/habitos")
    assert r.json() == []

def test_delete_habito_404(client):
    r = client.delete("/api/habitos/99999")
    assert r.status_code == 404

def test_delete_habito_cascade_registros(client):
    r = client.post("/api/habitos", json={"nome": "Com registros", "tipo": "binario"})
    habito_id = r.json()["id"]
    client.post(f"/api/habitos/{habito_id}/registros", json={"habito_id": habito_id, "data": "2026-06-01"})
    client.post(f"/api/habitos/{habito_id}/registros", json={"habito_id": habito_id, "data": "2026-06-02"})
    r = client.get(f"/api/habitos/{habito_id}/registros")
    assert len(r.json()) == 2
    r = client.delete(f"/api/habitos/{habito_id}")
    assert r.status_code == 200
    r = client.get(f"/api/habitos/{habito_id}/registros")
    assert r.status_code == 404

def test_list_registros(client):
    r = client.post("/api/habitos", json={"nome": "Registravel", "tipo": "binario"})
    habito_id = r.json()["id"]
    r = client.get(f"/api/habitos/{habito_id}/registros")
    assert r.status_code == 200
    assert r.json() == []

def test_list_registros_404(client):
    r = client.get("/api/habitos/99999/registros")
    assert r.status_code == 404

def test_create_registro(client):
    r = client.post("/api/habitos", json={"nome": "Com registro", "tipo": "binario"})
    habito_id = r.json()["id"]
    r = client.post(f"/api/habitos/{habito_id}/registros", json={"habito_id": habito_id, "data": "2026-06-15"})
    assert r.status_code == 200
    data = r.json()
    assert data["data"] == "2026-06-15"
    assert data["habito_id"] == habito_id
    assert data["excecao_justificada"] is False

def test_create_registro_com_valor(client):
    r = client.post("/api/habitos", json={"nome": "Medido", "tipo": "quantitativo"})
    habito_id = r.json()["id"]
    r = client.post(f"/api/habitos/{habito_id}/registros", json={
        "habito_id": habito_id, "data": "2026-06-15", "valor": 7.5,
    })
    assert r.status_code == 200
    assert r.json()["valor"] == 7.5

def test_create_registro_404(client):
    r = client.post("/api/habitos/99999/registros", json={"habito_id": 99999, "data": "2026-06-15"})
    assert r.status_code == 404

def test_delete_registro_por_data(client):
    r = client.post("/api/habitos", json={"nome": "Deleta registro", "tipo": "binario"})
    habito_id = r.json()["id"]
    client.post(f"/api/habitos/{habito_id}/registros", json={"habito_id": habito_id, "data": "2026-06-10"})
    r = client.delete(f"/api/habitos/{habito_id}/registros/2026-06-10")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    r = client.get(f"/api/habitos/{habito_id}/registros")
    assert r.json() == []

def test_delete_registro_por_data_404_habito(client):
    r = client.delete("/api/habitos/99999/registros/2026-06-10")
    assert r.status_code == 404

def test_delete_registro_por_data_404_registro(client):
    r = client.post("/api/habitos", json={"nome": "Sem registro", "tipo": "binario"})
    habito_id = r.json()["id"]
    r = client.delete(f"/api/habitos/{habito_id}/registros/2026-06-10")
    assert r.status_code == 404
    assert r.json()["detail"] == "Registro não encontrado"

def test_list_habitos_filtro_inativos(client):
    r = client.post("/api/habitos", json={"nome": "Ativo", "tipo": "binario"})
    ativo_id = r.json()["id"]
    r = client.post("/api/habitos", json={"nome": "Inativo", "tipo": "binario", "ativo": False})
    inativo_id = r.json()["id"]
    r = client.get("/api/habitos", params={"ativos": "true"})
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == ativo_id
    r = client.get("/api/habitos", params={"ativos": "false"})
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == inativo_id

def test_list_habitos_paginacao(client):
    for i in range(5):
        client.post("/api/habitos", json={"nome": f"Habito {i}", "tipo": "binario"})
    r = client.get("/api/habitos", params={"limit": 2, "offset": 0})
    assert len(r.json()) == 2
    r = client.get("/api/habitos", params={"limit": 2, "offset": 2})
    assert len(r.json()) == 2
    r = client.get("/api/habitos", params={"limit": 2, "offset": 4})
    assert len(r.json()) == 1
