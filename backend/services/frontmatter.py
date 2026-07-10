import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

FRONTMATTER_RE = re.compile(r'^---\s*\n(.*?)\n---\s*\n?(.*)', re.DOTALL)
YAML_DELIMITER = '---'

def extract_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    if not content or not content.startswith(YAML_DELIMITER):
        return {}, (content or '')

    match = FRONTMATTER_RE.match(content)
    if not match:
        return {}, content

    yaml_text = match.group(1)
    body = match.group(2).strip()

    try:
        import yaml
        props = yaml.safe_load(yaml_text) or {}
        if not isinstance(props, dict):
            logger.warning('frontmatter YAML não é um dict: %s', type(props))
            return {}, content
        return props, body
    except Exception as e:
        logger.warning('erro ao parsear frontmatter: %s', e)
        return {}, content


def inject_frontmatter(content: str, props: dict[str, Any]) -> str:
    if not props:
        return content or ''

    _, body = extract_frontmatter(content)
    body = body.strip() if body else ''

    try:
        import yaml
        fm = yaml.dump(props, allow_unicode=True, default_flow_style=False, sort_keys=False).strip()
    except Exception as e:
        logger.warning('erro ao gerar frontmatter YAML: %s', e)
        return content or ''

    return f'{YAML_DELIMITER}\n{fm}\n{YAML_DELIMITER}\n\n{body}'
