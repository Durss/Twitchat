<template>
	<div class="obsaudiosourceform">
		<p class="info">Give control over your microphone so some users can mute or unmute you from the chat</p>
		<div v-if="!noAudioSource">
			<ParamItem :paramData="obsAllowed_audioSources" class="row" @change="onAudioParamChange()"/>
			<ParamItem :paramData="obsAllowed_muteCommand" class="row" @change="onAudioParamChange()"/>
			<ParamItem :paramData="obsAllowed_unmuteCommand" class="row" @change="onAudioParamChange()"/>
		</div>
		<div v-else class="noAudioSource">
			<div class="label">- no audio source found -</div>
			<Button title="Check again" @click="listAudioSources(true)" class="connectBt" :loading="loadingAudioSources" />
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { OBSInputItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
	}
})
export default class OBSAudioSourceForm extends Vue {

	public noAudioSource = false;
	public loadingAudioSources = false;
	public audioSources:OBSInputItem[] = [];
	public obsAllowed_audioSources:TwitchatDataTypes.ParameterData = { type:"list", value:"", listValues:[], label:"Audio source" };
	public obsAllowed_muteCommand:TwitchatDataTypes.ParameterData = { type:"text", value:"", label:"Mute command", placeholder:"!mute" };
	public obsAllowed_unmuteCommand:TwitchatDataTypes.ParameterData = { type:"text", value:"", label:"Unmute command", placeholder:"!unmute" };

	private defaultEntry = {label:"- none -", value:"- none -"};

	public mounted():void {
		watch(()=> OBSWebsocket.instance.connected, () => { 
			if(OBSWebsocket.instance.connected) {
				this.listAudioSources();
			}
		})
		this.listAudioSources();
	}

	public onAudioParamChange():void {
		if(!this.obsAllowed_audioSources.value || (this.obsAllowed_unmuteCommand.value === "" && this.obsAllowed_muteCommand.value === "")) return;
		
		let audioSource = this.obsAllowed_audioSources.value as string
		if(audioSource === this.defaultEntry.value) audioSource = "";
		const commands:TwitchatDataTypes.OBSMuteUnmuteCommands = {
			audioSourceName: audioSource,
			muteCommand: this.obsAllowed_muteCommand.value as string,
			unmuteCommand: this.obsAllowed_unmuteCommand.value as string,
		};
		this.$store("obs").setOBSMuteUnmuteCommands(commands);
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

		this.audioSources = await OBSWebsocket.instance.getInputs();
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

			const storedState = this.$store("obs").muteUnmuteCommands;
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
</script>

<style scoped lang="less">
.obsaudiosourceform{
	.info {
		margin-bottom: 10px;
	}

	.noAudioSource {
		display: flex;
		flex-direction: column;
		align-items: center;
		.label {
			margin-bottom: 10px;
			font-style: italic;
			background-color: @mainColor_light;
			padding: .25em .5em;
		}
	}
}
</style>