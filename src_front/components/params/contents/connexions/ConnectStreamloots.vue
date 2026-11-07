<template>
	<div class="connectstreamloots parameterContent">
		<Icon name="streamloots" alt="streamloots icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamloots.header">
				<template #LINK>
					<a href="https://www.streamloots.com/" target="_blank"
						><Icon name="newtab" />Streamloots</a
					>
				</template>
			</i18n-t>
		</div>

		<div class="content">
			<template v-if="!storeStreamloots.connected">
				<div class="card-item secondary infos">
					<Icon name="info" />
					<span>{{ t("streamloots.instructions") }}</span>
				</div>

				<form class="card-item" @submit.prevent="connect()">
					<ParamItem
						class="param"
						:paramData="param_url"
						noBackground
						v-model="widgetUrl"
						autofocus
					/>
					<TTButton
						type="submit"
						icon="offline"
						:loading="connecting || storeStreamloots.connecting"
						:disabled="!canConnect"
						>{{ t("global.connect") }}</TTButton
					>
				</form>
			</template>

			<TTButton v-else alert @click="storeStreamloots.disconnect()">{{
				t("global.disconnect")
			}}</TTButton>

			<div class="card-item alert error" v-if="error" @click="error = ''">
				{{ t(`streamloots.error_messages.${error}`) }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { storeStreamloots as useStoreStreamloots } from "@/store/streamloots/storeStreamloots";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";

const { t } = useI18n();
const storeStreamloots = useStoreStreamloots();

const widgetUrl = ref<string>(storeStreamloots.widgetId);
const connecting = ref<boolean>(false);
const error = ref<"" | "INVALID_URL" | "CONNECT_FAILED">("");
const param_url = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	labelKey: "streamloots.param_url",
	placeholder: "https://widgets.streamloots.com/alerts/...",
	maxLength: 200,
});

const canConnect = computed(() => widgetUrl.value.trim().length > 0);

/**
 * Connects to Streamloots alerts and emotes streams
 */
async function connect(): Promise<void> {
	error.value = "";
	connecting.value = true;
	const success = await storeStreamloots.connect(widgetUrl.value);
	connecting.value = false;
	if (success) return;

	error.value = storeStreamloots.invalidID ? "INVALID_URL" : "CONNECT_FAILED";
	storeStreamloots.disconnect();
}
</script>

<style scoped lang="less">
.connectstreamloots {
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;

		form {
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			.param {
				:deep(.holder) {
					flex-direction: column;
				}
				:deep(.inputHolder) {
					width: 100%;
				}
			}
		}

		.infos {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			max-width: 500px;
			line-height: 1.25em;
			.icon {
				height: 1em;
				flex-shrink: 0;
			}
		}

		.error {
			cursor: pointer;
			white-space: pre-line;
			text-align: center;
			line-height: 1.25em;
		}
	}
}
</style>

