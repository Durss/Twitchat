import StoreProxy from "@/store/StoreProxy";
import { toast } from "../toast/toast";

/**
 * Converts a file input to a base64 image
 * @param input
 */
export async function fileToBase64Img(input: File): Promise<string> {
	return new Promise<string>((resolve, _reject) => {
		const img = new Image();
		img.onload = (_event) => {
			//Scale down image to a 32x32px image
			const size = 32;
			const sourceCanvas = document.createElement("canvas");
			sourceCanvas.width = size;
			sourceCanvas.height = size;
			const sourceContext = sourceCanvas.getContext("2d")!;
			sourceContext.drawImage(img, 0, 0, size, size);
			const base64Img = sourceCanvas.toDataURL();
			resolve(base64Img);
		};
		img.onerror = () => {
			toast(StoreProxy.i18n.t("error.badge_file_loading_failed"), { autoClose: true });
		};
		img.src = URL.createObjectURL(input);
	});
}
