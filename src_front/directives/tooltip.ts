import type { Instance, Props } from "tippy.js";
import type { ObjectDirective } from "vue";
import { directive as tippyDirective, tippy } from "vue-tippy";

export type TooltipValue = string | Partial<Props> | null | undefined;

type TooltipElement = Element & {
	/**
	 * Options of a tooltip displayed by the shared instance.
	 * Undefined if the element has its own vue-tippy instance.
	 */
	__tooltip?: Partial<Props>;
};

/**
 * If only these options are used, the tooltip is displayed by the single
 * shared tippy instance. Any other option (hooks, showOnCreate,
 * followCursor...) gets its own vue-tippy instance.
 * The shared instance always behaves like `touch: "hold"`, the option is ignored.
 */
const SHARED_OPTIONS = new Set<string>([
	"touch",
	"content",
	"placement",
	"theme",
	"maxWidth",
	"allowHTML",
	"offset",
	"delay",
	"arrow",
	"zIndex",
	"animation",
	"duration",
]);

/**
 * The next tooltip ignores its show delay if one has been hidden less than this ago
 */
const WARM_MS = 300;
/**
 * Moving over the gaps between items doesn't close the tooltip
 */
const HIDE_GRACE_MS = 80;
/**
 * No tooltip opens within a container until it stopped scrolling for that long
 */
const SCROLL_QUIET_MS = 150;

let listening = false;
let shared: Instance | null = null;
/**
 * Element the shared tooltip is displayed (or about to be) for
 */
let current: TooltipElement | null = null;
/**
 * Element the shared tooltip is positioned on.
 * Unlike current, it's kept while the tooltip fades out.
 */
let anchor: Element | null = null;
/**
 * Element clicked while its tooltip was displayed. Stays hidden until the pointer leaves it.
 */
let suppressed: TooltipElement | null = null;
let describedEl: Element | null = null;
let appliedProps: Record<string, unknown> = {};
let showTimer = -1;
let hideTimer = -1;
let lastHide = 0;
/**
 * Type of the last pointer that went over something
 */
let lastPointer = "";
/**
 * Recently scrolled containers and when
 */
const recentScrolls = new Map<Node, number>();

function toProps(value: TooltipValue): Partial<Props> {
	if (!value) return {};
	return typeof value === "string" ? { content: value } : value;
}

function hasTooltip(el: TooltipElement): boolean {
	const content = el.__tooltip?.content;
	return content != null && content !== "";
}

function isShared(value: TooltipValue): boolean {
	return (
		value == null ||
		typeof value != "object" ||
		Object.keys(value).every((key) => SHARED_OPTIONS.has(key))
	);
}

function sameProps(a: object, b: object): boolean {
	const keysA = Object.keys(a);
	if (keysA.length != Object.keys(b).length) return false;
	return keysA.every(
		(key) => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key],
	);
}

function showDelay(props: Partial<Props>): number {
	const delay = props.delay;
	if (Array.isArray(delay)) return delay[0] ?? 0;
	return typeof delay == "number" ? delay : 0;
}

/**
 * Single tippy instance displaying all the tooltips.
 * It's positioned from the hovered element's rect but its popper context
 * is the body, so popper never walks the hovered element's ancestors nor
 * listens to their scroll events. Scrolling hides it instead.
 */
function getShared(): Instance {
	if (shared) return shared;
	const getReferenceClientRect = Object.assign(
		() => (anchor || document.body).getBoundingClientRect(),
		{ contextElement: document.body },
	);
	shared = tippy(document.createElement("span"), {
		trigger: "manual",
		hideOnClick: false,
		aria: { content: null, expanded: false },
		getReferenceClientRect,
	});
	//Images in the content (ex: emotes) resize the tooltip once loaded.
	//"load" doesn't bubble but capture catches it.
	shared.popper.addEventListener("load", () => void shared?.popperInstance?.update(), true);
	return shared;
}

/**
 * Applies given element's options to the shared instance.
 * Options it doesn't specify fall back to the defaults so nothing leaks
 * from the previously hovered element.
 */
function applyProps(el: TooltipElement): void {
	const props = el.__tooltip as Record<string, unknown>;
	const defaults = tippy.defaultProps as unknown as Record<string, unknown>;
	const next: Record<string, unknown> = {};
	for (const key of SHARED_OPTIONS) {
		//Handled here, the shared instance is shown manually
		if (key == "delay" || key == "touch") continue;
		let value = props[key] ?? defaults[key];
		//Evaluate it against the hovered element instead of the shared instance's reference
		if (key == "content" && typeof value == "function") value = value(el);
		next[key] = value;
	}
	if (sameProps(next, appliedProps)) return;
	appliedProps = next;
	getShared().setProps(next as Partial<Props>);
}

/**
 * Links the tooltip to given element for screen readers, keeps its own descriptions
 */
function describe(el: Element | null): void {
	const id = shared?.popper.id;
	if (!id) return;
	const without = (node: Element) =>
		(node.getAttribute("aria-describedby") || "").split(" ").filter((v) => v && v != id);
	if (describedEl) {
		const ids = without(describedEl);
		if (ids.length) describedEl.setAttribute("aria-describedby", ids.join(" "));
		else describedEl.removeAttribute("aria-describedby");
	}
	describedEl = el;
	if (el) el.setAttribute("aria-describedby", [...without(el), id].join(" "));
}

function isScrolling(el: Element): boolean {
	const now = performance.now();
	for (const [scroller, time] of recentScrolls) {
		if (now - time > SCROLL_QUIET_MS) recentScrolls.delete(scroller);
		else if (scroller.contains(el)) return true;
	}
	return false;
}

