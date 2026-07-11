export class FormulaError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'FormulaError'
  }
}

type Token = readonly [string, string]
type Props = Record<string, unknown>

const TOK_RE = /(?<NUMBER>\d+(?:\.\d+)?)|(?<STR>"[^"]*"|'[^']*')|(?<FIELD>\{[a-zA-Z_][a-zA-Z0-9_]*\})|(?<OP>[-+*/%()])|(?<SKIP>\s+)|(?<MISMATCH>.)/g

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  for (const m of expr.matchAll(TOK_RE)) {
    const kind = Object.entries(m.groups!).find(([, v]) => v !== undefined)![0] as string
    const val = m[0]
    if (kind === 'SKIP') continue
    if (kind === 'MISMATCH') {
      throw new FormulaError(`Caractere inesperado: ${JSON.stringify(val)}`)
    }
    tokens.push([kind, val])
  }
  tokens.push(['EOF', ''])
  return tokens
}

export class FormulaParser {
  private tokens: Token[] = []
  private pos = 0
  private depth = 0
  private props: Props

  constructor(props: Props) {
    this.props = props
  }

  parse(expr: string): unknown {
    if (this.depth > 10) {
      throw new FormulaError('Profundidade máxima excedida')
    }
    this.tokens = tokenize(expr)
    this.pos = 0
    const result = this._parseExpr()
    const tok = this._peek()
    if (tok[0] !== 'EOF') {
      throw new FormulaError(`Token inesperado: ${JSON.stringify(tok[1])}`)
    }
    return result
  }

  private _peek(): Token {
    return this.tokens[this.pos]
  }

  private _consume(expected?: string): Token {
    const tok = this.tokens[this.pos]
    if (expected !== undefined && tok[1] !== expected && tok[0] !== expected) {
      throw new FormulaError(`Esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(tok[1])}`)
    }
    this.pos++
    return tok
  }

  private _parseExpr(): unknown {
    let left = this._parseTerm()
    while (this._peek()[1] === '+' || this._peek()[1] === '-') {
      const op = this._consume()[1]
      const right = this._parseTerm()
      if (op === '+') {
        left = (left as number) + (right as number)
      } else {
        left = (left as number) - (right as number)
      }
    }
    return left
  }

  private _parseTerm(): unknown {
    let left = this._parseFactor()
    while (this._peek()[1] === '*' || this._peek()[1] === '/' || this._peek()[1] === '%') {
      const op = this._consume()[1]
      const right = this._parseFactor()
      if (op === '*') {
        left = (left as number) * (right as number)
      } else if (op === '/') {
        if (right === 0) throw new FormulaError('Divisão por zero')
        left = (left as number) / (right as number)
      } else {
        left = (left as number) % (right as number)
      }
    }
    return left
  }

  private _parseFactor(): unknown {
    const tok = this._peek()
    if (tok[0] === 'NUMBER') {
      this._consume()
      return tok[1].includes('.') ? parseFloat(tok[1]) : parseInt(tok[1], 10)
    }
    if (tok[0] === 'STR') {
      this._consume()
      return tok[1].slice(1, -1)
    }
    if (tok[0] === 'FIELD') {
      this._consume()
      const name = tok[1].slice(1, -1)
      if (!(name in this.props)) {
        throw new FormulaError(`Campo desconhecido: ${JSON.stringify(name)}`)
      }
      return this.props[name]
    }
    if (tok[1] === '(') {
      this._consume('(')
      this.depth++
      if (this.depth > 10) throw new FormulaError('Profundidade máxima excedida')
      const val = this._parseExpr()
      this.depth--
      this._consume(')')
      return val
    }
    if (tok[1] === '-') {
      this._consume('-')
      return -(this._parseFactor() as number)
    }
    if (tok[1] === '+') {
      this._consume('+')
      return +(this._parseFactor() as number)
    }
    throw new FormulaError(`Token inesperado: ${JSON.stringify(tok[1])}`)
  }
}

export function evaluarFormula(expressao: string, props: Props): unknown {
  const parser = new FormulaParser(props)
  return parser.parse(expressao)
}
