<template>
	<ToggleBlock
	orderable
	medium
	:error="isError"
	:errorTitle="errorTitle"
	:open="opened"
	:title="title"
	:class="classes"
	:icons="icons"
	>
		<template #actions>
			<Button small
				:icon="$image('icons/copy.svg')"
				class="toggleAction"
				@click="$emit('duplicate')"
				data-tooltip="Duplicate"
			/>
			<Button small highlight
				:icon="$image('icons/cross_white.svg')"
				class="toggleAction"
				@click="$emit('delete')"
			/>
		</template>

		<div>
			<div v-if="action.type===null" class="typeSelector">
				<div class="info">Select the action type to execute</div>
				<Button class="button" white @click="selectActionType('chat')" title="Send chat message" :icon="$image('icons/whispers_purple.svg')"/>
					
				<Button class="button" white @click="selectActionType('bingo')" title="Start a bingo" :icon="$image('icons/bingo_purple.svg')"/>
				
				<Button class="button" white @click="selectActionType('raffle')" title="Start a raffle" :icon="$image('icons/ticket_purple.svg')"/>
				
				<Button class="button" white @click="selectActionType('highlight')" title="Highlight on stream" :icon="$image('icons/highlight_purple.svg')" />
				
				<Button class="button" white @click="selectActionType('trigger')" title="Trigger" :icon="$image('icons/broadcast_purple.svg')" />
				
				<Button class="button" white @click="selectActionType('obs')" title="Control OBS" :icon="$image('icons/obs_purple.svg')"
					:disabled="!obsConnected"
					:data-tooltip="obsConnected? '' : 'You need to connect with OBS<br>on the OBS section'"/>
				
				<Button class="button" white @click="selectActionType('tts')"
					title="Text to speech"
					:icon="$image('icons/tts_purple.svg')"
					:disabled="!$store.state.ttsParams.enabled"
					:data-tooltip="$store.state.ttsParams.enabled? '' : 'This needs the <strong>text to speech</strong><br>feature to be enabled'"/>
				
				<Button class="button" white @click="selectActionType('music')"
					title="Control music"
					:icon="$image('icons/music_purple.svg')"
					:disabled="!musicServiceConfigured"
					:data-tooltip="musicServiceConfigured? '' : 'You need to connect<br>Spotify or Deezer<br>on the Overlays section'"/>
				
				<Button class="button" white
				@click="selectActionType('voicemod')"
					title="Control Voicemod"
					:icon="$image('icons/voicemod_purple.svg')"
					:disabled="!voicemodEnabled"
					:data-tooltip="voicemodEnabled? '' : 'You need to connect<br>with Voicemod'"/>
			</div>

			<TriggerActionChatEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='chat'" :action="action" :event="event" />
			<TriggerActionOBSEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='obs'" :action="action" :event="event" :sources="sources" />
			<TriggerActionMusicEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='music'" :action="action" :event="event" />
			<TriggerActionTTSEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='tts'" :action="action" :event="event" />
			<TriggerActionVoicemodEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='voicemod'" :action="action" :event="event" />
			<TriggerActionHighlightEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='highlight'" :action="action" :event="event" />
			<TriggerActionTriggerEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='trigger'" :action="action" :event="event" />
			<RaffleForm @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='raffle'" :action="action" :event="event" triggerMode />
			<BingoForm @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='bingo'" :action="action" :event="event" triggerMode />
			
			<ParamItem class="item delay" :paramData="delay_conf" v-if="action.type!==null" v-model="action.delay" />

		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { ParameterData, TriggerActionStringTypes, TriggerActionTypes } from '@/types/TwitchatDataTypes';
import type { OBSSourceItem } from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '@/components/params/ParamItem.vue';
import TriggerActionOBSEntry from './entries/TriggerActionOBSEntry.vue';
import TriggerActionChatEntry from './entries/TriggerActionChatEntry.vue';
import TriggerActionMusicEntry from './entries/TriggerActionMusicEntry.vue';
import Config from '@/utils/Config';
import TriggerActionTTSEntry from './entries/TriggerActionTTSEntry.vue';
import OBSWebsocket from '@/utils/OBSWebsocket';
import RaffleForm from '../../../raffle/RaffleForm.vue';
import BingoForm from '../../../bingo/BingoForm.vue';
import TriggerActionVoicemodEntry from './entries/TriggerActionVoicemodEntry.vue';
import VoicemodWebSocket from '@/utils/VoicemodWebSocket';
import TriggerActionHighlightEntry from './entries/TriggerActionHighlightEntry.vue';
import TriggerActionTriggerEntry from './entries/TriggerActionTriggerEntry.vue';

