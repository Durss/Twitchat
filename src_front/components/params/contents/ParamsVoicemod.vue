<template>
	<div class="paramsvoicemod">
		<img src="@/assets/icons/voicemod_purple.svg" alt="voicemod icon" class="icon">
		<div class="head">Control <strong>Voicemod</strong> from Twitchat</div>
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
				<PermissionsForm class="item" v-model="permissions" @change="saveData()" />
			</section>

			<section v-if="connected">
				<Splitter>Params</Splitter>
				<ParamItem class="item" :paramData="param_voiceIndicator" @change="saveData()" />
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
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import VoicemodWebSocket, { type VoicemodTypes } from '@/utils/voice/VoicemodWebSocket';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Splitter from '../../Splitter.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from './obs/PermissionsForm.vue';

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
	public voiceParams:TwitchatDataTypes.ParameterData[] = [];
	public param_enabled:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Enabled", value:false};
	public param_voiceIndicator:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Show when a voice effect is active", value:true, example:"voicemod_reset.png"};
	public permissions:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods: false,
		vips: false,
		subs: false,
		all: false,
		users: ""
	}
	
	public get contentTriggers():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.TRIGGERS; } 

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true && !this.connecting? 1 : .5,
			pointerEvents:this.param_enabled.value === true && !this.connecting? "all" : "none",
		};
	}

	public mounted():void {
		this.prefill();
	}

	/**
	 * Called when toggling the "enabled" state
	 */
	public toggleState():void {
		if(this.param_enabled.value === true) {
			this.prefill();
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
			this.connecting = false;
			this.connectionFailed = true;
		}
	}

	/**
	 * Populate voices list.
	 * Grabs image for all voices then add it to the list
	 */
	public async populate():Promise<void> {
		this.voices = VoicemodWebSocket.instance.voices;
		this.voiceParams = [];
		const storeParams = this.$store("voice").voicemodParams as TwitchatDataTypes.VoicemodParamsData;

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
				const data:TwitchatDataTypes.ParameterData = {
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
		const commandToVoiceID:{[key:string]:string} = {};

		for (let i = 0; i < this.voiceParams.length; i++) {
			const p = this.voiceParams[i];
			const cmd = (p.value as string).trim().toLowerCase();
			if(cmd.length > 0) {
				commandToVoiceID[cmd] = (p.storage as VoicemodTypes.Voice).voiceID;
			}
		}

		const data:TwitchatDataTypes.VoicemodParamsData = {
			enabled: this.param_enabled.value as boolean,
			voiceIndicator: this.param_voiceIndicator.value as boolean,
			chatCmdPerms:this.permissions,
			commandToVoiceID,
		}
		this.$store("voice").setVoicemodParams(data);
	}

	/**
	 * Prefills the forms
	 */
	private prefill():void {
		const params:TwitchatDataTypes.VoicemodParamsData = this.$store("voice").voicemodParams;
		if(params.enabled === true) {
			this.param_enabled.value = true;
			this.param_voiceIndicator.value = params.voiceIndicator;

			const storedPermissions = params.chatCmdPerms;
			this.permissions.mods = storedPermissions?.mods;
			this.permissions.vips = storedPermissions?.vips;
			this.permissions.subs = storedPermissions?.subs;
			this.permissions.all = storedPermissions?.all;
			this.permissions.users = storedPermissions?.users;
		}
	}
}
</script>

<style scoped lang="less">
.paramsvoicemod{
	.parameterContent();

	.fadeHolder {
		transition: opacity .2s;
	}

	section {
		
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
				:deep(.content) {
					align-items: center;
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