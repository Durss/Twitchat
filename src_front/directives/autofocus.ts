import type { Directive } from "vue";

const observerMap = new WeakMap<HTMLElement, IntersectionObserver>();

function applyFocus(el: HTMLElement): void {
	//Disabling scroll avoids breaking layout when opening
	//a ChannelNotifications content that has an autofocus element.
	//In such case, if the focus is given during the opening
	//transition, it completely breaks the chat layout, adding
	//lots of space under the chat and activities.
	//The "preventScroll" flag avoids this.
	el.focus({ preventScroll: true });
	if (el.tagName.toLowerCase() == "input" || el.tagName.toLowerCase() == "textarea") {
		const typedEl = el as unknown as HTMLInputElement;
		if (typedEl.type == "number") {
			typedEl.focus();
		} else {
			typedEl.focus();
			typedEl.setSelectionRange(typedEl.value.length, typedEl.value.length);
		}
	}
}

export const vAutofocus: Directive<HTMLDivElement, boolean | undefined> = {
	mounted(el, binding) {
		if (binding.value !== false) {
			applyFocus(el);

			//Watch for visibility changes (e.g. a parent toggling display:none)
			//and re-apply focus when the element becomes visible again.
			const observer = new IntersectionObserver((entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						applyFocus(el);
					}
				}
			});
			observer.observe(el);
			observerMap.set(el, observer);
		}
	},
	beforeUnmount(el) {
		const observer = observerMap.get(el);
		if (observer) {
			observer.disconnect();
			observerMap.delete(el);
		}
		if (el === document.activeElement) {
			el.blur();
		}
	},
};
