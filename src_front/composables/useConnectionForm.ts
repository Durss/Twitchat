import { ref } from "vue";

/**
 * Shared reactive state & helpers for IP/port style connection forms.
 *
 * @param connect  async function that attempts the connection and returns true on success
 * @param disconnect  function that tears down the connection
 */
export function useConnectionForm(connect: () => Promise<boolean>, disconnect: () => void) {
	const connecting = ref(false);
	const error = ref(false);
	const showSuccess = ref(false);

	async function doConnect(): Promise<void> {
		connecting.value = true;
		error.value = false;
		try {
			const success = await connect();
			if (success) {
				showSuccess.value = true;
				window.setTimeout(() => {
					showSuccess.value = false;
				}, 3000);
			} else {
				error.value = true;
			}
		} catch (_e) {
			error.value = true;
		}
		connecting.value = false;
	}

	function doDisconnect(): void {
		disconnect();
		showSuccess.value = false;
	}

	return { connecting, error, showSuccess, doConnect, doDisconnect };
}
