<template>
	<div class="paramsvoicebot">
		<img src="@/assets/icons/voice.svg" alt="voice icon" class="icon">
		<div class="head">{{ $t("voice.header") }}</div>
		
		<div v-if="!voiceApiAvailable" class="noApi">
			<p>{{ $t("voice.unsupported_browser") }}</p>
			<p class="infos">{{ $t("voice.unsupported_browser_detail") }}</p>
		</div>
		<div v-else class="infos">{{ $t("voice.supported_browsers") }}</div>

		<div v-if="!voiceApiAvailable || true" class="fallback">
			<p>{{ $t("voice.remote_control") }}</p>
			<a :href="voicePageUrl" target="_blank">{{voicePageUrl}}</a>
		</div>

		<div>
			<VoiceControlForm v-if="obsConnected" class="form" :voiceApiAvailable="voiceApiAvailable" />
			<div class="connectObs" v-if="!obsConnected">
				<div>{{ $t("voice.need_OBS") }}</div>
				<Button class="button" :title="$t('voice.obs_connectBt')" white @click="$store('params').openParamsPage(contentObs)" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Component, Vue } from 'vue-facing-decorator';
import VoiceControlForm from '../../voice/VoiceControlForm.vue';
import Button from '../../Button.vue';
import VoiceController from '@/utils/voice/VoiceController';
import Config from '@/utils/Config';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button,
		VoiceControlForm,
	},
	emits:[]
})
export default class ParamsVoiceBot extends Vue implements IParameterContent {
	
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; } 

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get voicePageUrl():string {
		let url = document.location.origin;
		url += this.$router.resolve({name:"voice"}).href;
		return url;
	}

	public get voiceApiAvailable():boolean {
		return VoiceController.instance.apiAvailable && !Config.instance.OBS_DOCK_CONTEXT;
	}

	public onNavigateBack(): boolean { return false; }

}

</script>

<style scoped lang="less">
.paramsvoicebot{
	.parameterContent();
	
	.infos {
		font-size: .9em;
		text-align: center;
	}
	.form {
		margin-top: 1em;
	}

	.noApi, 
	.connectObs {
		text-align: center;
		color: var(--mainColor_light);
		background-color: var(--mainColor_alert);
		padding: .5em;
		border-radius: .5em;
		margin-top: 1em;

		.button {
			margin-top: .5em;
		}
	}

	.fallback {
		font-size: .8em;
		line-height: 1.2em;
		margin-top: 1em;
		border: 1px solid var(--mainColor_normal);
		border-radius: .5em;
		padding: .5em;
	}
}
</style>