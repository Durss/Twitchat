<template>
	<div class="paramsvoicemod parameterContent">
		<Icon name="voicemod" class="icon" />
		
		<i18n-t scope="global" class="head" tag="div" keypath="voicemod.header">
			<template #LINK>
				<a href="https://www.voicemod.net" target="_blank">{{ $t("voicemod.header_link") }}</a>
			</template>
		</i18n-t>

		<ParamItem class="item enableBt" :paramData="param_enabled" @change="toggleState()" />

		<section v-if="connecting" class="card-item">
			<Icon class="item center" name="loader" />
			<div class="item center">{{ $t("voicemod.connecting") }}</div>
		</section>

		<div class="fadeHolder" :style="holderStyles">

			<section class="card-item alert error" v-if="connectionFailed && !connected" @click="connectionFailed = false">
				<div class="item">{{ $t("voicemod.connect_failed") }}</div>
			</section>

			<template v-if="connected">
				<Splitter>{{ $t("voicemod.params_title") }}</Splitter>
	
				<section>
					<ParamItem class="item" :paramData="param_voiceIndicator" @change="saveData()" />
					<div class="card-item">
						<div class="item"><strong>{{ $t("voicemod.allowed_users") }}</strong></div>
						<PermissionsForm class="item users" v-model="permissions" @change="saveData()" />
					</div>
				</section>
	
				<Splitter>{{ $t("voicemod.voices_title") }}</Splitter>
	
				<section>
					<div class="item center">{{ $t("voicemod.voices_infos") }}</div>
					<i18n-t scope="global" tag="div" class="item small" keypath="voicemod.voices_triggers">
						<template #LINK>
							<a @click="$store('params').openParamsPage(contentTriggers)">{{ $t("voicemod.voices_triggers_link") }}</a>
						</template>
					</i18n-t>
					<ParamItem class="item param shrinkInput" v-for="p in voiceParams" :paramData="p" @change="saveData()" />
				</section>
			</template>
		</div>

	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import type { StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Splitter from '../../Splitter.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from '../../PermissionsForm.vue';
import type { VoicemodTypes } from '@/utils/voice/VoicemodTypes';
import type IParameterContent from './IParameterContent';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		Splitter,
		ParamItem,
		PermissionsForm,
	},
	emits:[]
})
export default class ParamsVoicemod extends Vue implements IParameterContent {

	public connected:boolean = false;
	public connecting:boolean = false;
	public connectionFailed:boolean = false;
	public voices:VoicemodTypes.Voice[] = [];
	public voiceParams:TwitchatDataTypes.ParameterData<string>[] = [];
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};
	public param_voiceIndicator:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, example:"voicemod_reset.png", labelKey:"voicemod.show_indicator"};
	public permissions:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods: false,
		vips: false,
		subs: false,
		all: false,
		follower:true,
		follower_duration_ms:0,
		usersAllowed:[],
		usersRefused:[],
	}
	
	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; } 

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true && !this.connecting? 1 : .5,
			pointerEvents:this.param_enabled.value === true && !this.connecting? "all" : "none",
		};
	}

	public mounted():void {
		this.prefill();
	}

	public onNavigateBack(): boolean { return false; }

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
				const data:TwitchatDataTypes.ParameterData<string> = {
					type: "string",
					storage: v,
					label: v.friendlyName,
					value: voiceIdToCommand[v.voiceID] ?? "",
					placeholder: "!command",
					maxLength: 50,
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
			const cmd = p.value.trim().toLowerCase();
			if(cmd.length > 0) {
				commandToVoiceID[cmd] = (p.storage as VoicemodTypes.Voice).voiceID;
			}
		}

		const data:TwitchatDataTypes.VoicemodParamsData = {
			enabled: this.param_enabled.value,
			voiceIndicator: this.param_voiceIndicator.value,
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
			this.permissions.usersAllowed = storedPermissions?.usersAllowed;
			this.permissions.usersRefused = storedPermissions?.usersRefused;
		}
	}
}
</script>

<style scoped lang="less">
.paramsvoicemod{
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
				:deep(.inputHolder) {
					max-width: 150px;
				}
				:deep(input) {
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
			&.users {
				padding-left: 1em;
			}
		}

		&.error {
			text-align: center;
		}
	}
	
}
</style>