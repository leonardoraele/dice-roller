import parse from './parser/parse.js';
import add from 'lodash/add.js';
import sub from 'lodash/subtract.js';
import mul from 'lodash/multiply.js';
import div from 'lodash/divide.js';
import Throw from 'throw2';
import range from 'lodash/range.js';
import { findLowest, findHighest, filterIndex } from './util/array.js';
import get from 'lodash/fp/get.js';
import eq from 'lodash/fp/eq.js';
import gt from 'lodash/fp/gt.js';
import gte from 'lodash/fp/gte.js';
import lt from 'lodash/fp/lt.js';
import lte from 'lodash/fp/lte.js';
import { pipe, not } from 'ramda';

/**
 * @param {string} expression
 */
export default function evaluate(expression, context = {}) {
	const resolution = evaluateNode(parse(expression), context);
	return { resolution, total: resolution.value, expression };
}

function evaluateNode(node, context) {
	return RESOLVERS[node.type](node, context);
}

const RESOLVERS = {
	number: node => node,
	op(node, context) {
		if (!(node.op in RESOLVERS.op)) {
			throw new Error('Failed to evaluate expression. Cause: Invalid operator: ' + node.token);
		}
		const left = evaluateNode(node.left, context);
		const right = evaluateNode(node.right, context);
		const value = RESOLVERS.op[node.op](left.value, right.value);
		return { ...node, left, right, value };
	},
	identifier: (node, context) => ({ ...node, value: context[node.name] ?? Throw('Unknown identifier: ', node.name) }),
	fn(node, context) {
		const args = node.args.map(arg => evaluateNode(arg, context));
		const value = RESOLVERS.fn[node.name](...args.map(({ value }) => value));
		return { ...node, args, value };
	},
	roll(oldNode, context) {
		if (oldNode.modifiers.some(({ mod }) => !(mod in RESOLVERS.roll.modifiers))) {
			throw new Error(`Failed to evaluate dice modifier "${modifier.mod}". Cause: Invalid dice modifier.`);
		}

		const newNode = { type: 'roll', rolls: [], value: 0 };

		pushRolls(newNode, rollDice(oldNode.qnt, oldNode.sides));

		for (const modifier of oldNode.modifiers) {
			RESOLVERS.roll.modifiers[modifier.mod](newNode, modifier, oldNode);
		}

		return newNode;
	},
};

function rollDice(quantity, sides) {
	return range(quantity)
		.map(Math.random)
		.map(n => n * sides)
		.map(Math.ceil);
}

function pushRolls(node, rollValues) {
	node.rolls.push(...rollValues.map(roll => ({ roll })));
	node.value += rollValues.reduce((a, b) => a + b, 0);
}

function dropRolls(node, indexes, reason) {
	for (const index of indexes) {
		node.rolls[index].ignored = { reason };
		node.value -= node.rolls[index].roll;
	}
}

function dropRollsExcept(node, keepIndexes, reason) {
	const keepSet = new Set(keepIndexes);
	const dropIndexes = range(node.rolls.length)
		.filter(index => !keepSet.has(index));
	dropRolls(node, dropIndexes, reason);
}

RESOLVERS.op.sum = add;
RESOLVERS.op.sub = sub;
RESOLVERS.op.mul = mul;
RESOLVERS.op.div = div;
RESOLVERS.op.pow = Math.pow;
RESOLVERS.op.eq = eq;
RESOLVERS.op.neq = pipe(eq, not);
RESOLVERS.op.gt = gt;
RESOLVERS.op.gte = gte;
RESOLVERS.op.lt = lt;
RESOLVERS.op.lte = lte;
RESOLVERS.fn.abs = Math.abs;
RESOLVERS.fn.ceil = Math.ceil;
RESOLVERS.fn.floor = Math.floor;
RESOLVERS.fn.round = Math.round;
RESOLVERS.fn.sqrt = Math.sqrt;
RESOLVERS.fn.min = Math.min;
RESOLVERS.fn.max = Math.max;
RESOLVERS.fn.mod = (a, b) => a % b;

