type CompareOperator = 'eq'|'neq'|'lt'|'lte'|'gt'|'gte';
type MathOperator = 'sum'|'sub'|'mul'|'div'|'pow';
type Operator = CompareOperator|MathOperator;

interface LiteralNumberNode {
	type: 'number',
	value: number,
}

interface FunctionCallNode {
	type: 'fn';
	name: string;
	args: Node[];
}

interface RollNode {
	type: 'roll';
	qnt: number;
	sides: number;
	modifiers: Modifier[];
}

type Modifier = EmptyModifier|ModifierWValue|ModifierWRange;

interface EmptyModifier {
	mod: string;
}

interface ModifierWValue {
	mod: string;
	value: number;
}

interface ModifierWRange {
	mod: string;
	rangeStart: number;
	rangeEnd: number;
}

interface OperationNode {
	type: 'op';
	op: Operator;
	left: Node;
	right: Node;
}

interface IdentifierNode {
	type: 'identifier';
	name: string;
}

type Node = OperationNode|IdentifierNode|RollNode|FunctionCallNode|LiteralNumberNode;
type DiceExpressionAst = Node;

export default function parse(diceNotation: string): DiceExpressionAst;
