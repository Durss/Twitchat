import StoreProxy from "@/store/StoreProxy";
import { toast as vToast, type Content, type Id, type ToastOptions } from "vue3-toastify";

export function toast(content: Content, options?: ToastOptions): Id {
	return vToast(content, {
		theme: StoreProxy.common.theme == "dark" ? "dark" : "light",
		...options,
	});
}

/**
 * Closes a toast opened with toast(), useful for the ones opened with
 * autoClose:false
 */
export function closeToast(id: Id): void {
	vToast.remove(id);
}
