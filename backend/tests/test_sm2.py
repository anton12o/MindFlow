from services.spaced_repetition import sm2_calculo


def test_qualidade_0_reseta():
    intervalo, facilidade, revisoes = sm2_calculo(0, 5.0, 2.5, 3)
    assert intervalo == 0.0
    assert facilidade == 2.5
    assert revisoes == 0


def test_qualidade_1_reseta():
    intervalo, facilidade, revisoes = sm2_calculo(1, 5.0, 2.5, 3)
    assert intervalo == 0.0
    assert facilidade == 2.5
    assert revisoes == 0


def test_qualidade_2_reseta():
    intervalo, facilidade, revisoes = sm2_calculo(2, 5.0, 2.5, 3)
    assert intervalo == 0.0
    assert facilidade == 2.5
    assert revisoes == 0


def test_primeira_revisao_intervalo_1():
    intervalo, facilidade, revisoes = sm2_calculo(4, 0.0, 2.5, 0)
    assert intervalo == 1.0
    assert revisoes == 1


def test_segunda_revisao_intervalo_6():
    intervalo, facilidade, revisoes = sm2_calculo(4, 0.0, 2.5, 1)
    assert intervalo == 6.0
    assert revisoes == 2


def test_revisoes_seguintes_multiplica_facilidade():
    intervalo, _, revisoes = sm2_calculo(4, 6.0, 2.5, 2)
    assert intervalo == 15.0  # 6 * 2.5
    assert revisoes == 3


def test_facilidade_aumenta_com_qualidade_5():
    _, facilidade, _ = sm2_calculo(5, 6.0, 2.5, 2)
    expected = round(2.5 + (0.1 - (5 - 5) * (0.08 + (5 - 5) * 0.02)), 2)
    assert facilidade == expected
    assert facilidade > 2.5


def test_facilidade_diminui_com_qualidade_3():
    _, facilidade, _ = sm2_calculo(3, 6.0, 2.5, 2)
    assert facilidade < 2.5


def test_facilidade_nao_abaixo_de_1_3():
    _, facilidade, _ = sm2_calculo(3, 6.0, 1.2, 2)
    assert facilidade >= 1.3


def test_intervalo_arredondado():
    intervalo, _, _ = sm2_calculo(4, 6.0, 2.5, 2)
    assert isinstance(intervalo, float)
    assert len(str(intervalo).split('.')[-1]) <= 1
