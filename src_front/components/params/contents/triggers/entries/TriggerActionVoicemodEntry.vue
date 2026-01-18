<template>
	<div class="triggeractionvoicemodentry triggerActionForm" v-if="!vmConnected">
		<div class="item info warn">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.voicemod.header">
				<template #LINK>
					<a @click="$store.params.openParamsPage(contentConnexions, subcontentVM)">{{ $t("triggers.actions.voicemod.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="triggeractionvoicemodentry triggerActionForm" v-else>
		<ParamItem :paramData="param_action" v-model="action.action" />
		<ParamItem :paramData="param_voiceList" v-model="voiceItemID" @change="onSelectVoice()" v-if="param_action.value == 'voice'" />
		<ParamItem :paramData="param_soundsList" v-model="soundItemID" @change="onSelectSound()" v-if="param_action.value == 'sound'" />
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import type { TriggerActionVoicemodDataAction } from '@/types/TriggerActionDataTypes';
import { TriggerActionVoicemodDataActionList, type ITriggerPlaceholder, type TriggerActionVoicemodData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import type { VoicemodTypes } from "@/utils/voice/VoicemodTypes";
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		Icon,
		ParamItem,
	},
	emits:["update"]
})
class TriggerActionVoicemodEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionVoicemodData;

	@Prop
	declare triggerData:TriggerData;

	public param_action:TwitchatDataTypes.ParameterData<TriggerActionVoicemodDataAction, TriggerActionVoicemodDataAction> = {type:"list", listValues:[], value:"voice", icon:"", labelKey:"triggers.actions.voicemod.param_action"}
	public param_voiceList:TwitchatDataTypes.ParameterData<string, string> = {type:"list", listValues:[], value:"", icon:"voice", labelKey:"triggers.actions.voicemod.param_voice"}
	public param_soundsList:TwitchatDataTypes.ParameterData<string, string> = {type:"list", listValues:[], value:"", icon:"unmute", labelKey:"triggers.actions.voicemod.param_sound"}

	public voiceItemID:string = "";
	public soundItemID:string = "";
	private voiceListItemIDToData:{[key:string]:{type:"id"|"placeholder", value:string}} = {};
	private soundListItemIDToData:{[key:string]:{type:"id"|"placeholder", value:string}} = {};

	public get vmConnected():boolean { return VoicemodWebSocket.instance.connected.value; }
	public get subcontentVM():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.VOICEMOD; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }

	public beforeMount():void {
		this.param_action.listValues = TriggerActionVoicemodDataActionList.map((v):TwitchatDataTypes.ParameterDataListValue<TriggerActionVoicemodDataAction>=> {
			return {
				value:v,
				labelKey:"triggers.actions.voicemod.param_action_"+v
			}
		});
	}

	/**
	 * Called when voice selection changes
	 */
	public onSelectVoice():void {
		this.action.voiceID = "";
		this.action.placeholder = "";
		let data = this.voiceListItemIDToData[this.voiceItemID]!;
		if(data.type == "id") {
			this.action.voiceID = data.value;
		}else{
			this.action.placeholder = data.value;
		}
	}

	/**
	 * Called when sound selection changes
	 */
	public onSelectSound():void {
		this.action.soundID = "";
		this.action.placeholder = "";
		let data = this.soundListItemIDToData[this.soundItemID]!;
		if(data.type == "id") {
			this.action.soundID = data.value;
			VoicemodWebSocket.instance.playSound(undefined, data.value);
		}else{
			this.action.placeholder = data.value;
		}
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(placeholders:ITriggerPlaceholder<any>[]):void {
		if(!this.vmConnected) return;

		//Add an entry per voice filter
		let voiceList:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
		voiceList = VoicemodWebSocket.instance.voices.map(v=>{
			let id = Utils.getUUID();
			this.voiceListItemIDToData[id] = {type:"id",value:v.id};
			return {
				label:v.friendlyName,
				value:id,
			}
		});

		//Add an entry per sound
		let soundList:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
		soundList = VoicemodWebSocket.instance.soundboards.reduce((result:VoicemodTypes.Sound[], item) => result.concat(item.sounds), []).map(v=>{
			let id = Utils.getUUID();
			this.soundListItemIDToData[id] = {type:"id",value:v.id};
			return {
				label:v.name,
				value:id,
			}
		});

		//Add placeholders section with all placeholders available on this action
		let ph = placeholders;
		if(ph.length > 0) {
			voiceList.push({label:"", value:"", disabled:true});
			soundList.push({label:"", value:"", disabled:true});
			voiceList.push({label:"═══════ Placeholders ═══════", value:"", disabled:true});
			soundList.push({label:"═══════ Placeholders ═══════", value:"", disabled:true});

			for (const p of ph) {
				let id = Utils.getUUID();
				this.voiceListItemIDToData[id] = {type:"placeholder",value:p.tag};
				this.soundListItemIDToData[id] = {type:"placeholder",value:p.tag};
				voiceList.push({label:"{"+p.tag.toUpperCase()+"}", value:id});
				soundList.push({label:"{"+p.tag.toUpperCase()+"}", value:id});
				voiceList.push({label: " ⤷ "+this.$t(p.descKey, {NAME:"{"+p.tag.toUpperCase()+"}"}), value:id, disabled:true});
				soundList.push({label: " ⤷ "+this.$t(p.descKey, {NAME:"{"+p.tag.toUpperCase()+"}"}), value:id, disabled:true});
			}
		}

		//Prefill input depending on selected data type
		this.param_voiceList.listValues = voiceList;
		for (const v of voiceList) {

			if(v.disabled === true) continue; //Ignore disabled entries used just as labels

			let data = this.voiceListItemIDToData[v.value];

			if(!data) {
				console.log("Entry not found", v);
				continue;
			}
			if(data.type === "id" &&  this.action.voiceID === data.value) {
				this.voiceItemID = v.value;
				break;
			}
			if(data.type === "placeholder" &&  this.action.placeholder === data.value) {
				this.voiceItemID = v.value;
				break;
			}
		}

		//Prefill input depending on selected data type
		this.param_soundsList.listValues = soundList;
		for (const v of soundList) {

			if(v.disabled === true) continue; //Ignore disabled entries used just as labels

			let data = this.soundListItemIDToData[v.value];

			if(!data) {
				console.log("Entry not found", v);
				continue;
			}
			if(data.type === "id" &&  this.action.soundID === data.value) {
				this.soundItemID = v.value;
				break;
			}
			if(data.type === "placeholder" &&  this.action.placeholder === data.value) {
				this.soundItemID = v.value;
				break;
			}
		}
	}

}
export default toNative(TriggerActionVoicemodEntry);
</script>

<style scoped lang="less">
.triggeractionvoicemodentry{
}
</style>
