import type { Directive } from "vue";

const parsedMarkups = new Map<string, DocumentFragment>();

function render(el: HTMLElement, markup: string): void {
	let fragment = parsedMarkups.get(markup);
	if (!fragment) {
		const template = document.createElement("template");
		template.innerHTML = markup;
		fragment = template.content;
		parsedMarkups.set(markup, fragment);
	}
	el.replaceChildren(fragment.cloneNode(true));
}

/**
 * Same as v-html but parses each markup only once, then clones the parsed nodes.
 * Meant for a small set of static markups rendered many times (icons).
 * Cache is never purged, don't use it on dynamic content.
 */
export const vSvg: Directive<HTMLElement, string> = {
	beforeMount(el, binding) {
		render(el, binding.value);
	},
	updated(el, binding) {
		if (binding.value !== binding.oldValue) render(el, binding.value);
	},
};