RESOLVERS.roll.modifiers = {
	d(node, { rangeStart, rangeEnd }) {
		assertRange({ rangeStart, rangeEnd }, 'drop (d)');
		const dropIndexes = filterIndex(node.rolls, ({ roll, ignored }) => !ignored && rangeStart <= roll && roll <= rangeEnd);
		dropRolls(node, dropIndexes, 'dropped');
	},
	dl(node, modifier) {
		assertNoRange(modifier, 'drop lowest (dl)');
		const { value: amount = 1 } = modifier;
		const rolls = node.rolls.map(get('roll'));
		const lowestIndexes = findLowest(rolls, amount);
		dropRolls(node, lowestIndexes, 'dropped');
	},
	dh(node, modifier) {
		assertNoRange(modifier, 'drop lowest (dl)');
		const { value: amount = 1 } = modifier;
		const rolls = node.rolls.map(get('roll'));
		const highestIndexes = findHighest(rolls, amount);
		dropRolls(node, highestIndexes, 'dropped');
	},
	k(node, { rangeStart, rangeEnd }) {
		assertRange({ rangeStart, rangeEnd }, 'keep (k)');
		const keepIndexes = filterIndex(node.rolls, ({ roll, ignored }) => !ignored && rangeStart <= roll && roll <= rangeEnd);
		dropRollsExcept(node, keepIndexes, 'dropped');
	},
	kh(node, modifier) {
		assertNoRange(modifier, 'drop lowest (dl)');
		const { value: amount = 1 } = modifier;
		const rolls = node.rolls.map(get('roll'));
		const highestIndexes = findHighest(rolls, amount);
		dropRollsExcept(node, highestIndexes, 'dropped');
	},
	kl(node, modifier) {
		assertNoRange(modifier, 'drop lowest (dl)');
		const { value: amount = 1 } = modifier;
		const rolls = node.rolls.map(get('roll'));
		const lowestIndexes = findLowest(rolls, amount);
		dropRollsExcept(node, lowestIndexes, 'dropped');
	},
	r(node, { value = 1, rangeStart = value, rangeEnd = rangeStart }, { sides }) {
		const rerollIndexes = filterIndex(node.rolls, ({ roll, ignored }) => !ignored && rangeStart <= roll && roll <= rangeEnd);
		dropRolls(node, rerollIndexes, 'rerolled');
		pushRolls(node, rollDice(rerollIndexes.length, sides));
	},
	'r!'(node, { value = 1, rangeStart = value, rangeEnd = rangeStart }, { sides }) {
		if (rangeStart <= 1 && rangeEnd >= sides) {
			throw new Error('Failed to evaluate "reroll recursivelly" (r!) dice modifier. Cause: Infinite reroll detected.');
		} else if ((rangeEnd - rangeStart + 1) / sides > 999/1000) {
			throw new Error('Failed to evaluate "reroll recursivelly" (r!) dice modifier. Cause: Chances of reroll are too low.');
		}
		while(true) {
			const rerollIndexes = filterIndex(
				node.rolls,
				({ roll, ignored }) => !ignored && rangeStart <= roll && roll <= rangeEnd
			);
			if (!rerollIndexes.length) {
				break;
			}
			dropRolls(node, rerollIndexes, 'rerolled');
			pushRolls(node, rollDice(rerollIndexes.length, sides));
		}
	},
	c(node, { value, rangeStart, rangeEnd }, oldNode) {
		if (value === undefined && rangeStart === undefined) {
			throw new Error('Failed to evaluate dice modifier "count (c)". Cause: Expected a numeric value or range.');
		}
		return this.cs(node, { rangeStart, rangeEnd }, oldNode);
	},
	cs(node, { value, rangeStart = value, rangeEnd = rangeStart }, { sides }) {
		rangeStart ??= sides;
		rangeEnd ??= sides;
		assertRange({ rangeStart, rangeEnd }, 'count (c)');
		node.rolls.filter(({ ignored }) => !ignored)
			.filter(({ roll }) => rangeStart <= roll && roll <= rangeEnd)
			.forEach(roll => {
				roll.count ??= 0;
				roll.count += 1;
			})
		node.value = node.rolls.filter(({ count, ignored }) => !!count && !ignored)
			.map(({ count }) => count)
			.reduce((a, b) => a + b, 0);
	},
	cf(node, { value = 1, rangeStart = value, rangeEnd = 1 }) {
		assertRange({ rangeStart, rangeEnd }, 'count (c)');
		node.rolls.filter(({ ignored }) => !ignored)
			.filter(({ roll }) => rangeStart <= roll && roll <= rangeEnd)
			.forEach(roll => {
				roll.count ??= 0;
				roll.count -= 1;
			})
		node.value = node.rolls.filter(({ count, ignored }) => typeof count === 'number' && !ignored)
			.map(({ count }) => count)
			.reduce((a, b) => a + b, 0);
	},
	min(node, { value: min }, { sides }) {
		assertValue({ value: min }, 'min');
		if (min < 1 || sides < min) {
			throw new Error('Failed to evaluate dice modifier "min". Cause: Invalid minimum value.');
		}
		node.rolls.filter(({ roll }) => roll < min)
			.forEach(roll => {
				node.value += (min - roll.roll);
				roll.roll = min;
			});
	},
	max(node, { value: max }, { sides }) {
		assertValue({ value: max }, 'max');
		if (max < 1 || sides < max) {
			throw new Error('Failed to evaluate dice modifier "max". Cause: Invalid maximum value.');
		}
		node.rolls.filter(({ roll }) => roll > max)
			.forEach(roll => {
				node.value -= (roll.roll - max);
				roll.roll = max;
			});
	},
	x() {
		// TODO
		throw new Error('Dice modifier "x" not implemented yet.');
	},
	'x!'() {
		// TODO
		throw new Error('Dice modifier "x!" not implemented yet.');
	},
};

