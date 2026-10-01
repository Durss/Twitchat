<template>
	<div ref="rootEl" class="alertview" v-if="message && message.length > 0" @click="close()">
		<ClearButton v-if="!locked" />
		<div v-html="message" class="label"></div>
		<div v-if="storeCommon.alertData.showContact" class="contact">
			<TTButton
				@click.stop
				:href="discordUrl"
				type="link"
				target="_blank"
				icon="discord"
				light
				alert
				>{{ $t("global.ask_supportBt") }}</TTButton
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import ClearButton from "@/components/ClearButton.vue";
import TTButton from "@/components/TTButton.vue";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import Config from "@/utils/Config";
import { gsap } from "gsap/gsap-core";
import DOMPurify from "isomorphic-dompurify";
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

const storeCommon = useStoreCommon();
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");

const message = ref("");
let timeout: number;
const locked = ref(false);
const showContact = ref(false);

const discordUrl = computed((): string => {
	return Config.instance.DISCORD_URL;
});

async function onWatchAlert(): Promise<void> {
	if (locked.value) return;

	let mess = storeCommon.alertData;
	if (mess && mess.message.length > 0) {
		message.value = DOMPurify.sanitize(mess.message);
		await nextTick();
		rootEl.value!.removeAttribute("style");
		gsap.killTweensOf(rootEl.value!);
		gsap.from(rootEl.value!, {
			duration: 0.3,
			height: 0,
			paddingTop: 0,
			paddingBottom: 0,
			ease: "back.out",
		});
		clearTimeout(timeout);

		if (mess.critical) {
			locked.value = true;
		} else if (!showContact.value) {
			const autoHideDuration = (message.value.length * 80 + 2000) * 4;
			timeout = window.setTimeout(() => close(), autoHideDuration);
		}
	} else if (message.value) {
		gsap.to(rootEl.value!, {
			duration: 0.3,
			height: 0,
			paddingTop: 0,
			paddingBottom: 0,
			ease: "back.in",
			onComplete: () => {
				message.value = "";
			},
		});
	}
}

function close(): void {
	if (locked.value) return;

	clearTimeout(timeout);
	storeCommon.alertData.message = "";
}

onBeforeUnmount(() => {
	clearTimeout(timeout);
});
watch(
	() => storeCommon.alertData.message,
	() => {
		onWatchAlert();
	},
	{ immediate: true },
);
</script>

<style lang="less" scoped>
.alertview {
	background-color: var(--color-alert);
	color: var(--color-light);
	padding: 20px 0;
	height: auto;
	width: 100%;
	overflow: hidden;
	z-index: 101;
	position: fixed;
	top: 0;
	left: 0;
	cursor: pointer;
	gap: 1em;
	display: flex;
	flex-direction: column;

	.label {
		max-width: 600px;
		margin: 0 auto;
		text-align: center;
		line-height: 1.3em;
		white-space: pre-line;
	}

	.contact {
		align-self: center;
	}
}
</style>
