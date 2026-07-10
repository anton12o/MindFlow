#!/usr/bin/env python3
"""
Validação automática de análises do Cérebro.
Garante que análises em docs/OpencodeXFreebuff/analises/ seguem o padrão obrigatório.
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple

ANALYSES_DIR = Path("docs/OpencodeXFreebuff/analises")
PENSAMENTOS_DIR = Path("docs/OpencodeXFreebuff/pensamentos")

REQUIRED_SECTIONS = [
    "## Escopo",
    "## Arquivos Afetados", 
    "## Plano de Implementação",
    "## Riscos",
    "## Testes",
    "## Glossário"
]

STATUS_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}-.+-(FEITO|FAZENDO|NAO_FEITO)\.md$")

def validate_filename(filepath: Path) -> Tuple[bool, str]:
    """Valida nomenclatura do arquivo: YYYY-MM-DD-descricao-[STATUS].md"""
    if not STATUS_PATTERN.match(filepath.name):
        return False, f"Nome inválido: {filepath.name}. Esperado: YYYY-MM-DD-descricao-[STATUS].md"
    return True, ""

def validate_sections(content: str) -> Tuple[bool, List[str]]:
    """Valida se todas as seções obrigatórias estão presentes."""
    missing = []
    for section in REQUIRED_SECTIONS:
        if section not in content:
            missing.append(section)
    return len(missing) == 0, missing

def validate_status_consistency(filepath: Path, content: str) -> Tuple[bool, str]:
    """Verifica se STATUS no nome do arquivo condiz com localização."""
    status_match = re.search(r"-(FEITO|FAZENDO|NAO_FEITO)\.md$", filepath.name)
    if not status_match:
        return False, "Status não encontrado no nome"
    
    status = status_match.group(1)
    is_in_analises = "analises" in str(filepath)
    is_in_pensamentos = "pensamentos" in str(filepath)
    
    if status == "FEITO" and not is_in_analises:
        return False, f"Arquivo [FEITO] deve estar em analises/, não em {filepath.parent.name}"
    if status in ("FAZENDO", "NAO_FEITO") and not is_in_pensamentos:
        return False, f"Arquivo [{status}] deve estar em pensamentos/, não em {filepath.parent.name}"
    
    return True, ""

def validate_analise(filepath: Path) -> Tuple[bool, List[str]]:
    """Validação completa de uma análise."""
    errors = []
    
    # 1. Nome do arquivo
    ok, msg = validate_filename(filepath)
    if not ok:
        errors.append(f"Nome: {msg}")
    
    # 2. Conteúdo
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        errors.append(f"Leitura: {e}")
        return False, errors
    
    # 3. Seções obrigatórias
    ok, missing = validate_sections(content)
    if not ok:
        errors.append(f"Seções faltando: {', '.join(missing)}")
    
    # 4. Consistência status/localização
    ok, msg = validate_status_consistency(filepath, content)
    if not ok:
        errors.append(f"Status/Local: {msg}")
    
    # 5. Verificações extras para [FEITO]
    if "FEITO" in filepath.name:
        # Deve ter Plano de Implementação com passos numerados
        if "## Plano de Implementação" in content:
            plan_section = content.split("## Plano de Implementação")[1].split("##")[0]
            if not re.search(r"\d+\.", plan_section):
                errors.append("Plano de Implementação deve ter passos numerados (1., 2., etc.)")
    
    return len(errors) == 0, errors

def validate_all() -> bool:
    """Valida todas as análises nos diretórios."""
    all_ok = True
    all_errors = []
    
    for directory in [ANALYSES_DIR, PENSAMENTOS_DIR]:
        if not directory.exists():
            print(f"⚠️  Diretório não existe: {directory}")
            continue
            
        for filepath in directory.glob("*.md"):
            if filepath.name in ("README.md", "TEMPLATE.md"):
                continue
                
            ok, errors = validate_analise(filepath)
            if not ok:
                all_ok = False
                all_errors.append(f"\n❌ {filepath.relative_to(Path.cwd())}:")
                for err in errors:
                    all_errors.append(f"  - {err}")
            else:
                print(f"✅ {filepath.relative_to(Path.cwd())}")
    
    if not all_ok:
        print("\n".join(all_errors))
    
    return all_ok

if __name__ == "__main__":
    print("🔍 Validando análises do Cérebro...")
    print("=" * 50)
    
    if validate_all():
        print("\n✅ Todas as análises são válidas!")
        sys.exit(0)
    else:
        print("\n❌ Validação falhou. Corrija os erros acima.")
        sys.exit(1)