<template>
	<div class="promptmodal modal noBlur" v-if="data">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder" :key="data.id">
			<ProgressBar
				v-if="timeoutDuration > 0"
				:class="{ paused: timeoutPaused }"
				:percent="timeoutPercent"
				:duration="timeoutDuration"
				noLabel
				light
				thick
			/>

			<Icon v-if="data.icon" :name="data.icon" class="icon" />
			<ClearButton aria-label="close" @click="cancel()" />

			<div v-if="data.title || data.titleLabel" class="head">
				<span class="title">{{ data.title ?? t(data.titleLabel!) }}</span>
			</div>

			<div class="header" v-if="data.header || data.headerLabel">
				{{ data.header ?? t(data.headerLabel!) }}
			</div>

			<div class="content">
				<component
					v-if="data.mode == 'template'"
					:is="PROMPT_TEMPLATES[data.template]"
					ref="templateEl"
					:payload="data.payload"
					@submit="submit"
				/>

				<ParamItem
					v-else
					v-for="(param, index) in data.inputs"
					:paramData="param"
					v-model="param.value"
					:key="param.id ?? 'param_' + index"
				/>
			</div>

			<div class="ctas">
				<TTButton alert @click="cancel()">{{ t("global.cancel") }}</TTButton>
				<TTButton primary :disabled="!canSubmit" @click="submit()">
					{{ t(data.submitLabelKey ?? "global.submit") }}
				</TTButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeMain as useStoreMain } from "@/store/storeMain.js";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../params/ParamItem.vue";
import ProgressBar from "../ProgressBar.vue";
import TTButton from "../TTButton.vue";
import { PROMPT_TEMPLATES, type PromptTemplateExpose } from "./prompt_templates";
import ClearButton from "../ClearButton.vue";

const { t } = useI18n();
const storeMain = useStoreMain();
const dimmer = useTemplateRef("dimmer");
const holder = useTemplateRef("holder");
const templateEl = useTemplateRef<PromptTemplateExpose<unknown>>("templateEl");
const closing = ref(false);
const timeoutPercent = ref(0);
const timeoutPaused = ref(false);
const keyDownHandler = (e: KeyboardEvent) => onKeyDown(e);
const activityHandler = () => onUserActivity();

let timeoutElapsed = 0;
let timeoutPrevFrame = 0;
let latestActivityDate = 0;
let timeoutInterval = -1;
const activityPauseDuration = 2000;
const activityEvents = ["keydown", "mousedown", "mousemove", "wheel", "touchstart"];

const data = computed(() => storeMain.promptParams[0]);

const timeoutDuration = computed(() => (data.value?.timeout_s ?? 0) * 1000);

const canSubmit = computed(() => {
	if (!data.value || closing.value) return false;
	//Stays disabled until the async template component is loaded
	if (data.value.mode == "template") return templateEl.value?.isValid === true;
	return data.value.inputs.every((v) => v.error !== true);
});

onMounted(() => {
	document.addEventListener("keydown", keyDownHandler, { capture: true });
	activityEvents.forEach((event) =>
		document.addEventListener(event, activityHandler, { capture: true, passive: true }),
	);
	open();
	startTimeout();
});

onBeforeUnmount(() => {
	document.removeEventListener("keydown", keyDownHandler, { capture: true });
	activityEvents.forEach((event) =>
		document.removeEventListener(event, activityHandler, { capture: true }),
	);
	stopTimeout();
});

//Replay the open animation when the next prompt of the queue shows up
watch(
	() => data.value?.id,
	async (id) => {
		if (!id) return;
		await nextTick();
		open();
		startTimeout();
	},
);

async function open(): Promise<void> {
	await nextTick();
	if (!holder.value || !dimmer.value) return;
	gsap.killTweensOf([holder.value, dimmer.value]);
	gsap.set(holder.value, { marginTop: 0, opacity: 1 });
	gsap.to(dimmer.value, { duration: 0.25, opacity: 1 });
	gsap.from(holder.value, { duration: 0.25, marginTop: 100, opacity: 0, ease: "back.out" });
}

/**
 * Starts the auto cancelation countdown.
 * Using an interval instead of a requestAnimationFrame so it
 * keeps running when the tab is in the background.
 */
function startTimeout(): void {
	stopTimeout();
	timeoutElapsed = 0;
	timeoutPercent.value = 0;
	timeoutPaused.value = false;
	latestActivityDate = 0;
	timeoutPrevFrame = Date.now();
	if (timeoutDuration.value <= 0) return;
	timeoutInterval = window.setInterval(() => renderTimeout(), 1000 / 30);
}

function stopTimeout(): void {
	clearInterval(timeoutInterval);
	timeoutInterval = -1;
}

function onUserActivity(): void {
	latestActivityDate = Date.now();
}

/**
 * Update timeout's progress.
 * Pauses progress on user activity
 */
function renderTimeout(): void {
	const now = Date.now();
	const frameDuration = now - timeoutPrevFrame;
	timeoutPrevFrame = now;
	timeoutPaused.value = now - latestActivityDate < activityPauseDuration;
	if (timeoutPaused.value) return;

	timeoutElapsed = Math.min(timeoutDuration.value, timeoutElapsed + frameDuration);
	timeoutPercent.value = timeoutElapsed / timeoutDuration.value;
	if (timeoutElapsed >= timeoutDuration.value) close();
}

function onKeyDown(e: KeyboardEvent): void {
	if (!data.value || e.key != "Escape") return;
	cancel();
	e.preventDefault();
	e.stopPropagation();
}

function cancel(): void {
	close();
}

/**
 * @param result value emitted by a template submitting itself. When omitted
 * the value is pulled from the template's getResult() or from the inputs.
 */
function submit(result?: unknown): void {
	const d = data.value;
	if (!d || !canSubmit.value) return;

	if (d.mode == "template") {
		const value = result ?? templateEl.value?.getResult();
		//Template refused the submission
		if (value === undefined) return;
		close(value);
	} else {
		close(d.inputs);
	}
}

function close(result?: unknown): void {
	const d = data.value;
	if (!d || closing.value) return;
	closing.value = true;
	stopTimeout();

	gsap.killTweensOf([holder.value!, dimmer.value!]);
	//Only fade the dimmer out if no other prompt is waiting behind
	if (storeMain.promptParams.length == 1) {
		gsap.to(dimmer.value!, { duration: 0.25, opacity: 0, ease: "sine.in" });
	}
	gsap.to(holder.value!, {
		duration: 0.25,
		marginTop: 100,
		opacity: 0,
		ease: "back.in",
		onComplete: () => {
			closing.value = false;
			storeMain.closePrompt(d.id, result);
		},
	});
}
</script>

<style scoped lang="less">
.promptmodal {
	.icon {
		height: 2em;
		margin: auto;
	}

	.holder {
		overflow: hidden;
		max-width: ~"min(calc(100vw - 1em), 600px)";
		width: max-content;

		& > .progressbar {
			position: absolute;
			top: 0;
			left: 0;
			transform: scaleY(1);
			transition: transform 0.15s;
			transform-origin: top;
			&.paused {
				transform: scaleY(0);
			}
		}
	}

	.content {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.header {
		line-height: 1.1em;
		text-align: center;
		white-space: pre-line;
	}

	.ctas {
		gap: 1em;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}
}
</style>
