import type { Directive } from "vue";

export const vAutofocus: Directive<HTMLDivElement, boolean | undefined> = {
	mounted(el, binding) {
		if(binding.value !== false) {
			//Disabling scroll avoids breaking layout when opening
			//a ChannelNotifications content that has an autofocus element.
			//In such case, if the focus is given during the opening
			//transition, it completely breaks the chat layout, adding
			//lots of space under the chat and activities.
			//The "preventScroll" flag avoids this.
			el.focus({preventScroll:true});
			if(el.tagName.toLowerCase() == "input" || el.tagName.toLowerCase() == "textarea") {
				const typedEl = el as unknown as HTMLInputElement;
				if(typedEl.type =="number") {
					typedEl.focus();
				}else{
					typedEl.setSelectionRange(typedEl.value.length, typedEl.value.length);
				}
			}
		}
	}
};
