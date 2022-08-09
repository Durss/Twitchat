<template>
	<div class="paramsvoicebot">
		<img src="@/assets/icons/voice_purple.svg" alt="voice icon" class="icon">
		<div class="title">Control <strong>Twitchat</strong> with your voice</div>
		<!-- <p>If you use Twitchat from an OBS dock, you'll want to open twitchat on one of the above browsers.</p> -->
		
		<div v-if="!voiceApiAvailable" class="noApi">
			<p>This browser does not support voice recognition</p>
			<p class="infos">Please use Google Chrome, Microsoft Edge or Safari.</p>
		</div>

		<div v-if="!voiceApiAvailable" class="fallback">
			<p>If you still want to use Twitchat on the current browser, you can open the following page on one of the compatible browsers:</p>
			<a :href="voicePageUrl" target="_blank">{{voicePageUrl}}</a>
		</div>

		<div v-if="voiceApiAvailable">
			<VoiceControlForm v-if="obsConnected" class="form" />
	
			<div class="connectObs" v-if="!obsConnected">
				<div>This features needs you to connect with OBS.</div>
				<Button class="button" title="Connect with OBS" white @click="$emit('setContent', contentObs)" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import VoiceControlForm from '../../voice/VoiceControlForm.vue';
import Button from '../../Button.vue';
import VoiceController from '@/utils/VoiceController';
import Config from '@/utils/Config';
import { ParamsContentType, type ParamsContentStringType } from '@/types/TwitchatDataTypes';

@Options({
	props:{},
	components:{
		Button,
		VoiceControlForm,
	},
	emits:["setContent"]
})
export default class ParamsVoiceBot extends Vue {
	
	public get contentObs():ParamsContentStringType { return ParamsContentType.OBS; } 

	public get obsConnected():boolean { return this.$router.currentRoute.value.name != "voice" || OBSWebsocket.instance.connected; }
	public get voicePageUrl():string {
		let url = document.location.origin;
		url += this.$router.resolve({name:"voice"}).href;
		return url;
	}

	public get voiceApiAvailable():boolean {
		return VoiceController.instance.apiAvailable && !Config.instance.OBS_DOCK_CONTEXT;
	}

}

</script>

<style scoped lang="less">
.paramsvoicebot{
	.icon {
		height: 5em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}
	.title {
		text-align: center;
		margin-bottom: 1em;
	}
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
		color: @mainColor_light;
		background-color: @mainColor_alert;
		padding: .5em;
		border-radius: .5em;
		margin-top: 1em;

		.button {
			margin-top: .5em;
		}
	}

	.fallback {
		margin-top: 1em;
		border: 1px solid @mainColor_normal;
		border-radius: 1em;
		padding: .5em;
	}
}
</style>