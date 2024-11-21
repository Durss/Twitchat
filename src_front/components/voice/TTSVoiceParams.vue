<template>
	<div class="ttsvoiceparams">
		<ParamItem noBackground :paramData="param_voice" v-model="modelValue.voice" @change="onVoiceChange()" />
		<template v-if="param_voice.selectedListValue?.storage?.platform == 'elevenlabs'">
			<ParamItem noBackground :paramData="param_elevenlabs_model" v-model="modelValue.elevenlabs_model" @change="updateLanguages()">
				<div class="card-item modelInfo" v-if="param_elevenlabs_model.selectedListValue">
					<strong>{{ param_elevenlabs_model.selectedListValue!.storage?.name }}</strong>
					<div><Icon name="info" />{{param_elevenlabs_model.selectedListValue!.storage?.description}}</div>
				</div>
			</ParamItem>

			<ParamItem noBackground
			:paramData="param_elevenlabs_lang"
			v-model="modelValue.elevenlabs_lang"
			v-if="modelValue.elevenlabs_model == 'eleven_turbo_v2_5'"
			@change="onChange()" />

			<template v-if="param_elevenlabs_model.selectedListValue?.storage?.can_be_finetuned">
				<ParamItem noBackground :paramData="param_elevenlabs_stability" v-model="modelValue.elevenlabs_stability" @change="onChange()" />
				<ParamItem noBackground :paramData="param_elevenlabs_similarity" v-model="modelValue.elevenlabs_similarity" @change="onChange()" />
				<ParamItem v-if="param_elevenlabs_model.selectedListValue?.storage?.can_use_style" noBackground :paramData="param_elevenlabs_style" v-model="modelValue.elevenlabs_style" @change="onChange()" />
			</template>
		</template>

		<ParamItem noBackground :paramData="param_volume" v-model="modelValue.volume" @change="onChange()" />
		
		<template v-if="param_voice.selectedListValue?.storage?.platform == 'system'">
			<ParamItem noBackground :paramData="param_rate" v-model="modelValue.rate" @change="onChange()" />
			<ParamItem noBackground :paramData="param_pitch" v-model="modelValue.pitch" @change="onChange()" />
		</template>

		<form @submit.prevent="testVoice()">
			<input class="center" type="text" v-model="testStr" :placeholder="$t('tts.params.test_placeholder')">
			<TTButton class="center" icon="tts" type="submit">{{ $t('tts.params.testBt') }}</TTButton>
		</form>
	</div>
</template>

<script lang="ts">
import type { ElevenLabsModel } from '@/store/elevenlabs/storeElevenLabs';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TTSUtils from '@/utils/TTSUtils';
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';
import ParamItem from '../params/ParamItem.vue';
import { TTButton } from '../TTButton.vue';
import StoreProxy from '@/store/StoreProxy';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:["update:modelValue"],
})
class TTSVoiceParams extends Vue {
	@Prop
	public modelValue!:TwitchatDataTypes.TTSVoiceParamsData;

	public testStr:string = "Hello world!";

	public param_voice:TwitchatDataTypes.ParameterData<TwitchatDataTypes.TTSParamsData["voice"]["id"], TwitchatDataTypes.TTSParamsData["voice"]["id"], unknown, unknown, typeof TTSUtils.instance.voiceList[0]> = {type:"list", value:"", listValues:[], id:404, parent:400, labelKey:"tts.params.param_voice"};
	public param_volume:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, min:0, max:1, step:0.1, labelKey:"tts.params.param_volume"};
	public param_rate:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, min:0.1, max:5, step:0.1, labelKey:"tts.params.param_rate"};
	public param_pitch:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, min:0, max:2, step:0.1, labelKey:"tts.params.param_pitch"};
	public param_elevenlabs_lang:TwitchatDataTypes.ParameterData<string, string> = {type:"list", value:"", labelKey:"tts.params.param_elevenlabs_lang"};
	public param_elevenlabs_model:TwitchatDataTypes.ParameterData<string, string, unknown, unknown, ElevenLabsModel> = {type:"list", value:"", labelKey:"tts.params.param_elevenlabs_model"};
	public param_elevenlabs_stability:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:.5, min:0, max:1, step:.02, labelKey:"tts.params.param_elevenlabs_stability"};
	public param_elevenlabs_similarity:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:.5, min:0, max:1, step:.02, labelKey:"tts.params.param_elevenlabs_similarity"};
	public param_elevenlabs_style:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:0, min:0, max:1, step:.02, labelKey:"tts.params.param_elevenlabs_style"};

	public beforeMount():void {
		this.testStr = this.$t("tts.params.test_message");

		this.param_voice.listValues = TTSUtils.instance.voiceList.map(v=> {
			return {label:v.name, value:v.id, storage:v}
		})
		
		this.param_elevenlabs_model.listValues = this.$store.elevenLabs.modelList.map(v=> {
			let cost = "$";
			if(v.model_rates?.character_cost_multiplier == 1) cost += "$";
			if((v.model_rates?.character_cost_multiplier || 0) > 1) cost += "$";
			const res:NonNullable<typeof this.param_elevenlabs_model.listValues>[0] = {
				label:v.name + " ("+cost+")",
				value:v.model_id,
				storage:v
			};
			return res;
		});

		this.updateLanguages();
	}

	public mounted():void {
		this.onVoiceChange();
	}

	public onVoiceChange():void {
		//Wait for components to be mounted and initialized
		this.$nextTick().then(()=> {
			this.updateLanguages();
		});
	}

	public updateLanguages():void {
		const languages = this.param_elevenlabs_model.selectedListValue?.storage?.languages || [];
		this.param_elevenlabs_lang.listValues = languages.map(v=> {
			return {label:v.name, value:v.language_id}
		});
		this.onChange();
	}

	public testVoice():void {
		const uid = StoreProxy.auth.twitch.user.id;
		const chunks = TwitchUtils.parseMessageToChunks(this.testStr);
		const m:TwitchatDataTypes.MessageChatData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitchat",
			channel_id: uid,
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			user: StoreProxy.users.getUserFrom("twitch", uid, uid),
			message: this.testStr,
			message_chunks: chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
			message_size: TwitchUtils.computeMessageSize(chunks),
			answers: [],
			is_short:false,
		};
		TTSUtils.instance.readNow(m, undefined, this.modelValue);
	}

	public onChange():void {
		this.$emit("update:modelValue", this.modelValue);
	}
}
export default toNative(TTSVoiceParams);
</script>

<style scoped lang="less">
.ttsvoiceparams{
	gap: .5em;
	display: flex;
	flex-direction: column;

	.modelInfo {
		margin-top: .25em;
		gap: .5em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: .25em;
			vertical-align: bottom;
		}
	}
	form {
		display: flex;
		flex-direction: column;
		gap: .5em;
		.center {
			margin-left: auto;
			margin-right: auto;
		}
	}
}
</style>