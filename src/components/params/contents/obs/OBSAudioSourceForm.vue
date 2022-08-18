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
import Store from '@/store/Store';
import type { OBSMuteUnmuteCommands, ParameterData } from '@/types/TwitchatDataTypes';
import type { OBSAudioSource, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import StoreProxy from '@/utils/StoreProxy';
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
	public audioSources:OBSSourceItem[] = [];
	public obsAllowed_audioSources:ParameterData = { type:"list", value:"", listValues:[], label:"Audio source" };
	public obsAllowed_muteCommand:ParameterData = { type:"text", value:"", label:"Mute command", placeholder:"!mute" };
	public obsAllowed_unmuteCommand:ParameterData = { type:"text", value:"", label:"Unmute command", placeholder:"!unmute" };

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
		const commands:OBSMuteUnmuteCommands = {
			audioSourceName: audioSource,
			muteCommand: this.obsAllowed_muteCommand.value as string,
			unmuteCommand: this.obsAllowed_unmuteCommand.value as string,
		};
		StoreProxy.store.dispatch("setOBSMuteUnmuteCommands", commands);
	}

	public async listAudioSources(manualCheck = false):Promise<void> {
		const storeConfStr = Store.get(Store.OBS_CONF_MUTE_UNMUTE);
		let storeConf!:OBSMuteUnmuteCommands;
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

		this.audioSources = await OBSWebsocket.instance.getSources();
		if(this.audioSources.length > 0) {
			this.noAudioSource = false;
			this.obsAllowed_audioSources.listValues = this.audioSources.map(v=> { return {label:v.sourceName, value:v.sourceName};});//Audio sources
			this.obsAllowed_audioSources.listValues.unshift( this.defaultEntry );
			this.obsAllowed_audioSources.value = this.defaultEntry.value;//Default value

			if(storeConf
			&& storeConf.audioSourceName
			&& this.audioSources.find(v => v.sourceName == storeConf.audioSourceName)) {
				this.obsAllowed_audioSources.value = storeConf.audioSourceName;
			}

			const storedState = StoreProxy.store.state.obsMuteUnmuteCommands;
			if(storedState) {
				this.obsAllowed_muteCommand.value = storedState.muteCommand;
				this.obsAllowed_unmuteCommand.value = storedState.unmuteCommand;
				if(this.audioSources.find(v => v.sourceName == storedState.audioSourceName)) {
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