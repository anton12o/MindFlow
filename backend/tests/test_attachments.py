
import pytest
from fastapi.testclient import TestClient

import main as main_module


@pytest.fixture
def tmp_attachments(tmp_path, monkeypatch):
    att_dir = tmp_path / "attachments"
    att_dir.mkdir()
    monkeypatch.setattr(main_module, "ATTACHMENTS_DIR", att_dir)
    monkeypatch.setattr(main_module, "MAX_ATTACHMENT_SIZE", 2 * 1024 * 1024)
    return att_dir


@pytest.fixture
def client(tmp_attachments):
    from sqlmodel import Session

    import database as db_module
    import routers.import_data as import_data_module
    from database import engine as db_engine
    from main import app

    test_engine = db_engine
    import_data_module.engine = test_engine

    def override_get_session():
        with Session(test_engine) as s:
            yield s

    app.dependency_overrides[db_module.get_session] = override_get_session
    from fastapi.staticfiles import StaticFiles
    from starlette.routing import Mount
    app.routes[:] = [r for r in app.routes if not (isinstance(r, Mount) and isinstance(r.app, StaticFiles))]

    c = TestClient(app)
    yield c
    app.dependency_overrides.pop(db_module.get_session, None)


def test_upload_png(client, tmp_attachments):
    content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    r = client.post("/api/attachments/upload", files={"file": ("test.png", content, "image/png")})
    assert r.status_code == 200
    data = r.json()
    assert data["url"].startswith("/api/attachments/")
    assert data["nome_original"] == "test.png"
    assert data["tamanho"] == len(content)
    files = list(tmp_attachments.iterdir())
    assert len(files) == 1


def test_upload_extensao_invalida(client):
    r = client.post("/api/attachments/upload", files={"file": ("test.exe", b"fake", "application/octet-stream")})
    assert r.status_code == 400
    assert "não permitido" in r.json()["detail"]


def test_upload_tamanho_excedido(client, monkeypatch):
    monkeypatch.setattr(main_module, "MAX_ATTACHMENT_SIZE", 10)
    r = client.post("/api/attachments/upload", files={"file": ("test.png", b"x" * 20, "image/png")})
    assert r.status_code == 400
    assert "excede limite" in r.json()["detail"]


def test_upload_sem_extensao(client):
    r = client.post("/api/attachments/upload", files={"file": ("test", b"data", "application/octet-stream")})
    assert r.status_code == 400
    assert "não permitido" in r.json()["detail"]


def test_get_attachment_ok(client, tmp_attachments):
    content = b"file content"
    (tmp_attachments / "abc123.txt").write_bytes(content)
    r = client.get("/api/attachments/abc123.txt")
    assert r.status_code == 200
    assert r.content == content


def test_get_attachment_404(client):
    r = client.get("/api/attachments/inexistente.png")
    assert r.status_code == 404


def test_get_attachment_path_traversal(client):
    r = client.get("/api/attachments/../etc/passwd")
    assert r.status_code in (400, 404)


def test_delete_attachment_ok(client, tmp_attachments):
    (tmp_attachments / "remover.txt").write_bytes(b"data")
    r = client.delete("/api/attachments/remover.txt")
    assert r.status_code == 200
    assert not (tmp_attachments / "remover.txt").exists()


def test_delete_attachment_404(client):
    r = client.delete("/api/attachments/inexistente.png")
    assert r.status_code == 404


def test_delete_attachment_path_traversal(client):
    r = client.delete("/api/attachments/../secret.db")
    assert r.status_code in (400, 404)
