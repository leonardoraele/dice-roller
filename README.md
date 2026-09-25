# @leonardoraele/dice-roller

`@leonardoraele/dice-roller` is a small ESM library for parsing and evaluating dice notation mixed with arithmetic expressions. It is useful for tabletop RPG rolls, probability helpers, and any workflow that needs both random dice rolls and expression parsing.

## Installation

```bash
npm install @leonardoraele/dice-roller
```

**Requirements:** Node.js 16+

## How to use

### Import the library

```js
import { evaluate, parse, toString } from '@leonardoraele/dice-roller';
```

### Evaluate a simple roll

```js
const result = evaluate('2d6 + 3');

console.log(result.total);       // number between 5 and 15
console.log(result.expression);  // '2d6 + 3'
console.log(result.resolution);  // resolved AST with roll details
```

### Format a roll result

```js
const result = evaluate('4d6dl1');

console.log(toString(result));
// Example: [6, 5, 4, ~2]
```

Ignored rolls are prefixed with `~` in the formatted output.

### Parse without rolling

```js
const ast = parse('2d20kh1 + 5');

console.log(ast);
// {
//   type: 'op',
//   op: 'sum',
//   left: {
//     type: 'roll',
//     qnt: 2,
//     sides: 20,
//     modifiers: [{ mod: 'kh', value: 1 }]
//   },
//   right: { type: 'number', value: 5 }
// }
```

### Use variables in expressions

```js
const result = evaluate('(str + dex) / 2', {
  str: 14,
  dex: 12,
});

console.log(result.total); // 13
```

Identifiers are looked up from the `context` object by name.

### Built-in math functions

Supported functions are:

- `abs(...)`
- `ceil(...)`
- `floor(...)`
- `round(...)`
- `sqrt(...)`
- `min(...)`
- `max(...)`
- `mod(a, b)`

```js
console.log(evaluate('max(1d4, 2) + floor(3.8)').total);
```

### Supported operators

Arithmetic:

- `+`
- `-`
- `*`
- `/`
- `^` or `**`

Comparisons:

- `=` / `==` / `===`
- `!=` / `!==` / `<>`
- `<`
- `<=`
- `>`
- `>=`

Comparison expressions evaluate to booleans:

```js
console.log(evaluate('abs(-5) === 5').total); // true
```

### Dice notation examples

#### Basic rolls

- `d20`
- `2d6`
- `4d8 + 3`
- `2d20kh1 + 5`

#### Keep and drop modifiers

- `4d6dl1` — drop the lowest die
- `2d20kh1` — keep the highest die
- `2d20kl1` — keep the lowest die
- `5d6dh2` — drop the highest two dice
- `8d10k7..10` — keep rolls in the given range
- `8d10d1..2` — drop rolls in the given range

#### Reroll modifiers

- `1d20r` — reroll `1`s once
- `2d6r1..2` — reroll `1` and `2` once
- `1d4r!2..3` — recursively reroll while the value is between `2` and `3`

#### Count modifiers

- `8d2c1..1` — count matching results
- `8d10cs7..10` — count successes in the range
- `4d6cf1..2` — count failures in the range

#### Minimum and maximum modifiers

- `4d20min15` — clamp each die to at least `15`
- `4d20max5` — clamp each die to at most `5`

#### Unsupported modifiers

- `x`
- `x!`

These explode modifiers are recognized by `parse()`, but `evaluate()` currently throws because they are not implemented yet.

## API reference

### `evaluate(expression, context?)`

Evaluates a dice or math expression and returns an object with:

- `expression` — the original input string
- `total` — the final evaluated value (`number` for arithmetic and dice expressions, `boolean` for comparisons)
- `resolution` — the resolved syntax tree, including roll details

Parameters:

- `expression: string` — expression to parse and evaluate
- `context?: object` — optional variables used by identifiers in the expression

Notes:

- Rolls are generated with `Math.random()`.
- Dice results are stored in `resolution.rolls`.
- Dropped or rerolled dice are marked in the roll metadata.
- Expressions that use `x` or `x!` currently throw because explode evaluation is not implemented.

### `parse(expression)`

Parses an expression and returns its AST without evaluating it.

Parameters:

- `expression: string`

Returned node shapes include:

- number nodes: `{ type: 'number', value }`
- identifier nodes: `{ type: 'identifier', name }`
- function nodes: `{ type: 'fn', name, args }`
- operation nodes: `{ type: 'op', op, left, right }`
- roll nodes: `{ type: 'roll', qnt, sides, modifiers }`

### `toString(evaluationResult)`

Formats an evaluated result into a readable string.

Examples:

- `evaluate('1')` → `'1'`
- `evaluate('1d20')` → `'[17]'` (example)
- `evaluate('4d6dl1')` → `'[6, 5, 4, ~2]'` (example)

## Development

```bash
npm test
npm run build
```
