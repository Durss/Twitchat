import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { defineAsyncComponent, type Component } from "vue";

/**
 * Maps a template ID to the component rendering it.
 * Adding an entry here requires adding it to TwitchatDataTypes.PromptTemplates
 * so the prompt's payload and result get properly typed.
 */
export const PROMPT_TEMPLATES: Record<TwitchatDataTypes.PromptTemplateKey, Component> = {
	quiz: defineAsyncComponent({
		loader: () => import("./PromptQuickQuiz.vue"),
	}),
};

/**
 * Contract every prompt template must expose to the PromptModal.
 * The modal owns the chrome (title, submit/cancel, keyboard shortcuts,
 * animations), templates only own their form.
 */
export interface PromptTemplateExpose<T> {
	/**
	 * Returns the value to resolve the prompt's promise with.
	 * Returning "undefined" refuses the submission.
	 */
	getResult(): T | undefined;
	/**
	 * Drives the submit button's disabled state
	 */
	isValid: boolean;
}
