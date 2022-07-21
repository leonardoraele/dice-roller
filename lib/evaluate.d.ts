import { LiteralNumberNode, IdentifierNode, FunctionCallNode, Operator } from "./parser/parse";

interface ResolvedRollNode {
	type: 'roll';
	rolls: { roll: number, ignored?: { reason: string } }[];
	value: number;
	qnt: number;
	sides: number;
}

interface ResolvedFunctionCallNode extends FunctionCallNode {
	value: number;
}

interface ResolvedOperationNode {
	type: 'op';
	op: Operator;
	left: EvaluationResolution;
	right: EvaluationResolution;
	value: number;
}

interface ResolvedIdentifierNode extends IdentifierNode {
	value: number;
}

type EvaluationResolution = LiteralNumberNode
	| ResolvedOperationNode
	| ResolvedIdentifierNode
	| ResolvedFunctionCallNode
	| ResolvedRollNode;

interface EvaluationResult {
	resolution: EvaluationResolution;
	total: number;
	expression: string;
}

export default function evaluate(expression: string, context?: object): EvaluationResult;

export function toString(evaluationResult: EvaluationResult): string;
