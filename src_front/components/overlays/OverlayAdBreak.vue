<template>
	<div class="overlayadbreak" v-if="show">
		<template v-if="component == 'bar'">
			<div id="progress" ref="holder" :class="progressClasses" :style="progressStyles">
				<span
					v-if="textContent"
					key="labelbar"
					class="label"
					:style="labelStyles"
					v-html="textContent"
				></span>
			</div>
		</template>

		<div
			v-if="component == 'text'"
			id="text"
			ref="holder"
			:class="progressClasses"
			:style="progressStyles"
		>
			<span
				class="label"
				key="labeltext"
				:style="labelStyles"
				v-if="textContent"
				v-html="textContent"
			></span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useOverlayConnector } from "@/composables/useOverlayConnector";
import type TwitchatEvent from "@/events/TwitchatEvent";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import DOMPurify from "isomorphic-dompurify";
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	type CSSProperties,
} from "vue";

type AdType = "approaching" | "running" | "none";

const show = ref(false);
const textContent = ref("");
const adType = ref<AdType>("none");
const component = ref<TwitchatDataTypes.AdBreakOverlayData["runningStyle"]>("bar");
const adData = ref<TwitchatDataTypes.CommercialData | null>(null);
const parameters = ref<TwitchatDataTypes.AdBreakOverlayData | null>(null);

const holderEl = useTemplateRef("holder");

let disposed: boolean = false;
let hidding: boolean = false;
const progressPercent = ref<number>(0);

const progressClasses = computed<string[]>(() => {
	const res: string[] = [adType.value];
	const style =
		adType.value == "approaching"
			? parameters.value?.approachingStyle
			: parameters.value?.runningStyle;
	const placement =
		adType.value == "approaching"
			? parameters.value?.approachingPlacement
			: parameters.value?.runningPlacement;
	res.push(style!, "position-" + placement);
	return res;
});

const progressStyles = computed<CSSProperties>(() => {
	const placement =
		adType.value == "approaching"
			? parameters.value?.approachingPlacement
			: parameters.value?.runningPlacement;
	const thickness =
		(adType.value == "approaching"
			? parameters.value?.approachingThickness
			: parameters.value?.runningThickness) || 20;
	const color =
		adType.value == "approaching"
			? parameters.value?.approachingColor
			: parameters.value?.runningColor;
	const res: CSSProperties = {};
	res.backgroundColor = color;
	if (component.value === "bar") {
		switch (placement) {
			case "t":
			case "b": {
				res.width = "100vw";
				res.transform = "scaleX(" + progressPercent.value + ")";
				res.height = thickness + "px";
				break;
			}
			// case "l":
			case "r": {
				res.height = "100vh";
				res.transform = "scaleY(" + progressPercent.value + ")";
				res.width = thickness + "px";
				break;
			}
			case "l": {
				res.height = "100vh";
				res.transform = "scaleY(" + progressPercent.value + ")";
				res.width = thickness + "px";
				break;
			}
		}
	}
	return res;
});

const labelStyles = computed<CSSProperties>(() => {
	const placement =
		adType.value == "approaching"
			? parameters.value?.approachingPlacement
			: parameters.value?.runningPlacement;
	const fontSize =
		(adType.value == "approaching"
			? parameters.value?.approachingSize
			: parameters.value?.runningSize) || 20;
	const color =
		adType.value == "approaching"
			? parameters.value?.approachingColor
			: parameters.value?.runningColor;
	const res: CSSProperties = {};
	res.fontSize = fontSize + "px";
	if (component.value === "bar") {
		switch (placement) {
			case "t":
			case "b": {
				res.transform = "scaleX(" + 1 / progressPercent.value + ")";
				break;
			}
			case "l":
			case "r": {
				res.transform = "scaleY(" + 1 / progressPercent.value + ")";
				// if(placement == "l") {
				// 	res.left = "10px";
				// }
				break;
			}
		}
	}
	//Define text color based on background's brightness
	const hsl = Utils.rgb2hsl(parseInt((color || "#ffffff").replace("#", ""), 16));
	const minL = 0.65;
	if (hsl.l < minL) {
		res.color = "#ffffff";
	} else {
		res.color = "#000000";
	}
	return res;
});

