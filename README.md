# `@leonardoraele/dice-roller`

This lib parses and evaluates dice expressions (e.g. `1d20` or `3d6`) and arithmetic operations.
Intended to be used by TTRPG-related apps that allow users to perform dice rolls via text-based dice expressions.

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

- `abs(n: number)`
- `ceil(n: number)`
- `floor(n: number)`
- `round(n: number)`
- `sqrt(n: number)`
- `min(a: number, b: number)` Returns the lower value
- `max(a: number, b: number)` Returns the greater value
- `mod(a, b)` Similar to `%` operator in JavaScript and other languages

```js
console.log(evaluate('max(1d4, 2) + floor(3.8)').total);
// Prints 5, 6, or 7; never 4.
```

### Supported operators

Arithmetic:

- `+`
- `-`
- `*`
- `/`
- `^` or `**` (exponent)

Comparisons:

- `=` | `==` | `===`
- `!=` | `!==` | `<>`
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

- `d20` Rolls one 20-sided die.
- `2d6` Rolls two 6-sided dice and sum the results.
- `4d8 + 3` Rolls four 8-sided dice, sum the results, then add 3 to the total.
- `2d20kh1 + 5` Rolls two 20-sided dice, keep the highest one, then add 5 to it.

#### Keep and drop modifiers

- `4d6dl1` — drop the lowest die
- `2d20kh1` — keep the highest die
- `2d20kl1` — keep the lowest die
- `5d6dh2` — drop the highest two dice
- `8d10k7..10` — keep rolls in the given range, inclusive
- `8d10d1..2` — drop rolls in the given range, inclusive

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

- `x` — explode, or roll an extra die when a result matches the explode condition
- `x!` — recursive explode, or keep exploding while the condition matches

These explode modifiers are recognized by `parse()`, but `evaluate()` currently throws because explode evaluation is not implemented yet.

## API reference

### `evaluate(expression: string, context?: Record<string, number>): object`

Evaluates a dice or math expression and returns an object with:

- `expression: string` — the original input string
- `total: number | boolean` — the final evaluated value (`number` for arithmetic and dice expressions, `boolean` for comparisons)
- `resolution: object` — the resolved syntax tree, including roll details

Parameters:

- `expression: string` — expression to parse and evaluate
- `context?: object` — optional variables used by identifiers in the expression

Notes:

- Rolls are generated with `Math.random()`.
- Dice results are stored in `resolution.rolls`.
- Dropped or rerolled dice are marked in the roll metadata.
- Expressions that use the explode modifiers `x` or `x!` currently throw because explode evaluation is not implemented.

### `parse(expression: string): object`

Parses an expression and returns its AST without evaluating it.

Returned node shapes include:

- number nodes: `{ type: 'number', value }`
- identifier nodes: `{ type: 'identifier', name }`
- function nodes: `{ type: 'fn', name, args }`
- operation nodes: `{ type: 'op', op, left, right }`
- roll nodes: `{ type: 'roll', qnt, sides, modifiers }`

### `toString(evaluationResult: object): string`

Formats an evaluated result into a readable string.

Examples:

- `evaluate('1')` → `'1'`
- `evaluate('1d20')` → `'[17]'` (example)
- `evaluate('4d6dl1')` → `'[6, 5, 4, ~2]'` (example)

## Development

Clone the repo and install dependencies:

```bash
git clone $REPO_URI dice-roller
cd dice-roller
npm install
```

Run tests:

```
npm test
```

## License

MIT. Full license text at [license.txt](./license.txt).
