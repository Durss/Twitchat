<template>
	<div class="triggeractionvoicemodentry triggerActionForm" v-if="!vmConnected">
		<div class="item info warn">
			<img src="@/assets/icons/info.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.voicemod.header">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentVM)">{{ $t("triggers.actions.voicemod.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="triggeractionvoicemodentry triggerActionForm" v-else>
		<ParamItem :paramData="param_voiceList" v-model="itemID" @change="onSelectVoice()" />
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { watch } from 'vue';
import { Component, Prop } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry.vue';
import type { ITriggerPlaceholder, TriggerActionVoicemodData, TriggerData } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';

@Component({
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionVoicemodEntry extends AbstractTriggerActionEntry {
	
	@Prop
	declare action:TriggerActionVoicemodData;
	
	@Prop
	declare triggerData:TriggerData;
	
	public param_voiceList:TwitchatDataTypes.ParameterData<string, string> = {type:"list", label:"", listValues:[], value:"", icon:"voice"}
	public itemID:string = "";
	private listItemIDToData:{[key:string]:{type:"id"|"placeholder", value:string}} = {};
	
	public get vmConnected():boolean { return VoicemodWebSocket.instance.connected; }
	public get contentVM():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.VOICEMOD; } 

	public beforeMount():void {
		this.param_voiceList.labelKey = "triggers.actions.voicemod.param_voice";
	}

	/**
	 * Called when voice selection changes
	 */
	public onSelectVoice():void {
		this.action.voiceID = "";
		this.action.placeholder = "";
		let data = this.listItemIDToData[this.itemID];
		if(data.type == "id") {
			this.action.voiceID = data.value;
		}else{
			this.action.placeholder = data.value;
		}
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	 public onPlaceholderUpdate(placeholders:ITriggerPlaceholder[]):void {
		if(!this.vmConnected) return;

		//Add an entry per voice filter
		let list:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
			list = VoicemodWebSocket.instance.voices.map(v=>{
			let id = Utils.getUUID();
			this.listItemIDToData[id] = {type:"id",value:v.voiceID};
			return {
				label:v.friendlyName,
				value:id,
			}
		});

		//Add placeholders section with all placeholders available on this action
		let ph = placeholders;
		if(ph.length > 0) {
			list.push({label:"", value:"", disabled:true});
			list.push({label:"═══════ Placeholders ═══════", value:"", disabled:true});

			for (let i = 0; i < ph.length; i++) {
				const p = ph[i];
				let id = Utils.getUUID();
				this.listItemIDToData[id] = {type:"placeholder",value:p.tag};
				list.push({label:"{"+p.tag.toUpperCase()+"}", value:id});
				list.push({label: " ⤷ "+this.$t(p.descKey, {NAME:"{"+p.tag.toUpperCase()+"}"}), value:id, disabled:true});
			}
		}

		//Prefill input depending on selected data type
		this.param_voiceList.listValues = list;
		for (let i = 0; i < list.length; i++) {
			const v = list[i];
			
			if(v.disabled === true) continue; //Ignore disabled entries used just as labels
			
			let data = this.listItemIDToData[v.value];

			if(!data) {
				console.log("Entry not found", v);
				continue;
			}
			if(data.type === "id" &&  this.action.voiceID === data.value) {
				this.itemID = v.value;
				break;
			}
			if(data.type === "placeholder" &&  this.action.placeholder === data.value) {
				this.itemID = v.value;
				break;
			}
		}
	}

}
</script>

<style scoped lang="less">
.triggeractionvoicemodentry{
}
</style>