<template>
	<div class="groqchannelaction">
		<ButtonNotification icon="groq" class="button" @click.stop="open"></ButtonNotification>

		<div class="popin blured-background-window" ref="popin" v-if="expand">
			<GroqSummaryFilterForm
				:messageList="storeChat.messages"
				@complete="close"
				standalone
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { gsap } from "gsap/gsap-core";
import { nextTick, onBeforeMount, onBeforeUnmount, ref, useTemplateRef } from "vue";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import ButtonNotification from "../ButtonNotification.vue";
import GroqSummaryFilterForm from "../GroqSummaryFilterForm.vue";

const storeChat = useStoreChat();
const popin = useTemplateRef<HTMLDivElement>("popin");

const expand = ref<boolean>(false);

onBeforeMount(() => {
	document.addEventListener("click", onClickDOM, true);
});

onBeforeUnmount(() => {
	storeChat.messageMode = "message";
	document.removeEventListener("click", onClickDOM, true);
});

/**
 * Opens the window
 */
async function open(event: MouseEvent): Promise<void> {
	event.stopPropagation();
	event.preventDefault();
	if (expand.value) {
		onClickDOM(event);
		return;
	}
	expand.value = true;
	await nextTick();
	const holder = popin.value!;
	gsap.killTweensOf(holder);
	gsap.fromTo(
		holder,
		{ scaleY: 0 },
		{ duration: 0.25, scaleY: 1, ease: "back.out", delay: 0.05 },
	);
}

/**
 * Closes the window
 */
function close(): void {
	const holder = popin.value;
	if (!holder) return;
	gsap.killTweensOf(holder);
	gsap.to(holder, {
		duration: 0.1,
		scaleY: 0,
		clearProps: "scaleY",
		ease: "back.in",
		onComplete: () => {
			expand.value = false;
		},
	});
}

/**
 * Detects click outside of the window to close it
 */
function onClickDOM(e: MouseEvent): void {
	if (!expand.value) return;
	const holder = popin.value;
	if (!holder) return;

	let target = e.target as HTMLElement;
	while (target != document.body && target != holder && target != null) {
		target = target.parentElement as HTMLElement;
	}
	if (target === document.body) {
		close();
	}
}
</script>

<style scoped lang="less">
.groqchannelaction {
	.newFlag {
		&::before {
			top: 0;
			left: 0;
		}
	}

	& > .button {
		min-width: 1.5em;
		min-height: 1.5em;
		font-weight: bold;
		:deep(.icon) {
			width: auto;
			font-size: 0.8em;
		}
	}

	.popin {
		position: absolute;
		bottom: 100%;
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		max-width: 500px;
	}
}
</style>