function assertValue({ value }, modifier) {
	if (typeof value !== 'number') {
		throw new Error(`Failed to evaluate "${modifier}" dice modifier. Cause: This dice modifier expects exactly one numeric value.`);
	}
}

function assertNoRange({ rangeStart, rangeEnd }, modifier) {
	if (typeof rangeStart !== 'undefined' || typeof rangeEnd !== 'undefined') {
		throw new Error(`Failed to evaluate "${modifier}" dice modifier. Cause: Modifier should not have a range.`);
	}
}

function assertRange({ rangeStart, rangeEnd }, modifier) {
	if (typeof rangeStart !== 'number' || typeof rangeEnd !== 'number') {
		throw new Error(`Failed to evaluate "${modifier}" dice modifier. Cause: Modifier should have a range.`);
	} else if (rangeStart > rangeEnd) {
		throw new Error(`Failed to evaluate "${modifier}" dice modifier. Cause: Invalid range.`);
	}
}

export function toString(evaluationResult) {
	return nodeToString(evaluationResult.resolution);
}

function nodeToString(node) {
	return nodeToString[node.type]?.(node) ?? `(${JSON.stringify(node)})`;
}

nodeToString.number = node => String(node.value);

nodeToString.op = node => {
	const left = node.left.type === 'op'
		? `(${nodeToString(node.left)})`
		: nodeToString(node.left);
	const right = node.right.type === 'op'
		? `(${nodeToString(node.right)})`
		: nodeToString(node.right);
	const op = OP_SYMBOLS[node.op];
	return [left, op, right].join(' ');
};

const OP_SYMBOLS = {
	eq: '==',
	neq: '!=',
	lt: '<',
	lte: '<=',
	gt: '>',
	gte: '>=',
	sum: '+',
	sub: '-',
	mul: '×',
	div: '÷',
	pow: '^',
};

nodeToString.identifier = node => `{${node.name}: ${node.value}}`

nodeToString.fn = node => `{${node.name}(${node.args.map(nodeToString).join(', ')}): ${node.value}}`;

nodeToString.roll = node => `[${node.rolls.map(({ roll, ignored }) => ignored ? `~${roll}` : roll).join(', ')}]`;
