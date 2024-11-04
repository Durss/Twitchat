<template>
	<div class="paramsvoicemod parameterContent">
		<Icon name="voicemod" class="icon" />
		
		<div class="head">
			<i18n-t scope="global" tag="div" keypath="voicemod.header">
				<template #LINK>
					<a href="https://www.voicemod.net" target="_blank"><Icon name="newtab" />{{ $t("voicemod.header_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<ParamItem class="item enableBt" :paramData="param_enabled" v-model="param_enabled.value" @change="toggleState()" />

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
					<ParamItem class="item" :paramData="param_voiceIndicator" v-model="param_voiceIndicator.value" @change="saveData()" />
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
							<a @click="$store.params.openParamsPage(contentTriggers)">{{ $t("voicemod.voices_triggers_link") }}</a>
						</template>
					</i18n-t>
					<ParamItem class="item param voiceEffect" v-for="p in voiceParams" :paramData="p" @change="saveData()" />
				</section>
			</template>
		</div>

	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import type { CSSProperties } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Splitter from '../../../Splitter.vue';
import ParamItem from '../../ParamItem.vue';
import PermissionsForm from '../../../PermissionsForm.vue';
import type { VoicemodTypes } from '@/utils/voice/VoicemodTypes';
import Icon from '@/components/Icon.vue';
import type IParameterContent from '../IParameterContent';

@Component({
	components:{
		Icon,
		Splitter,
		ParamItem,
		PermissionsForm,
	},
	emits:[]
})
class ConnectVoicemod extends Vue implements IParameterContent {

	public connected:boolean = false;
	public connecting:boolean = false;
	public connectionFailed:boolean = false;
	public voices:VoicemodTypes.Voice[] = [];
	public voiceParams:TwitchatDataTypes.ParameterData<string, unknown, unknown, VoicemodTypes.Voice>[] = [];
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

	private loadCount:number = 0;
	private loadTotal:number = 0;
	private voiceIdToCommand:{[key:string]:string} = {};
	
	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; } 

	public get holderStyles():CSSProperties {
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
			// this.prefill();
			this.connect();
		} else {
			this.connected = false;
			this.connecting = false;
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
		this.connecting = false;
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
		this.voiceParams = [];
		const storeParams = this.$store.voice.voicemodParams as TwitchatDataTypes.VoicemodParamsData;

		//Build hashmap for faster access
		for (const key in storeParams.commandToVoiceID) {
			this.voiceIdToCommand[ storeParams.commandToVoiceID[key] ] = key;
		}

		this.loadTotal = this.voices.length;
		this.loadCount = 0;
		for (let i = 0; i < this.loadTotal; i++) {
			const v = this.voices[i];
			if(!v.bitmapChecksum) {
				this.addVoiceTolist(v);
				continue;
			}
			VoicemodWebSocket.instance.getBitmapForVoice(v.id).then((img:string)=>{
				this.addVoiceTolist(v, img);
			});
		}
		this.saveData();
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
				commandToVoiceID[cmd] = p.storage!.id;
			}
		}

		const data:TwitchatDataTypes.VoicemodParamsData = {
			enabled: this.param_enabled.value,
			voiceIndicator: this.param_voiceIndicator.value,
			chatCmdPerms:this.permissions,
			commandToVoiceID,
		}
		this.$store.voice.setVoicemodParams(data);
	}

	/**
	 * Prefills the forms
	 */
	private prefill():void {
		const params:TwitchatDataTypes.VoicemodParamsData = this.$store.voice.voicemodParams;
		this.param_enabled.value = params.enabled === true;
		
		this.param_voiceIndicator.value = params.voiceIndicator;

		const storedPermissions = params.chatCmdPerms;
		this.permissions.mods = storedPermissions?.mods;
		this.permissions.vips = storedPermissions?.vips;
		this.permissions.subs = storedPermissions?.subs;
		this.permissions.all = storedPermissions?.all;
		this.permissions.usersAllowed = storedPermissions?.usersAllowed;
		this.permissions.usersRefused = storedPermissions?.usersRefused;
	}

	private addVoiceTolist(v:VoicemodTypes.Voice, img?:string):void {
		const data:TwitchatDataTypes.ParameterData<string> = {
			type: "string",
			storage: v,
			label: v.friendlyName,
			value: this.voiceIdToCommand[v.id] ?? "",
			placeholder: "!command",
			maxLength: 50,
			iconURL: img? "data:image/png;base64," + img : ""
		};
		this.voiceParams.push( data );
		this.voiceParams.sort((a, b)=> {
			if(a.storage!.friendlyName < b.storage!.friendlyName) return -1;
			if(a.storage!.friendlyName > b.storage!.friendlyName) return 1;
			return 0;
		});
		if(++this.loadCount === this.loadTotal) {
			this.saveData();
		}
	}
}
export default toNative(ConnectVoicemod);
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
			&.voiceEffect {
				:deep(.inputHolder) {
					max-width: 150px;
				}
				:deep(input) {
					max-width: 150px;
				}
				:deep(.paramIcon) {
					height: 4em;
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