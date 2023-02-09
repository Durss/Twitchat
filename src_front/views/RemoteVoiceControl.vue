<template>
	<div class="voicecontrol">
		<div class="block head">
			<img src="@/assets/icons/voice_purple.svg" alt="voice icon" class="icon">
			<p>{{ $t("voice.remote.title") }}</p>
			<p class="install"><span>{{ $t("obs.install") }}</span> <strong>OBS v28+</strong>
				<br><i v-html="$t('obs.install_option', {PLUGIN_URL:obswsInstaller})"></i></p>
		</div>

		<ToggleBlock class="block conf"
		:open="!connected"
		icon="info_purple"
		:title="$t('obs.credentials_form_title')">
			<OBSConnectForm  class="connectForm" />
		</ToggleBlock>

		<div class="block tuto">
			<p v-html="$t('voice.remote.commands')"></p>
		</div>

		<VoiceControlForm class="block" v-if="connected" sttOnly />
		
		<!-- <DataServerSyncModal v-if="showStorageModal" @close="showStorageModal = false" /> -->
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import DataServerSyncModal from '../components/modals/DataServerSyncModal.vue';
import OBSConnectForm from '../components/params/contents/obs/OBSConnectForm.vue';
import ParamsOBS from '../components/params/contents/ParamsOBS.vue';
import ParamItem from '../components/params/ParamItem.vue';
import ToggleBlock from '../components/ToggleBlock.vue';
import VoiceControlForm from '../components/voice/VoiceControlForm.vue';

@Options({
	props:{},
	components:{
		ParamItem,
		ParamsOBS,
		ToggleBlock,
		OBSConnectForm,
		VoiceControlForm,
		DataServerSyncModal,
	}
})
export default class RemoteVoiceControl extends Vue {

	public loading:boolean = false;
	public connectError:boolean = false;
	public connectSuccess:boolean = false;
	public showStorageModal:boolean = false;
	
	public obsPort_conf:TwitchatDataTypes.ParameterData = { type:"number", value:4455, label:"OBS websocket server port", min:0, max:65535, step:1 };
	public obsPass_conf:TwitchatDataTypes.ParameterData = { type:"password", value:"", label:"OBS websocket password" };
	public obsIP_conf:TwitchatDataTypes.ParameterData = { type:"text", value:"127.0.0.1", label:"OBS local IP" };

	public get connected():boolean { return OBSWebsocket.instance.connected; }
	public get obswsInstaller():string { return Config.instance.OBS_WEBSOCKET_INSTALLER; }

	public mounted():void {
		this.showStorageModal = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == null;
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

		&.tuto {
			text-align: center;
		}
	}

	.connectForm {
		max-width: 500px;
		margin: auto;
	}

}
</style>