import DataStore from "@/store/DataStore";
import type { Directive, DirectiveBinding, VNode } from "vue";

export const vNewflag: Directive<HTMLElement, {date:number, id:string, duration?:number}> = {
	mounted(el, binding: DirectiveBinding<{date:number, id:string, duration?:number}>, vnode: VNode<any, any, { [key: string]: any; }>) {
		if(binding && binding.value) {
			//date : contains the date at which something has been flagged as new
			//id : id of the item flaged as new
			//duration : duration during which the item should be flaged as new (1 month by default)
			const {date, id, duration} = binding.value;
			const maxDuration = duration || 30 * 24 * 60 * 60000;
			//Flag as new only for 1 month
			if(Date.now() - date > maxDuration) return;

			//Don't flag is already marked as read
			const flagsDone = JSON.parse(DataStore.get(DataStore.NEW_FLAGS) || "[]");
			if(flagsDone.includes(id)) return;

			el.classList.add("newFlag");

			el.addEventListener("click", ()=>{
				const flagsDone = JSON.parse(DataStore.get(DataStore.NEW_FLAGS) || "[]");
				if(!flagsDone.includes(id)) {
					flagsDone.push(id);
					DataStore.set(DataStore.NEW_FLAGS, flagsDone);
				}
				el.classList.remove("newFlag");
			});
		}
	},
	beforeUnmount(el, binding) {
	}
};
