import evaluate from './evaluate.js';
import { describe, test } from 'mocha';
import { expect } from 'chai';
import range from 'lodash/range.js';
import get from 'lodash/fp/get.js';
// TODO ramda does not support direct submodule imports (i.e. tree-shakable imports) compatible with esm node >= 17
// but this issue have already been fixed and should be published in version 0.28.X, 0.29.0, or 1.0.0; once it is, the
// following imports should be updated. See: https://github.com/ramda/ramda/issues/3236
// import pipe from 'ramda/es/pipe.js';
// import not from 'ramda/es/not.js';
import { pipe, not } from 'ramda';

describe('evaluate', () => {
	const id = name => ({ type: 'identifier', name });
	const num = value => ({ type: 'number', value });
	const resolve = value => typeof value === 'number' ? num(value)
		: typeof value === 'string' ? id(value)
		: value;
	const op = op => (left, right, value) => ({ type: 'op', op, left: resolve(left), right: resolve(right), value });
	const sum = op('sum');
	const sub = op('sub');
	const mul = op('mul');
	const div = op('div');
	const pow = op('pow');

	test('numbers', () => {
		expect(evaluate('1')).to.deep.equal({ resolution: num(1), total: 1 });
		expect(evaluate('1.2')).to.deep.equal({ resolution: num(1.2), total: 1.2 });
		expect(evaluate('0')).to.deep.equal({ resolution: num(0), total: 0 });
		expect(evaluate('-2')).to.deep.equal({ resolution: num(-2), total: -2 });
		expect(evaluate('-2.4')).to.deep.equal({ resolution: num(-2.4), total: -2.4 });
		expect(evaluate('-0')).to.deep.equal({ resolution: num(-0), total: -0 });
		expect(evaluate('.2')).to.deep.equal({ resolution: num(.2), total: .2 });
	});

	describe('arithmetics', () => {
		test('simple arithmetics', () => {
			expect(evaluate('1 + 3')).to.deep.equal({ resolution: sum(1, 3, 4), total: 4 });
			expect(evaluate('1 - 3')).to.deep.equal({ resolution: sub(1, 3, -2), total: -2 });
			expect(evaluate('1.2 + 0.85')).to.deep.equal({ resolution: sum(1.2, 0.85, 2.05), total: 2.05 });
			expect(evaluate('3 * 3')).to.deep.equal({ resolution: mul(3, 3, 9), total: 9 });
			expect(evaluate('9 / 3')).to.deep.equal({ resolution: div(9, 3, 3), total: 3 });
			expect(evaluate('2 ^ 3')).to.deep.equal({ resolution: pow(2, 3, 8), total: 8 });
			expect(evaluate('2 ** 3')).to.deep.equal({ resolution: pow(2, 3, 8), total: 8 });
			expect(evaluate('1.2 ^ 3.4')).to.deep.equal({ resolution: pow(1.2, 3.4, Math.pow(1.2, 3.4)), total: Math.pow(1.2, 3.4) });
		});

		test('signals', () => {
			expect(evaluate('-2 -3 -4')).to.deep.match({ total: -9 });
			expect(evaluate('-2 + -3 + -4')).to.deep.match({ total: -9 });
			expect(evaluate('-2 - -3 - -4')).to.deep.match({ total: 5 });
		});

		test('parenthesis and evaluation order', () => {
			expect(evaluate('2 + 3 + 4')).to.deep.match({ total: 9 });
			expect(evaluate('2 + 3 * 4')).to.deep.match({ total: 14 });
			expect(evaluate('2 * 3 + 4')).to.deep.match({ total: 10 });
			expect(evaluate('2 * 3 * 4')).to.deep.match({ total: 24 });
			expect(evaluate('(2 + 3) * 4')).to.deep.match({ total: 20 });
			expect(evaluate('2 * (3 + 4)')).to.deep.match({ total: 14 });
			expect(evaluate('2 * 4 / 5')).to.deep.match({ total: 1.6 });
			expect(evaluate('2 / 4 * 5')).to.deep.match({ total: 2.5 });
			expect(evaluate('2 ^ 4 * 5 + 6')).to.deep.match({ total: 86 });
			expect(evaluate('2 * 4 ^ 5 + 2')).to.deep.match({ total: 2050 });
			expect(evaluate('2 + 4 ^ 5 * 2')).to.deep.match({ total: 2050 });
			expect(evaluate('2 * 4 + 5 ^ 2')).to.deep.match({ total: 33 });
			expect(evaluate('2 * (4 + 5) ^ 2')).to.deep.match({ total: 162 });
			expect(evaluate('(2 * (4 + 5)) ^ 2')).to.deep.match({ total: 324 });
		});
	});

	describe('dice rolls', () => {
		test('simple dice roll', () => {
			range(1000).forEach(() => {
				const d20 = evaluate('d20');

				expect(d20.total).to.be.a('number').within(1, 20);
				expect(d20.resolution.type).to.equal('roll');
				expect(d20.resolution.value).to.equal(d20.total);
				expect(d20.resolution.rolls).to.be.an('array').with.lengthOf(1);
				expect(d20.resolution.rolls[0].roll).to.equal(d20.total);

				const many = evaluate('3d6');

				expect(many.total).to.be.a('number').within(3, 18);
				expect(many.resolution.type).to.equal('roll');
				expect(many.resolution.value).to.equal(many.total);
				expect(many.resolution.rolls).to.be.an('array').with.lengthOf(3);
				expect(many.resolution.rolls.map(({ roll }) => roll).reduce((a, b) => a + b, 0)).to.equal(many.total);
			});
		});

		describe('drop dice modifier', () => {
			test('drop lowest', () => {
				range(1000).forEach(() => {
					const roll = evaluate('5d6dl2');
					const dropped = roll.resolution.rolls.filter(get('ignored'));
					const kept = roll.resolution.rolls.filter(pipe(get('ignored'), not));

					expect(dropped).to.have.lengthOf(2);
					expect(dropped.map(get('roll')).sort())
						.to.deep.equal(roll.resolution.rolls.map(get('roll')).sort().slice(0, 2));
					expect(roll.total).to.equal(roll.resolution.value);
					expect(roll.total).to.equal(kept.map(get('roll')).reduce((a, b) => a + b, 0));
				});
			});
			test('drop highest', () => {
				range(1000).forEach(() => {
					const roll = evaluate('5d6dh2');
					const dropped = roll.resolution.rolls.filter(get('ignored'));
					const kept = roll.resolution.rolls.filter(pipe(get('ignored'), not));

					expect(dropped).to.have.lengthOf(2);
					expect(roll.total).to.be.within(3, 18);
					expect(dropped.map(get('roll')).sort()[0])
						.to.be.greaterThanOrEqual(kept.map(get('roll')).sort().at(-1));
				});
			});
		});

		describe('keep dice modifier', () => {
			test('keep highest one', () => {
				range(1000).forEach(() => {
					const roll = evaluate('2d20kh');
					expect(roll.total).to.equal(roll.resolution.value);
					expect(roll.total).to.be.within(1, 20);
					expect(roll.resolution.rolls.find(get('ignored')).roll)
						.to.be.lessThanOrEqual(roll.resolution.rolls.find(pipe(get('ignored'), not)).roll);
				});
			});
			test('keep lowest one', () => {
				range(1000).forEach(() => {
					const roll = evaluate('2d20kl');
					expect(roll.total).to.equal(roll.resolution.value);
					expect(roll.total).to.be.within(1, 20);
					expect(roll.resolution.rolls.find(get('ignored')).roll)
						.to.be.greaterThanOrEqual(
							roll.resolution.rolls.find(pipe(get('ignored'), not)).roll
						);
				});
			});
			test('keep highest many', () => {
				range(1000).forEach(() => {
					const roll = evaluate('5d6kh3');
					expect(roll.total).to.equal(roll.resolution.value);
					expect(roll.total).to.be.within(3, 18);
					expect(roll.resolution.rolls.filter(get('ignored')).map(get('roll')).sort().at(-1))
						.to.be.lessThanOrEqual(
							roll.resolution.rolls.filter(pipe(get('ignored'), not))
								.map(get('roll'))
								.sort()
								[0]
						);
				});
			});
			test('keep lowest many', () => {
				range(1000).forEach(() => {
					const roll = evaluate('5d6kl3');
					expect(roll.total).to.equal(roll.resolution.value);
					expect(roll.total).to.be.within(3, 18);
					expect(roll.resolution.rolls.filter(get('ignored')).map(get('roll')).sort()[0])
						.to.be.greaterThanOrEqual(
							roll.resolution.rolls.filter(pipe(get('ignored'), not))
								.map(get('roll'))
								.sort()
								.at(-1)
						);
				});
			});
		});

		describe('reroll modifier', () => {
			test('reroll once', () => {
				range(1000).forEach(() => {
					const roll = evaluate('1d2r');

					if (roll.resolution.rolls.length === 1) {
						expect(roll.resolution.rolls[0].roll).to.equal(2);
					} else {
						expect(roll.resolution.rolls.length).to.equal(2);
						expect(roll.resolution.rolls.filter(get('ignored')).length).to.equal(1);
					}
				});
			});
			test('reroll range', () => {
				range(1000).forEach(() => {
					const roll = evaluate('1d4r2..3');

					if (roll.resolution.rolls.length === 1) {
						expect([1, 4]).to.include(roll.resolution.rolls[0].roll);
					} else {
						expect([2, 3]).to.include(roll.resolution.rolls.filter(get('ignored'))[0].roll);
						expect(roll.resolution.rolls.length).to.equal(2);
						expect(roll.resolution.rolls.filter(get('ignored')).length).to.equal(1);
					}
				});
			});
			test('reroll recusivelly without range', () => {
				range(1000).forEach(() => {
					expect(evaluate('1d2r!').total).to.equal(2);
				});
			});
			test('reroll recusivelly in range', () => {
				range(1000).forEach(() => {
					expect([1, 4]).to.include(evaluate('1d4r!2..3').total);
				});
			});
			test('recursive reroll limit', () => {
				expect(evaluate('1d1000r!1..999').total).to.equal(1000);
				expect(() => evaluate('1d1001r!1..1000')).to.throw();
				expect(() => evaluate('1d10r!1..10')).to.throw();
			});
		});

		describe('count modifier', () => {
			test('count successes', () => {
				range(1000).forEach(() => {
					expect(evaluate('1d1cs').total).to.equal(1);
					expect(evaluate('1d1cs1').total).to.equal(1);
					expect(evaluate('1d1cs1..1').total).to.equal(1);
					expect(evaluate('7d10cs1..10').total).to.equal(7);
					expect(evaluate('7d10cs11..20').total).to.equal(0);
					expect(evaluate('7d10cs7..10').total).to.be.within(0, 10);

					expect(() => evaluate('1d1c')).to.throw();
					expect(evaluate('1d1c1').total).to.equal(1);
					expect(evaluate('1d1c1..1').total).to.equal(1);
					expect(evaluate('7d10c1..10').total).to.equal(7);
					expect(evaluate('7d10c11..20').total).to.equal(0);
					expect(evaluate('7d10c7..10').total).to.be.within(0, 10);

					const roll = evaluate('2d2c2..2');

					if (roll.total === 0) {
						expect(roll.resolution.rolls.map(get('roll'))).to.deep.equal([1, 1]);
					} else if (roll.total === 1) {
						expect(
							roll.resolution.rolls[0].roll === 1 && roll.resolution.rolls[1].roll === 2
							|| roll.resolution.rolls[0].roll === 2 && roll.resolution.rolls[1].roll === 1
						).to.be.true;
					} else if (roll.total === 2) {
						expect(roll.resolution.rolls.map(get('roll'))).to.deep.equal([2, 2]);
					} else {
						expect.fail(`roll.total should be between [0, 2]. It is: ${roll.total}`);
					}
				});
			});
			test('count failures', () => {
				range(1000).forEach(() => {
					expect(evaluate('1d1cf').total).to.equal(-1);
					expect(evaluate('1d1cf1').total).to.equal(-1);
					expect(evaluate('1d1cf1..1').total).to.equal(-1);
					expect(evaluate('4d6cf1..6').total).to.equal(-4);
					expect(evaluate('4d6cf1..3').total).to.be.within(-4, 0);
					expect(evaluate('4d6cs5..6cf1..2').total).to.be.within(-4, 4);
					expect(evaluate('4d6cs1..6cf1..2').total).to.be.within(0, 4);
				});
			});
		});

		test('min modifier', () => {
			range(1000).forEach(() => {
				expect(evaluate('4d20min15').total).to.be.within(60, 80);
				expect(evaluate('1d6min6').total).to.equal(6);
			});
			expect(() => evaluate('1d20min')).to.throw();
			expect(() => evaluate('1d20min0')).to.throw();
			expect(() => evaluate('1d20min21')).to.throw();
			expect(() => evaluate('1d20min1..5')).to.throw();
		});

		test('max modifier', () => {
			range(1000).forEach(() => {
				expect(evaluate('4d20max5').total).to.be.within(4, 20);
				expect(evaluate('1d6max1').total).to.equal(1);
			});
			expect(() => evaluate('1d20max')).to.throw();
			expect(() => evaluate('1d20max0')).to.throw();
			expect(() => evaluate('1d20max21')).to.throw();
			expect(() => evaluate('1d20max1..5')).to.throw();
		});
	});

	test('expressions with dice and numbers', () => {
		range(1000).forEach(() => {
			expect(evaluate('1d6 + 4').total).to.be.within(5, 10);
			expect(evaluate('1d6 / 1d6').total).to.be.within(1/6, 6/1);
			expect(evaluate('10 * 1d6').total).to.be.within(10, 60);
			expect(evaluate('5 - d10').total).to.be.within(-5, 4);
			expect([2, 4, 8, 16, 32, 64, 128, 256]).to.be.include(evaluate('2 ^ 1d8').total);
			expect([1, 2, 4, 8, 16, 32, 64, 128]).to.be.include(evaluate('2 ** (1d8 - 1)').total);
		});
	});

	describe('functions', () => {
		test('with numbers', () => {
			expect(evaluate('ceil(1)').total).to.equal(1);
			expect(evaluate('ceil(1.5)').total).to.equal(2);
			expect(evaluate('floor(2)').total).to.equal(2);
			expect(evaluate('floor(2.5)').total).to.equal(2);
			expect(evaluate('round(3)').total).to.equal(3);
			expect(evaluate('round(3.49)').total).to.equal(3);
			expect(evaluate('round(3.5)').total).to.equal(4);
			expect(evaluate('round(4)').total).to.equal(4);
			expect(evaluate('abs(5)').total).to.equal(5);
			expect(evaluate('abs(-5)').total).to.equal(5);
			expect(evaluate('sqrt(9)').total).to.equal(3);
			expect(evaluate('min(4, 2, 3, 5)').total).to.equal(2);
			expect(evaluate('max(4, 3, 5, 2)').total).to.equal(5);
		});
		test.skip('with dice', () => {
			range(1000).forEach(() => {
				expect(evaluate('max(1d4, 1d10 + 4, 3)').total).to.be.at.least(5);
				expect(evaluate('ceil(1d10 / 10) * 4').total).to.equal(4);
				expect(evaluate('abs(1 - 1d20)').total).to.be.at.most(0);
				expect(evaluate('mod(round(1d8 / 10), 1)').total).to.equal(0);
			});
		});
		test('invalid', () => {
			expect(() => evaluate('foo()')).to.throw();
		});
	});

	test('compare', () => {
		expect(evaluate('abs(5) === abs(-5)').total).to.equal(true);
		expect(evaluate('abs(5) !== abs(-5)').total).to.equal(false);
		expect(evaluate('1d10 <= 10').total).to.equal(true);
	});

	test('identifiers', () => {
		expect(evaluate('str', { str: 3 }).total).to.equal(3);
		expect(evaluate('(one + two) * three', { one: 1, two: 2, three: 3 }).total).to.equal(9);

		range(1000).forEach(() => {
			expect(evaluate('1d8 + str', { str: 3 }).total).to.be.within(4, 11);
		});

		expect(() => evaluate('10 + foo', { bar: 1 })).to.throw();
	});

	test('invalid modifiers', () => {
		expect(() => evaluate('1d20foo')).to.throw();
		expect(() => evaluate('1d20foo1')).to.throw();
		expect(() => evaluate('1d20foo1..2')).to.throw();
		expect(() => evaluate('1d20bar')).to.throw();
		expect(() => evaluate('1d20bar1')).to.throw();
		expect(() => evaluate('1d20bar1..2')).to.throw();
		expect(() => evaluate('1d20!')).to.throw();
		expect(() => evaluate('1d20!1')).to.throw();
		expect(() => evaluate('1d20!1..2')).to.throw();
	});
});
