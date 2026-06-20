from services.notes import extrair_wikilinks


def test_extrair_wikilinks_simples():
    result = extrair_wikilinks("Veja [[nota 1]] e [[nota 2]]")
    assert result == ["nota 1", "nota 2"]


def test_extrair_wikilinks_com_alias():
    result = extrair_wikilinks("[[nota|alias]]")
    assert result == ["nota"]


def test_extrair_wikilinks_sem_repeticao():
    result = extrair_wikilinks("[[nota]] e [[nota]]")
    assert result == ["nota"]


def test_extrair_wikilinks_vazio():
    assert extrair_wikilinks("") == []
    assert extrair_wikilinks("texto sem links") == []


def test_extrair_wikilinks_sem_colchetes():
    result = extrair_wikilinks("apenas [[um]] link")
    assert result == ["um"]
