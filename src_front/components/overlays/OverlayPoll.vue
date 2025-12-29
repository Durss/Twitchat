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
		/>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { PollOverlayParamStoreData } from '@/store/poll/storePoll';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { Component, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import AbstractOverlay from './AbstractOverlay';
import PollRenderer from './poll/PollRenderer.vue';
@Component({
	components:{
		Icon,
		PollRenderer,
	},
	emits:[],
})
class OverlayPoll extends AbstractOverlay {

	public show:boolean = false;
	public showWinner:boolean = false;
	public poll:TwitchatDataTypes.MessagePollData | null = null;
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
	private pendingData:TwitchatEvent<"POLL_PROGRESS">|null = null;
	private updatePollHandler!:(e:TwitchatEvent<"POLL_PROGRESS">)=>void;
	private updateParametersHandler!:(e:TwitchatEvent<"POLLS_OVERLAY_PARAMETERS">)=>void;
	private requestPresenceHandler!:()=>void;

	public get listMode():boolean {
		return this.parameters.listMode
		&& (!this.parameters.listModeOnlyMore2 || (this.parameters.listModeOnlyMore2 && this.poll!.choices.length > 2))
	}

	public async mounted():Promise<void> {
		PublicAPI.instance.broadcast("POLLS_OVERLAY_PRESENCE");

		this.updateParametersHandler = (e:TwitchatEvent<"POLLS_OVERLAY_PARAMETERS">)=>this.onUpdateParams(e);
		this.updatePollHandler = (e:TwitchatEvent<"POLL_PROGRESS">)=>this.onUpdatePoll(e);
		this.requestPresenceHandler = ()=>{ PublicAPI.instance.broadcast("POLLS_OVERLAY_PRESENCE"); }

		PublicAPI.instance.addEventListener("POLL_PROGRESS", this.updatePollHandler);
		PublicAPI.instance.addEventListener("POLLS_OVERLAY_PARAMETERS", this.updateParametersHandler);
		PublicAPI.instance.addEventListener("GET_POLLS_OVERLAY_PRESENCE", this.requestPresenceHandler);
	}

	public beforeUnmount():void {
		super.beforeUnmount();
		PublicAPI.instance.removeEventListener("POLL_PROGRESS", this.updatePollHandler);
		PublicAPI.instance.removeEventListener("POLLS_OVERLAY_PARAMETERS", this.updateParametersHandler);
		PublicAPI.instance.removeEventListener("GET_POLLS_OVERLAY_PRESENCE", this.requestPresenceHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast("GET_POLLS_OVERLAY_PARAMETERS");
	}

	public async onUpdatePoll(e:TwitchatEvent<"POLL_PROGRESS">):Promise<void> {
		if(!this.parametersReceived) {
			// overlay's parameters not received yet, put data aside
			// onUpdatePoll() will be called by onUpdateParams() afterwards
			this.pendingData = e;
			this.requestInfo();
			return;
		}

		const poll = e.data?.poll;
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

	public async onUpdateParams(e:TwitchatEvent<"POLLS_OVERLAY_PARAMETERS">):Promise<void> {
		this.parameters = e.data.parameters;
		this.parametersReceived = true;
		if(this.pendingData) {
			this.onUpdatePoll(this.pendingData);
			this.pendingData = null;
		}else{
			this.show = this.parameters.showOnlyResult !== true;
		}
	}

}
export default toNative(OverlayPoll);

</script>
