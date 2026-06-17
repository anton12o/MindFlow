import logging
from database import engine
from models import TemplateNota, TipoObjeto, Nota, Tarefa
from sqlmodel import Session, select, func

logger = logging.getLogger(__name__)

TEMPLATES_PADRAO = [
    {"nome": "Resumo de Aula", "descricao": "Estrutura para resumir aulas e palestras",
     "conteudo": "# {{titulo}}\n\n**Data:** {{data}}\n\n## Pontos principais\n- \n\n## Dúvidas\n- \n\n## Ações\n- [ ] "},
    {"nome": "Reunião", "descricao": "Pauta, decisões e próximos passos",
     "conteudo": "# {{titulo}} — {{data}}\n\n**Presentes:**\n\n**Pauta:**\n1. \n\n**Decisões:**\n- \n\n**Próximos passos:**\n- [ ] "},
    {"nome": "Diário Rápido", "descricao": "Registro diário de atividades e aprendizados",
     "conteudo": "# {{data}}\n\n**Hoje:**\n- Feito:\n- Pendente:\n- Aprendido:\n\n**Humor:** 😊"},
    {"nome": "Flashcard", "descricao": "Criar um flashcard manualmente",
     "conteudo": "# {{titulo}}\n\n**Pergunta:**\n\n**Resposta:**"},
    {"nome": "Projeto", "descricao": "Estrutura básica de projeto",
     "conteudo": "# {{titulo}}\n\n**Objetivo:**\n\n**Status:** ✅\n\n**Checklist:**\n- [ ] \n\n**Notas:**"},
]

SCHEMA_CAMPOS_PADRAO = {
    "Tarefa": {
        "status": {"type": "select", "options": ["pendente", "em_andamento", "feito"]},
        "prioridade": {"type": "select", "options": ["alta", "normal", "baixa"]},
        "vencimento": {"type": "date"},
        "estimativa": {"type": "number"},
    },
    "Nota": {
        "autor": {"type": "text"},
        "fonte": {"type": "url"},
        "lido_em": {"type": "date"},
    },
    "Ideia": {
        "status": {"type": "select", "options": ["rascunho", "refinada", "descartada"]},
        "cover_url": {"type": "text"},
    },
    "Livro": {
        "autor": {"type": "text"},
        "paginas": {"type": "number"},
        "status": {"type": "select", "options": ["lendo", "pausado", "concluido"]},
        "avaliacao": {"type": "number"},
    },
    "Projeto": {
        "status": {"type": "select", "options": ["planejando", "ativo", "concluido", "pausado"]},
        "data_inicio": {"type": "date"},
        "data_fim": {"type": "date"},
        "prioridade": {"type": "select", "options": ["alta", "normal", "baixa"]},
    },
}


TIPOS_PADRAO = [
    {"nome": "Tarefa", "icone": "✅"},
    {"nome": "Nota", "icone": "📄"},
    {"nome": "Ideia", "icone": "💡"},
    {"nome": "Livro", "icone": "📖"},
    {"nome": "Projeto", "icone": "📋"},
]


def seed_templates(session: Session):
    existing = session.exec(select(TemplateNota).limit(1)).first()
    if not existing:
        for t_data in TEMPLATES_PADRAO:
            session.add(TemplateNota(**t_data))
        session.commit()


def seed_tipos(session: Session):
    existing = session.exec(select(TipoObjeto).limit(1)).first()
    if not existing:
        for t in TIPOS_PADRAO:
            schema = SCHEMA_CAMPOS_PADRAO.get(t["nome"], {})
            session.add(TipoObjeto(nome=t["nome"], icone=t["icone"], schema_campos=schema))
        session.commit()
    else:
        # Atualizar schema_campos dos tipos existentes se vazio
        tipos = session.exec(select(TipoObjeto)).all()
        for t in tipos:
            if not t.schema_campos:
                schema = SCHEMA_CAMPOS_PADRAO.get(t.nome, {})
                if schema:
                    t.schema_campos = schema
                    session.add(t)
        # Remover tipos de teste sem schema_campos
        nomes_padrao = {tp["nome"] for tp in TIPOS_PADRAO}
        for t in tipos:
            if t.nome not in nomes_padrao and not t.schema_campos:
                session.delete(t)
        # Remover tipos de teste explícitos (apenas se sem referências FK)
        tipos_teste = ["Pessoa", "Recurso", "TipoImp"]
        for t in tipos:
            if t.nome in tipos_teste:
                notas_ref = session.exec(select(func.count(Nota.id)).where(Nota.tipo_id == t.id)).one()
                tarefas_ref = session.exec(select(func.count(Tarefa.id)).where(Tarefa.tipo_id == t.id)).one()
                if notas_ref == 0 and tarefas_ref == 0:
                    session.delete(t)
                    logger.info("Tipo de teste removido: %s", t.nome)
        session.commit()


def seed_db():
    try:
        with Session(engine) as session:
            seed_templates(session)
            seed_tipos(session)
    except Exception as e:
        logger.error("Erro ao semear dados: %s", e)
        raise
