import type { Directive } from "vue";

export const vClick2Select: Directive<HTMLElement, boolean | undefined> = {
	mounted(el, binding) {
		if(binding.value !== false) {
			el.style.cursor = "default";
			el.addEventListener("click", ()=> {
				if(el.nodeName === "INPUT") {
					(el as HTMLInputElement).select();
				}else{
					el.ownerDocument?.getSelection()?.selectAllChildren(el);
				}
			});
		}
	}
};
