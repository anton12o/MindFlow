def sm2_calculo(qualidade: int, intervalo: float, facilidade: float, revisoes: int):
    if qualidade < 3:
        return 0.0, facilidade, 0
    facilidade = max(1.3, facilidade + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02)))
    if revisoes == 0:
        intervalo = 1.0
    elif revisoes == 1:
        intervalo = 6.0
    else:
        intervalo = round(intervalo * facilidade, 1)
    return intervalo, round(facilidade, 2), revisoes + 1
