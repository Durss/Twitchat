<template>
	<div class="paramsvoicebot parameterContent">
		<Icon name="voice" alt="voice icon" class="icon"/>
		<div class="head">{{ $t("voice.header") }}</div>

		<div v-if="!voiceApiAvailable" class="card-item alert noApi">
			<p>{{ $t("voice.unsupported_browser") }}</p>
			<p>{{ $t("voice.unsupported_browser_detail") }}</p>
		</div>
		<div v-else class="infos">{{ $t("voice.supported_browsers") }}</div>

		<div class="card-item fallback">
			<p>{{ $t("voice.remote_control") }}</p>
			<a :href="voicePageUrl" target="_blank">{{voicePageUrl}}</a>
		</div>

		<VoiceControlForm v-if="obsConnected" class="form" :voiceApiAvailable="voiceApiAvailable" />

		<div class="card-item alert connectObs" v-if="!obsConnected">
			<div>{{ $t("voice.need_OBS") }}</div>
			<Button class="button" icon="obs" light alert @click="$store.params.openParamsPage(contentConnexions, subcontentObs)">{{ $t('voice.obs_connectBt') }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket from '@/utils/OBSWebsocket';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import VoiceControlForm from '../../voice/VoiceControlForm.vue';
import TTButton from '../../TTButton.vue';
import VoiceController from '@/utils/voice/VoiceController';
import Config from '@/utils/Config';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button: TTButton,
		VoiceControlForm,
	},
	emits:[]
})
class ParamsVoiceBot extends Vue implements IParameterContent {

	public get subcontentObs():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }

	public get obsConnected():boolean { return OBSWebsocket.instance.connected.value; }
	public get voiceApiAvailable():boolean { return VoiceController.instance.apiAvailable && !Config.instance.OBS_DOCK_CONTEXT; }
	public get voicePageUrl():string {
		let url = document.location.origin;
		url += this.$router.resolve({name:"voice"}).href;
		return url;
	}

	public onNavigateBack(): boolean { return false; }

}

export default toNative(ParamsVoiceBot);
</script>

<style scoped lang="less">
.paramsvoicebot{
	.infos {
		text-align: center;
	}

	.noApi,
	.connectObs {
		text-align: center;
		line-height: 1.3em;

		.button {
			margin-top: .5em;
		}
	}

	.fallback {
		font-size: .8em;
		line-height: 1.2em;
	}
}
</style>
