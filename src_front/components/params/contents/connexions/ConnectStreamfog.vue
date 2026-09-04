<template>
	<div class="connectstreamfog parameterContent">
		<Icon name="streamfog" alt="streamfog icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamfog.header">
				<template #LINK>
					<a href="https://streamfog.com/" target="_blank"
						><Icon name="newtab" />Streamfog</a
					>
				</template>
			</i18n-t>
			<div class="card-item secondary infos">
				<span>
					<Icon name="info" />
					<span>{{ t("streamfog.instructions") }}</span>
				</span>
				<TTButton
					class="installBt"
					href="https://streamfog.com/"
					type="link"
					icon="newtab"
					target="_blank"
					light
					secondary
					>{{ t("streamfog.install") }}</TTButton
				>
			</div>
		</div>

		<div class="content">
			<form class="card-item" @submit.prevent="connect()">
				<ParamItem
					noBackground
					:paramData="param_userId"
					v-model="storeStreamfog.userId"
					autofocus
				/>

				<TTButton
					type="submit"
					v-if="!storeStreamfog.connected"
					:loading="connecting"
					:disabled="!canConnect"
					>{{ t("global.connect") }}</TTButton
				>
			</form>

			<div
				class="card-item alert message error"
				v-if="storeStreamfog.invalidID"
				@click="storeStreamfog.invalidID = false"
			>
				{{ t(`streamfog.error_messages.${error}`) }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { storeStreamfog as useStoreStreamfog } from "@/store/streamfog/storeStreamfog";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";

const { t } = useI18n();
const storeStreamfog = useStoreStreamfog();

const error = ref("false");
const connecting = ref(false);
const param_userId = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "streamfog.param_userId",
	maxLength: 24,
});

const canConnect = computed(() => param_userId.value.value.length >= 24);

async function connect(): Promise<void> {
	error.value = "";
	connecting.value = true;
	const res = await storeStreamfog.connect(param_userId.value.value);
	if (res !== true) error.value = res;
	connecting.value = false;
}
</script>

<style scoped lang="less">
.connectstreamfog {
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;

		form {
			display: flex;
			flex-direction: column;
			gap: 0.5em;
		}
		.ctas {
			gap: 1em;
			display: flex;
			flex-direction: row;
			justify-content: center;
		}

		.error {
			cursor: pointer;
			white-space: pre-line;
			text-align: center;
		}
	}

	.infos {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
