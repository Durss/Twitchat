import { ref, computed, type Ref } from "vue";
import type { HLJSApi } from "highlight.js";

const hljs: Ref<HLJSApi | null> = ref(null);
let loading = false;

function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function loadHighlightJs(): Promise<void> {
	if (hljs.value || loading) return;
	loading = true;
	const [core, js, py, bash] = await Promise.all([
		import("highlight.js/lib/core"),
		import("highlight.js/lib/languages/javascript"),
		import("highlight.js/lib/languages/python"),
		import("highlight.js/lib/languages/bash"),
		import("highlight.js/styles/github-dark.min.css"),
	]);
	const instance = core.default;
	instance.registerLanguage("javascript", js.default);
	instance.registerLanguage("python", py.default);
	instance.registerLanguage("bash", bash.default);
	hljs.value = instance;
}

export function useHighlight() {
	function highlight(code: string, lang: string): string {
		void loadHighlightJs();
		if (hljs.value) {
			return hljs.value.highlight(code, { language: lang }).value;
		}
		return escapeHtml(code);
	}

	function highlighted(code: Ref<string> | (() => string), lang: string) {
		return computed(() => {
			const raw = typeof code === "function" ? code() : code.value;
			return highlight(raw, lang);
		});
	}

	return { loadHighlightJs, highlight, highlighted };
}
