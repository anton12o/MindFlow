from datetime import date, datetime

from routers.import_data import _convert_datetimes, _topological_sort_pastas


class TestConvertDatetimes:
    def test_converte_string_iso_com_t(self):
        r = _convert_datetimes({"data": "2026-06-30T10:30:00"})
        assert r["data"] == datetime(2026, 6, 30, 10, 30, 0)

    def test_converte_string_iso_sem_t(self):
        r = _convert_datetimes({"data": "2026-06-30"})
        assert r["data"] == date(2026, 6, 30)

    def test_converte_varios_campos(self):
        r = _convert_datetimes({"inicio": "2026-01-01", "fim": "2026-12-31T23:59:59"})
        assert isinstance(r["inicio"], date)
        assert isinstance(r["fim"], datetime)

    def test_ignora_string_nao_iso(self):
        r = _convert_datetimes({"nome": "foo", "valor": "123"})
        assert r["nome"] == "foo"
        assert r["valor"] == "123"

    def test_ignora_none(self):
        r = _convert_datetimes({"data": None})
        assert r["data"] is None

    def test_converte_com_espaco_em_vez_de_t(self):
        r = _convert_datetimes({"data": "2026-06-30 10:30:00"})
        assert r["data"] == datetime(2026, 6, 30, 10, 30, 0)


class TestTopologicalSortPastas:
    def test_pastas_sem_pai_mantem_ordem(self):
        pastas = [{"id": 1, "nome": "A"}, {"id": 2, "nome": "B"}]
        result = _topological_sort_pastas(pastas)
        assert [p["id"] for p in result] == [1, 2]

    def test_pai_antes_do_filho(self):
        pastas = [
            {"id": 2, "nome": "Filho", "pai_id": 1},
            {"id": 1, "nome": "Pai"},
        ]
        result = _topological_sort_pastas(pastas)
        ids = [p["id"] for p in result]
        assert ids.index(1) < ids.index(2)

    def test_cadeia_de_tres_niveis(self):
        pastas = [
            {"id": 3, "nome": "Neto", "pai_id": 2},
            {"id": 2, "nome": "Filho", "pai_id": 1},
            {"id": 1, "nome": "Avô"},
        ]
        result = _topological_sort_pastas(pastas)
        ids = [p["id"] for p in result]
        assert ids.index(1) < ids.index(2) < ids.index(3)

    def test_pai_faltando_adiciona_mesmo_assim(self):
        pastas = [{"id": 1, "nome": "Orfão", "pai_id": 999}]
        result = _topological_sort_pastas(pastas)
        assert len(result) == 1

    def test_pastas_sem_id_preservadas(self):
        pastas = [{"nome": "Sem ID"}]
        result = _topological_sort_pastas(pastas)
        assert result == pastas

    def test_lista_vazia_retorna_vazia(self):
        assert _topological_sort_pastas([]) == []
