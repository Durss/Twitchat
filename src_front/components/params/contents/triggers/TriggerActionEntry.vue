<template>
	<TriggerActionDelayEntry v-if="action.type=='delay'"
	:action="action"
	:triggerData="triggerData"
	@delete="$emit('delete')" />

	<ToggleBlock v-else
	:error="isError"
	:open="opened"
	:title="title"
	:subtitle="subtitle"
	:class="classes"
	:icons="icons? icons : []"
	>
		<template #left_actions>
			<div class="actionList">
				<Button small
					icon="dragZone"
					class="action orderBt"
					v-tooltip="$t('triggers.reorder_tt')"
					@click.stop
				/>
			</div>
		</template>
		<template #right_actions>
			<div class="actionList">
				<Button small
					icon="copy"
					class="action"
					@click.stop="$emit('duplicate')"
					v-tooltip="$t('triggers.actions.common.duplicate_tt')"
					/>
					<Button small alert
					icon="trash"
					class="action delete"
					@click.stop="$emit('delete')"
					v-tooltip="$t('global.delete')"
				/>
			</div>
		</template>

		<div v-if="action.type===null" class="typeSelector">
			<div class="info">{{ $t('triggers.actions.common.select_action') }}</div>
			<div class="list">
				<Button class="button" @click="selectActionType('delay')"
					icon="timer">{{ $t('triggers.actions.common.action_delay') }}</Button>
	
				<Button class="button" @click="selectActionType('chat')"
					icon="whispers">{{ $t('triggers.actions.common.action_chat') }}</Button>
					
				<Button class="button" @click.capture="selectActionType('poll')"
					v-if="hasChannelPoints"
					icon="poll"
					:disabled="!canCreatePoll">{{ $t('triggers.actions.common.action_poll') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('prediction')"
					v-if="hasChannelPoints"
					icon="prediction"
					:disabled="!canCreatePrediction">{{ $t('triggers.actions.common.action_prediction') }}</Button>
					
				<Button class="button" @click="selectActionType('bingo')"
					icon="bingo">{{ $t('triggers.actions.common.action_bingo') }}</Button>
				
				<Button class="button" @click="selectActionType('raffle')"
					icon="ticket">{{ $t('triggers.actions.common.action_raffle') }}</Button>
	
				<Button class="button" @click="selectActionType('raffle_enter')"
					v-if="hasUserInfo"
					icon="user">{{ $t('triggers.actions.common.action_raffle_enter') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('stream_infos')"
					icon="info"
					:disabled="!canEditStreamInfo"
					v-tooltip="canEditStreamInfo? '' : $t('triggers.actions.common.action_stream_infos_tt')">{{ $t('triggers.actions.common.action_stream_infos') }}</Button>
					
				<Button class="button" @click="selectActionType('chatSugg')"
					icon="chatPoll">{{ $t('triggers.actions.common.action_chatSugg') }}</Button>
				
				<Button class="button" @click="selectActionType('highlight')"
					icon="highlight" >{{ $t('triggers.actions.common.action_highlight') }}</Button>
				
				<Button class="button" @click="selectActionType('value')"
				 	v-newflag="{date:1690765812999, id:'params_value'}"
					icon="placeholder">{{ $t('triggers.actions.common.action_value') }}</Button>
				
				<Button class="button" @click="selectActionType('count')"
					icon="count">{{ $t('triggers.actions.common.action_count') }}</Button>
				
				<Button class="button" @click="selectActionType('random')"
					icon="dice">{{ $t('triggers.actions.common.action_random') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('obs')"
					icon="obs"
					:disabled="!obsConnected"
					v-tooltip="obsConnected? '' : $t('triggers.actions.common.action_obs_tt')">{{ $t('triggers.actions.common.action_obs') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('tts')"
					icon="tts"
					:disabled="!$store('tts').params.enabled"
					v-tooltip="$store('tts').params.enabled? '' : $t('triggers.actions.common.action_tts_tt')">{{ $t('triggers.actions.common.action_tts') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('music')"
					icon="spotify"
					:disabled="!spotifyConnected"
					v-tooltip="spotifyConnected? '' : $t('triggers.actions.common.action_music_tt')">{{ $t('triggers.actions.common.action_music') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('voicemod')"
					icon="voicemod"
					:disabled="!voicemodEnabled"
					v-tooltip="voicemodEnabled? '' : $t('triggers.actions.common.action_voicemod_tt')">{{ $t('triggers.actions.common.action_voicemod') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('goxlr')"
				 	v-newflag="{date:1690765812999, id:'params_goxlr'}"
					icon="goxlr" premium
					:disabled="!goxlrEnabled"
					v-tooltip="goxlrEnabled? '' : $t('triggers.actions.common.action_goxlr_tt')">{{ $t('triggers.actions.common.action_goxlr') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('customBadges')"
				 	v-newflag="{date:1690765812999, id:'params_custombadges'}"
					icon="badge">{{ $t('triggers.actions.common.action_customBadges') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('customUsername')"
				 	v-newflag="{date:1690765812999, id:'params_customusername'}"
					icon="user">{{ $t('triggers.actions.common.action_customUsername') }}</Button>
				
				<Button class="button" @click="selectActionType('trigger')"
					icon="broadcast" >{{ $t('triggers.actions.common.action_trigger') }}</Button>
				
				<Button class="button" @click="selectActionType('triggerToggle')"
					icon="broadcast" >{{ $t('triggers.actions.common.action_triggerToggle') }}</Button>
				
				<Button class="button" @click="selectActionType('vibrate')"
					icon="vibrate" >{{ $t('triggers.actions.common.action_vibrate') }}</Button>
				
				<Button class="button" @click="selectActionType('http')"
					icon="url">{{ $t('triggers.actions.common.action_http') }}</Button>
				
				<Button class="button" @click.capture="selectActionType('ws')"
					:disabled="!wsConnected"
					icon="url">{{ $t('triggers.actions.common.action_ws') }}</Button>
			</div>
		</div>

		<TriggerActionChatEntry v-if="action.type=='chat'" :action="action" :triggerData="triggerData" />
		<TriggerActionOBSEntry v-if="action.type=='obs'" :action="action" :triggerData="triggerData" :obsSources="obsSources" :obsInputs="obsInputs" />
		<TriggerActionMusicEntry v-if="action.type=='music'" :action="action" :triggerData="triggerData" />
		<TriggerActionTTSEntry v-if="action.type=='tts'" :action="action" :triggerData="triggerData" />
		<TriggerActionVoicemodEntry v-if="action.type=='voicemod'" :action="action" :triggerData="triggerData" />
		<TriggerActionHighlightEntry v-if="action.type=='highlight'" :action="action" :triggerData="triggerData" />
		<TriggerActionTriggerEntry v-if="action.type=='trigger'" :action="action" :triggerData="triggerData" :rewards="rewards" />
		<TriggerActionTriggerToggleEntry v-if="action.type=='triggerToggle'" :action="action" :triggerData="triggerData" :rewards="rewards" />
		<TriggerActionHTTPCall v-if="action.type=='http'" :action="action" :triggerData="triggerData" />
		<TriggerActionWSEntry v-if="action.type=='ws'" :action="action" :triggerData="triggerData" />
		<TriggerActionValueEntry v-if="action.type=='value'" :action="action" :triggerData="triggerData" />
		<TriggerActionCountEntry v-if="action.type=='count'" :action="action" :triggerData="triggerData" />
		<TriggerActionRandomEntry v-if="action.type=='random'" :action="action" :triggerData="triggerData" :rewards="rewards" />
		<TriggerActionStreamInfoEntry v-if="action.type=='stream_infos'" :action="action" :triggerData="triggerData" />
		<TriggerActionVibratePhoneEntry v-if="action.type=='vibrate'" :action="action" :triggerData="triggerData" />
		<TriggerActionGoXLREntry v-if="action.type=='goxlr'" :action="action" :triggerData="triggerData" />
		<TriggerActionCustomBadge v-if="action.type=='customBadges'" :action="action" :triggerData="triggerData" />
		<TriggerActionCustomUsername v-if="action.type=='customUsername'" :action="action" :triggerData="triggerData" />
		<RaffleForm v-if="action.type=='raffle'" :action="action" :triggerData="triggerData" triggerMode />
		<BingoForm v-if="action.type=='bingo'" :action="action" :triggerData="triggerData" triggerMode />
		<PollForm v-if="action.type=='poll'" :action="action" :triggerData="triggerData" triggerMode />
		<PredictionForm v-if="action.type=='prediction'" :action="action" :triggerData="triggerData" triggerMode />
		<ChatSuggestionForm v-if="action.type=='chatSugg'" :action="action" :triggerData="triggerData" triggerMode />
		<div v-if="action.type=='raffle_enter'" class="raffleEnter">{{ $t("triggers.actions.raffle_enter.info") }}</div>

	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ChatSuggestionForm from '@/components/chatSugg/ChatSuggestionForm.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import { TriggerEventPlaceholders, type TriggerActionObsData, type TriggerActionObsDataAction, type TriggerActionStringTypes, type TriggerActionTypes, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { OBSInputItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import WebsocketTrigger from '@/utils/WebsocketTrigger';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import BingoForm from '../../../bingo/BingoForm.vue';
import RaffleForm from '../../../raffle/RaffleForm.vue';
import TriggerActionChatEntry from './entries/TriggerActionChatEntry.vue';
import TriggerActionCountEntry from './entries/TriggerActionCountEntry.vue';
import TriggerActionValueEntry from './entries/TriggerActionValueEntry.vue';
import TriggerActionDelayEntry from './entries/TriggerActionDelayEntry.vue';
import TriggerActionGoXLREntry from './entries/TriggerActionGoXLREntry.vue';
import TriggerActionHTTPCall from './entries/TriggerActionHTTPCall.vue';
import TriggerActionHighlightEntry from './entries/TriggerActionHighlightEntry.vue';
import TriggerActionMusicEntry from './entries/TriggerActionMusicEntry.vue';
import TriggerActionOBSEntry from './entries/TriggerActionOBSEntry.vue';
import TriggerActionRandomEntry from './entries/TriggerActionRandomEntry.vue';
import TriggerActionStreamInfoEntry from './entries/TriggerActionStreamInfoEntry.vue';
import TriggerActionTTSEntry from './entries/TriggerActionTTSEntry.vue';
import TriggerActionTriggerEntry from './entries/TriggerActionTriggerEntry.vue';
import TriggerActionTriggerToggleEntry from './entries/TriggerActionTriggerToggleEntry.vue';
import TriggerActionVibratePhoneEntry from './entries/TriggerActionVibratePhoneEntry.vue';
import TriggerActionVoicemodEntry from './entries/TriggerActionVoicemodEntry.vue';
import TriggerActionWSEntry from './entries/TriggerActionWSEntry.vue';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import TriggerActionCustomBadge from './entries/TriggerActionCustomBadge.vue';
import TriggerActionCustomUsername from './entries/TriggerActionCustomUsername.vue';

@Component({
	components:{
		Button,
		PollForm,
		ParamItem,
		BingoForm,
		RaffleForm,
		ToggleBlock,
		PredictionForm,
		ChatSuggestionForm,
		TriggerActionWSEntry,
		TriggerActionOBSEntry,
		TriggerActionTTSEntry,
		TriggerActionHTTPCall,
		TriggerActionChatEntry,
		TriggerActionDelayEntry,
		TriggerActionValueEntry,
		TriggerActionCountEntry,
		TriggerActionMusicEntry,
		TriggerActionGoXLREntry,
		TriggerActionCustomBadge,
		TriggerActionRandomEntry,
		TriggerActionTriggerEntry,
		TriggerActionVoicemodEntry,
		TriggerActionHighlightEntry,
		TriggerActionCustomUsername,
		TriggerActionStreamInfoEntry,
		TriggerActionVibratePhoneEntry,
		TriggerActionTriggerToggleEntry,
	},
	emits:["delete", "duplicate"]
})
export default class TriggerActionEntry extends Vue {

	@Prop
	public action!:TriggerActionTypes;
	@Prop
	public triggerData!:TriggerData;
	@Prop
	public obsSources!:OBSSourceItem[];
	@Prop
	public obsInputs!:OBSInputItem[];
	@Prop
	public rewards!:TwitchDataTypes.Reward[];
	@Prop
	public index!:number;

	public opened = false;
	public isError = false;
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get spotifyConnected():boolean { return SpotifyHelper.instance.connected; }
	public get voicemodEnabled():boolean { return VoicemodWebSocket.instance.connected; }
	public get goxlrEnabled():boolean { return GoXLRSocket.instance.connected; }
	public get wsConnected():boolean { return WebsocketTrigger.instance.connected; }
	public get canCreatePoll():boolean { return TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS]); }
	public get canCreatePrediction():boolean { return TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS]); }
	public get canEditStreamInfo():boolean { return TwitchUtils.hasScopes([TwitchScopes.SET_STREAM_INFOS]); }
	public get hasChannelPoints():boolean {
		return this.$store("auth").twitch.user.is_affiliate || this.$store("auth").twitch.user.is_partner;
	}

	/**
	 * Checks if one of the placeholders has a user info in it
	 */
	public get hasUserInfo():boolean { return TriggerEventPlaceholders(this.triggerData.type).findIndex(v=> v.isUserID) > -1; }

	public get classes():string[] {
		const res = ["triggeractionentry"];
		if(this.isError) res.push("error");
		return res;
	}

	/**
	 * Get block's title
	 */
	public get title():string {
		if(this.isError) {
			if(this.action.type == "obs") {
				return "MISSING OBS SOURCE";
			}
		}

		let res = 'Step '+(this.index+1);
		if(this.action.type) {
			res = this.$t("triggers.actions.common.action_"+this.action.type)
		}
		return res;
	}

	/**
	 * Get block's subtitle
	 */
	public get subtitle():string {
		let res = "";
		if(this.action.type == "obs") {
			const chunks:string[] = [];
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
			if(chunks.length > 0) {
				res += chunks.join(" -> ");
			}
		}else
		if(this.action.type == "delay" && this.action.delay > 0) {
			res += "⏳"+this.action.delay+"s";
		}
		return res;
	}

	/**
	 * Get block's icon
	 */
	public get icons():string[] {
		const icons = [];
		const action2Icon:{[key in TriggerActionObsDataAction]:string} = {
			hide:"hide",
			show:"show",
			mute:"mute",
			unmute:"unmute",
			replay:"play",
		};
		
		if(this.action.type == "obs") icons.push( action2Icon[this.action.action]+"" );
		if(this.action.type == "music") icons.push( 'spotify' );
		if(this.action.type == "chat") icons.push( 'whispers' );
		if(this.action.type == "tts") icons.push( 'tts' );
		if(this.action.type == "raffle") icons.push( 'ticket' );
		if(this.action.type == "raffle_enter") icons.push( 'user' );
		if(this.action.type == "bingo") icons.push( 'bingo' );
		if(this.action.type == "voicemod") icons.push( 'voicemod' );
		if(this.action.type == "trigger") icons.push( 'broadcast' );
		if(this.action.type == "triggerToggle") icons.push( 'broadcast' );
		if(this.action.type == "highlight") icons.push( 'highlight' );
		if(this.action.type == "http") icons.push( 'url' );
		if(this.action.type == "ws") icons.push( 'url' );
		if(this.action.type == "poll") icons.push( 'poll' );
		if(this.action.type == "prediction") icons.push( 'prediction' );
		if(this.action.type == "count") icons.push( 'count' );
		if(this.action.type == "value") icons.push( 'placeholder' );
		if(this.action.type == "random") icons.push( 'dice_placeholder' );
		if(this.action.type == "stream_infos") icons.push( 'info' );
		if(this.action.type == "delay") icons.push( 'timer' );
		if(this.action.type == "vibrate") icons.push( 'vibrate' );
		if(this.action.type == "customBadges") icons.push( 'badge' );
		if(this.action.type == "customUsername") icons.push( 'user' );
		return icons;
	}

	public async beforeMount():Promise<void> {
		this.opened = !this.action.type;
	}

	public async mounted():Promise<void> {
		if(this.action.type == "obs") {
			watch(()=>this.obsSources, ()=> this.checkOBSSource());
			this.checkOBSSource();
		}
	}

	/**
	 * Called when submitting the form
	 */
	public onSubmit():void {
		this.$emit("update");
	}

	/**
	 * Called when choosing an action type
	 * @param type 
	 */
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
			case "stream_infos": {
				if(!this.canEditStreamInfo) {
					this.$store("auth").requestTwitchScopes([TwitchScopes.SET_STREAM_INFOS]);
					return;
				}break
			}
			case "music": {
				if(!this.spotifyConnected) {
					this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.SPOTIFY);
					return;
				}break
			}
			case "voicemod": {
				if(!this.voicemodEnabled) {
					this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.VOICEMOD);
					return;
				}break
			}
			case "goxlr": {
				if(!this.goxlrEnabled) {
					this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.GOXLR);
					return;
				}break
			}
			case "obs": {
				if(!this.obsConnected) {
					this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.OBS);
					return;
				}break
			}
			case "ws": {
				if(!this.wsConnected) {
					this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.WEBSOCKET);
					return;
				}break
			}
			case "tts": {
				if(!this.$store('tts').params.enabled) {
					this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.TTS);
					return;
				}break
			}
		}
		this.action.type = type;
	}

	/**
	 * Updates the error state when obs sources are changed
	 */
	private checkOBSSource():void {
		const action:TriggerActionObsData = this.action as TriggerActionObsData;
		this.isError = this.obsSources.findIndex(v=>v.sourceName == action.sourceName) == -1 && this.obsConnected;
	}

}
</script>

<style lang="less">
.triggeractionentry.closed {
    width: fit-content;
    &:not(.small) {
		margin: auto;
	}
}
</style>

<style scoped lang="less">
.triggeractionentry{
	transition: all .15s;
	:deep(.header) {
		padding: 0;
		.title {
			padding: .5em 0;
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
			overflow: hidden;
			&::before {
				content: "beta";
				position: absolute;
				right: 0;
				color:var(--color-light);
				background-color: var(--color-alert);
				background: linear-gradient(-90deg, var(--color-alert-fadest) 0%, var(--color-alert) 0%, var(--color-alert) 100%);
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

	.actionList {
		display: flex;
		align-self: stretch;
		.action {
			border-radius: 0;
			padding: .5em;
			align-self: stretch;
			box-shadow: unset;
			&.orderBt {
				cursor: grab;
				&:active {
					cursor: grabbing;
				}
			}
		}
	}

	.typeSelector {
		.info {
			align-self: center;
			font-weight: bold;
			margin-bottom: .5em;
		}

		.list {
			gap: 3px;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			flex-grow: 1;
			.button {
				flex-grow: 1;
				flex-basis: 250px;
				:deep(.icon) {
					max-width: 1.25em;
				}
			}
		}
	}

	.raffleEnter{
		font-size: .9em;
		line-height: 1.3em;
	}
}
</style>