useOverlayConnector(requestInfo);

onBeforeMount(() => {
	PublicAPI.instance.addEventListener("ON_AD_BREAK_OVERLAY_DATA", onAdBreak);
	PublicAPI.instance.addEventListener("ON_AD_BREAK_OVERLAY_CONFIGS", onParameters);
	PublicAPI.instance.addEventListener("GET_AD_BREAK_OVERLAY_PRESENCE", onPresenceRequest);
	renderFrame();

	/*
	adData.value = {
		adCooldown_ms:0,
		currentAdDuration_ms: 0,
		currentAdStart_at: 0,
		nextAdStart_at: Date.now() + 30000,
		nextSnooze_at: 0,
		remainingSnooze: 3,
	};
	//*/
	/*
	adData.value = {
		adCooldown_ms:0,
		// currentAdDuration_ms: 10 * 60000,
		// currentAdStart_at: Date.now() - 2 * 60000,
		currentAdDuration_ms: 100000,
		currentAdStart_at: Date.now(),
		nextAdStart_at: 0,
		nextSnooze_at: 0,
		remainingSnooze: 3,
	};
	//*/
});

onBeforeUnmount(() => {
	disposed = true;
	PublicAPI.instance.removeEventListener("ON_AD_BREAK_OVERLAY_DATA", onAdBreak);
	PublicAPI.instance.removeEventListener("ON_AD_BREAK_OVERLAY_CONFIGS", onParameters);
	PublicAPI.instance.removeEventListener("GET_AD_BREAK_OVERLAY_PRESENCE", onPresenceRequest);
});

function requestInfo(): void {
	PublicAPI.instance.broadcast("GET_AD_BREAK_OVERLAY_CONFIGS");
}

function onPresenceRequest(): void {
	PublicAPI.instance.broadcast("ON_AD_BREAK_OVERLAY_PRESENCE");
}

/**
 * Called when API sends fresh overlay parameters
 */
async function onParameters(e: TwitchatEvent<"ON_AD_BREAK_OVERLAY_CONFIGS">): Promise<void> {
	if (e.data) {
		parameters.value = e.data;
	}
}

/**
 * Called when API sends an ad break info
 */
function onAdBreak(e: TwitchatEvent<"ON_AD_BREAK_OVERLAY_DATA">): void {
	if (e.data) {
		show.value = false;
		adData.value = e.data;
	}
}

function renderFrame(): void {
	if (disposed) return;

	requestAnimationFrame(() => renderFrame());

	if (!adData.value || !parameters.value) return;

	let isAdComing = false;
	let isAdRunning = false;
	let duration: number = (parameters.value?.approachingDelay || 30) * 1000;
	let startDate: number = 0;
	if (adData.value.prevAdStart_at + adData.value.currentAdDuration_ms >= Date.now()) {
		isAdRunning = true;
		startDate = adData.value.prevAdStart_at + adData.value.currentAdDuration_ms;
		duration = adData.value.currentAdDuration_ms;
	} else if (
		Date.now() > adData.value.nextAdStart_at &&
		Date.now() < adData.value.nextAdStart_at + adData.value.currentAdDuration_ms
	) {
		isAdRunning = true;
		startDate = adData.value.nextAdStart_at + adData.value.currentAdDuration_ms;
		duration = adData.value.currentAdDuration_ms;
	} else if (
		adData.value.nextAdStart_at > 0 &&
		adData.value.nextAdStart_at - Date.now() < duration
	) {
		isAdComing = true;
		startDate = adData.value.nextAdStart_at;
	}
	progressPercent.value = 1 - (startDate - Date.now()) / duration;

	if (progressPercent.value >= 1) {
		adType.value = "none";
		doHide();
		return;
	}

	if (!isAdRunning && !isAdComing) {
		adType.value = "none";
		doHide();
		return;
	}
	if (isAdRunning && parameters.value?.showRunning !== true) {
		adType.value = "none";
		doHide();
		return;
	}
	if (isAdComing && parameters.value?.showApproaching !== true) {
		adType.value = "none";
		doHide();
		return;
	}

	adType.value = isAdRunning ? "running" : "approaching";
	component.value =
		adType.value == "approaching"
			? parameters.value!.approachingStyle
			: parameters.value!.runningStyle;

	if (progressPercent.value <= 0) {
		doHide();
		return;
	} else {
		doShow();
	}

	const rawLabel =
		adType.value == "approaching"
			? parameters.value?.approachingLabel
			: parameters.value?.runningLabel;
	textContent.value = DOMPurify.sanitize(
		rawLabel?.replace(
			/\{TIMER\}/gi,
			Utils.formatDuration(Math.round((startDate - Date.now()) / 1000) * 1000),
		) || "",
	);
}

