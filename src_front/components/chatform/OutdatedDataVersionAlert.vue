<template>
	<div class="outdateddataversionalert modal">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<h1 class="title"><Icon name="alert" /> {{ t("outdated_data.title") }}</h1>
			</div>
			<div class="content" v-if="!confirm && !readOnly && !why">
				<i18n-t scope="global" tag="p" keypath="outdated_data.description">
					<template #WHY
						>(<a href="#" @click.prevent="why = true">{{ t("outdated_data.why_bt") }}</a
						>)</template
					>
				</i18n-t>
				<div class="buttonList vertical">
					<TTButton
						class="uploadBt"
						icon="upload"
						:loading="saving"
						@click="confirm = true"
						alert
						>{{ t("outdated_data.erase_bt") }}</TTButton
					>
					<a href="#" @click.prevent="readOnly = true">{{
						t("outdated_data.readOnly_bt")
					}}</a>
				</div>
			</div>
			<div class="content" v-else>
				<p v-if="readOnly">{{ t("outdated_data.readOnly") }}</p>
				<p v-else-if="why">{{ t("outdated_data.why_description") }}</p>
				<p v-else>{{ t("outdated_data.confirm") }}</p>
				<div class="buttonList" v-if="!why">
					<TTButton
						icon="back"
						:loading="saving"
						@click="confirm = readOnly = why = false"
						>{{ t("global.back") }}</TTButton
					>
					<TTButton
						icon="upload"
						v-if="!readOnly"
						:loading="saving"
						@click="saveData()"
						primary
						>{{ t("global.confirm") }}</TTButton
					>
					<TTButton icon="checkmark" v-else @click="close()" primary>{{
						t("global.confirm")
					}}</TTButton>
				</div>
				<div class="buttonList" v-else>
					<TTButton icon="back" @click="why = false">{{ t("global.back") }}</TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import DataStore from "@/store/DataStore";
import { storeMain as useStoreMain } from "@/store/storeMain";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/all";
import { onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";

const { t } = useI18n();
const storeMain = useStoreMain();

const dimmer = useTemplateRef("dimmer");
const holder = useTemplateRef("holder");

const why = ref(false);
const saving = ref(false);
const confirm = ref(false);
const readOnly = ref(false);

onMounted(() => {
	gsap.set(holder.value!, { marginTop: 0, opacity: 1 });
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
			storeMain.hideOutdatedDataVersionAlert(readOnly.value === true);
		},
	});
}

async function saveData(): Promise<void> {
	saving.value = true;
	await DataStore.save(true);
	await Utils.promisedTimeout(500);
	saving.value = false;
	close();
}
</script>

<style scoped lang="less">
.outdateddataversionalert {
	z-index: 10;
	.holder {
		max-width: 620px;
		border: 3px solid var(--color-secondary);
	}
	.content {
		p {
			white-space: pre-line;
			line-height: 1.25em;
		}
		.buttonList {
			gap: 1em;
			width: 100%;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			margin-top: 1em;
			&.vertical {
				flex-direction: column;
			}
			a {
				color: var(--color-text);
				font-style: italic;
			}
		}
	}
}
</style>
