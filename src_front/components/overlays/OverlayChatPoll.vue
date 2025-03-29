<template>
	<PollRenderer v-if="poll && parameters"
		:open="show"
		:showTimer="parameters.showTimer"
		:showLabels="parameters.showLabels"
		:showPercent="parameters.showPercent"
		:showVoters="parameters.showVotes"
		:showVotes="false"
		:showWinner="showWinner"
		:title="parameters.showTitle? poll.title : ''"
		:duration="poll.duration_s * 1000"
		:startedAt="poll.started_at"
		:resultDuration_s="parameters.resultDuration_s"
		:placement="parameters.placement"
		:mode="listMode? 'list' : 'line'"
		:entries="poll.choices"
		showIndex
		/>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { PollOverlayParamStoreData } from '@/store/poll/storePoll';
import TwitchatEvent from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import PollRenderer from './poll/PollRenderer.vue';

@Component({
	components:{
		PollRenderer,
	},
	emits:[],
})
class OverlayChatPoll extends AbstractOverlay {

	public show:boolean = false;
	public showWinner:boolean = false;
	public poll:TwitchatDataTypes.ChatPollData | null = null;
	public parameters:PollOverlayParamStoreData = {
		showTitle:true,
		listMode:true,
		listModeOnlyMore2:true,
		showLabels:false,
		showPercent:false,
		showVotes:false,
		showTimer:true,
		showOnlyResult:false,
		resultDuration_s:5,
		placement:"bl",
	};

	private parametersReceived:boolean = false;
	private pendingData:TwitchatEvent|null = null;
	private updatePollHandler!:(e:TwitchatEvent)=>void;
	private updateParametersHandler!:(e:TwitchatEvent)=>void;
	private requestPresenceHandler!:(e:TwitchatEvent)=>void;

	public get listMode():boolean {
		return this.parameters.listMode
		&& (!this.parameters.listModeOnlyMore2 || (this.parameters.listModeOnlyMore2 && this.poll!.choices.length > 2))
	}

	public async mounted():Promise<void> {
		PublicAPI.instance.broadcast(TwitchatEvent.CHAT_POLL_OVERLAY_PRESENCE);

		this.updateParametersHandler = (e:TwitchatEvent)=>this.onUpdateParams(e);
		this.updatePollHandler = (e:TwitchatEvent)=>this.onUpdatePoll(e);
		this.requestPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.CHAT_POLL_OVERLAY_PRESENCE); }

		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_POLL_PROGRESS, this.updatePollHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_POLL_OVERLAY_PARAMETERS, this.updateParametersHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CHAT_POLL_OVERLAY_PRESENCE, this.requestPresenceHandler);
	}

	public beforeUnmount():void {
		super.beforeUnmount();
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_POLL_PROGRESS, this.updatePollHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_POLL_OVERLAY_PARAMETERS, this.updateParametersHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_CHAT_POLL_OVERLAY_PRESENCE, this.requestPresenceHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CHAT_POLL_OVERLAY_PARAMETERS);
	}

	public async onUpdatePoll(e:TwitchatEvent):Promise<void> {
		if(!this.parametersReceived) {
			// overlay's parameters not received yet, put data aside
			// onUpdatePoll() will be called by onUpdateParams() afterwards
			this.pendingData = e;
			this.requestInfo();
			return;
		}

		const poll = ((e.data as unknown) as {poll:TwitchatDataTypes.ChatPollData}).poll;
		if(!poll) {
			// No poll given when a poll was displayed, request close
			if(this.poll) {
				this.showWinner = this.parameters.resultDuration_s > 0;
				this.show = true;
				await Utils.promisedTimeout(this.parameters.resultDuration_s * 1000);
				this.show = false;
			}
		}else{
			this.show		= this.parameters.showOnlyResult !== true;
			this.showWinner	= false;
			this.poll		= poll;
		}
	}

	public async onUpdateParams(e:TwitchatEvent):Promise<void> {
		this.parameters = ((e.data as unknown) as {parameters:PollOverlayParamStoreData}).parameters;
		this.parametersReceived = true;
		if(this.pendingData) {
			this.onUpdatePoll(this.pendingData);
			this.pendingData = null;
		}else{
			this.show = this.parameters.showOnlyResult !== true;
		}
	}

}
export default toNative(OverlayChatPoll);
</script>
