import { createPopper } from "@popperjs/core";

/**
 * Global helper to place a dropdown list
 */
export function usePlaceDropdown() {
	return {
		place: (
			dropdownList: HTMLDivElement,
			component: { $refs: { [key: string]: HTMLElement } },
			params: { width: string; left: string; top: string },
		) => {
			dropdownList.style.width = params.width;
			const popper = createPopper(component.$refs.toggle!, dropdownList, {
				placement: "top",
			});
			return () => popper.destroy();
		},
	};
}
