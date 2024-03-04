<template>
	<div :class="classes" id="holder" v-if="prediction && parameters">
		<div id="progress" class="progress" ref="progress" v-show="parameters.showTimer"></div>
		<h1 id="title" v-if="parameters.showTitle">{{ prediction?.title }}</h1>
		<div id="list" class="list" v-if="listMode">
			<div id="list_choice" class="choice" v-for="(c, index) in prediction.outcomes" ref="bar">
				<h2 id="list_choice_label" v-if="parameters.showLabels">{{c.label}}</h2>
				<div class="bar" id="list_choice_bar" :style="getAnswerStyles(c)">
					<div class="details" id="list_choice_bar_details">
						<span id="list_choice_bar_details_percent" class="percent" v-if="parameters.showPercent">{{getPercent(c).toFixed(0)}}%</span>
						<span id="list_choice_bar_details_votes" class="votes" v-if="parameters.showVoters"><Icon name="user" class="icon" />{{c.voters}}</span>
						<span id="list_choice_bar_details_points" class="points" v-if="parameters.showVotes"><Icon name="channelPoints" class="icon"/>{{c.votes}}</span>
					</div>
				</div>
			</div>
		</div>
		<div id="line" class="battle" v-else ref="holder">
			<div id="line_labelList" class="labels" v-if="parameters.showLabels">
				<h2 id="line_labelList_label" class="outcomeTitle" v-for="(c, index) in prediction.outcomes" :style="{flexBasis:getPercent(c)+'%'}">
					{{ c.label }}
				</h2>
			</div>
			<div class="chunks" id="line_bar" ref="bar">
				<div id="line_bar_item" class="chunk" v-for="(c, index) in prediction.outcomes" :style="{flexBasis:getPercent(c)+'%'}">
					<div class="details" id="line_bar_item_details">
						<span id="line_bar_item_details_percent" class="percent" v-if="parameters.showPercent">{{getPercent(c).toFixed(0)}}%</span>
						<span id="line_bar_item_details_votes" class="votes" v-if="parameters.showVoters"><Icon name="user" class="icon" />{{c.voters}}</span>
						<span id="line_bar_item_details_points" class="points" v-if="parameters.showVotes"><Icon name="channelPoints" class="icon"/>{{c.votes}}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import type { StyleValue } from 'vue';
import type { PredictionOverlayParamStoreData } from '@/store/prediction/storePrediction';
import gsap, { Linear } from 'gsap';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
class OverlayPredictions extends Vue {

	public prediction:TwitchatDataTypes.MessagePredictionData | null = null;
	public parameters:PredictionOverlayParamStoreData = {
		showTitle:true,
		listMode:true,
		listModeOnlyMore2:true,
		showLabels:false,
		showPercent:false,
		showVoters:false,
		showVotes:false,
		showTimer:true,
		placement:"bl",
	};
	
	private updatePredictionHandler!:(e:TwitchatEvent)=>void;
	private updateParametersHandler!:(e:TwitchatEvent)=>void;
	private requestPresenceHandler!:(e:TwitchatEvent)=>void;

	public get listMode():boolean {
		return this.parameters.listMode
		&& (!this.parameters.listModeOnlyMore2 || (this.parameters.listModeOnlyMore2 && this.prediction!.outcomes.length > 2))
	}

	public get classes():string[] {
		return [
			"overlaypredictions",
			"position-"+this.parameters.placement
		];
	}

	public getAnswerStyles(c:TwitchatDataTypes.MessagePredictionDataOutcome):StyleValue {
		return {
			backgroundSize: `${this.getPercent(c)}% 100%`,
		}
	}

	public getPercent(c:TwitchatDataTypes.MessagePredictionDataOutcome):number {
		let maxVotes = 0;
		let totalVotes = 0;
		if(this.prediction) {
			for (let i = 0; i < this.prediction.outcomes.length; i++) {
				totalVotes += this.prediction.outcomes[i].votes;
				maxVotes = Math.max(maxVotes, this.prediction.outcomes[i].votes);
			}
			if(totalVotes == 0) {
				if(this.listMode) return 0;
				return 100/this.prediction.outcomes.length;
			}
		}
		if(this.listMode) totalVotes = maxVotes;	
		return Math.round(c.votes/Math.max(1,totalVotes) * 100);
	}

