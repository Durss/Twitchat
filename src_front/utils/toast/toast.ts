import StoreProxy from "@/store/StoreProxy";
import { toast as vToast, type Content, type ToastOptions } from "vue3-toastify";

export function toast(content: Content, options?: ToastOptions) {
	vToast(content, {
		theme: StoreProxy.common.theme == "dark" ? "dark" : "light",
		...options,
	});

	return {};
}
