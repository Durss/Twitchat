<template>
	<div class="connectstreamsocket parameterContent">
		<Icon name="streamsocket" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamsocket.header">
				<template #LINK>
					<a
						href="https://dashboard.twitch.tv/extensions/1lpj3883m4u6exlgdwzuk627bvpabj"
						target="_blank"
						><Icon name="newtab" />StreamSocket Events</a
					>
				</template>
			</i18n-t>
		</div>

		<template v-if="!storeStreamSocket.connected">
			<section>
				<TTButton
					icon="newtab"
					type="link"
					href="https://dashboard.twitch.tv/extensions/1lpj3883m4u6exlgdwzuk627bvpabj"
					target="_blank"
					@click="storeStreamSocket.disconnect(true)"
					>{{ t("streamsocket.installBt") }}</TTButton
				>
			</section>

			<section class="card-item form">
				<form @submit.prevent="storeStreamSocket.connect(secretField.value)">
					<ParamItem :paramData="secretField" v-model="secretField.value" noBackground />

					<ToggleBlock small :title="t('streamsocket.help')" :open="false">
						<div class="infos">
							<span>{{ t("streamsocket.find_secret") }}</span>
							<img src="@/assets/img/streamsocket_secret.png" width="330" />
						</div>
					</ToggleBlock>

					<TTButton
						icon="online"
						type="submit"
						:loading="storeStreamSocket.connecting"
						:disabled="secretField.value.length < 100"
						>{{ t("global.connect") }}</TTButton
					>

					<div
						class="card-item alert error"
						v-if="storeStreamSocket.invalidSecret"
						@click="storeStreamSocket.invalidSecret = false"
					>
						{{ t("error.streamSocket_connect_failed") }}
					</div>
				</form>
			</section>

			<section class="card-item connected">
				<img class="graph" src="@/assets/img/streamsocket_graph.png" />
			</section>
		</template>

		<section class="card-item connected" v-else>
			<TTButton
				alert
				icon="offline"
				class="disconnectBt"
				@click="storeStreamSocket.disconnect(true)"
				>{{ t("global.disconnect") }}</TTButton
			>

			<i18n-t scope="global" tag="span" keypath="streamsocket.next_step">
				<template #TRIGGERS>
					<a @click="openTriggers()">{{ t("params.categories.triggers") }}</a>
				</template>
			</i18n-t>

			<img class="graph" src="@/assets/img/streamsocket_graph.png" />
		</section>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeStreamSocket as useStoreStreamSocket } from "@/store/streamsocket/storeStreamSocket";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";

const { t } = useI18n();
const storeParams = useStoreParams();
const storeStreamSocket = useStoreStreamSocket();

const secretField = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "password",
	value: "",
	labelKey: "streamsocket.secret_input",
	icon: "key",
	isPrivate: true,
});

onMounted(() => {
	secretField.value.value = storeStreamSocket.socketSecret || "";
});

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}
</script>

<style scoped lang="less">
.connectstreamsocket {
	form {
		// max-width: 400px;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.infos {
			margin-top: 1em;
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
	}

	.error {
		white-space: pre-line;
		cursor: pointer;
	}

	.connected {
		margin: auto;
		text-align: center;

		.disconnectBt {
			margin: auto;
		}
	}

	.graph {
		margin: auto;
		margin-top: 2em;
		display: block;
		max-width: 500px;
	}
}
</style>
