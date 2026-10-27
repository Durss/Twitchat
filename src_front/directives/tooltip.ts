import type { Instance, Props } from "tippy.js";
import type { ObjectDirective } from "vue";
import { directive as tippyDirective, tippy } from "vue-tippy";

export type TooltipValue = string | Partial<Props> | null | undefined;

type TooltipElement = Element & {
	_tippy?: Instance;
	__tooltip?: {
		eager: boolean;
		props: Partial<Props>;
	};
};

/**
 * If only these options are used, make the tooltip lazy (build only on hover)
 */
const LAZY_OPTIONS = new Set<string>([
	"content",
	"placement",
	"theme",
	"maxWidth",
	"allowHTML",
	"offset",
	"followCursor",
	"hideOnClick",
	"delay",
	"interactive",
	"arrow",
	"zIndex",
	"appendTo",
	"animation",
	"duration",
]);

let listening = false;

function toProps(value: TooltipValue): Partial<Props> {
	if (!value) return {};
	return typeof value === "string" ? { content: value } : value;
}

function hasContent(props: Partial<Props>): boolean {
	return props.content != null && props.content !== "";
}

function isEager(value: TooltipValue): boolean {
	return (
		value != null &&
		typeof value == "object" &&
		Object.keys(value).some((key) => !LAZY_OPTIONS.has(key))
	);
}

function sameProps(a: Partial<Props>, b: Partial<Props>): boolean {
	const keysA = Object.keys(a) as (keyof Props)[];
	if (keysA.length != Object.keys(b).length) return false;
	return keysA.every((key) => a[key] === b[key]);
}

/**
 * Builds a tippy on given element
 * @returns false if there's nothing to show.
 */
function build(el: TooltipElement): boolean {
	if (el._tippy || !el.__tooltip || !hasContent(el.__tooltip.props)) return false;
	tippy(el, el.__tooltip.props);
	return true;
}

/**
 * Builds the tooltips of all the elements the pointer just entered, then replays the
 * "mouseenter" so tippy handles it exactly like if it had been there from the start
 */
function onMouseOver(event: MouseEvent): void {
	const from = event.relatedTarget as Node | null;
	let el = event.target as TooltipElement | null;
	while (el) {
		//Only if the pointer comes from outside the element, like a "mouseenter"
		if (el.__tooltip && !el.__tooltip.eager && !(from && el.contains(from)) && build(el)) {
			el.dispatchEvent(
				new MouseEvent("mouseenter", {
					clientX: event.clientX,
					clientY: event.clientY,
					screenX: event.screenX,
					screenY: event.screenY,
					relatedTarget: from,
				}),
			);
		}
		el = el.parentElement;
	}
}

/**
 * Same as onMouseOver for keyboard navigation.
 * Tippy listens for "focus" which doesn't bubble, only the focused element matters.
 */
function onFocusIn(event: FocusEvent): void {
	const el = event.target as TooltipElement;
	if (el.__tooltip && !el.__tooltip.eager && build(el)) {
		el.dispatchEvent(new FocusEvent("focus", { relatedTarget: event.relatedTarget }));
	}
}

function listen(): void {
	if (listening) return;
	listening = true;
	//Capture phase so a stopPropagation() somewhere can't prevent tooltips from showing
	document.addEventListener("mouseover", onMouseOver, { passive: true, capture: true });
	document.addEventListener("focusin", onFocusIn, { passive: true, capture: true });
}

const vueTippyDirective = tippyDirective as ObjectDirective<TooltipElement>;

/**
 * Replaces vue-tippy's `v-tooltip` directive to be lazy.
 * vue-tippy builds the tooltip at mount which creates potentially tons
 * of useless tooltips that may never be shown.
 * This directive makes it so the tooltip is actually created only on
 * first hover of the element
 */
export const vTooltip: ObjectDirective<TooltipElement, TooltipValue> = {
	mounted(el, binding, vnode, prevVNode) {
		if (isEager(binding.value)) {
			el.__tooltip = { eager: true, props: {} };
			vueTippyDirective.mounted!(el, binding, vnode, prevVNode);
			return;
		}
		listen();
		el.__tooltip = { eager: false, props: toProps(binding.value) };
	},

	updated(el, binding, vnode, prevVNode) {
		const state = el.__tooltip;
		if (!state) return;
		if (state.eager) {
			vueTippyDirective.updated!(el, binding, vnode, prevVNode);
			return;
		}
		if (binding.value === binding.oldValue) return;

		const props = toProps(binding.value);
		if (sameProps(state.props, props)) return;
		state.props = props;

		const instance = el._tippy;
		if (!instance) return;
		if (hasContent(props)) {
			instance.setProps(props);
			instance.enable();
		} else {
			instance.hide();
			instance.disable();
		}
	},

	unmounted(el, binding, vnode, prevVNode) {
		if (el.__tooltip?.eager) {
			vueTippyDirective.unmounted!(el, binding, vnode, prevVNode);
		} else {
			el._tippy?.destroy();
		}
		delete el.__tooltip;
	},
};

