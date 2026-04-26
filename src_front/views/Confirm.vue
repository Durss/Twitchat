<template>
	<div class="confirmView modal" v-if="confirmData" ref="rootEl">
		<div class="dimmer" ref="dimmer" @click="answer(false)"></div>
		<div class="holder" ref="holder">
			<div class="title" v-html="htmlSafe(confirmData.title)"></div>

			<VoiceGlobalCommandsHelper v-if="voiceController" :confirmMode="true" />

			<div
				class="description"
				v-if="confirmData.description"
				v-html="htmlSafe(confirmData.description)"
			></div>
			<div class="buttons">
				<TTButton class="button" @click.stop="answer()" alert>{{
					confirmData.noLabel ?? t("global.cancel")
				}}</TTButton>
				<TTButton class="button" @click.stop="answer(true)" primary>{{
					confirmData.yesLabel ?? t("global.yes")
				}}</TTButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import FormVoiceControllHelper from "@/components/voice/FormVoiceControllHelper";
import { storeMain as useStoreMain } from "@/store/storeMain";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import VoiceController from "@/utils/voice/VoiceController";
import { gsap } from "gsap/gsap-core";
import DOMPurify from "isomorphic-dompurify";
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import VoiceGlobalCommandsHelper from "../components/voice/VoiceGlobalCommandsHelper.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeMain = useStoreMain();
const rootEl = useTemplateRef("rootEl");
const dimmer = useTemplateRef("dimmer");
const holder = useTemplateRef("holder");
const confirmData = ref<TwitchatDataTypes.ConfirmData | null>(null);
const submitPressed = ref<boolean>(false);
const voiceController = ref<FormVoiceControllHelper>();
const keyUpHandler = (e: KeyboardEvent) => onKeyUp(e);
const keyDownHandler = (e: KeyboardEvent) => onDownUp(e);
const mouseDownhandler = (e: MouseEvent) => blockEvent(e);
const mouseUphandler = (e: MouseEvent) => blockEvent(e);

onMounted(() => {
	document.addEventListener("keyup", keyUpHandler);
	document.addEventListener("keydown", keyDownHandler, { capture: true });
	document.addEventListener("mousedown", mouseDownhandler, { capture: true });
	document.addEventListener("mouseup", mouseUphandler, { capture: true });
});

onBeforeUnmount(() => {
	document.removeEventListener("keyup", keyUpHandler);
	document.removeEventListener("keydown", keyDownHandler, { capture: true });
	document.removeEventListener("mousedown", mouseDownhandler, { capture: true });
	document.removeEventListener("mouseup", mouseUphandler, { capture: true });
});

watch(
	() => storeMain.confirmData,
	async () => {
		await Utils.promisedTimeout(50);
		const newData = storeMain.confirmData;

		if (newData != null) {
			confirmData.value = newData;
			await nextTick();
			(document.activeElement as HTMLElement)?.blur(); //avoid clicking again on focused button if submitting confirm via SPACE key
			gsap.killTweensOf([holder.value!, dimmer.value!]);
			gsap.set(holder.value!, { marginTop: 0, opacity: 1 });
			gsap.to(dimmer.value!, { duration: 0.25, opacity: 1 });
			gsap.from(holder.value!, {
				duration: 0.25,
				marginTop: 100,
				opacity: 0,
				ease: "back.out",
			});
			if (VoiceController.instance.started.value) {
				voiceController.value = new FormVoiceControllHelper(
					rootEl.value!,
					close,
					submitForm,
				);
			}
		} else {
			if (voiceController.value) voiceController.value.dispose();
			gsap.killTweensOf([holder.value!, dimmer.value!]);
			gsap.to(dimmer.value, { duration: 0.25, opacity: 0, ease: "sine.in" });
			gsap.to(holder.value, {
				duration: 0.25,
				marginTop: 100,
				opacity: 0,
				ease: "back.out",
				onComplete: () => {
					confirmData.value = null;
				},
			});
		}
	},
);

function htmlSafe(html: string): string {
	return DOMPurify.sanitize(html);
}

/**
 * Used by FormVoiceControllHelper
 */
function close(): void {
	answer(false);
}

/**
 * Used by FormVoiceControllHelper
 */
function submitForm(): void {
	answer(true);
}

/**
 * Captures mouse events as long as the confirm is open.
 * This avoids other windows in the background detecting "click outside" events
 * from closing when clicking here.
 */
function blockEvent(e: MouseEvent): void {
	if (!confirmData.value) return;
	e.preventDefault();
	e.stopPropagation();
}

function onDownUp(e: KeyboardEvent): void {
	if (!confirmData.value) return;
	if (e.key == "Enter" || e.key == " ") {
		//Enter / space
		submitPressed.value = true;
		e.preventDefault();
	}
	if (e.key == "Escape") {
		//escape
		answer(false);
		e.preventDefault();
		e.stopPropagation();
	}
}

function onKeyUp(e: KeyboardEvent): void {
	if (!confirmData.value) return;
	if (e.key == "Enter" || e.key == " ") {
		//Enter / space
		if (submitPressed.value) {
			answer(true);
			submitPressed.value = false;
		}
		e.preventDefault();
		e.stopPropagation();
	}
}

function answer(confirm = false): void {
	const d = storeMain.confirmData;
	if (!d) return;

	if (confirm) {
		if (d.confirmCallback) {
			d.confirmCallback!();
		}
	} else {
		if (d.cancelCallback) {
			d.cancelCallback!();
		}
	}
	storeMain.closeConfirm();
}
</script>

<style lang="less" scoped>
.confirmView {
	z-index: 99;
	position: fixed;

	& > .holder {
		width: 400px;

		.icon {
			display: block;
			margin: auto;
			margin-bottom: 0.5em;
			height: 3em;
		}

		.title {
			font-size: 2em;
			text-align: center;
		}

		.voiceHelper {
			margin: auto;
		}

		.description {
			font-size: 1.25em;
			line-height: 1.25em;
			margin-top: 1em;
			text-align: center;
			white-space: pre-line;
		}

		.buttons {
			width: 100%;
			display: flex;
			flex-direction: row;
			margin: auto;
			margin-top: 1em;
			justify-content: space-evenly;
			.button {
				text-transform: uppercase;
			}
		}
	}
}

@media only screen and (max-width: 500px) {
	.confirmView {
		& > .holder {
			padding: 0.75em;
			width: 90vw;

			.icon {
				height: 2em;
			}

			.title {
				font-size: 1.5em;
			}

			.description {
				font-size: 1em;
				margin-top: 0.5em;
			}

			.buttons {
				margin-top: 1em;
			}
		}
	}
}
</style>
