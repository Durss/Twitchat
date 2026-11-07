/**
 * Include an image from the asset folder
 */
export function asset() {
	const map = import.meta.glob("/src_front/assets/**/*", { eager: true, import: "default" });
	return {
		getAsset(path: string): string {
			return map[`/src_front/assets/${path}`] as string;
		},
	};
}
