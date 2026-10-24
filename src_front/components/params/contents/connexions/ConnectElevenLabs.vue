<template>
	<div class="connectelevenlabs parameterContent">
		<Icon name="elevenlabs" alt="elevenlabs icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="elevenlabs.header">
				<template #LINK>
					<a href="https://elevenlabs.io" target="_blank"
						><Icon name="newtab" />ElevenLabs</a
					>
				</template>
			</i18n-t>
			<div class="card-item secondary infos" v-if="!storeElevenLabs.connected">
				<span>
					<Icon name="info" />
					<span>{{ t("elevenlabs.instructions") }}</span>
				</span>
				<TTButton
					class="installBt"
					href="https://elevenlabs.io/app/settings/api-keys"
					type="link"
					icon="newtab"
					target="_blank"
					light
					secondary
					>{{ t("elevenlabs.install") }}</TTButton
				>
			</div>
		</div>

		<div class="content">
			<TTButton
				class="connectBt"
				alert
				@click="disconnect()"
				icon="offline"
				v-if="storeElevenLabs.connected"
				>{{ t("global.disconnect") }}</TTButton
			>

			<form class="card-item" v-else @submit.prevent="connect()">
				<ParamItem
					noBackground
					:paramData="param_apiKey"
					v-model="storeElevenLabs.apiKey"
					autofocus
				/>

				<div class="ctas">
					<TTButton
						type="submit"
						:loading="connecting"
						:disabled="!canConnect"
						icon="online"
						>{{ t("global.connect") }}</TTButton
					>
				</div>
			</form>
			<div class="card-item alert error" v-if="error" @click="error = false">
				<div>{{ t(`elevenlabs.errors.${errorKey}`) }}</div>
				<i18n-t
					tag="div"
					scope="global"
					v-if="te(`elevenlabs.error_resolution_source.${errorKey}`)"
					keypath="elevenlabs.error_resolution"
				>
					<template #SOURCE>
						<strong>{{ t(`elevenlabs.error_resolution_source.${errorKey}`) }}</strong>
					</template>
				</i18n-t>
			</div>

			<template v-if="storeElevenLabs.connected">
				<div class="card-item infos">
					<i18n-t scope="global" keypath="elevenlabs.usage" tag="span">
						<template #TTS>
							<a @click.prevent="openTTS()">{{ t("params.categories.tts") }}</a>
						</template>
						<template #TRIGGERS>
							<a @click.prevent="openTriggers()">{{
								t("params.categories.triggers")
							}}</a>
						</template>
					</i18n-t>
				</div>

				<div class="credits">
					<TTButton
						icon="refresh"
						:loading="loadingCredits"
						@click="refreshCreditsUsage"
					/>
					<i18n-t
						class="card-item"
						scope="global"
						keypath="elevenlabs.credits_usage"
						tag="span"
					>
						<template #LIMIT>
							<strong>{{ storeElevenLabs.creditsTotal }}</strong>
						</template>
						<template #REMAINING>
							<strong>{{
								storeElevenLabs.creditsTotal - storeElevenLabs.creditsUsed
							}}</strong>
						</template>
					</i18n-t>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { storeElevenLabs as useStoreElevenLabs } from "@/store/elevenlabs/storeElevenLabs";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { toast } from "@/utils/toast/toast";
import Utils from "@/utils/Utils";

const { t, te } = useI18n();

const storeElevenLabs = useStoreElevenLabs();
const storeParams = useStoreParams();

const error = ref(false);
const loadingCredits = ref(false);
const errorKey = ref("");
const connecting = ref(false);

const param_apiKey = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "password",
	icon: "key",
	labelKey: "elevenlabs.apiKey",
	isPrivate: true,
});

const canConnect = computed(() => param_apiKey.value.value.length >= 30);

async function connect(): Promise<void> {
	error.value = false;
	connecting.value = true;
	const res = await storeElevenLabs.connect();
	error.value = res !== true;
	errorKey.value = res === true ? "" : res;
	connecting.value = false;
}

function disconnect(): void {
	storeElevenLabs.disconnect();
}

function openTTS(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TTS);
}

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

async function refreshCreditsUsage(): Promise<void> {
	loadingCredits.value = true;
	await Utils.promisedTimeout(250);
	try {
		await storeElevenLabs.loadApiCredits();
	} catch (e) {
		// ignore
		toast(t("elevenlabs.errors.UNKNOWN"), {
			type: "error",
		});
	}
	loadingCredits.value = false;
}
</script>

<style scoped lang="less">
.connectelevenlabs {
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
		line-height: 1.2em;
	}

	.credits {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
	}
}
</style>
