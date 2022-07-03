interface EvaluationResult {
	resolution: any;
	total: number;
}

export default function evaluate(expression: string, context?: object): EvaluationResult;
