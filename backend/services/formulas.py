import re
from typing import Any


class FormulaError(Exception):
    pass


_TOKEN_SPEC = [
    ("NUMBER", r"\d+(\.\d+)?"),
    ("STR", r'"[^"]*"|\'[^\']*\''),
    ("FIELD", r"\{[a-zA-Z_][a-zA-Z0-9_]*\}"),
    ("OP", r"[+\-*/%()]"),
    ("SKIP", r"\s+"),
    ("MISMATCH", r"."),
]
_TOK_RE = re.compile("|".join(f"(?P<{name}>{pattern})" for name, pattern in _TOKEN_SPEC))


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    for m in _TOK_RE.finditer(expr):
        kind = m.lastgroup
        val = m.group()
        if kind == "SKIP":
            continue
        if kind == "MISMATCH":
            raise FormulaError(f"Caractere inesperado: {val!r}")
        tokens.append((kind, val))
    tokens.append(("EOF", ""))
    return tokens


class FormulaParser:
    def __init__(self, props: dict[str, Any]):
        self.props = props
        self.tokens: list[tuple[str, str]] = []
        self.pos = 0
        self.depth = 0

    def parse(self, expr: str) -> Any:
        if self.depth > 10:
            raise FormulaError("Profundidade máxima excedida")
        self.tokens = _tokenize(expr)
        self.pos = 0
        result = self._parse_expr()
        tok = self._peek()
        if tok[0] != "EOF":
            raise FormulaError(f"Token inesperado: {tok[1]!r}")
        return result

    def _peek(self) -> tuple[str, str]:
        return self.tokens[self.pos]

    def _consume(self, expected: str | None = None) -> tuple[str, str]:
        tok = self.tokens[self.pos]
        if expected and tok[1] != expected and tok[0] != expected:
            raise FormulaError(f"Esperado {expected!r}, obtido {tok[1]!r}")
        self.pos += 1
        return tok

    def _parse_expr(self) -> Any:
        left = self._parse_term()
        while self._peek()[1] in ("+", "-"):
            op = self._consume()[1]
            right = self._parse_term()
            if op == "+":
                left = left + right
            else:
                left = left - right
        return left

    def _parse_term(self) -> Any:
        left = self._parse_factor()
        while self._peek()[1] in ("*", "/", "%"):
            op = self._consume()[1]
            right = self._parse_factor()
            if op == "*":
                left = left * right
            elif op == "/":
                if right == 0:
                    raise FormulaError("Divisão por zero")
                left = left / right
            else:
                left = left % right
        return left

    def _parse_factor(self) -> Any:
        tok = self._peek()
        if tok[0] == "NUMBER":
            self._consume()
            return float(tok[1]) if "." in tok[1] else int(tok[1])
        if tok[0] == "STR":
            self._consume()
            return tok[1][1:-1]
        if tok[0] == "FIELD":
            self._consume()
            name = tok[1][1:-1]
            if name not in self.props:
                raise FormulaError(f"Campo desconhecido: {name!r}")
            return self.props[name]
        if tok[1] == "(":
            self._consume("(")
            self.depth += 1
            if self.depth > 10:
                raise FormulaError("Profundidade máxima excedida")
            val = self._parse_expr()
            self.depth -= 1
            self._consume(")")
            return val
        if tok[1] == "-":
            self._consume("-")
            return -self._parse_factor()
        if tok[1] == "+":
            self._consume("+")
            return +self._parse_factor()
        raise FormulaError(f"Token inesperado: {tok[1]!r}")


def evaluar_formula(expressao: str, props: dict[str, Any]) -> Any:
    parser = FormulaParser(props)
    return parser.parse(expressao)