function doShow(): void {
	if (show.value) return;
	show.value = true;
	if (component.value == "text") {
		showCard();
	}
}

function doHide(): void {
	if (hidding || !show.value) return;
	if (component.value == "text") {
		hideCard();
	} else {
		show.value = false;
	}
}

/**
 * Open the text card
 */
async function showCard(): Promise<void> {
	show.value = true;
	hidding = false;
	await nextTick();
	const placement =
		adType.value == "approaching"
			? parameters.value?.approachingPlacement
			: parameters.value?.runningPlacement;
	const holder = holderEl.value;
	if (!holder || !placement) return;

	const bounds = holder.getBoundingClientRect();

	if (placement.indexOf("r") > -1) {
		gsap.from(holder, { x: "100%", duration: 0.35, ease: "sine.out", clearProps: "x" });
	} else if (placement.indexOf("l") > -1) {
		gsap.from(holder, {
			x: -(bounds.x + bounds.width),
			duration: 0.35,
			ease: "sine.out",
			clearProps: "x",
		});
	} else if (placement == "t") {
		gsap.from(holder, {
			y: -(bounds.y + bounds.height),
			duration: 0.35,
			ease: "sine.out",
			clearProps: "y",
		});
	} else if (placement == "b") {
		gsap.from(holder, { y: "100%", duration: 0.35, ease: "sine.out", clearProps: "y" });
	} else if (placement == "m") {
		gsap.from(holder, {
			scale: 0,
			duration: 0.35,
			ease: "back.out",
			clearProps: "transform",
		});
	}
}

/**
 * Closes the text card
 */
async function hideCard(): Promise<void> {
	hidding = true;
	const placement =
		adType.value == "approaching"
			? parameters.value?.approachingPlacement
			: parameters.value?.runningPlacement;
	const holder = holderEl.value;
	if (!holder || !placement) return;

	if (placement.indexOf("r") > -1) {
		gsap.to(holder, {
			x: "100%",
			duration: 0.35,
			ease: "sine.in",
			onComplete: () => {
				adType.value = "none";
			},
			clearProps: "x",
		});
	} else if (placement.indexOf("l") > -1) {
		gsap.to(holder, {
			x: "-100%",
			duration: 0.35,
			ease: "sine.in",
			onComplete: () => {
				adType.value = "none";
			},
			clearProps: "x",
		});
	} else if (placement == "t") {
		gsap.to(holder, {
			y: "-100%",
			duration: 0.35,
			ease: "sine.in",
			onComplete: () => {
				adType.value = "none";
			},
			clearProps: "y",
		});
	} else if (placement == "b") {
		gsap.to(holder, {
			y: "100%",
			duration: 0.35,
			ease: "sine.in",
			onComplete: () => {
				adType.value = "none";
			},
			clearProps: "y",
		});
	} else if (placement == "m") {
		gsap.to(holder, {
			scale: 0,
			duration: 0.35,
			ease: "back.in",
			onComplete: () => {
				adType.value = "none";
			},
			clearProps: "transform",
		});
	}
	await Utils.promisedTimeout(350);
	show.value = false;
}
</script>

