
Expression 'expression' = CmpOperation

CmpOperation 'comparison operation'
  = left:LowPriorityOperation _ comparator:ComparisonOperator _ right: LowPriorityOperation {
    return { type: 'op', op: comparator.op, token: comparator.token, left, right }
  }
  / LowPriorityOperation

LowPriorityOperation
  = initial:HighPriorityOperation addends:(_ op:LowPriorityOperator _ addend:HighPriorityOperation { return { op, addend } })* {
    return addends.length
      ? addends.reduce((previous, { op, addend }) => ({ type: 'op', op, left: previous, right: addend }), initial)
      : initial
  }

HighPriorityOperation
  = initial:HighestPriorityOperation factors:(_ op:HighPriorityOperator _ factor:HighestPriorityOperation { return { op, factor } })* {
    return factors.length
      ? factors.reduce((previous, { op, factor }) => ({ type: 'op', op, left: previous, right: factor }), initial)
      : initial
  }

HighestPriorityOperation
  = left:NumericValue _ op:HighestPriorityOperator _ right:HighestPriorityOperation {
    return { type: 'op', op, left, right }
  }
  / NumericValue

NumericValue = FunctionCall
  / DiceExpression
  / Variable
  / LiteralNumber
  / '(' _ op:Expression _ ')' { return op }

LiteralNumber = value:Number { return { type: 'number', value } }

// -----------------------------------------------------------------------------
// OPERATORS
// -----------------------------------------------------------------------------

ArithmeticsOperator 'arithmetics operator'
  = HighestPriorityOperator / HighPriorityOperator / LowPriorityOperator

LowPriorityOperator = SumOperator / SubOperator
HighPriorityOperator = MulOperator / DivOperator
HighestPriorityOperator = PowOperator

SumOperator 'sum operator'            = '+'           { return 'sum' }
SubOperator 'subtraction operator'    = '-'           { return 'sub' }
MulOperator 'multiplication operator' = '*'           { return 'mul' }
DivOperator 'division operator'       = '/'           { return 'div' }
PowOperator 'power opeartor'          = ('**' / '^')  { return 'pow' }

// -----------------------------------------------------------------------------
// Dice Expression
// -----------------------------------------------------------------------------

DiceExpression 'dice expression'
  = StandardDiceExpression

StandardDiceExpression 'standard dice expresion'
  = qnt:PositiveInteger? 'd' sides:PositiveInteger modifiers:Modifier*
  { return { type: 'roll', /*dice: 'numeric',*/ qnt: qnt ?? 1, sides, modifiers/*, expression: text()*/ } }

// FudgeDiceExpression 'fudge/fate dice expression'
//   = qnt:PositiveInteger? 'dF' modifiers:Modifier*
//   { return { type: 'roll', dice: 'fudge', qnt: qnt ?? 1, modifiers } }

// StarWarsDiceExpression 'star wars dice expression'
//   = qnt:PositiveInteger? 'sw' kind:('A'/'D'/'F'/'P'/'C'/'B'/'S') modifiers:Modifier*
//   { return { type: 'roll', dice: 'starwars', kind, qnt: qnt ?? 1, modifiers } }

Modifier 'dice expression modifier'
  = mod:ModifierKey
    range:(
      start:PositiveInteger
      end:( '..' value:PositiveInteger { return value } )?
      { return { start, end } }
    )?
    {
      if (typeof range?.end === 'number' && typeof range?.start === 'number' && range.end < range.start) {
        throw new Error(`Failed to evaluate dice modifier "${text()}". Cause: Invalid range.`);
      }
      return typeof range?.end === 'number' ? { mod, rangeStart: range.start, rangeEnd: range.end }
        : typeof range?.start === 'number' ? { mod, value: range.start }
        : { mod };
    }

ModifierKey
  = 'x!' / 'x' // Explode, explode recursivelly
  / 'r!' / 'r' // Reroll, reroll recursivelly
  / 'dl' / 'dh' / 'd' // Drop, drop lowest, drop highest
  / 'kl' / 'kh' / 'k' // Keep, keep lowest, keep highest
  / 'cs' / 'cf' / 'c' // Count, count successes, count failures
  / 'min' / 'max'

// -----------------------------------------------------------------------------
// COMPARISON OPERATORS
// -----------------------------------------------------------------------------

ComparisonOperator 'comparison operator'
  = EqualOperator
  / DiffOpeartor
  / LessOrEqualOperator
  / LessThanOperator
  / GreaterOrEqualOperator
  / GreaterThanOperator

EqualOperator           'equality comparison operator'        = '=' '='? '='?       { return { op: 'eq', token: text() } }
DiffOpeartor            '"not equal" operator'                = ('!=' '='? / '<>')  { return { op: 'neq', token: text() } }
LessThanOperator        '"less than" operator'                = '<'                 { return { op: 'lt', token: text() } }
LessOrEqualOperator     '"less than or equal to" operator'    = '<='                { return { op: 'lte', token: text() } }
GreaterThanOperator     '"greater than" operator'             = '>'                 { return { op: 'gt', token: text() } }
GreaterOrEqualOperator  '"greater than or equal to" operator' = '>='                { return { op: 'gte', token: text() } }

// -----------------------------------------------------------------------------
// FUNCTIONS
// -----------------------------------------------------------------------------

FunctionCall 'function call'
  = identifier:Identifier
    '(' _
    args:(
      arg0:FunctionArgument _
      rest:( ',' _ arg:FunctionArgument _ { return arg } )*
      { return [arg0, ...rest] }
    )?
    ')'
  { return { type: 'fn', name: identifier.name, args: args ?? [] } }

FunctionArgument = NumericValue

// -----------------------------------------------------------------------------
// NUMBERS
// -----------------------------------------------------------------------------

Number 'number'
  = Float
  / Integer

Float 'floating point number'
  = NegativeFloat
  / PositiveFloat

NegativeFloat 'negative floating point number'
  = '-' _ f:PositiveFloat { return f * -1 }

PositiveFloat 'positive floating point number'
  = PositiveInteger? '.' PositiveInteger { return parseFloat(text()) }

Integer 'integer'
  = NegativeInteger
  / PositiveInteger

NegativeInteger 'negative integer'
  = '-' _ i:PositiveInteger { return i * -1 }

PositiveInteger 'positive integer'
  = [0-9]+ { return parseInt(text(), 10) }

// -----------------------------------------------------------------------------
// MISC
// -----------------------------------------------------------------------------

Variable 'variable'
  = Identifier ('.' Identifier)* { return { type: 'identifier', name: text() } }

Identifier 'identifier'
  = [a-zA-Z_] [a-zA-Z0-9_]* { return { type: 'identifier', name: text() } }

_ 'whitespace'
  = [ \t\n\r]*
