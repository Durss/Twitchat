<template>
	<div class="obsaudiosourceform">
		<p class="info">You sometimes forget to unmute your microphone ?<br>Select your microphone source and set commands so your mods can mute or unmute your mic.</p>
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
import store, { OBSMuteUnmuteCommands, ParameterData } from '@/store';
import Store from '@/store/Store';
import OBSWebsocket, { OBSAudioSource } from '@/utils/OBSWebsocket';
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

	public noAudioSource:boolean = false;
	public loadingAudioSources:boolean = false;
	public audioSources:OBSAudioSource[] = [];
	public obsAllowed_audioSources:ParameterData = { type:"list", value:"", listValues:[], label:"Audio source" };
	public obsAllowed_muteCommand:ParameterData = { type:"text", value:"", label:"Mute command", placeholder:"!mute" };
	public obsAllowed_unmuteCommand:ParameterData = { type:"text", value:"", label:"Unmute command", placeholder:"!unmute" };

	private defaultEntry:string = "- none -"

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
		if(audioSource === this.defaultEntry) audioSource = "";
		const commands:OBSMuteUnmuteCommands = {
			audioSourceName: audioSource,
			muteCommand: this.obsAllowed_muteCommand.value as string,
			unmuteCommand: this.obsAllowed_unmuteCommand.value as string,
		};
		store.dispatch("setOBSMuteUnmuteCommands", commands);
	}

	private async listAudioSources(manualCheck:boolean = false):Promise<void> {
		const storeConfStr = Store.get("obsConf_muteUnmute");
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

		const res = await OBSWebsocket.instance.getAudioSources();
		this.audioSources = (res.inputs as unknown) as OBSAudioSource[];
		if(this.audioSources.length > 0) {
			this.noAudioSource = false;
			this.obsAllowed_audioSources.listValues = this.audioSources.map(v=> v.inputName);//Audio sources
			this.obsAllowed_audioSources.listValues.unshift( this.defaultEntry );
			this.obsAllowed_audioSources.value = this.defaultEntry;//Default value

			if(storeConf
			&& storeConf.audioSourceName
			&& this.audioSources.find(v => v.inputName == storeConf.audioSourceName)) {
				this.obsAllowed_audioSources.value = storeConf.audioSourceName;
			}

			const storedState = store.state.obsMuteUnmuteCommands;
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