<style scoped lang="less">
.overlayadbreak {
	font-variant-numeric: tabular-nums;
	.bar {
		position: absolute;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-end;
		transform-origin: top left;

		.label {
			z-index: 1;
			padding: 0.5em;
			border-bottom-left-radius: 0.5em;
			border-bottom-right-radius: 0.5em;
			margin: auto 0;
			background-color: inherit;
			// background-color: rgba(0, 255, 0, .5);
			transform-origin: top right;
		}

		&.position-b {
			bottom: 0;
		}
		&.position-b {
			display: flex;
			flex-direction: column;
			.label {
				align-self: flex-end;
				border-radius: 0;
				border-top-left-radius: 0.5em;
				border-top-right-radius: 0.5em;
			}
		}
		&.position-l {
			left: 0;
			display: flex;
			flex-direction: column;
			transform-origin: bottom left;
			.label {
				align-self: flex-end;
				writing-mode: vertical-lr;
				text-orientation: mixed;
				margin: auto;
				margin-top: 0;
				border-radius: 0;
				border-top-right-radius: 0.5em;
				border-bottom-right-radius: 0.5em;
			}
		}
		&.position-r {
			right: 0;
			transform-origin: bottom right;
			.label {
				writing-mode: vertical-rl;
				text-orientation: mixed;
				margin: auto;
				margin-bottom: 0;
				border-radius: 0;
				border-top-left-radius: 0.5em;
				border-bottom-left-radius: 0.5em;
			}
		}
		// &.position-r,
		// &.position-l {
		// 	.label {
		// 		transform-origin: top right;
		// 		transform: rotate(90deg);
		// 		min-width: 100px;
		// 		margin: 0 auto;
		// 	}
		// }

		// &.labelOverflow {
		// 	.label {
		// 		top: 100%;
		// 		right: 0;
		// 		padding: 0 .5em .5em .5em;
		// 		border-bottom-left-radius: .5em;
		// 		border-bottom-right-radius: .5em;
		// 		background-color: inherit;
		// 	}
		// }
	}

	.text {
		@margin: 1vh;
		@borderRadius: 0.5em;

		position: absolute;
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		font-size: 1.25em;
		background-color: var(--color-light);
		padding: 0.5em;
		border-top-right-radius: @borderRadius;
		border-bottom-right-radius: @borderRadius;
		// box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		max-width: calc(60vw - @margin);

		&.position-tl {
			top: @margin;
			left: 0;
		}

		&.position-t {
			top: 0;
			right: 50%;
			transform: translateX(50%);
			border-radius: 0;
			border-bottom-right-radius: @borderRadius;
			border-bottom-left-radius: @borderRadius;
		}

		&.position-tr {
			top: 0.5em;
			right: 0;
			border-radius: 0;
			border-top-left-radius: @borderRadius;
			border-bottom-left-radius: @borderRadius;
		}

		&.position-l {
			top: 50%;
			left: 0;
			transform: translateY(-50%);
		}

		&.position-m {
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			border-radius: @borderRadius;
		}

		&.position-r {
			top: 50%;
			right: 0;
			transform: translateY(-50%);
			border-radius: 0;
			border-top-left-radius: @borderRadius;
			border-bottom-left-radius: @borderRadius;
		}

		&.position-bl {
			bottom: @margin;
			left: 0;
		}

		&.position-b {
			bottom: 0;
			right: 50%;
			transform: translateX(50%);
			border-radius: 0;
			border-top-right-radius: @borderRadius;
			border-top-left-radius: @borderRadius;
		}

		&.position-br {
			bottom: 0.5em;
			right: 0;
			border-radius: 0;
			border-top-left-radius: @borderRadius;
			border-bottom-left-radius: @borderRadius;
		}
	}
}
</style>
