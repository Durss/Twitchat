declare module '*.vue' {
	import type { DefineComponent } from 'vue'
	const component: DefineComponent<{}, {}, any>
	export default component
	interface ElementAttrs<HTMLAttributes> extends AriaAttributes, DOMAttributes<T> {
		"data-tooltip"?: string;
	}
}