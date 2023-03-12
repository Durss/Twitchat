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
		<template #right_actions>
			<Button small
				:icon="$image('icons/copy.svg')"
				class="toggleAction"
				@click="$emit('duplicate')"
				:data-tooltip="$t('triggers.actions.common.duplicate_tt')"
			/>
			<Button small highlight
				:icon="$image('icons/cross_white.svg')"
				class="toggleAction"
				@click="$emit('delete')"
			/>
		</template>

		<div>
			<div v-if="action.type===null" class="typeSelector">
				<div class="info">{{ $t('triggers.actions.common.select_action') }}</div>
				<Button class="button" white @click="selectActionType('chat')"
					:title="$t('triggers.actions.common.action_chat')"
					:icon="$image('icons/whispers_purple.svg')"/>
					
				<Button class="button" white @click.capture="selectActionType('poll')"
					v-if="hasChannelPoints"
					:title="$t('triggers.actions.common.action_poll')"
					:icon="$image('icons/poll_purple.svg')"
					:disabled="!canCreatePoll"/>
				
				<Button class="button" white @click.capture="selectActionType('prediction')"
					v-if="hasChannelPoints"
					:title="$t('triggers.actions.common.action_prediction')"
					:icon="$image('icons/prediction_purple.svg')"
					:disabled="!canCreatePrediction"/>
					
				<Button class="button" white @click="selectActionType('bingo')"
					:title="$t('triggers.actions.common.action_bingo')"
					:icon="$image('icons/bingo_purple.svg')"/>
				
				<Button class="button" white @click="selectActionType('raffle')"
					:title="$t('triggers.actions.common.action_raffle')"
					:icon="$image('icons/ticket_purple.svg')"/>

				<Button class="button" white @click="selectActionType('raffle_enter')"
					v-if="hasUserInfo"
					:title="$t('triggers.actions.common.action_raffle_enter')"
					:icon="$image('icons/user_purple.svg')"/>
				
				<Button class="button" white @click="selectActionType('stream_infos')"
					:title="$t('triggers.actions.common.action_stream_infos')"
					:icon="$image('icons/info_purple.svg')"/>
				
				<Button class="button" white @click="selectActionType('highlight')"
					:title="$t('triggers.actions.common.action_highlight')"
					:icon="$image('icons/highlight_purple.svg')" />
				
				<Button class="button beta" white @click="selectActionType('count')"
					:title="$t('triggers.actions.common.action_count')"
					:icon="$image('icons/count_purple.svg')"/>
				
				<Button class="button beta" white @click="selectActionType('countget')"
					:title="$t('triggers.actions.common.action_countget')"
					:icon="$image('icons/count_placeholder_purple.svg')"/>
				
				<Button class="button beta" white @click="selectActionType('random')"
					:title="$t('triggers.actions.common.action_random')"
					:icon="$image('icons/dice_purple.svg')"/>
				
				<Button class="button" white @click.capture="selectActionType('obs')"
					:title="$t('triggers.actions.common.action_obs')"
					:icon="$image('icons/obs_purple.svg')"
					:disabled="!obsConnected"
					:data-tooltip="obsConnected? '' : $t('triggers.actions.common.action_obs_tt')"/>
				
				<Button class="button" white @click.capture="selectActionType('tts')"
					:title="$t('triggers.actions.common.action_tts')"
					:icon="$image('icons/tts_purple.svg')"
					:disabled="!$store('tts').params.enabled"
					:data-tooltip="$store('tts').params.enabled? '' : $t('triggers.actions.common.action_tts_tt')"/>
				
				<Button class="button" white @click.capture="selectActionType('music')"
					:title="$t('triggers.actions.common.action_music')"
					:icon="$image('icons/spotify_purple.svg')"
					:disabled="!musicServiceConfigured"
					:data-tooltip="musicServiceConfigured? '' : $t('triggers.actions.common.action_music_tt')"/>
				
				<Button class="button" white @click.capture="selectActionType('voicemod')"
					:title="$t('triggers.actions.common.action_voicemod')"
					:icon="$image('icons/voicemod_purple.svg')"
					:disabled="!voicemodEnabled"
					:data-tooltip="voicemodEnabled? '' : $t('triggers.actions.common.action_voicemod_tt')"/>
				
				<Button class="button beta" white @click="selectActionType('trigger')"
					:title="$t('triggers.actions.common.action_trigger')"
					:icon="$image('icons/broadcast_purple.svg')" />
				
				<Button class="button" white @click="selectActionType('http')"
					:title="$t('triggers.actions.common.action_http')"
					:icon="$image('icons/url_purple.svg')"/>
			</div>

			<TriggerActionChatEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='chat'" :action="action" :event="event" :triggerKey="triggerKey" />
			<TriggerActionOBSEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='obs'" :action="action" :event="event" :sources="sources" />
			<TriggerActionMusicEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='music'" :action="action" :event="event" />
			<TriggerActionTTSEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='tts'" :action="action" :event="event" />
			<TriggerActionVoicemodEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='voicemod'" :action="action" :event="event" />
			<TriggerActionHighlightEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='highlight'" :action="action" :event="event" />
			<TriggerActionTriggerEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='trigger'" :action="action" :event="event" :triggerData="triggerData" :triggerKey="triggerKey" />
			<TriggerActionHTTPCall @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='http'" :action="action" :event="event" />
			<TriggerActionCountEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='count'" :action="action" :event="event" :triggerData="triggerData" :triggerKey="triggerKey" />
			<TriggerActionCountGetEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='countget'" :action="action" />
			<TriggerActionRandomEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='random'" :action="action" />
			<TriggerActionStreamInfoEntry @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='stream_infos'" :action="action" :event="event" :triggerKey="triggerKey" />
			<RaffleForm @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='raffle'" :action="action" :event="event" triggerMode />
			<BingoForm @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='bingo'" :action="action" :event="event" triggerMode />
			<PollForm @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='poll'" :action="action" :event="event" triggerMode />
			<PredictionForm @setContent="(v:string)=>$emit('setContent', v)" v-if="action.type=='prediction'" :action="action" :event="event" triggerMode />
			<div v-if="action.type=='raffle_enter'">{{ $t("triggers.actions.raffle_enter.info") }}</div>
			
			<ParamItem class="item delay" :paramData="delay_conf" v-if="action.type!==null" v-model="action.delay" />

		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerActionHelpers, type TriggerActionStringTypes, type TriggerActionTypes, type TriggerData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import type { OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import BingoForm from '../../../bingo/BingoForm.vue';
import RaffleForm from '../../../raffle/RaffleForm.vue';
import TriggerActionChatEntry from './entries/TriggerActionChatEntry.vue';
import TriggerActionCountEntry from './entries/TriggerActionCountEntry.vue';
import TriggerActionCountGetEntry from './entries/TriggerActionCountGetEntry.vue';
import TriggerActionHighlightEntry from './entries/TriggerActionHighlightEntry.vue';
import TriggerActionHTTPCall from './entries/TriggerActionHTTPCall.vue';
import TriggerActionMusicEntry from './entries/TriggerActionMusicEntry.vue';
import TriggerActionOBSEntry from './entries/TriggerActionOBSEntry.vue';
import TriggerActionRandomEntry from './entries/TriggerActionRandomEntry.vue';
import TriggerActionTriggerEntry from './entries/TriggerActionTriggerEntry.vue';
import TriggerActionTTSEntry from './entries/TriggerActionTTSEntry.vue';
import TriggerActionVoicemodEntry from './entries/TriggerActionVoicemodEntry.vue';
import TriggerActionStreamInfoEntry from './entries/TriggerActionStreamInfoEntry.vue';

@Component({
	components:{
		Button,
		PollForm,
		ParamItem,
		BingoForm,
		RaffleForm,
		ToggleBlock,
		PredictionForm,
		TriggerActionOBSEntry,
		TriggerActionTTSEntry,
		TriggerActionHTTPCall,
		TriggerActionChatEntry,
		TriggerActionMusicEntry,
		TriggerActionCountEntry,
		TriggerActionRandomEntry,
		TriggerActionTriggerEntry,
		TriggerActionCountGetEntry,
		TriggerActionVoicemodEntry,
		TriggerActionHighlightEntry,
		TriggerActionStreamInfoEntry,
	},
	emits:["delete", "setContent", "duplicate"]
})
export default class TriggerActionEntry extends Vue {

	@Prop
	public action!:TriggerActionTypes;
	@Prop
	public triggerData!:TriggerData;
	@Prop
	public event!:TriggerEventTypes;
	@Prop
	public sources!:OBSSourceItem[];
	@Prop
	public triggerKey!:string;
	@Prop
	public index!:number;
	@Prop
	public totalItems!:number;

	public opened = false;
	public isError = false;
	public delay_conf:TwitchatDataTypes.ParameterData = { type:"number", value:0, min:0, max:60*10, icon:"timeout_purple.svg" };
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get musicServiceConfigured():boolean { return Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED; }
	public get voicemodEnabled():boolean { return VoicemodWebSocket.instance.connected; }
	public get canCreatePoll():boolean { return TwitchUtils.hasScope(TwitchScopes.MANAGE_POLLS); }
	public get canCreatePrediction():boolean { return TwitchUtils.hasScope(TwitchScopes.MANAGE_PREDICTIONS); }
	public get hasChannelPoints():boolean {
		return this.$store("auth").twitch.user.is_affiliate || this.$store("auth").twitch.user.is_partner;
	}

	/**
	 * Checks if one of the placeholders has a user info in it
	 */
	public get hasUserInfo():boolean { return TriggerActionHelpers(this.event.value).findIndex(v=> v.isUserID) > -1; }

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
		if(this.action.type) {
			res = this.$t("triggers.actions.common.action_"+this.action.type)
		}
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
		if(this.action.type == "music") icons.push( 'spotify' );
		if(this.action.type == "chat") icons.push( 'whispers' );
		if(this.action.type == "tts") icons.push( 'tts' );
		if(this.action.type == "raffle") icons.push( 'ticket' );
		if(this.action.type == "raffle_enter") icons.push( 'user' );
		if(this.action.type == "bingo") icons.push( 'bingo' );
		if(this.action.type == "voicemod") icons.push( 'voicemod' );
		if(this.action.type == "trigger") icons.push( 'broadcast' );
		if(this.action.type == "highlight") icons.push( 'highlight' );
		if(this.action.type == "http") icons.push( 'url' );
		if(this.action.type == "poll") icons.push( 'poll' );
		if(this.action.type == "prediction") icons.push( 'prediction' );
		if(this.action.type == "count") icons.push( 'count' );
		if(this.action.type == "countget") icons.push( 'count_placeholder' );
		if(this.action.type == "random") icons.push( 'dice_placeholder' );
		if(this.action.type == "stream_infos") icons.push( 'info' );
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
		this.delay_conf.labelKey = "triggers.actions.common.next_delay";
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
		switch(type) {
			case "poll": {
				if(!this.canCreatePoll) {
					this.$store("auth").requestTwitchScopes([TwitchScopes.MANAGE_POLLS]);
					return;
				}break
			}
			case "prediction": {
				if(!this.canCreatePrediction) {
					this.$store("auth").requestTwitchScopes([TwitchScopes.MANAGE_PREDICTIONS]);
					return;
				}break
			}
			case "music": {
				if(!this.musicServiceConfigured) {
					this.$emit("setContent", TwitchatDataTypes.ParamsCategories.OVERLAYS);
					return;
				}break
			}
			case "voicemod": {
				if(!this.voicemodEnabled) {
					this.$emit("setContent", TwitchatDataTypes.ParamsCategories.VOICEMOD);
					return;
				}break
			}
			case "obs": {
				if(!this.obsConnected) {
					this.$emit("setContent", TwitchatDataTypes.ParamsCategories.OBS);
					return;
				}break
			}
		}
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
			max-width: 2em;
			padding: .15em 0;
			width: unset !important;
			vertical-align: middle;
		}
	}

	.button {
		&.beta {
			&::before {
				content: "beta";
				position: absolute;
				left: 0;
				color:@mainColor_light;
				background-color: @mainColor_normal;
				background: linear-gradient(-90deg, fade(@mainColor_normal, 0) 0%, fade(@mainColor_normal, 100%) 0%, fade(@mainColor_normal, 100%) 100%);
				height: 100%;
				display: flex;
				align-items: center;
				padding: .35em;
				font-size: .8em;
				font-family: var(--font-nunito);
				text-transform: uppercase;
				z-index: 1;
			}
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
			:deep(.icon) {
				max-width: 1.25em;
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