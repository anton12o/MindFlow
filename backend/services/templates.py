import logging
from datetime import date, datetime

logger = logging.getLogger(__name__)

SIMPLE_PLACEHOLDERS = {
    '{{data}}': lambda ctx: ctx.get('data', ''),
    '{{titulo}}': lambda ctx: ctx.get('titulo', ''),
    '{{id}}': lambda ctx: ctx.get('id', ''),
    '{{dia_da_semana}}': lambda ctx: ctx.get('dia_da_semana', ''),
}

DIAS = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']

def _build_context(titulo: str = '', nota_id: int = 0, pasta: str | None = None) -> dict:
    hoje = date.today()
    return {
        'data': hoje.strftime('%d/%m/%Y'),
        'titulo': titulo,
        'id': datetime.now().strftime('%Y%m%d%H%M'),
        'dia_da_semana': DIAS[hoje.weekday()],
        'pasta': pasta or '',
    }

def render_simple(template: str, context: dict) -> str:
    result = template
    for placeholder, getter in SIMPLE_PLACEHOLDERS.items():
        result = result.replace(placeholder, getter(context))
    return result

def render_template(template: str, context: dict) -> str:
    return render_simple(template, context)
