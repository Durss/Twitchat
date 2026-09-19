<template>
	<div class="voicetranscript">
		<div class="holder" ref="rootEl" v-if="show" @click="hide(true)">
			<div class="padder">
				<Icon name="microphone" alt="mic" class="icon" theme="light" />
				<div class="text">{{ text }}</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeVoice as useStoreVoice } from "@/store/voice/storeVoice";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";

const storeVoice = useStoreVoice();

const show = ref(false);
const rootEl = useTemplateRef("rootEl");

const text = computed(() => {
	if (storeVoice.voiceText.rawTempText) return storeVoice.voiceText.rawTempText;
	return storeVoice.voiceText.finalText;
});

onMounted(() => {
	watch(
		() => storeVoice.voiceText.rawTempText,
		async () => {
			if (!show.value) {
				show.value = true;
				await nextTick();
				const holder = rootEl.value!;
				gsap.killTweensOf(holder);
				gsap.to(holder, { duration: 0.25, y: "0%" });
			}
		},
	);
	watch(
		() => storeVoice.voiceText.finalText,
		async (value: string) => {
			if (value != "") {
				hide();
			}
		},
	);
});

function hide(force: boolean = false): void {
	if (!show.value) return;

	const holder = rootEl.value!;
	gsap.killTweensOf(holder);
	let len = storeVoice.voiceText.finalText.length;
	if (isNaN(len) || len < 0) len = 1;
	const delay = force ? 0 : Math.min(2, len * 0.025);
	gsap.to(holder, {
		delay,
		duration: 0.25,
		y: "120%",
		clearProps: "all",
		onComplete: () => {
			show.value = false;
		},
	});
}
</script>

<style scoped lang="less">
.voicetranscript {
	width: 100%;
	color: var(--color-light);
	// overflow-x: hidden;
	overflow-y: hidden;
	z-index: 3;
	line-height: 1.1em;
	height: fit-content;
	max-height: 3em;
	pointer-events: none;

	.holder {
		padding: 0.5em;
		background-color: fade(#000000, 50%);
		pointer-events: all;
		backdrop-filter: blur(6px);
		z-index: -1;
		cursor: pointer;
		transition: background-color 0.25s;

		&:hover {
			background-color: fade(#111, 50%);
		}

		.padder {
			max-height: 2em;
			overflow: hidden;
			display: flex;
			align-items: flex-end;
			justify-content: center;
			text-align: center;

			.icon {
				height: 1em;
				margin-right: 0.5em;
				align-self: flex-start;
			}
		}
	}
}
</style>
