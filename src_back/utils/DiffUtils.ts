/**
 * Created : 29/08/2026
 */

export interface DroppedEntry {
	path: string;
	value: unknown;
}

/**
 * Helpers to diff 2 JSON
 * Used to detect props dropped by AJV's "removeAdditional" cleanup
 */
export default class DiffUtils {
	/**
	 * Returns the props that got dropped between the original and the sanitized
	 * @param original data as received, before validation
	 * @param sanitized same data after AJV mutated it in place
	 */
	public static getDroppedProps(original: unknown, sanitized: unknown): DroppedEntry[] {
		const result: DroppedEntry[] = [];
		if (original === null || typeof original !== "object") return result;
		this.walk(original as Record<string, unknown>, sanitized, [], result);
		return result;
	}

	/**
	 * Recursively checks for missing props in "sanitized"
	 */
	private static walk(
		original: object,
		sanitized: unknown,
		stack: (string | number)[],
		result: DroppedEntry[],
	): void {
		if (sanitized === null || typeof sanitized !== "object") return;

		if (Array.isArray(original)) {
			// Type flipped between the two trees, nothing sane to report
			if (!Array.isArray(sanitized)) return;
			// AJV only truncates arrays (additionalItems), it never splices
			// out an item, so indices stay aligned between both trees.
			const originalLength = original.length;
			const sanitizedLength = sanitized.length;
			for (let i = 0; i < originalLength; i++) {
				const value = original[i];
				if (i >= sanitizedLength) {
					stack.push(i);
					result.push({ path: this.toPointer(stack), value });
					stack.pop();
					continue;
				}
				if (value !== null && typeof value === "object") {
					stack.push(i);
					this.walk(value, sanitized[i], stack, result);
					stack.pop();
				}
			}
			return;
		}

		if (Array.isArray(sanitized)) return;

		const sanitizedObject = sanitized as Record<string, unknown>;
		for (const key in original) {
			const value = (original as Record<string, unknown>)[key];
			if (sanitizedObject[key] === undefined) {
				if (value === undefined) continue;
				stack.push(key);
				result.push({ path: this.toPointer(stack), value });
				stack.pop();
				continue;
			}
			if (value !== null && typeof value === "object") {
				stack.push(key);
				this.walk(value, sanitizedObject[key], stack, result);
				stack.pop();
			}
		}
	}

	/**
	 * Builds the pointer path
	 */
	private static toPointer(stack: (string | number)[]): string {
		let pointer = "";
		for (let i = 0; i < stack.length; i++) {
			const segment = stack[i]!;
			pointer +=
				"/" +
				(typeof segment === "string"
					? segment.indexOf("~") === -1 && segment.indexOf("/") === -1
						? segment
						: segment.replace(/~/g, "~0").replace(/\//g, "~1")
					: segment);
		}
		return pointer;
	}
}
