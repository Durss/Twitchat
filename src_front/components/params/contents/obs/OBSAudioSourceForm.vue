<template>
	<div class="obsaudiosourceform">
		<p class="info">{{ $t("obs.microphone_head") }}</p>
		<template v-if="!noAudioSource">
			<ParamItem :paramData="obsAllowed_audioSources" class="row" @change="onAudioParamChange()"/>
			<ParamItem :paramData="obsAllowed_muteCommand" class="row" @change="onAudioParamChange()"/>
			<ParamItem :paramData="obsAllowed_unmuteCommand" class="row" @change="onAudioParamChange()"/>
		</template>
		<div v-else class="card-item alert noAudioSource">
			<div class="label">{{ $t("obs.microphone_empty") }}</div>
			<Button @click="listAudioSources(true)" class="connectBt" icon="refresh" :loading="loadingAudioSources">{{ $t('obs.microphone_reCheck') }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { OBSInputItem } from '@/utils/OBSWebSocket';
import OBSWebSocket from '@/utils/OBSWebSocket';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
	}
})
class OBSAudioSourceForm extends Vue {

	public noAudioSource = false;
	public loadingAudioSources = false;
	public audioSources:OBSInputItem[] = [];
	public obsAllowed_audioSources:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", listValues:[] };
	public obsAllowed_muteCommand:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", placeholder:"!mute" };
	public obsAllowed_unmuteCommand:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", placeholder:"!unmute" };

	private defaultEntry = {label:"", value:""};

	public mounted():void {
		this.defaultEntry.label					= this.defaultEntry.value = this.$t("obs.microphone_default_entry");
		this.obsAllowed_audioSources.labelKey	= "obs.microphone_source";
		this.obsAllowed_muteCommand.labelKey	= "obs.microphone_mute";
		this.obsAllowed_unmuteCommand.labelKey	= "obs.microphone_unmute";
		watch(()=> OBSWebSocket.instance.connected.value, () => { 
			if(OBSWebSocket.instance.connected.value) {
				this.listAudioSources();
			}
		})
		this.listAudioSources();
	}

	public onAudioParamChange():void {
		if(!this.obsAllowed_audioSources.value || (this.obsAllowed_unmuteCommand.value === "" && this.obsAllowed_muteCommand.value === "")) return;
		
		let audioSource = this.obsAllowed_audioSources.value
		if(audioSource === this.defaultEntry.value) audioSource = "";
		const commands:TwitchatDataTypes.OBSMuteUnmuteCommands = {
			audioSourceName: audioSource,
			muteCommand: this.obsAllowed_muteCommand.value,
			unmuteCommand: this.obsAllowed_unmuteCommand.value,
		};
		this.$store.obs.setOBSMuteUnmuteCommands(commands);
	}

	public async listAudioSources(manualCheck = false):Promise<void> {
		const storeConfStr = DataStore.get(DataStore.OBS_CONF_MUTE_UNMUTE);
		let storeConf!:TwitchatDataTypes.OBSMuteUnmuteCommands;
		if(storeConfStr) {
			storeConf = JSON.parse(storeConfStr);
		}
		
		this.noAudioSource = true;
		if(manualCheck) {
			this.loadingAudioSources = true;
			this.audioSources = [];
			//Delay here only ofr UX purpose. This gives time to the loader to appear
			//Without that the user may think the button does nothing.
			await Utils.promisedTimeout(500);
		}

		this.audioSources = await OBSWebSocket.instance.getInputs();
		if(this.audioSources.length > 0) {
			this.noAudioSource = false;
			this.obsAllowed_audioSources.listValues = this.audioSources
													.map(v=> { return {label:v.inputName, value:v.inputName};})
													.sort((a,b) => {
														if(a.label<b.label) return -1;
														if(a.label>b.label) return 1;
														return 0;
													});
			this.obsAllowed_audioSources.listValues.unshift( this.defaultEntry );
			this.obsAllowed_audioSources.value = this.defaultEntry.value;//Default value

			if(storeConf
			&& storeConf.audioSourceName
			&& this.audioSources.find(v => v.inputName == storeConf.audioSourceName)) {
				this.obsAllowed_audioSources.value = storeConf.audioSourceName;
			}

			const storedState = this.$store.obs.muteUnmuteCommands;
			if(storedState) {
				this.obsAllowed_muteCommand.value = storedState.muteCommand;
				this.obsAllowed_unmuteCommand.value = storedState.unmuteCommand;
				if(this.audioSources.find(v => v.inputName == storedState.audioSourceName)) {
					this.obsAllowed_audioSources.value = storedState.audioSourceName;
				}
			}
		}
		this.loadingAudioSources = false;
	}

}
export default toNative(OBSAudioSourceForm);
</script>

<style scoped lang="less">
.obsaudiosourceform{
	gap: .5em;
	display: flex;
	flex-direction: column;

	.noAudioSource {
		display: flex;
		flex-direction: column;
		align-items: center;
		.label {
			margin-bottom: .5em;
			font-style: italic;
		}
	}
}
</style>