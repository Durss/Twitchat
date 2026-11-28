import { toRaw } from "vue";

/**
 * Deeply clones a vue object.
 * Equivalent to `JSON.parse(JSON.stringify(vueObject))` but with much better perfs.
 * Only difference with JSON cloning is NaN and Infinity that are kept instead of
 * set to null. Which is actually better.
 */
export function deepVueRefClone<T>(value: T): T {
	const v = toRaw(value) as any;
	if (v === null || typeof v !== "object") return v;
	if (v instanceof Date) return new Date(v.getTime()) as T;
	if (Array.isArray(v)) {
		const n = v.length;
		const out = Array.from({ length: n });
		for (let i = 0; i < n; i++) out[i] = deepVueRefClone(v[i]);
		return out as T;
	}
	const out: Record<string, unknown> = {};
	const keys = Object.keys(v);
	for (let i = 0; i < keys.length; i++) {
		const k = keys[i]!;
		const val = v[k];
		if (val === undefined || typeof val === "function") continue;
		out[k] = deepVueRefClone(val);
	}
	return out as T;
}
