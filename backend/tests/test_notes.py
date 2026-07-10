from models import Flashcard, Nota, NotaTag, SessaoPomodoro, Tag
from services.notes import cleanup_nota_relations, criar_nota_resumo, extrair_cover_url, yaml_quote


def test_extrair_cover_url_de_propriedades():
    url = extrair_cover_url("", {"cover_url": "https://exemplo.com/img.png"})
    assert url == "https://exemplo.com/img.png"


def test_extrair_cover_url_ignora_propriedades_url_invalida():
    url = extrair_cover_url("", {"cover_url": "invalido"})
    assert url is None


def test_extrair_cover_url_fallback_markdown():
    url = extrair_cover_url("![alt](https://exemplo.com/foto.jpg)")
    assert url == "https://exemplo.com/foto.jpg"


def test_extrair_cover_url_sem_imagem():
    url = extrair_cover_url("texto sem imagem")
    assert url is None


def test_extrair_cover_url_ignora_extensao_fora_da_lista():
    url = extrair_cover_url("![doc](https://exemplo.com/doc.pdf)")
    assert url is None


def test_extrair_cover_url_conteudo_vazio():
    url = extrair_cover_url(None)
    assert url is None


def test_yaml_quote_simples():
    assert yaml_quote("apenas texto") == "apenas texto"


def test_yaml_quote_com_dois_pontos():
    assert "'" in yaml_quote("chave: valor")


def test_yaml_quote_com_aspas_simples():
    result = yaml_quote("texto 'especial'")
    assert result.startswith("'")
    assert result.endswith("'")


def test_yaml_quote_com_hash():
    assert "'" in yaml_quote("#comentario")


def test_cleanup_nota_relations_deleta_tags(session):
    nota = Nota(titulo="Teste", conteudo="")
    session.add(nota)
    session.flush()
    tag = Tag(nome="tag1", cor="red")
    session.add(tag)
    session.flush()
    session.add(NotaTag(nota_id=nota.id, tag_id=tag.id))
    session.commit()
    cleanup_nota_relations(nota.id, session)
    session.flush()
    remaining = session.exec(
        NotaTag.__table__.select().where(NotaTag.nota_id == nota.id)
    ).all()
    assert len(remaining) == 0


def test_cleanup_nota_relations_desassocia_flashcards(session):
    nota = Nota(titulo="Teste", conteudo="")
    session.add(nota)
    session.flush()
    fc = Flashcard(pergunta="Q", resposta="A", nota_id=nota.id)
    session.add(fc)
    session.commit()
    cleanup_nota_relations(nota.id, session)
    session.refresh(fc)
    assert fc.nota_id is None


def test_cleanup_nota_relations_desassocia_sessoes(session):
    nota = Nota(titulo="Teste", conteudo="")
    session.add(nota)
    session.flush()
    sessao = SessaoPomodoro(
        duracao_min=25, resumo_nota_id=nota.id,
        iniciado_em="2026-06-25T10:00:00",
    )
    session.add(sessao)
    session.commit()
    cleanup_nota_relations(nota.id, session)
    session.refresh(sessao)
    assert sessao.resumo_nota_id is None


def test_criar_nota_resumo_cria_nota(session):
    nota = criar_nota_resumo("conteudo do resumo", session)
    assert nota.id is not None
    assert nota.conteudo == "conteudo do resumo"
    assert "Resumo Pomodoro" in nota.titulo


def test_criar_nota_resumo_com_contexto(session):
    nota = criar_nota_resumo("foco total", session, "Estudo")
    assert "Estudo" in nota.titulo
