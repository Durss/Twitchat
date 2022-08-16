<template>
	<div class="paramsvoicemod">
		<img src="@/assets/icons/voicemod_purple.svg" alt="voicemod icon" class="icon">
		<div class="title">Control <strong>Voicemod</strong> from Twitchat</div>
		<ParamItem class="item enableBt" :paramData="param_enabled" @change="toggleState()" />

		<section v-if="connecting">
			<img class="item center" src="@/assets/loader/loader.svg" alt="loader">
			<div class="item center">connecting to Voicemod...</div>
		</section>

		<div class="fadeHolder" :style="holderStyles">

			<section class="error" v-if="connectionFailed && !connected" @click="connectionFailed = false">
				<div class="item">Unable to connect to Voicemod</div>
			</section>

			<section v-if="connected">
				<Splitter>Users allowed</Splitter>
				<div class="item center">Select who can use chat commands to change your voice</div>
				<PermissionsForm class="item" v-model="permissions" />
			</section>

			<section v-if="connected">
				<Splitter>Voices list</Splitter>
				<div class="item center">Associate any voice to a chat command</div>
				<div class="item small">For more control on when to trigger a voice effect head over the <a @click="$emit('setContent', contentTriggers)">triggers section</a>.</div>
				<ParamItem class="item param shrinkInput" v-for="p in voiceParams" :paramData="p" @change="saveData()" />
			</section>
		</div>

	</div>
</template>

<script lang="ts">
import { ParamsContentType, type ParameterData, type ParamsContentStringType, type PermissionsData } from '@/types/TwitchatDataTypes';
import VoicemodWebSocket, {type VoicemodTypes} from '@/utils/VoicemodWebSocket';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';
import type { VoicemodParamsData } from '../../../types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import PermissionsForm from './obs/PermissionsForm.vue';
import Splitter from '../../Splitter.vue';

@Options({
	props:{},
	components:{
		Splitter,
		ParamItem,
		PermissionsForm,
	},
	emits:["setContent"]
})
export default class ParamsVoicemod extends Vue {

	public connected:boolean = false;
	public connecting:boolean = false;
	public connectionFailed:boolean = false;
	public voices:VoicemodTypes.Voice[] = [];
	public voiceParams:ParameterData[] = [];
	public param_enabled:ParameterData = {type:"toggle", label:"Enabled", value:false};
	public permissions:PermissionsData = {
		mods: false,
		vips: false,
		subs: false,
		all: false,
		users: ""
	}
	
	public get contentTriggers():ParamsContentStringType { return ParamsContentType.TRIGGERS; } 

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true && !this.connecting? 1 : .5,
			pointerEvents:this.param_enabled.value === true && !this.connecting? "all" : "none",
		};
	}

	public mounted():void {
		const params:VoicemodParamsData = StoreProxy.store.state.voicemodParams;
		if(params.enabled === true) {
			this.param_enabled.value = true;

			const storedPermissions = params.chatCmdPerms;
			this.permissions.mods = storedPermissions?.mods;
			this.permissions.vips = storedPermissions?.vips;
			this.permissions.subs = storedPermissions?.subs;
			this.permissions.all = storedPermissions?.all;
			this.permissions.users = storedPermissions?.users;
		}
	}

	/**
	 * Called when toggling the "enabled" state
	 */
	public toggleState():void {
		if(this.param_enabled.value === true) {
			this.connect();
		} else {
			this.connected = false;
			this.saveData();
			VoicemodWebSocket.instance.disconnect();
		}
	}

	/**
	 * Connect to Voicemod
	 */
	public async connect():Promise<void> {
		this.connected = false;
		this.connecting = true;
		this.connectionFailed = false;
		let res = false;
		try {
			await VoicemodWebSocket.instance.connect();
			res = true;
		}catch(error) {}

		this.connected = res;
		if(res) {
			this.populate();
		}
		if(!res) {
			this.connectionFailed = true;
		}
	}

	/**
	 * Populate voices list.
	 * Grabs image for all voices then add it to the list
	 */
	public async populate():Promise<void> {
		this.voices = VoicemodWebSocket.instance.voices;
		const storeParams = StoreProxy.store.state.voicemodParams as VoicemodParamsData;

		//Build hashmap for faster access
		const voiceIdToCommand:{[key:string]:string} = {};
		for (const key in storeParams.commandToVoiceID) {
			voiceIdToCommand[ storeParams.commandToVoiceID[key] ] = key;
		}

		let loadTotal = this.voices.length;
		let loadCount = 0;
		for (let i = 0; i < loadTotal; i++) {
			const v = this.voices[i];
			VoicemodWebSocket.instance.getBitmapForVoice(v.voiceID).then((img:string)=>{
				// console.log(v.voiceID);
				const data:ParameterData = {
					type: "text",
					storage: v,
					label: v.friendlyName,
					value: voiceIdToCommand[v.voiceID] ?? "",
					placeholder: "!command",
					maxLength: 100,
					iconURL: "data:image/png;base64," + img
				};
				this.voiceParams.push( data );
				if(++loadCount === loadTotal) {
					this.saveData();
					this.connecting = false;
				}
			});
		}
	}
	
	/**
	 * Save current configs
	 */
	public saveData():void {
		console.log("Do save...");
		const commandToVoiceID:{[key:string]:string} = {};

		for (let i = 0; i < this.voiceParams.length; i++) {
			const p = this.voiceParams[i];
			const cmd = (p.value as string).trim().toLowerCase();
			if(cmd.length > 0) {
				commandToVoiceID[cmd] = (p.storage as VoicemodTypes.Voice).voiceID;
			}
		}

		const data:VoicemodParamsData = {
			enabled: this.param_enabled.value as boolean,
			commandToVoiceID,
			chatCmdPerms:this.permissions,
		}
		StoreProxy.store.dispatch("setVoicemodParams", data);
	}
}
</script>

<style scoped lang="less">
.paramsvoicemod{
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

	.enableBt {
		max-width: 200px;
		margin: auto;
		margin-top: 1.5em;
		border: 1px solid @mainColor_normal;
		border-radius: 1em;
		padding: .5em 1em !important;
		background-color: fade(@mainColor_normal_extralight, 30%);
	}

	.fadeHolder {
		transition: opacity .2s;
	}

	section {
		overflow: hidden;
		border-radius: .5em;
		background-color: fade(@mainColor_normal_extralight, 30%);
		padding: .5em;
		margin-top: 2em;
		
		.item {
			&:not(:first-child) {
				margin-top: .5em;
			}
			&.splitter {
				margin: .5em 0 1em 0;
			}
			&.label {
				i {
					font-size: .8em;
				}
				.icon {
					width: 1.2em;
					max-height: 1.2em;
					margin-right: .5em;
					margin-bottom: 2px;
					display: inline;
					vertical-align: middle;
				}
				p {
					display: inline;
				}
			}
			&.small {
				font-size: .8em;
			}
			&.center {
				display: block;
				margin-left: auto;
				margin-right: auto;
				text-align: center;
			}
			&.shrinkInput {
				:deep(input) {
					width: auto;
					max-width: 150px;
				}
			}
			&.param {
				margin-top: 0;
				:deep(.icon) {
					width: 2em;
					height: 2em;
				}
			}
		}

		&.error {
			color: @mainColor_light;
			text-align: center;
			background-color: @mainColor_alert;
		}
	}
	
}
</style>