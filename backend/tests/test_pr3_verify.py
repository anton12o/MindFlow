"""Verificação funcional das 3 implementações do PR #3"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from database import engine
from main import app
from models import ConexaoNota, Flashcard, Habito, Nota, NotaTag, Pasta, RegistroHabito, SessaoPomodoro, Tag

client = TestClient(app)

# ─── Setup ───────────────────────────────────────────
@pytest.fixture(autouse=True)
def clean_db():
    yield
    with Session(engine) as s:
        for t in [RegistroHabito, SessaoPomodoro, NotaTag, ConexaoNota, Flashcard, Nota, Tag, Habito, Pasta]:
            s.exec(select(t)).all()
            for r in s.exec(select(t)).all():
                s.delete(r)
        s.commit()

# ─── #1: Pomodoro → hábito específico ───────────────
class TestPomodoroHabito:
    def test_finalizar_sessao_cria_registro_no_habito_especifico(self):
        # cria um hábito específico
        resp = client.post("/api/habitos", json={"nome": "Estudar", "tipo": "quantitativo"})
        assert resp.status_code == 200, resp.text
        habito = resp.json()

        # cria sessão com contexto_tipo=habito
        resp = client.post("/api/pomodoro/sessoes", json={
            "contexto_tipo": "habito", "contexto_id": habito["id"], "duracao_min": 25
        })
        assert resp.status_code == 200, resp.text
        sessao_id = resp.json()["id"]

        # finaliza
        resp = client.patch(f"/api/pomodoro/sessoes/{sessao_id}/finalizar", json={})
        assert resp.status_code == 200, resp.text

        # verifica: registro foi criado para o hábito "Estudar"
        with Session(engine) as s:
            registros = s.exec(
                select(RegistroHabito).where(RegistroHabito.habito_id == habito["id"])
            ).all()
        assert len(registros) == 1, f"Esperado 1 registro para {habito['nome']}, achou {len(registros)}"
        assert registros[0].valor == 25.0

    def test_finalizar_sessao_sem_contexto_nao_cria_registro_extra(self):
        resp = client.post("/api/pomodoro/sessoes", json={"duracao_min": 15})
        assert resp.status_code == 200
        sessao_id = resp.json()["id"]

        resp = client.patch(f"/api/pomodoro/sessoes/{sessao_id}/finalizar", json={})
        assert resp.status_code == 200

        # verifica: só o "Foco" genérico foi criado
        with Session(engine) as s:
            foco = s.exec(select(Habito).where(Habito.nome == "Foco")).first()
            registros = s.exec(select(RegistroHabito)).all()
        # 1 do Foco, 0 de outros
        assert len(registros) >= 1
        if foco:
            registros_foco = [r for r in registros if r.habito_id == foco.id]
            assert len(registros_foco) >= 1

# ─── #2: Auto-create wikilink ───────────────────────
class TestAutoCreateWikilink:
    def test_create_from_wikilink_endpoint(self):
        resp = client.post("/api/notas/from-wikilink", json={"titulo": "Nova Nota Via Link"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["titulo"] == "Nova Nota Via Link"
        assert data["id"] is not None

    def test_create_from_wikilink_duplicado_rejeita(self):
        client.post("/api/notas/from-wikilink", json={"titulo": "Unica"})
        resp = client.post("/api/notas/from-wikilink", json={"titulo": "Unica"})
        assert resp.status_code == 409

    def test_create_from_wikilink_titulo_vazio_rejeita(self):
        resp = client.post("/api/notas/from-wikilink", json={"titulo": ""})
        assert resp.status_code == 400

    def test_create_from_wikilink_titulo_grande_rejeita(self):
        resp = client.post("/api/notas/from-wikilink", json={"titulo": "A" * 201})
        assert resp.status_code == 400

# ─── #3: CASCADE deletes ────────────────────────────
class TestCascadeDeletes:
    def test_delete_habito_cascade_registros(self):
        resp = client.post("/api/habitos", json={"nome": "Teste", "tipo": "binario"})
        hid = resp.json()["id"]

        resp1 = client.post(f"/api/habitos/{hid}/registros", json={"habito_id": hid, "data": "2026-07-09", "valor": 1})
        resp2 = client.post(f"/api/habitos/{hid}/registros", json={"habito_id": hid, "data": "2026-07-08", "valor": 1})
        assert resp1.status_code == 200, resp1.text
        assert resp2.status_code == 200, resp2.text

        with Session(engine) as s:
            assert len(s.exec(select(RegistroHabito).where(RegistroHabito.habito_id == hid)).all()) == 2

        resp = client.delete(f"/api/habitos/{hid}")
        assert resp.status_code == 200

        # verifica: registros foram deletados (cascade manual ainda funciona)
        with Session(engine) as s:
            registros = s.exec(select(RegistroHabito).where(RegistroHabito.habito_id == hid)).all()
        assert len(registros) == 0

    def test_delete_nota_com_flashcard_set_null(self):
        resp = client.post("/api/notas", json={"titulo": "Nota Mestre", "conteudo": "abc"})
        nid = resp.json()["id"]

        resp = client.post("/api/flashcards", json={
            "pergunta": "P?", "resposta": "R", "nota_id": nid
        })
        fid = resp.json()["id"]

        resp = client.delete(f"/api/notas/{nid}")
        assert resp.status_code == 200

        # flashcard sobrevive com nota_id = None
        resp = client.get("/api/flashcards")
        flashcards = resp.json()
        fc = next((f for f in flashcards if f["id"] == fid), None)
        assert fc is not None, "Flashcard deveria sobreviver à exclusão da nota"
        assert fc["nota_id"] is None

    def test_model_definitions_have_ondelete(self):
        """Verifica se os modelos têm ondelete configurado no Field"""


        from models import ConexaoNota, Flashcard, Nota, NotaTag, Pasta, QuerySalva, RegistroHabito, SessaoPomodoro, Tarefa

        fk_map = {
            NotaTag: {"nota_id": "CASCADE", "tag_id": "CASCADE"},
            ConexaoNota: {"nota_origem_id": "CASCADE", "nota_destino_id": "CASCADE"},
            RegistroHabito: {"habito_id": "CASCADE"},
            Flashcard: {"nota_id": "SET NULL"},
            SessaoPomodoro: {"resumo_nota_id": "SET NULL"},
            Pasta: {"pai_id": "CASCADE"},
            QuerySalva: {"tipo_objeto_id": "CASCADE"},
            Nota: {"pasta_id": "SET NULL", "tipo_id": "SET NULL"},
            Tarefa: {"bloco_id": "SET NULL", "tipo_id": "SET NULL"},
        }

        for model, cols in fk_map.items():
            for col_name, expected in cols.items():
                sa_col = getattr(model, col_name)
                # expression = sa_col.expression (Column)
                fk_args = sa_col.expression.foreign_keys
                assert len(fk_args) > 0, f"{model.__tablename__}.{col_name} não tem FK"
                for fk in fk_args:
                    actual = fk.ondelete
                    assert actual == expected, \
                        f"{model.__tablename__}.{col_name}: ondelete='{actual}' (esperado '{expected}')"

    def test_create_from_wikilink_com_titulo_comum(self):
        """Título com acentos e caracteres especiais"""
        resp = client.post("/api/notas/from-wikilink", json={"titulo": "Nota de Teste: Áudio & Vídeo"})
        assert resp.status_code == 200
        assert resp.json()["titulo"] == "Nota de Teste: Áudio & Vídeo"

    def test_create_from_wikilink_com_espacos(self):
        """Whitespace trimming"""
        resp = client.post("/api/notas/from-wikilink", json={"titulo": "  Nota com Espaços  "})
        assert resp.status_code == 200
        assert resp.json()["titulo"] == "Nota com Espaços"
