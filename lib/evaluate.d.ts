import { LiteralNumberNode, OperationNode, IdentifierNode, FunctionCallNode, RollNode } from "./parser/parse";

interface ResolvedRollNode {
	type: 'roll';
	rolls: { roll: number, ignored?: { reason: string } }[];
	value: number;
}

interface ResolvedFunctionCallNode extends FunctionCallNode {
	value: number;
}

interface ResolvedOperationNode extends OperationNode {
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
