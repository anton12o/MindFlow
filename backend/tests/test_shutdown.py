import sqlite3
from pathlib import Path
from unittest.mock import patch

from routers.shutdown import _wal_checkpoint, cold_backup


class TestWalCheckpoint:
    def test_checkpoint_nao_explode(self, client):
        _wal_checkpoint()

    def test_checkpoint_com_erro_nao_explode(self):
        with patch("routers.shutdown.Session") as mock_session:
            mock_session.side_effect = Exception("db fail")
            _wal_checkpoint()


class TestColdBackup:
    def test_cria_arquivo_backup(self, tmp_path):
        db_path = tmp_path / "test.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute("CREATE TABLE t (x)")
        conn.execute("INSERT INTO t VALUES (1)")
        conn.close()

        backup_dir = tmp_path / "backups"
        with patch("routers.shutdown.DB_PATH", db_path), \
             patch("routers.shutdown.BACKUP_DIR", backup_dir):
            cold_backup()

        backups = list(backup_dir.glob("mindflow-*.db"))
        assert len(backups) == 1

    def test_db_inexistente_retorna_silenciosamente(self, tmp_path):
        inexistente = tmp_path / "nao-existe.db"
        backup_dir = tmp_path / "backups"
        with patch("routers.shutdown.DB_PATH", inexistente), \
             patch("routers.shutdown.BACKUP_DIR", backup_dir):
            cold_backup()

        assert not backup_dir.exists()

    def test_limite_maximo_6_backups(self, tmp_path):
        db_path = tmp_path / "test.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute("CREATE TABLE t (x)")
        conn.execute("INSERT INTO t VALUES (1)")
        conn.close()

        backup_dir = tmp_path / "backups"
        backup_dir.mkdir()
        for i in range(1, 9):
            (backup_dir / f"mindflow-2026-01-0{i}_00-00-00.db").write_text("")

        with patch("routers.shutdown.DB_PATH", db_path), \
             patch("routers.shutdown.BACKUP_DIR", backup_dir):
            cold_backup()

        backups = sorted(backup_dir.glob("mindflow-*.db"))
        assert len(backups) == 6


class TestShutdownEndpoint:
    def test_chama_checkpoint_e_backup(self, client):
        with patch("routers.shutdown._wal_checkpoint") as mock_wal, \
             patch("routers.shutdown.cold_backup") as mock_backup:
            r = client.post("/api/shutdown")
            assert r.status_code == 200
            assert r.json() == {"ok": True}
            mock_wal.assert_called_once()
            mock_backup.assert_called_once()

    def test_nao_explode_com_funcoes_reais(self, client):
        with patch("routers.shutdown.os._exit"):
            r = client.post("/api/shutdown")
            assert r.status_code == 200


class TestDbBackup:
    def test_backup_inicia_e_retorna_ok(self, client):
        r = client.post("/api/db/backup")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_backup_cria_arquivo(self, tmp_path, client):
        with patch("routers.shutdown.BACKUP_DIR", tmp_path / "backups"), \
             patch("routers.shutdown.DB_PATH", tmp_path / "mindflow.db"):
            import sqlite3
            conn = sqlite3.connect(str(tmp_path / "mindflow.db"))
            conn.execute("CREATE TABLE t (x)")
            conn.execute("INSERT INTO t VALUES (1)")
            conn.close()
            from routers.shutdown import cold_backup
            cold_backup()
            assert len(list((tmp_path / "backups").glob("mindflow-*.db"))) >= 1


class TestListBackups:
    def test_lista_vazia_quando_dir_nao_existe(self, client):
        with patch("routers.shutdown.BACKUP_DIR", Path("/nao/existe")):
            r = client.get("/api/db/backups")
            assert r.status_code == 200
            assert r.json() == []

    def test_lista_backups_existentes(self, tmp_path, client):
        backup_dir = tmp_path / "backups"
        backup_dir.mkdir()
        (backup_dir / "mindflow-2026-01-01_00-00-00.db").write_text("a")
        (backup_dir / "mindflow-2026-01-02_00-00-00.db").write_text("b")
        with patch("routers.shutdown.BACKUP_DIR", backup_dir):
            r = client.get("/api/db/backups")
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 2
            assert data[0]["nome"].startswith("mindflow-")


class TestDownloadBackup:
    def test_download_arquivo_existente(self, tmp_path, client):
        backup_dir = tmp_path / "backups"
        backup_dir.mkdir()
        f_path = backup_dir / "mindflow-2026-01-01_00-00-00.db"
        f_path.write_text("conteudo do backup")
        with patch("routers.shutdown.BACKUP_DIR", backup_dir):
            r = client.get("/api/db/backups/mindflow-2026-01-01_00-00-00.db")
            assert r.status_code == 200
            assert r.headers["content-type"] == "application/octet-stream"

    def test_download_arquivo_inexistente_404(self, client):
        with patch("routers.shutdown.BACKUP_DIR", Path("/nao/existe")):
            r = client.get("/api/db/backups/inexistente.db")
            assert r.status_code == 404


class TestDbVacuum:
    def test_vacuum_retorna_ok(self, client):
        r = client.post("/api/db/vacuum")
        assert r.status_code == 200
        assert r.json()["ok"] is True
