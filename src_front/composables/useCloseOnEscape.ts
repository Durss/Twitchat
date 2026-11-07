import { onBeforeUnmount, onMounted } from "vue";
import Utils from "@/utils/Utils";

/**
 * Composable that closes a floating window when hitting Escape key.
 * First Escape leaves the focused text field if it has content. An empty field
 * is skipped, otherwise an autofocused one would require pressing Escape twice.
 *
 * Listens during capture phase because some fields stop their keydown propagation
 * (ex: SearchUserForm).
 * Listens on body because Confirm and PromptModal stop propagation from document,
 * which gives them priority over the window whatever their mounting order.
 * Stopping propagation from here gives the window priority over side panels.
 *
 * @param close - the function closing the window
 */
export function useCloseOnEscape(close: () => void, onEscapeAborted?: () => void) {
	function onKeyDown(e: KeyboardEvent): void {
		if (e.key != "Escape" || e.repeat) return;
		const target = e.target as HTMLInputElement;
		if ((target.value ?? target.textContent) && Utils.blurFocusedTextField(target)) {
			if (onEscapeAborted) onEscapeAborted();
			return;
		}
		close();
		e.preventDefault();
		e.stopPropagation();
	}

	onMounted(() => {
		document.body.addEventListener("keydown", onKeyDown, true);
	});

	onBeforeUnmount(() => {
		document.body.removeEventListener("keydown", onKeyDown, true);
	});
}