@Options({
	props:{
		action:Object,
		sources:Object,
		index:Number,
		totalItems:Number,
		event:String,
	},
	components:{
		Button,
		ParamItem,
		BingoForm,
		RaffleForm,
		ToggleBlock,
		TriggerActionOBSEntry,
		TriggerActionTTSEntry,
		TriggerActionChatEntry,
		TriggerActionMusicEntry,
		TriggerActionTriggerEntry,
		TriggerActionVoicemodEntry,
		TriggerActionHighlightEntry,
	},
	emits:["delete", "setContent", "duplicate"]
})
export default class TriggerActionEntry extends Vue {

	public action!:TriggerActionTypes;
	public sources!:OBSSourceItem[];
	public index!:number;
	public totalItems!:number;
	public event!:string;

	public opened = false;
	public isError = false;
	public delay_conf:ParameterData = { label:"Delay before next step (seconds)", type:"number", value:0, min:0, max:60*10, icon:"timeout_purple.svg" };
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get musicServiceConfigured():boolean { return Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED; }
	public get voicemodEnabled():boolean { return VoicemodWebSocket.instance.connected; }

	public get errorTitle():string {
		let res = "ERROR - MISSING OBS SOURCE";
		
		if(this.action.type == "obs") {
			res += "<br><span class='subtitle'>";
			res += this.action.sourceName;
			res += "</span>";
		}
		
		return res;
	}

	public get classes():string[] {
		const res = ["TriggerActionEntry"];
		if(this.isError) res.push("error");
		return res;
	}

	/**
	 * Get block's title
	 */
	public get title():string {
		let res = 'Step '+(this.index+1);
		if(this.action.delay > 0) {
			res += " <span class='subtitle'>(⏳"+this.action.delay+"s)</span>";
		}
		return res+this.subtitle;
	}

	/**
	 * Get block's icon
	 */
	public get icons():string[] {
		const icons = [];
		if(this.action.type == "obs") icons.push( this.action.show? 'show' : 'hide' );
		if(this.action.type == "music") icons.push( 'music' );
		if(this.action.type == "chat") icons.push( 'whispers' );
		if(this.action.type == "tts") icons.push( 'tts' );
		if(this.action.type == "raffle") icons.push( 'ticket' );
		if(this.action.type == "bingo") icons.push( 'bingo' );
		if(this.action.type == "voicemod") icons.push( 'voicemod' );
		return icons;
	}

	/**
	 * Get block's subtitle
	 */
	public get subtitle():string {
		let res = "";
		const chunks:string[] = [];
		if(this.action.type == "obs") {

			if(this.action.sourceName) {
				let sourceName = this.action.sourceName;
				sourceName = sourceName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				chunks.push(sourceName);
			}
			if(this.action.filterName) {
				let filterName = this.action.filterName;
				filterName = filterName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				chunks.push(filterName);
			}
		}
		if(chunks.length > 0) {
			res += "<br><span class='subtitle'>";
			res += chunks.join(" -> ");
			res += "</span>";
		}
		return res;
	}

	public async beforeMount():Promise<void> {
		this.opened = !this.action.type || this.totalItems <= 2;
	}

	public async mounted():Promise<void> {
	}

	/**
	 * Called when submitting the form
	 */
	public onSubmit():void {
		this.$emit("update");
	}

	public selectActionType(type:TriggerActionStringTypes):void {
		this.action.type = type;
	}

}
</script>

<style scoped lang="less">
.TriggerActionEntry{
	:deep(.header) {
		.subtitle {
			font-size: .7em;
			font-weight: normal;
			vertical-align: middle;
			font-style: italic;
		}
		&>.icon {
			height: 1.5em !important;
			max-width: 2em !important;
			padding: .15em 0;
			width: unset !important;
			vertical-align: middle;
		}
	}

	.toggleAction {
		border-radius: 0;
		padding: .3em;
		align-self: stretch;
	}

	&.error {
		.source {
			padding: .25em;
			border-radius: .5em;
			border: 2px dashed @mainColor_alert;
			background-color: fade(@mainColor_alert, 35%);
		}
	}

	.typeSelector {
		display: flex;
		flex-direction: column;
		.info {
			align-self: center;
			font-weight: bold;
			margin-bottom: .5em;
		}
		.button {
			&:not(:last-child) {
				margin-bottom: .25em;
			}
			&.disabled {
				color: fade(@mainColor_light, 50%);
			}
			:deep(.icon) {
				max-width: 1.5em;
			}
		}
	}

	.item:not(:first-of-type) {
		margin-top: .25em;
	}

	.delay {
		:deep(input){
			flex-grow: unset;
			min-width: unset;
			width: 90px;
			max-width: 90px;
		}
	}

	.url {
		:deep(input){
			text-align: left;
			width: auto;
			max-width: unset;
		}
	}
	.saveBt {
		display: block;
		margin: auto;
		margin-top: .5em;
	}
}
</style>