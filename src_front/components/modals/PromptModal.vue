<template>
	<div class="promptmodal modal" v-if="data">
		<div class="dimmer" ref="dimmer" @click="cancel()"></div>
		<div class="holder" ref="holder" :key="data.id">
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
import TTButton from "../TTButton.vue";
import { PROMPT_TEMPLATES, type PromptTemplateExpose } from "./prompt_templates";
import ClearButton from "../ClearButton.vue";

const { t } = useI18n();
const storeMain = useStoreMain();
const dimmer = useTemplateRef("dimmer");
const holder = useTemplateRef("holder");
const templateEl = useTemplateRef<PromptTemplateExpose<unknown>>("templateEl");
const closing = ref(false);
const keyDownHandler = (e: KeyboardEvent) => onKeyDown(e);

const data = computed(() => storeMain.promptParams[0]);

const canSubmit = computed(() => {
	if (!data.value || closing.value) return false;
	//Stays disabled until the async template component is loaded
	if (data.value.mode == "template") return templateEl.value?.isValid === true;
	return data.value.inputs.every((v) => v.error !== true);
});

onMounted(() => {
	document.addEventListener("keydown", keyDownHandler, { capture: true });
	open();
});

onBeforeUnmount(() => {
	document.removeEventListener("keydown", keyDownHandler, { capture: true });
});

//Replay the open animation when the next prompt of the queue shows up
watch(
	() => data.value?.id,
	async (id) => {
		if (!id) return;
		await nextTick();
		open();
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

