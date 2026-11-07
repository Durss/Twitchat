<template>
	<div class="gngngn modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<h1 class="head">
				<span class="title">{{ t("gngngn.title") }}</span>
				<ClearButton @click="close()" />
			</h1>
			<div class="content">
				<p v-for="e in tm('gngngn.contents')" v-html="e"></p>
				<ToggleBlock class="block" :title="t('gngngn.why_title')" small :open="false">
					<p class="info">{{ t("gngngn.why_info") }}</p>
				</ToggleBlock>
				<ToggleBlock class="block" :title="t('gngngn.angry')" small :open="false">
					<p class="info" v-for="e in tm('gngngn.angry_contents')" v-html="e"></p>
				</ToggleBlock>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Config from "@/utils/Config";
import { gsap } from "gsap/gsap-core";
import { computed, onMounted, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import ToggleBlock from "../ToggleBlock.vue";

const emit = defineEmits<{
	close: [];
}>();

const { t, tm } = useI18n();

const dimmer = useTemplateRef("dimmer");
const holder = useTemplateRef("holder");

const discordPath = computed(() => Config.instance.DISCORD_URL);
const appVersion = computed(() => import.meta.env.PACKAGE_VERSION);

onMounted(() => {
	gsap.set(holder.value!, { marginTop: "calc(-.5 * var(--chat-form-height))", opacity: 1 });
	gsap.to(dimmer.value!, { duration: 0.25, opacity: 1 });
	gsap.from(holder.value!, {
		duration: 0.25,
		marginTop: -100,
		opacity: 0,
		ease: "back.out",
	});
});

async function close(): Promise<void> {
	gsap.killTweensOf([holder.value, dimmer.value]);
	gsap.to(dimmer.value!, { duration: 0.25, opacity: 0, ease: "sine.in" });
	gsap.to(holder.value!, {
		duration: 0.25,
		marginTop: -100,
		opacity: 0,
		ease: "back.in",
		onComplete: () => {
			emit("close");
		},
	});
}
</script>

<style scoped lang="less">
.gngngn {
	z-index: 2;

	.holder {
		line-height: 1.2em;
		width: 600px;
		height: fit-content;
		max-width: 600px;
		max-height: calc(var(--vh) - var(--chat-form-height));

		.block {
			margin-top: 0.5em;
		}

		.info {
			font-size: 0.8em;
			line-height: 1.3em;
		}
	}
}
</style>
