import { evaluate as MathEval } from "mathjs";

/**
 * Evaluate mathematical expressions
 * @param expr
 * @returns
 */
export function evalMath(expr: string): number | null {
	expr = expr.replace(/e/g, ".");
	if (
		//Ignore ranges notation as somthing like "1:0:0" kills CPU for a few seconds
		!/\d(:\d)+/.test(expr.trim())
	) {
		try {
			const num = MathEval(expr);
			if (!isNaN(num) && num != Infinity) return num;
		} catch (_error) {}
	}
	return null;
}