	public async mounted():Promise<void> {
		PublicAPI.instance.broadcast(TwitchatEvent.PREDICTIONS_OVERLAY_PRESENCE);
		PublicAPI.instance.broadcast(TwitchatEvent.GET_PREDICTIONS_OVERLAY_PARAMETERS);
		
		this.updateParametersHandler = (e:TwitchatEvent)=>this.onUpdateParams(e);
		this.updatePredictionHandler = (e:TwitchatEvent)=>this.onUpdatePrediction(e);
		this.requestPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.PREDICTIONS_OVERLAY_PRESENCE); }

		PublicAPI.instance.addEventListener(TwitchatEvent.PREDICTION_PROGRESS, this.updatePredictionHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.PREDICTIONS_OVERLAY_PARAMETERS, this.updateParametersHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_PREDICTIONS_OVERLAY_PRESENCE, this.requestPresenceHandler);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.PREDICTION_PROGRESS, this.updatePredictionHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.PREDICTIONS_OVERLAY_PARAMETERS, this.updateParametersHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_PREDICTIONS_OVERLAY_PRESENCE, this.requestPresenceHandler);
	}

	public async onUpdatePrediction(e:TwitchatEvent):Promise<void> {
		const prediction = ((e.data as unknown) as {prediction:TwitchatDataTypes.MessagePredictionData}).prediction;
		if(!prediction) {
			if(this.prediction) this.close();
		}else{
			const opening = this.prediction == null || this.prediction.id != prediction.id;
			this.prediction = prediction;
			await this.$nextTick();
			if(opening) this.open();
	
			const progressBar = this.$refs.progress as HTMLElement;
			if(progressBar) {
				const timeSpent = Math.min(prediction.duration_s * 1000, Date.now() - prediction.started_at);
				const percentDone = timeSpent / (prediction.duration_s * 1000);
				const percentRemaining = 1 - percentDone;
				const duration = prediction.duration_s * percentRemaining;
				gsap.killTweensOf(progressBar);
				gsap.fromTo(progressBar, {width:(percentRemaining * 100) +"%"}, {duration, ease:Linear.easeNone, width:"0%"});
			}
		}
	}
	
	public async onUpdateParams(e:TwitchatEvent):Promise<void> {
		this.parameters = ((e.data as unknown) as {parameters:PredictionOverlayParamStoreData}).parameters;
	}
	
	public async close():Promise<void> {
		gsap.to(this.$el, {scale:0, duration:.5, ease:"back.in", onComplete:()=>{
			this.prediction = null;
		}});
	}
	
	private async open():Promise<void> {
		let labels = this.$refs.labels as HTMLElement
		let items = this.$refs.bar as HTMLElement[] || HTMLElement;
		if(!Array.isArray(items)) items = [items];
		const minWidth = parseInt(this.$el.minWidth || "300");
		const width = Math.max(minWidth, items[0].getBoundingClientRect().width);

		
		gsap.killTweensOf(this.$el);
		gsap.fromTo(this.$el, {scale:0}, {scale:1, duration:.5, ease:"back.out", clearProps:true});
		
		if(labels) {
			labels.removeAttribute("style");
			gsap.killTweensOf(labels);
			gsap.fromTo(labels, {width:0}, {ease:"back.out", duration:.5, width, clearProps:true});
		}

		if(this.listMode) {
			items.forEach(item=>{
				item.removeAttribute("style");
			});
			gsap.killTweensOf(items);
			// gsap.from(items, {y:"-50px", scaleY:0, ease:"back.out", delay:.1, duration:.5, stagger:.1, clearProps:true});
			gsap.fromTo(items, {width:0}, {ease:"back.out", delay:.25, duration:.5, width, stagger:.05,
						onComplete:(item)=>{
							items.forEach(item=>{
								item.style.width = width+"px";
								item.style.minWidth = width+"px";
							});
						}});
		}else{
			const holder = this.$refs.holder as HTMLElement;
			gsap.from(holder, {scaleX:0, ease:"back.out", delay:.1, duration:.5, clearProps:true});
		}
	}
}
export default toNative(OverlayPredictions);

</script>

<style scoped lang="less">
.overlaypredictions{
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
				min-width: 2px;
				padding: .5em;
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
		
		.percent, .votes, .points {
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
}
</style>