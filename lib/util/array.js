import createTree from 'functional-red-black-tree';
import { flow } from './fp.js';

/**
 * Find the lowest value items in an array close to O(n).
 * @param {Array} list
 * @param {number} amount
 * @param {(item: any) => number} getValue Function invoked for each item to determine its ordering value.
 * @returns {number[]} An array of indexes for the items with the lowest value.
 */
export function findLowest(list, amount = 1, getValue = item => item.valueOf()) {
	const initialTree = list.slice(0, amount)
		.reduce((tree, item, index) => tree.insert(getValue(item), index), createTree());
	const finalTree = list.slice(amount)
		.reduce(
			(tree, item, index) => flow(
				getValue(item),
				value => value < tree.end.key
					? tree.remove(tree.end.key)
						.insert(value, index + amount)
					: tree,
			),
			initialTree,
		);
	return finalTree.values;
}

/**
 * Similar to {@link findLowest}, except it finds the highest value items instead.
 */
export function findHighest(list, amount = 1, getValue = item => item.valueOf()) {
	const initialTree = list.slice(0, amount)
		.reduce((tree, item, index) => tree.insert(getValue(item), index), createTree());
	const finalTree = list.slice(amount)
		.reduce(
			(tree, item, index) => flow(
				getValue(item),
				value => value > tree.begin.key
					? tree.remove(tree.begin.key)
						.insert(value, index + amount)
					: tree,
			),
			initialTree,
		);
	return finalTree.values;
}

export function filterIndex(list, predicate) {
	return list.map((item, index) => ({ item, index }))
		.filter(({ item, index }) => predicate(item, index, list))
		.map(({ index }) => index);
}
