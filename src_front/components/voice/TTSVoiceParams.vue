<template>
	<div class="ttsvoiceparams">
		<ParamItem
			noBackground
			:paramData="param_voice"
			v-model="modelValue.voice"
			@change="onVoiceChange()"
		/>
		<template v-if="param_voice.selectedListValue?.storage?.platform == 'elevenlabs'">
			<ParamItem
				noBackground
				:paramData="param_elevenlabs_model"
				v-model="modelValue.elevenlabs_model"
				@change="updateLanguages()"
			>
				<div class="card-item modelInfo" v-if="param_elevenlabs_model.selectedListValue">
					<strong>{{ param_elevenlabs_model.selectedListValue!.storage?.name }}</strong>
					<div>
						<Icon name="info" />{{
							param_elevenlabs_model.selectedListValue!.storage?.description
						}}
					</div>
				</div>
			</ParamItem>

			<ParamItem
				noBackground
				:paramData="param_elevenlabs_lang"
				v-model="modelValue.elevenlabs_lang"
				v-if="modelValue.elevenlabs_model == 'eleven_turbo_v2_5'"
				@change="onChange()"
			/>

			<template v-if="param_elevenlabs_model.selectedListValue?.storage?.can_be_finetuned">
				<ParamItem
					noBackground
					:paramData="param_elevenlabs_stability"
					v-model="modelValue.elevenlabs_stability"
					@change="onChange()"
				/>
				<ParamItem
					noBackground
					:paramData="param_elevenlabs_similarity"
					v-model="modelValue.elevenlabs_similarity"
					@change="onChange()"
				/>
				<ParamItem
					v-if="param_elevenlabs_model.selectedListValue?.storage?.can_use_style"
					noBackground
					:paramData="param_elevenlabs_style"
					v-model="modelValue.elevenlabs_style"
					@change="onChange()"
				/>
			</template>
		</template>

		<ParamItem
			noBackground
			:paramData="param_volume"
			v-model="modelValue.volume"
			@change="onChange()"
		/>

		<template v-if="param_voice.selectedListValue?.storage?.platform == 'system'">
			<ParamItem
				noBackground
				:paramData="param_rate"
				v-model="modelValue.rate"
				@change="onChange()"
			/>
			<ParamItem
				noBackground
				:paramData="param_pitch"
				v-model="modelValue.pitch"
				@change="onChange()"
			/>
		</template>

		<form @submit.prevent="testVoice()">
			<input
				class="center"
				type="text"
				v-model="testStr"
				:placeholder="t('tts.params.test_placeholder')"
			/>
			<TTButton class="center" icon="tts" type="submit">{{
				t("tts.params.testBt")
			}}</TTButton>
		</form>
	</div>
</template>

<script setup lang="ts">
import type { ElevenLabsModel } from "@/store/elevenlabs/storeElevenLabs";
import { storeElevenLabs as useStoreElevenLabs } from "@/store/elevenlabs/storeElevenLabs";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TTSUtils from "@/utils/TTSUtils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { nextTick, onBeforeMount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../params/ParamItem.vue";
import TTButton from "../TTButton.vue";

const props = defineProps<{
	modelValue: TwitchatDataTypes.TTSVoiceParamsData;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: TwitchatDataTypes.TTSVoiceParamsData];
}>();

const { t } = useI18n();
const storeElevenLabs = useStoreElevenLabs();

const testStr = ref("Hello world!");

const param_voice = ref<
	TwitchatDataTypes.ParameterData<
		TwitchatDataTypes.TTSParamsData["voice"]["id"],
		TwitchatDataTypes.TTSParamsData["voice"]["id"],
		unknown,
		unknown,
		(typeof TTSUtils.instance.voiceList)[0]
	>
>({
	type: "list",
	value: "",
	listValues: [],
	id: 404,
	parent: 400,
	labelKey: "tts.params.param_voice",
});
const param_volume = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 1,
	min: 0,
	max: 1,
	step: 0.1,
	labelKey: "tts.params.param_volume",
});
const param_rate = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 1,
	min: 0.1,
	max: 5,
	step: 0.1,
	labelKey: "tts.params.param_rate",
});
const param_pitch = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 1,
	min: 0,
	max: 2,
	step: 0.1,
	labelKey: "tts.params.param_pitch",
});
const param_elevenlabs_lang = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	value: "",
	labelKey: "tts.params.param_elevenlabs_lang",
});
const param_elevenlabs_model = ref<
	TwitchatDataTypes.ParameterData<string, string, unknown, unknown, ElevenLabsModel>
>({ type: "list", value: "", labelKey: "tts.params.param_elevenlabs_model" });
const param_elevenlabs_stability = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 0.5,
	min: 0,
	max: 1,
	step: 0.02,
	labelKey: "tts.params.param_elevenlabs_stability",
});
const param_elevenlabs_similarity = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 0.5,
	min: 0,
	max: 1,
	step: 0.02,
	labelKey: "tts.params.param_elevenlabs_similarity",
});
const param_elevenlabs_style = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 0,
	min: 0,
	max: 1,
	step: 0.02,
	labelKey: "tts.params.param_elevenlabs_style",
});

onBeforeMount(() => {
	testStr.value = t("tts.params.test_message");

	param_voice.value.listValues = TTSUtils.instance.voiceList.map((v) => {
		return { label: v.name, value: v.id, storage: v };
	});

	param_elevenlabs_model.value.listValues = storeElevenLabs.modelList.map((v) => {
		let cost = "$";
		if (v.model_rates?.character_cost_multiplier == 1) cost += "$";
		if ((v.model_rates?.character_cost_multiplier || 0) > 1) cost += "$";
		const res: NonNullable<typeof param_elevenlabs_model.value.listValues>[0] = {
			label: v.name + " (" + cost + ")",
			value: v.model_id,
			storage: v,
		};
		return res;
	});

	updateLanguages();
});

onMounted(() => {
	onVoiceChange();
});

function onVoiceChange(): void {
	//Wait for components to be mounted and initialized
	nextTick().then(() => {
		updateLanguages();
	});
}

function updateLanguages(): void {
	const languages = param_elevenlabs_model.value.selectedListValue?.storage?.languages || [];
	param_elevenlabs_lang.value.listValues = languages.map((v) => {
		return { label: v.name, value: v.language_id };
	});
	onChange();
}

function testVoice(): void {
	const uid = StoreProxy.auth.twitch.user.id;
	const chunks = TwitchUtils.parseMessageToChunks(testStr.value);
	const m: TwitchatDataTypes.MessageChatData = {
		id: Utils.getUUID(),
		date: Date.now(),
		platform: "twitchat",
		channel_id: uid,
		type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		user: StoreProxy.users.getUserFrom("twitch", uid, uid),
		message: testStr.value,
		message_chunks: chunks,
		message_html: TwitchUtils.messageChunksToHTML(chunks),
		message_size: TwitchUtils.computeMessageSize(chunks),
		answers: [],
		is_short: false,
	};
	TTSUtils.instance.readNow(m, undefined, props.modelValue);
}

function onChange(): void {
	emit("update:modelValue", props.modelValue);
}
</script>

<style scoped lang="less">
.ttsvoiceparams {
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	.modelInfo {
		margin-top: 0.25em;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: 0.25em;
			vertical-align: bottom;
		}
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		.center {
			margin-left: auto;
			margin-right: auto;
		}
	}
}
</style>
