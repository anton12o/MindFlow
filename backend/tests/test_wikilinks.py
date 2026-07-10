from sqlmodel import select

from models import ConexaoNota, Nota
from services.notes import extrair_wikilinks, processar_wikilinks


def test_extrair_wikilinks_simples():
    result = extrair_wikilinks("[[Nota]]")
    assert result == ["Nota"]


def test_extrair_wikilinks_com_alias():
    result = extrair_wikilinks("[[Destino|Ver Destino]]")
    assert result == ["Destino"]


def test_extrair_wikilinks_multiplos():
    result = extrair_wikilinks("[[A]] e [[B]] e [[C]]")
    assert result == ["A", "B", "C"]


def test_extrair_wikilinks_duplicatas():
    result = extrair_wikilinks("[[A]] e [[A]]")
    assert result == ["A"]


def test_extrair_wikilinks_vazio():
    result = extrair_wikilinks("texto sem links")
    assert result == []


def test_extrair_wikilinks_string_vazia():
    result = extrair_wikilinks("")
    assert result == []


def test_extrair_wikilinks_titulo_com_espacos():
    result = extrair_wikilinks("[[  Nota Com Espacos  ]]")
    assert result == ["Nota Com Espacos"]


def test_processar_wikilinks_cria_conexao(session):
    origem = Nota(titulo="Origem", conteudo="[[Destino]]")
    destino = Nota(titulo="Destino", conteudo="")
    session.add(origem)
    session.add(destino)
    session.flush()

    processar_wikilinks(origem.id, "[[Destino]]", session)
    session.flush()

    conns = session.exec(
        select(ConexaoNota).where(ConexaoNota.nota_origem_id == origem.id)
    ).all()
    assert len(conns) == 1
    assert conns[0].nota_destino_id == destino.id
    assert conns[0].tipo == "wikilink"


def test_processar_wikilinks_ignora_auto_referencia(session):
    nota = Nota(titulo="Unica", conteudo="[[Unica]]")
    session.add(nota)
    session.flush()

    processar_wikilinks(nota.id, "[[Unica]]", session)
    session.flush()

    conns = session.exec(
        select(ConexaoNota).where(ConexaoNota.nota_origem_id == nota.id)
    ).all()
    assert len(conns) == 0


def test_processar_wikilinks_link_quebrado(session):
    origem = Nota(titulo="Origem", conteudo="[[Inexistente]]")
    session.add(origem)
    session.flush()

    processar_wikilinks(origem.id, "[[Inexistente]]", session)
    session.flush()

    conns = session.exec(
        select(ConexaoNota).where(ConexaoNota.nota_origem_id == origem.id)
    ).all()
    assert len(conns) == 0


def test_processar_wikilinks_substitui_conexoes_antigas(session):
    origem = Nota(titulo="Origem", conteudo="[[Antigo]]")
    antigo = Nota(titulo="Antigo", conteudo="")
    session.add(origem)
    session.add(antigo)
    session.flush()

    processar_wikilinks(origem.id, "[[Antigo]]", session)
    session.flush()

    conns = session.exec(
        select(ConexaoNota).where(ConexaoNota.nota_origem_id == origem.id)
    ).all()
    assert len(conns) == 1

    novo = Nota(titulo="Novo", conteudo="")
    session.add(novo)
    session.flush()

    processar_wikilinks(origem.id, "[[Novo]]", session)
    session.flush()

    conns = session.exec(
        select(ConexaoNota).where(ConexaoNota.nota_origem_id == origem.id)
    ).all()
    assert len(conns) == 1
    assert conns[0].nota_destino_id == novo.id


def test_processar_wikilinks_none_seguro():
    processar_wikilinks(1, None, None)
