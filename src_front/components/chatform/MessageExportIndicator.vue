<template>
	<div class="messageexportindicator blured-background-window" :class="classes" @click="close()">
		<Icon
			class="loader"
			name="loader"
			v-if="state.id == 'progress'"
			v-tooltip="t('global.messageExport.tooltip')"
		/>
		<div class="message error" v-else-if="state.id == 'error'">
			{{ t("global.messageExport.error", state.params) }}
		</div>
		<div class="message error" v-else-if="state.id == 'error_discord_access'">
			{{ t("error.discord.MISSING_ACCESS", state.params) }}
		</div>
		<div class="message" v-else>
			<div v-if="state.id == 'complete_downloadOnly' || state.id == 'complete'">
				<Icon name="checkmark" />{{
					t("global.messageExport.complete_downloaded", state.params)
				}}
			</div>
			<div v-if="state.id == 'complete_downloadOnly' || state.id == 'discord'">
				<Icon name="checkmark" />{{
					t("global.messageExport.complete_discord", state.params)
				}}
			</div>
			<div v-if="state.id == 'complete_copyOnly' || state.id == 'complete'">
				<Icon name="checkmark" />{{
					t("global.messageExport.complete_copied", state.params)
				}}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeMain as useStoreMain } from "@/store/storeMain";
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";

const { t } = useI18n();
const storeMain = useStoreMain();

let closeTimeout: number = -1;

const state = computed(() => {
	return storeMain.messageExportState!;
});

const classes = computed<string[]>(() => {
	const res: string[] = [];
	if (state.value.id == "error" || state.value.id == "error_discord_access") res.push("error");
	return res;
});

function close() {
	if (state.value.id == "progress") return;
	storeMain.messageExportState = null;
}

onMounted(() => {
	watch(
		() => state.value,
		() => {
			//Auto close after success
			if (
				state.value.id == "complete" ||
				state.value.id == "discord" ||
				state.value.id == "complete_copyOnly" ||
				state.value.id == "complete_downloadOnly"
			) {
				closeTimeout = window.setTimeout(() => {
					storeMain.messageExportState = null;
				}, 7000);
			}
		},
	);
});

onBeforeUnmount(() => {
	clearTimeout(closeTimeout);
});
</script>

<style scoped lang="less">
.messageexportindicator {
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
	cursor: pointer;
	white-space: pre-line;
	text-align: center;
	line-height: 1.5em;

	color: var(--color-text);

	.loader {
		height: 1.5em;
	}

	.message {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: 0.5em;
		}
	}

	&.error {
		background-color: red;
	}
}
</style>
