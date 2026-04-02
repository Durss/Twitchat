import { gsap } from "gsap";
import { onMounted, onBeforeUnmount, type Ref } from "vue";

/**
 * Composable that replaces AbstractSidePanel base class.
 * Handles open/close GSAP animations and Escape key binding.
 *
 * @param rootEl - template ref to the panel's root element
 * @param emit - the component's emit function (must support "close" event)
 */
export function useSidePanel(
	rootEl: Readonly<Ref<HTMLElement | null>>,
	emit: (event: "close") => void,
) {
	let closed = true;

	function onKeyDown(e: KeyboardEvent): void {
		if (closed) return;
		const node = document.activeElement?.nodeName;
		if (
			e.key &&
			e.key.toLowerCase() == "escape" &&
			node != "INPUT" &&
			document.activeElement?.getAttribute("contenteditable") != "true"
		) {
			closed = true;
			void close();
		}
	}

	/**
	 * Open animation
	 */
	async function open(): Promise<void> {
		return new Promise((resolve) => {
			closed = false;
			gsap.set(rootEl.value!, { translateY: 0 });
			gsap.from(rootEl.value!, {
				duration: 0.4,
				translateY: "100%",
				clearProps: "transform",
				ease: "back.out",
				onComplete: () => {
					resolve();
				},
			});
		});
	}

	/**
	 * Close animation
	 */
	async function close(): Promise<void> {
		//contenteditable component crashes if it has focus when destroyed.
		//The following makes sure nothing has focus when closing the form.
		//This can also trigger some save process depending on the forms.
		if (document.activeElement) (document.activeElement as HTMLElement).blur();

		return new Promise((resolve) => {
			gsap.to(rootEl.value!, {
				duration: 0.25,
				translateY: "-100%",
				clearProps: "transform",
				ease: "back.in",
				onComplete: () => {
					emit("close");
					resolve();
				},
			});
		});
	}

	onMounted(() => {
		document.addEventListener("keydown", onKeyDown);
		void open();
	});

	onBeforeUnmount(() => {
		document.removeEventListener("keydown", onKeyDown);
	});

	return { open, close };
}
