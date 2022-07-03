import parse from './parse.js';
import { expect } from 'chai';
import { describe, test } from 'mocha';

describe('parser', () => {
	const id = name => ({ type: 'identifier', name });
	const num = value => ({ type: 'number', value });
	const evaluate = value => typeof value === 'number' ? num(value)
		: typeof value === 'string' ? id(value)
		: value;
	const op = op => (left, right) => ({ type: 'op', op, left: evaluate(left), right: evaluate(right) });
	const sum = op('sum');
	const sub = op('sub');
	const mul = op('mul');
	const div = op('div');
	const pow = op('pow');
	const cmp = (op, opToken) =>
		(left, right, token = opToken) =>
		({ type: 'op', op, left: evaluate(left), right: evaluate(right), token });
	const eq = cmp('eq');
	const neq = cmp('neq');
	const gt = cmp('gt', '>');
	const gte = cmp('gte', '>=');
	const lt = cmp('lt', '<');
	const lte = cmp('lte', '<=');
	const fn = (name, ...args) => ({ type: 'fn', name, args: args.map(evaluate) });

	test('parse numbers', () => {
		expect(parse('1')).to.deep.equal(num(1));
		expect(parse('1.2')).to.deep.equal(num(1.2));
		expect(parse('0')).to.deep.equal(num(0));
		expect(parse('-2')).to.deep.equal(num(-2));
		expect(parse('-2.4')).to.deep.equal(num(-2.4));
		expect(parse('-0')).to.deep.equal(num(-0));
	});

	test('parse dice expressions', () => {
		expect(parse('1d20')).to.deep.equal({ type: 'roll', qnt: 1, sides: 20, modifiers: [] });
		expect(parse('d6')).to.deep.equal({ type: 'roll', qnt: 1, sides: 6, modifiers: [] });
	});

	test('parse dice modifiers', () => {
		// Even advantage
		expect(parse('3d20kh1')).to.deep.equal({ type: 'roll', qnt: 3, sides: 20, modifiers: [{ mod: 'kh', value: 1 }] });
		expect(parse('3d20dl2')).to.deep.equal({ type: 'roll', qnt: 3, sides: 20, modifiers: [{ mod: 'dl', value: 2 }] });
		// Disadvantage
		expect(parse('2d20dh1')).to.deep.equal({ type: 'roll', qnt: 2, sides: 20, modifiers: [{ mod: 'dh', value: 1 }] });
		expect(parse('2d20kl1')).to.deep.equal({ type: 'roll', qnt: 2, sides: 20, modifiers: [{ mod: 'kl', value: 1 }] });
		// Stats
		expect(parse('4d6dl1')).to.deep.equal({ type: 'roll', qnt: 4, sides: 6, modifiers: [{ mod: 'dl', value: 1 }] });
		// Keep/drop shorts
		expect(parse('1d1dl')).to.deep.match({ modifiers: [{ mod: 'dl' }] });
		expect(parse('1d1dh')).to.deep.match({ modifiers: [{ mod: 'dh' }] });
		expect(parse('1d1kl')).to.deep.match({ modifiers: [{ mod: 'kl' }] });
		expect(parse('1d1kh')).to.deep.match({ modifiers: [{ mod: 'kh' }] });
		// Halfling luck
		expect(parse('1d20r')).to.deep.equal({ type: 'roll', qnt: 1, sides: 20, modifiers: [{ mod: 'r' }] });
		// Fighting style: Great weapon
		expect(parse('2d6r1..2')).to.deep.equal({ type: 'roll', qnt: 2, sides: 6, modifiers: [{ mod: 'r', rangeStart: 1, rangeEnd: 2 }] });
		// Other reroll modifiers
		expect(parse('4d8r!')).to.deep.match({ modifiers: [{ mod: 'r!' }] });
		expect(parse('4d8r!1..4')).to.deep.match({ modifiers: [{ mod: 'r!', rangeStart: 1, rangeEnd: 4 }] });
		expect(parse('4d8r!8..8')).to.deep.match({ modifiers: [{ mod: 'r!', rangeStart: 8, rangeEnd: 8 }] });
		// Explode
		expect(parse('1d6x')).to.deep.match({ modifiers: [{ mod: 'x' }] });
		expect(parse('1d6x!')).to.deep.match({ modifiers: [{ mod: 'x!' }] });
		expect(parse('1d10x9..10')).to.deep.match({ modifiers: [{ mod: 'x', rangeStart: 9, rangeEnd: 10 }] });
		expect(parse('1d6x!4..4')).to.deep.match({ modifiers: [{ mod: 'x!', rangeStart: 4, rangeEnd: 4 }] });
		// Counts the number of heads in 8 coins
		expect(parse('8d2c')).to.deep.match({ modifiers: [{ mod: 'c' }] });
		// Counts the number of d10's >= 7 in 8d10
		expect(parse('8d10c7..10')).to.deep.match({ modifiers: [{ mod: 'c', rangeStart: 7, rangeEnd: 10 }] });
		// Multiple modifiers in a single roll
		expect(parse('8d10dh1kh8dl1r2..3x!c')).to.deep.equal({ type: 'roll', qnt: 8, sides: 10, modifiers: [
			{ mod: 'dh', value: 1 },
			{ mod: 'kh', value: 8 },
			{ mod: 'dl', value: 1 },
			{ mod: 'r', rangeStart: 2, rangeEnd: 3 },
			{ mod: 'x!' },
			{ mod: 'c' },
		] });
	});

	test('invalid modifier range', () => {
		expect(() => parse('1d20c7..3')).to.throw();
	});

	test('parse arithmetic operations with numbers only', () => {
		[
			{ expression: '1 + 2', op: 'sum', left: 1, right: 2 },
			{ expression: '5 - 2', op: 'sub', left: 5, right: 2 },
			{ expression: '-5 + 2', op: 'sum', left: -5, right: 2 },
			{ expression: '2 - -1', op: 'sub', left: 2, right: -1 },
			{ expression: '2 * 11', op: 'mul', left: 2, right: 11 },
			{ expression: '-5 * 3', op: 'mul', left: -5, right: 3 },
			{ expression: '3 * -5', op: 'mul', left: 3, right: -5 },
			{ expression: '1 * 1', op: 'mul', left: 1, right: 1 },
			{ expression: '-1 * -1', op: 'mul', left: -1, right: -1 },
			{ expression: '56 / 7', op: 'div', left: 56, right: 7 },
			{ expression: '-56 / 7', op: 'div', left: -56, right: 7 },
			{ expression: '5 / 10', op: 'div', left: 5, right: 10 },
			{ expression: '5 / -10', op: 'div', left: 5, right: -10 },
			{ expression: '1 / 1', op: 'div', left: 1, right: 1 },
			{ expression: '-1 / -1', op: 'div', left: -1, right: -1 },
			{ expression: '2 ^ 4', op: 'pow', left: 2, right: 4 },
			{ expression: '2 ** 4', op: 'pow', left: 2, right: 4 },
		].forEach(({ expression, op, left, right }) => {
			expect(parse(expression)).to.deep.equal({
				type: 'op',
				op,
				left: num(left),
				right: num(right),
			});
		})
	});

	test('parse arithmetic operations with numbers and parenthesis', () => {
		expect(parse('2 * (3 + 2)')).to.deep.equal(mul(2, sum(3, 2)));
		expect(parse('(-3 -5) / ((0))')).to.deep.equal(div(sub(-3, 5), 0));
		expect(parse('1 + 2 * 3 + 4')).to.deep.equal(sum(sum(1, mul(2, 3)), 4));
		expect(parse('1 ** 2 * 3 + 4')).to.deep.equal(sum(mul(pow(1, 2), 3), 4));
		expect(parse('1 + 2 ** 3 * 4')).to.deep.equal(sum(1, mul(pow(2, 3), 4)));
		expect(parse('1 + 2 ** (3 * 4)')).to.deep.equal(sum(1, pow(2, mul(3, 4))));
		expect(parse('(1 + 2) ** (3 * 4)')).to.deep.equal(pow(sum(1, 2), mul(3, 4)));
		expect(parse('1 * 2 / 3')).to.deep.equal(div(mul(1, 2), 3));
		expect(parse('1 / 2 * 3')).to.deep.equal(mul(div(1, 2), 3));
	});

	test('parse dice expressions with arithmetics', () => {
		expect(parse('2d20dl1 + 5')).to.deep.equal({ type: 'op', op: 'sum', left: { type: 'roll', qnt: 2, sides: 20, modifiers: [{ mod: 'dl', value: 1 }] }, right: num(5) });
		expect(parse('1d8 + 3')).to.deep.equal({ type: 'op', op: 'sum', left: { type: 'roll', qnt: 1, sides: 8, modifiers: [] }, right: num(3) });
	});

	test('parse comparison operators', () => {
		expect(parse('1 > 2')).to.deep.equal(gt(1, 2));
		expect(parse('1 + 2 <= 3')).to.deep.equal(lte(sum(1, 2), 3));
		expect(parse('1 = 1')).to.deep.equal(eq(1, 1, '='));
		expect(parse('1 == 1')).to.deep.equal(eq(1, 1, '=='));
		expect(parse('1 === 1')).to.deep.equal(eq(1, 1, '==='));
		expect(parse('1 != 1')).to.deep.equal(neq(1, 1,  '!='));
		expect(parse('1 !== 1')).to.deep.equal(neq(1, 1, '!=='));
		expect(parse('1 <> 1')).to.deep.equal(neq(1, 1, '<>'));
		expect(parse('(2 == 2) == 1')).to.deep.equal(eq(eq(2, 2, '=='), 1, '=='));
		expect(() => parse('1 == 1 == 2')).to.throw();
	});

	test('identifiers', () => {
		expect(id('pipoca')).to.deep.equal({ type: 'identifier', name: 'pipoca' });
		expect(parse('pipoca')).to.deep.equal(id('pipoca'));
		expect(parse('PIPOCA')).to.deep.equal(id('PIPOCA'));
		expect(parse('pIpOcA')).to.deep.equal(id('pIpOcA'));
		expect(parse('__pipoca__')).to.deep.equal(id('__pipoca__'));
		expect(parse('str * 15')).to.deep.equal(mul('str', 15));
		expect(parse('(int + wis + cha) / (dex * (str + con))')).to.deep.equal(
			div(
				sum(sum('int', 'wis'), 'cha'),
				mul('dex', sum('str', 'con'))
			),
		);
		expect(parse('deeply.nested.property')).to.deep.equal(id('deeply.nested.property'));
		expect(() => parse('nested..invalid')).to.throw();
		expect(() => parse('.invalid')).to.throw();
		expect(() => parse('0invalid')).to.throw();
		expect(() => parse('-invalid')).to.throw();
		expect(() => parse('-invalid')).to.throw();
	});

	test('functions', () => {
		expect(fn('pipoca')).to.deep.equal({ type: 'fn', name: 'pipoca', args: [] });
		expect(fn('pipoca', 1, 'dex')).to.deep.equal({ type: 'fn', name: 'pipoca', args: [
			{ type: 'number', value: 1 },
			{ type: 'identifier', name: 'dex' },
		] });
		expect(parse('pipoca()')).to.deep.equal(fn('pipoca'));
		expect(parse('sqrt(9)')).to.deep.equal(fn('sqrt', 9));
		expect(parse('ceil(1.2)')).to.deep.equal(fn('ceil', 1.2));
		expect(parse('floor(-1.4)')).to.deep.equal(fn('floor', -1.4));
		expect(parse('max(1, 2, 3.4, -5.6, 7, infinity)')).to.deep.equal(fn('max', 1, 2, 3.4, -5.6, 7, 'infinity'));
	});
});
