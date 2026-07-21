#!/usr/bin/env python3
"""Verifica contraste WCAG AA/AAA das combinações de cor usadas no frontend.

Lê as cores do tema do index.css e testa pares (foreground, background)
usados nos componentes, reportando quais passam ou falham.

Uso:
    python scripts/check_contrast.py
"""

import re
from pathlib import Path
from colorsys import rgb_to_hls

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"

# Cores do @theme no index.css (dark)
THEME = {
    "--color-bg-primary": "#0D1117",
    "--color-bg-secondary": "#161B22",
    "--color-bg-tertiary": "#21262D",
    "--color-bg-hover": "#2A2A36",
    "--color-text-primary": "#E6EDF3",
    "--color-text-secondary": "#8B949E",
    "--color-text-muted": "#87919B",
    "--color-accent": "#58A6FF",
    "--color-accent-hover": "#79C0FF",
    "--color-accent-light": "#3A5A8A",
    "--color-success": "#3FB950",
    "--color-warning": "#D29922",
    "--color-danger": "#F85149",
    "--color-danger-hover": "#FF7B72",
    "--color-border": "#30363D",
}

# Tailwind utility colors usadas nos componentes Matriz
TAILWIND = {
    "emerald-400": "#34D399",
    "emerald-500": "#10B981",
    "amber-400": "#FBBF24",
    "amber-500": "#F59E0B",
    "red-400": "#F87171",
    "red-500": "#EF4444",
    "red-600": "#DC2626",
    "blue-400": "#60A5FA",
    "blue-500": "#3B82F6",
    "gray-400": "#9CA3AF",
    "gray-500": "#6B7280",
    "orange-500": "#F97316",
    "yellow-500": "#EAB308",
    "green-500": "#22C55E",
    "white": "#FFFFFF",
}

# --- relative luminance (WCAG 2.1) ---

def srgb(v: float) -> float:
    if v <= 0.04045:
        return v / 12.92
    return ((v + 0.055) / 1.055) ** 2.4

def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)

def relative_luminance(hex_color: str) -> float:
    r, g, b = hex_to_rgb(hex_color)
    return 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255)

def contrast_ratio(fg: str, bg: str) -> float:
    l1 = relative_luminance(fg)
    l2 = relative_luminance(bg)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def blend_over(bg: str, fg_hex: str, alpha: float) -> str:
    """Blend fg_hex sobre bg com alpha (ex: bg-secondary/50 sobre bg-primary)."""
    br, bg_, bb = hex_to_rgb(bg)
    fr, fg_, fb = hex_to_rgb(fg_hex)
    r = round(br * (1 - alpha) + fr * alpha)
    g = round(bg_ * (1 - alpha) + fg_ * alpha)
    b = round(bb * (1 - alpha) + fb * alpha)
    return f"#{r:02X}{g:02X}{b:02X}"

# --- combinações da Matriz ---

def combo(label, fg, bg, large=False):
    ratio = contrast_ratio(fg, bg)
    aa = ratio >= 3 if large else ratio >= 4.5
    aaa = ratio >= 4.5 if large else ratio >= 7
    return (label, fg, bg, round(ratio, 2), aa, aaa)

PASS = "[OK]"
FAIL = "[FAIL]"

COMBOS = [
    # Títulos / texto base
    combo("título (text-primary) sobre bg-primary", THEME["--color-text-primary"], THEME["--color-bg-primary"]),
    combo("título (text-primary) sobre card (bg-secondary/50)", THEME["--color-text-primary"],
          blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5), large=True),
    # Muted
    combo("text-muted sobre bg-primary", THEME["--color-text-muted"], THEME["--color-bg-primary"]),
    combo("text-muted sobre card bg-secondary/50", THEME["--color-text-muted"],
          blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    # Severity badges (seta para cima / travessao / seta para baixo)
    combo("^ emerald-400 sobre card bg-secondary/50 (RICE/GUT ^)",
          TAILWIND["emerald-400"], blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    combo("- amber-400 sobre card bg-secondary/50 (RICE/GUT -)",
          TAILWIND["amber-400"], blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    combo("v gray-400 sobre card bg-secondary/50 (RICE/GUT v)",
          TAILWIND["gray-400"], blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    # Score numbers
    combo("score RICE (text-emerald-400/amber-400/gray-400) sobre card",
          TAILWIND["emerald-400"], blend_over(THEME["--color-bg-primary"], TAILWIND["emerald-500"], 0.1)),
    # Contagem badges (white texto sobre badge color)
    combo("badge count white sobre emerald-500", TAILWIND["white"], TAILWIND["emerald-500"]),
    combo("badge count white sobre red-500", TAILWIND["white"], TAILWIND["red-500"]),
    combo("badge count white sobre amber-500", TAILWIND["white"], TAILWIND["amber-500"]),
    combo("badge count white sobre gray-500", TAILWIND["white"], TAILWIND["gray-500"]),
    combo("badge count white sobre blue-500", TAILWIND["white"], TAILWIND["blue-500"]),
    # GUT ScoreRing fillColor()
    combo("ring green-500 sobre card bg-secondary/50", TAILWIND["green-500"],
          blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    combo("ring red-500 sobre card bg-secondary/50", TAILWIND["red-500"],
          blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    # Slider gradient filled portion on card bg
    combo("slider filled emerald-500 sobre card bg-secondary/50 (nível 1-2)",
          TAILWIND["emerald-500"], blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    combo("slider filled red-600 sobre card bg-secondary/50 (nível 5)",
          TAILWIND["red-600"], blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    # Só críticos >60 label
    combo("GUT critico label (text-red-400) sobre card",
          TAILWIND["red-400"], blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    combo("GUT alto label (text-amber-400) sobre card",
          TAILWIND["amber-400"], blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
    combo("GUT medio label (text-yellow-400) sobre card",
          TAILWIND["yellow-500"], blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5), large=True),
    combo("GUT baixo label (text-emerald-400) sobre card",
          TAILWIND["emerald-400"], blend_over(THEME["--color-bg-primary"], THEME["--color-bg-secondary"], 0.5)),
]

HEADER = f"{'Combinacao':<55} {'FG':<9} {'BG':<9} {'Ratio':<6} {'AA':<5} {'AAA':<5}"
SEP = "-" * len(HEADER)

def main():
    print(f"\n  Verificacao de Contraste WCAG (dark theme #{THEME['--color-bg-primary']})\n")
    print(HEADER)
    print(SEP)
    falhas_aa = 0
    for label, fg, bg, ratio, aa, aaa in sorted(COMBOS, key=lambda x: x[4]):
        aa_str = f"{PASS} AA" if aa else f"{FAIL} AA"
        aaa_str = f"{PASS} AAA" if aaa else f"{FAIL} AAA"
        if not aa:
            falhas_aa += 1
        print(f"{label:<55} {fg:<9} {bg:<9} {ratio:<6} {aa_str:<5} {aaa_str:<5}")

    total = len(COMBOS)
    print(f"\n  {PASS if falhas_aa == 0 else FAIL} {total - falhas_aa}/{total} passam AA ({falhas_aa} falhas)\n")

    if falhas_aa > 0:
        for label, fg, bg, ratio, aa, aaa in COMBOS:
            if not aa:
                print(f"  ! {label} — ratio {ratio} < 4.5 (AA)")
        print()

if __name__ == "__main__":
    main()
