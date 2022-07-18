type CompareOperator = 'eq'|'neq'|'lt'|'lte'|'gt'|'gte';
type MathOperator = 'sum'|'sub'|'mul'|'div'|'pow';
type Operator = CompareOperator|MathOperator;

export interface LiteralNumberNode {
	type: 'number',
	value: number,
}

export interface FunctionCallNode {
	type: 'fn';
	name: string;
	args: Node[];
}

export interface RollNode {
	type: 'roll';
	qnt: number;
	sides: number;
	modifiers: Modifier[];
}

type Modifier = EmptyModifier|ModifierWValue|ModifierWRange;

export interface EmptyModifier {
	mod: string;
}

export interface ModifierWValue {
	mod: string;
	value: number;
}

export interface ModifierWRange {
	mod: string;
	rangeStart: number;
	rangeEnd: number;
}

export interface OperationNode {
	type: 'op';
	op: Operator;
	left: Node;
	right: Node;
}

export interface IdentifierNode {
	type: 'identifier';
	name: string;
}

type Node = OperationNode|IdentifierNode|RollNode|FunctionCallNode|LiteralNumberNode;
type DiceExpressionAst = Node;

export default function parse(diceNotation: string): DiceExpressionAst;
