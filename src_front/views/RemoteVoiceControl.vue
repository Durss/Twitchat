<template>
	<div class="voicecontrol">
		<div class="card-item primary block head">
			<Icon name="voice" alt="voice icon" class="icon" />
			<p>{{ $t("voice.remote.title") }}</p>
			<p class="install"><span>{{ $t("obs.install") }}</span> <strong>OBS v28+</strong></p>
		</div>

		<ToggleBlock class="block conf"
		:open="!connected"
		icon="info"
		:title="$t('obs.credentials_form_title')">
			<OBSConnectForm  class="connectForm" />
		</ToggleBlock>

		<div class="block card-item tuto">
			<p v-html="$t('voice.remote.commands')"></p>
		</div>

		<VoiceControlForm class="block card-item" v-if="connected" sttOnly />
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import OBSWebSocket from '@/utils/OBSWebSocket';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ToggleBlock from '../components/ToggleBlock.vue';
import OBSConnectForm from '../components/params/contents/obs/OBSConnectForm.vue';
import VoiceControlForm from '../components/voice/VoiceControlForm.vue';

@Component({
	components:{
		ToggleBlock,
		OBSConnectForm,
		VoiceControlForm,
	}
})
class RemoteVoiceControl extends Vue {

	public loading:boolean = false;
	public connectError:boolean = false;
	public connectSuccess:boolean = false;
	public showStorageModal:boolean = false;

	public get connected():boolean { return OBSWebSocket.instance.connected.value; }

	public mounted():void {
		this.showStorageModal = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == null;
	}

}
export default toNative(RemoteVoiceControl);
</script>

<style scoped lang="less">
.voicecontrol{
	.block {
		max-width: 600px;
		margin: auto;
		padding: 0;
		margin: .5em auto;
		color: var(--color-text);

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