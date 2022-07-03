export function flow(initialValue, ...functions) {
	return functions.reduce((currentValue, fn) => fn(currentValue), initialValue);
}
