<template>
	<div class="voicecontrol">
		<div class="block head">
			<img src="@/assets/icons/voice.svg" alt="voice icon" class="icon">
			<p>This page allows you to control <strong>Twitchat</strong> and some twitch features with your voice</p>
			<p class="install">In order to work, this needs <strong>OBS v27.2+</strong> and <a :href="obswsInstaller" target="_blank">OBS-websocket&nbsp;plugin&nbsp;V5</a><i>(scroll to bottom)</i> to be installed.</p>
		</div>

		<ToggleBlock class="block conf"
		:open="!connected"
		icon="info_purple"
		title="OBS credentials">
			<OBSConnectForm  class="connectForm" />
		</ToggleBlock>

		<VoiceControlForm class="block" v-if="connected" />
	</div>
</template>

<script lang="ts">
import { ParameterData } from '@/store';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../components/params/ParamItem.vue';
import ParamsOBS from '../components/params/contents/ParamsOBS.vue';
import OBSConnectForm from '../components/params/contents/obs/OBSConnectForm.vue';
import Config from '@/utils/Config';
import ToggleBlock from '../components/ToggleBlock.vue';
import OBSWebsocket from '@/utils/OBSWebsocket';
import VoiceControlForm from '../components/voice/VoiceControlForm.vue';

@Options({
	props:{},
	components:{
		ParamItem,
		ParamsOBS,
		ToggleBlock,
		OBSConnectForm,
		VoiceControlForm,
	}
})
export default class VoiceControl extends Vue {

	public loading:boolean = false;
	public connectError:boolean = false;
	public connectSuccess:boolean = false;
	
	public obsPort_conf:ParameterData = { type:"number", value:4455, label:"OBS websocket server port", min:0, max:65535, step:1 };
	public obsPass_conf:ParameterData = { type:"password", value:"", label:"OBS websocket password" };
	public obsIP_conf:ParameterData = { type:"text", value:"127.0.0.1", label:"OBS local IP" };
	public get connected():boolean { return OBSWebsocket.instance.connected; }

	public get obswsInstaller():string { return Config.OBS_WEBSOCKET_INSTALLER; }

	public mounted():void {
		
	}

}
</script>

<style scoped lang="less">
.voicecontrol{
	.block {
		.window();
		max-width: 600px;
		margin: auto;
		padding: 0;
		background-color: @mainColor_light;
		margin: .5em auto;

		&:not(.conf) {
			padding: 1em;
		}
		
		&.head {
			text-align: center;

			.icon {
				height: 5em;
				margin-bottom: 1em;
			}
			
			.install {
				margin-top: 1em;
				font-size: .8em;
			}
		}
	}

	.connectForm {
		max-width: 500px;
		margin: auto;
	}

}
</style>