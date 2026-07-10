from services.spaced_repetition import sm2_calculo


def test_qualidade_baixa_reseta():
    intervalo, facilidade, revisoes = sm2_calculo(qualidade=2, intervalo=10.0, facilidade=2.5, revisoes=5)
    assert intervalo == 0.0
    assert facilidade == 2.5
    assert revisoes == 0


def test_qualidade_0_reseta():
    intervalo, facilidade, revisoes = sm2_calculo(qualidade=0, intervalo=5.0, facilidade=1.5, revisoes=3)
    assert intervalo == 0.0
    assert facilidade == 1.5
    assert revisoes == 0


def test_primeira_revisao_intervalo_1():
    intervalo, _facilidade, revisoes = sm2_calculo(qualidade=4, intervalo=0.0, facilidade=2.5, revisoes=0)
    assert intervalo == 1.0
    assert revisoes == 1


def test_segunda_revisao_intervalo_6():
    intervalo, _facilidade, revisoes = sm2_calculo(qualidade=4, intervalo=0.0, facilidade=2.5, revisoes=1)
    assert intervalo == 6.0
    assert revisoes == 2


def test_revisoes_seguintes_multiplica_por_facilidade():
    intervalo, _facilidade, revisoes = sm2_calculo(qualidade=4, intervalo=10.0, facilidade=2.0, revisoes=2)
    assert intervalo == 20.0
    assert revisoes == 3


def test_facilidade_aumenta_com_nota_5():
    _intervalo, facilidade, _revisoes = sm2_calculo(qualidade=5, intervalo=1.0, facilidade=2.5, revisoes=0)
    assert facilidade > 2.5


def test_facilidade_diminui_com_nota_3():
    _intervalo, facilidade, _revisoes = sm2_calculo(qualidade=3, intervalo=1.0, facilidade=2.5, revisoes=0)
    assert facilidade < 2.5


def test_facilidade_minima_1_3():
    _intervalo, facilidade, _revisoes = sm2_calculo(qualidade=3, intervalo=1.0, facilidade=1.3, revisoes=0)
    assert facilidade == 1.3


def test_facilidade_nao_abaixo_de_1_3():
    _intervalo, facilidade, _revisoes = sm2_calculo(qualidade=3, intervalo=1.0, facilidade=1.0, revisoes=0)
    assert facilidade >= 1.3


def test_intervalo_arredondado_1_casa():
    intervalo, _facilidade, _revisoes = sm2_calculo(qualidade=4, intervalo=3.0, facilidade=2.0, revisoes=2)
    assert isinstance(intervalo, float)
    assert len(str(intervalo).split('.')[1]) <= 1


def test_facilidade_arredondada_2_casas():
    _intervalo, facilidade, _revisoes = sm2_calculo(qualidade=4, intervalo=1.0, facilidade=2.5, revisoes=0)
    texto = str(facilidade)
    if '.' in texto:
        assert len(texto.split('.')[1]) <= 2
