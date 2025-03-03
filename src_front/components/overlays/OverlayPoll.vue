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
import { Component, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import AbstractOverlay from './AbstractOverlay';
import PollRenderer from './poll/PollRenderer.vue';
import Utils from '@/utils/Utils';
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
	private pendingData:TwitchatEvent|null = null;
	private updatePollHandler!:(e:TwitchatEvent)=>void;
	private updateParametersHandler!:(e:TwitchatEvent)=>void;
	private requestPresenceHandler!:(e:TwitchatEvent)=>void;

	public get listMode():boolean {
		return this.parameters.listMode
		&& (!this.parameters.listModeOnlyMore2 || (this.parameters.listModeOnlyMore2 && this.poll!.choices.length > 2))
	}

	public async mounted():Promise<void> {
		PublicAPI.instance.broadcast(TwitchatEvent.POLLS_OVERLAY_PRESENCE);

		this.updateParametersHandler = (e:TwitchatEvent)=>this.onUpdateParams(e);
		this.updatePollHandler = (e:TwitchatEvent)=>this.onUpdatePoll(e);
		this.requestPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.POLLS_OVERLAY_PRESENCE); }

		PublicAPI.instance.addEventListener(TwitchatEvent.POLL_PROGRESS, this.updatePollHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.POLLS_OVERLAY_PARAMETERS, this.updateParametersHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_POLLS_OVERLAY_PRESENCE, this.requestPresenceHandler);
	}

	public beforeUnmount():void {
		super.beforeUnmount();
		PublicAPI.instance.removeEventListener(TwitchatEvent.POLL_PROGRESS, this.updatePollHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.POLLS_OVERLAY_PARAMETERS, this.updateParametersHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_POLLS_OVERLAY_PRESENCE, this.requestPresenceHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_POLLS_OVERLAY_PARAMETERS);
	}

	public async onUpdatePoll(e:TwitchatEvent):Promise<void> {
		if(!this.parametersReceived) {
			// overlay's parameters not received yet, put data aside
			// onUpdatePoll() will be called by onUpdateParams() afterwards
			this.pendingData = e;
			this.requestInfo();
			return;
		}

		const poll = ((e.data as unknown) as {poll:TwitchatDataTypes.MessagePollData}).poll;
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
export default toNative(OverlayPoll);

</script>

<style scoped lang="less">
.overlaypoll{
	background-color: var(--color-light);
	position: absolute;
	padding: 1em;
	border-radius: var(--border-radius);
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	overflow: hidden;
	transform-origin: center center;
	min-width: 20em;

	.progress {
		width: 100%;
		height: .5em;
		background-color: #387aff;
		position: absolute;
		top: 0;
		left: 0;
	}

	h1 {
		text-align: center;
		margin-bottom: .25em;
	}

	.battle {
		width: 100%;
		max-width: 800px;
		overflow: hidden;
		.labels {
			display: flex;
			flex-direction: row;
			margin-bottom: .25em;
			text-align: center;
			.outcomeTitle {
				display: block;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				transition: flex-basis .3s;
				min-width: 2px;
			}
			.outcomeTitle:first-child:nth-last-child(2),
			.outcomeTitle:first-child:nth-last-child(2) ~ .outcomeTitle {
				flex-basis: 50% !important;
				&:first-child {
					text-align: left;
				}
				&:last-child {
					text-align: right;
				}
			}
		}

		.chunks {
			display: flex;
			flex-direction: row;
			flex-direction: row;
			border-radius: var(--border-radius);
			overflow: hidden;
			width: 100%;
			transform-origin: top center;
			.chunk {
				flex: 1;
				transition: flex-basis .3s;
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: center;
				overflow: hidden;
				padding: .5em 0;
				&:nth-child(odd) {
					background-color: #387aff;
				}
				&:nth-child(even) {
					background-color: #f50e9b;
				}
			}
		}
	}

	.list {
		align-self: stretch;
		.choice {
			width: 100%;
			display: flex;
			flex-direction: column;
			align-items: stretch;
			overflow: hidden;
			transform-origin: top center;
			margin: auto;
			&:not(:last-child) {
				margin-bottom: .75em;
			}
			h2 {
				margin-bottom: .25em;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.bar {
				min-height: 1em;
				flex-grow: 1;
				border-radius: var(--border-radius);
				padding: .25em .5em;
				font-size: 1em;
				color: var(--color-light);
				@c: #387aff;
				transition: background-size .3s;
				background: linear-gradient(to right, @c 100%, @c 100%);
				background-color: fade(#387aff, 20%);
				background-repeat: no-repeat;
				display: flex;
				justify-content: flex-end;
				align-items: center;
			}
		}
		.choice:first-child:nth-last-child(2):nth-child(2),
		.choice:first-child:nth-last-child(2) ~ .choice {
			.bar {
				@c: #f50e9b;
				transition: background-size .3s;
				background: linear-gradient(to right, @c 100%, @c 100%);
				background-color: fade(#f50e9b, 20%);
				background-repeat: no-repeat;
			}
		}
	}

	.details{
		display: flex;
		flex-direction: row;
		color:var(--color-light);
		justify-content: center;

		.percent, .votes {
			display: flex;
			flex-direction: row;
			align-items: center;
			padding: .4em .5em;
			border-radius: var(--border-radius);
			background-color: rgba(0, 0, 0, .5);
			font-size: .8em;
			flex-shrink: 0;
			font-variant-numeric: tabular-nums;

			&:not(:last-child) {
				margin-right: .25em;
			}

			.icon {
				height: 1em;
				margin-right: .25em;
			}
		}
	}

	// transition: transform .25s, top .25s, right .25s, bottom .25s, left .25s;
	&.position-tl {
		top: 2em;
		left: 2em;
	}

	&.position-t {
		top: 2em;
		left: 50%;
		transform: translateX(-50%);
	}

	&.position-tr {
		top: 2em;
		right: 2em;
	}

	&.position-l {
		top: 50%;
		left: 2em;
		transform: translateY(-50%);
	}

	&.position-m {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	&.position-r {
		top: 50%;
		right: 2em;
		transform: translateY(-50%);
	}

	&.position-bl {
		bottom: 2em;
		left: 2em;
	}

	&.position-b {
		bottom: 2em;
		left: 50%;
		transform: translateX(-50%);
	}

	&.position-br {
		bottom: 2em;
		right: 2em;
	}

	&.win {
		.list {
			.choice {
				transition: opacity .25s;
				opacity: .5;
				.bar {
					background-color: fade(#387aff, 20%);
				}
				&.win {
					opacity: 1;
					position: relative;
					overflow: visible;
					&::before {
						content: "✔";
						position: absolute;
						transform: translate(-120%, 0%);
					}
				}
			}
		}



		.battle {
			.labels {
				.outcomeTitle {
					transition: opacity .25s;
					opacity: .5;
					&.win {
						opacity: 1;
					}
				}
			}

			.chunks {
				.chunk {
					transition: opacity .25s;
					opacity: .5;
					&.win {
						opacity: 1;
					}
				}
			}
		}
	}
}
</style>
