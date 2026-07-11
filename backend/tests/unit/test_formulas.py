import pytest

from services.formulas import FormulaError, evaluar_formula


def test_soma():
    r = evaluar_formula("2 + 3", {})
    assert r == 5


def test_subtracao():
    r = evaluar_formula("10 - 4", {})
    assert r == 6


def test_multiplicacao():
    r = evaluar_formula("3 * 7", {})
    assert r == 21


def test_divisao():
    r = evaluar_formula("15 / 3", {})
    assert r == 5.0


def test_modulo():
    r = evaluar_formula("10 % 3", {})
    assert r == 1


def test_precedencia():
    r = evaluar_formula("2 + 3 * 4", {})
    assert r == 14


def test_parenteses():
    r = evaluar_formula("(2 + 3) * 4", {})
    assert r == 20


def test_negativo():
    r = evaluar_formula("-5 + 3", {})
    assert r == -2


def test_positivo():
    r = evaluar_formula("+5 + 3", {})
    assert r == 8


def test_numero_decimal():
    r = evaluar_formula("2.5 * 2", {})
    assert r == 5.0


def test_string_literal():
    r = evaluar_formula('"hello"', {})
    assert r == "hello"


def test_string_single_quote():
    r = evaluar_formula("'world'", {})
    assert r == "world"


def test_campo_referencia():
    r = evaluar_formula("{qtd} * {preco}", {"qtd": 3, "preco": 10.5})
    assert r == 31.5


def test_campo_texto():
    r = evaluar_formula("{nome}", {"nome": "teste"})
    assert r == "teste"


def test_campo_desconhecido():
    with pytest.raises(FormulaError, match="Campo desconhecido"):
        evaluar_formula("{inexistente}", {})


def test_divisao_por_zero():
    with pytest.raises(FormulaError, match="Divisão por zero"):
        evaluar_formula("10 / 0", {})


def test_caractere_invalido():
    with pytest.raises(FormulaError, match="Caractere inesperado"):
        evaluar_formula("2 + @", {})


def test_expressao_vazia():
    with pytest.raises(FormulaError):
        evaluar_formula("", {})


def test_parenteses_aninhados():
    r = evaluar_formula("((1 + 2) * (3 + 4))", {})
    assert r == 21


def test_profundidade_maxima():
    deep = "(" * 12 + "1" + ")" * 12
    with pytest.raises(FormulaError, match="Profundidade máxima"):
        evaluar_formula(deep, {})


def test_formula_com_multiplos_campos():
    props = {"a": 10, "b": 20, "c": 5}
    r = evaluar_formula("{a} + {b} * {c}", props)
    assert r == 110


def test_formula_aninhada_e_parenteses():
    props = {"x": 100, "y": 3}
    r = evaluar_formula("({x} / {y}) * 2", props)
    assert r == pytest.approx(66.666, rel=1e-3)
