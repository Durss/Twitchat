import { Comment, Fragment, Text, type Slot, type VNode } from "vue";

export const useEmptySlot = () => {
	function isVnodeEmpty(vnodes: Array<VNode>) {
		return vnodes.every((node: VNode) => {
			if (node.type === Comment) {
				return true;
			}

			if (
				node.type === Text &&
				typeof node.children === "string" &&
				node.children.trim().length === 0
			) {
				return true;
			}

			if (node.type === Fragment && isVnodeEmpty(node.children as Array<VNode>)) {
				return true;
			}
			return false;
		});
	}

	/**
	 * Get if given slot is empty or not defined
	 * Adapted from https://github.com/vuejs/vue-next/blob/ca17162e377e0a0bf3fae9d92d0fdcb32084a9fe/packages/runtime-core/src/helpers/renderSlot.ts#L77
	 * @param slot
	 * @returns
	 */
	function isEmptySlot(slot: Slot<any> | undefined) {
		if (!slot) return true;
		return isVnodeEmpty(slot());
	}
	return {
		isEmptySlot,
	};
};