function show(el: TooltipElement): void {
	if (current !== el || !el.isConnected) return;
	getShared().show();
	describe(el);
}

function hide(): void {
	clearTimeout(showTimer);
	clearTimeout(hideTimer);
	showTimer = hideTimer = -1;
	current = null;
	describe(null);
	if (!shared?.state.isVisible) return;
	lastHide = performance.now();
	shared.hide();
}

function enter(el: TooltipElement): void {
	if (el === suppressed) return;
	suppressed = null;
	clearTimeout(hideTimer);
	hideTimer = -1;
	const visible = shared?.state.isVisible === true;
	if (el === current && (visible || showTimer > -1)) return;

	clearTimeout(showTimer);
	showTimer = -1;
	current = anchor = el;
	applyProps(el);

	if (visible) {
		//Already displayed for another element, just move it
		void shared!.popperInstance?.update();
		describe(el);
		return;
	}
	if (isScrolling(el)) return;

	const delay = showDelay(el.__tooltip!);
	if (delay > 0 && performance.now() - lastHide > WARM_MS) {
		showTimer = window.setTimeout(() => {
			showTimer = -1;
			show(el);
		}, delay);
	} else {
		show(el);
	}
}

function leave(): void {
	suppressed = null;
	if (!shared?.state.isVisible) hide();
	else if (hideTimer < 0) hideTimer = window.setTimeout(hide, HIDE_GRACE_MS);
}

/**
 * Displays the tooltip of the closest element having one.
 * Pointer events instead of mouse events give touch:"hold" for free: a finger
 * fires "pointerover" when it touches and "pointerout" when it's lifted, while
 * the mouse events emulated after a tap are ignored.
 */
function onPointerOver(event: PointerEvent): void {
	lastPointer = event.pointerType;
	const target = event.target as Node | null;
	//Pointer is over the shared tooltip itself
	if (shared && target && shared.popper.contains(target)) return;

	let el = target as TooltipElement | null;
	while (el && !hasTooltip(el)) el = el.parentElement;
	if (el) enter(el);
	else leave();
}

function onPointerOut(event: PointerEvent): void {
	//Pointer left the window or finger lifted
	if (!event.relatedTarget || event.pointerType == "touch") leave();
}

/**
 * Same as onPointerOver for keyboard navigation, only the focused element matters.
 * Ignored after a touch, a tap focuses the element once the finger is lifted.
 */
function onFocusIn(event: FocusEvent): void {
	const el = event.target as TooltipElement;
	if (lastPointer != "touch" && hasTooltip(el)) enter(el);
}

function onFocusOut(event: FocusEvent): void {
	if (event.target === current) hide();
}

function onPointerDown(event: PointerEvent): void {
	//Displayed while the finger is down
	if (event.pointerType == "touch") return;
	suppressed = current;
	hide();
}

/**
 * Only scrolls of a container holding the tooltip's element matter, the chat
 * columns scroll on their own all the time.
 */
function onScroll(event: Event): void {
	//Document scrolls target the document itself
	const scroller = event.target instanceof Node ? event.target : document;
	recentScrolls.set(scroller, performance.now());
	if (current && scroller.contains(current)) hide();
}

function listen(): void {
	if (listening) return;
	listening = true;
	//Capture phase so a stopPropagation() somewhere can't prevent tooltips from showing
	const options = { passive: true, capture: true };
	document.addEventListener("pointerover", onPointerOver, options);
	document.addEventListener("pointerout", onPointerOut, options);
	document.addEventListener("focusin", onFocusIn, options);
	document.addEventListener("focusout", onFocusOut, options);
	document.addEventListener("pointerdown", onPointerDown, options);
	//Scroll events don't bubble, capture catches them for every container
	document.addEventListener("scroll", onScroll, options);
}

/**
 * Stops displaying anything for given element
 */
function release(el: TooltipElement): void {
	if (el === current) hide();
	if (el === suppressed) suppressed = null;
}

const vueTippyDirective = tippyDirective as ObjectDirective<TooltipElement>;

/**
 * Replaces vue-tippy's `v-tooltip` directive.
 * vue-tippy builds a tippy instance per element at mount, which creates tons
 * of tooltips that may never be shown, and each one shown creates its own
 * popper which walks all its element's ancestors and listens to their scroll.
 *
 * Here, simple tooltips (a string or only SHARED_OPTIONS) are all displayed
 * by a single shared instance moved to the hovered element.
 * Others are left to vue-tippy.
 */
export const vTooltip: ObjectDirective<TooltipElement, TooltipValue> = {
	mounted(el, binding, vnode, prevVNode) {
		if (!isShared(binding.value)) {
			vueTippyDirective.mounted!(el, binding, vnode, prevVNode);
			return;
		}
		listen();
		el.__tooltip = toProps(binding.value);
	},

	updated(el, binding, vnode, prevVNode) {
		if (!el.__tooltip) {
			vueTippyDirective.updated!(el, binding, vnode, prevVNode);
			return;
		}
		if (binding.value === binding.oldValue) return;

		const props = toProps(binding.value);
		if (sameProps(el.__tooltip, props)) return;

		if (!isShared(binding.value)) {
			//Rare, options changed to something only a dedicated instance can do
			release(el);
			delete el.__tooltip;
			vueTippyDirective.mounted!(el, binding, vnode, null);
			return;
		}
		el.__tooltip = props;
		if (el !== current) return;
		if (hasTooltip(el)) applyProps(el);
		else hide();
	},

	unmounted(el, binding, vnode, prevVNode) {
		if (el.__tooltip) release(el);
		else vueTippyDirective.unmounted!(el, binding, vnode, prevVNode);
		delete el.__tooltip;
	},
};
