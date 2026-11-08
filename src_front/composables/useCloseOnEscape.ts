import { onBeforeUnmount, toValue, watch, type MaybeRefOrGetter } from "vue";
import Utils from "@/utils/Utils";

interface EscapeHandler {
	close: () => void;
	onEscapeAborted?: () => void;
}

/**
 * Enabled windows, last one is the most recently opened.
 * Only that one handles Escape.
 */
const stack: EscapeHandler[] = [];

function onKeyDown(e: KeyboardEvent): void {
	const handler = stack[stack.length - 1];
	if (!handler || e.key != "Escape" || e.repeat || e.defaultPrevented) return;
	if (Utils.blurFocusedTextField(e.target)) {
		if (handler.onEscapeAborted) handler.onEscapeAborted();
	} else {
		handler.close();
	}
	e.preventDefault();
	e.stopPropagation();
}

function activate(handler: EscapeHandler): void {
	const index = stack.indexOf(handler);
	if (index > -1) stack.splice(index, 1);
	stack.push(handler);
	if (stack.length == 1) document.body.addEventListener("keydown", onKeyDown, true);
}

function deactivate(handler: EscapeHandler): void {
	const index = stack.indexOf(handler);
	if (index == -1) return;
	stack.splice(index, 1);
	if (stack.length == 0) document.body.removeEventListener("keydown", onKeyDown, true);
}

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
 * All instances share a single listener. When several windows are open, only the
 * last enabled one handles Escape, so they close one at a time, latest first.
 * Activating during setup puts a nested window above its parent.
 *
 * @param close - the function closing the window
 * @param onEscapeAborted - called when Escape only blurred a text field
 * @param enabled - Escape is ignored (and left untouched for others) while this is false.
 * Turning it back on puts the window on top of the others.
 */
export function useCloseOnEscape(
	close: () => void,
	onEscapeAborted?: () => void,
	enabled: MaybeRefOrGetter<boolean> = true,
) {
	const handler: EscapeHandler = { close, onEscapeAborted };

	watch(
		() => toValue(enabled),
		(isEnabled) => (isEnabled ? activate(handler) : deactivate(handler)),
		{ immediate: true },
	);

	onBeforeUnmount(() => deactivate(handler));
}
