<template>
	<div class="pollrenderer" v-show="showContent"
	:class="{['position-'+placement]:true, win:showWinner}" id="holder">
		<div id="progress" class="progress" ref="progress" v-show="showTimer"></div>
		<h1 id="title" v-if="title">{{ title }}</h1>
		<div id="list" class="list" v-if="mode == 'list'">
			<div id="list_choice" class="choice" :class="getWinClasses(c)" v-for="(c, index) in entries" ref="bar">
				<div class="index" v-if="showIndex !== false"><span>{{ index+1 }}</span></div>
				<div class="subContent">
					<h2 id="list_choice_label" v-if="showLabels">{{c.label}}</h2>
					<div class="bar" id="list_choice_bar" :style="getAnswerStyles(c)">
						<div class="details" id="list_choice_bar_details">
							<span id="list_choice_bar_details_percent" class="percent" v-if="showPercent">{{getPercent(c).toFixed(0)}}%</span>
							<span id="list_choice_bar_details_votes" class="votes" v-if="showVoters"><Icon name="user" class="icon" />{{c.voters ?? c.votes}}</span>
							<span id="list_choice_bar_details_points" class="points" v-if="showVotes"><Icon name="channelPoints" class="icon"/>{{c.votes}}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div id="line" class="battle" v-else ref="holder">
			<div id="line_labelList" class="labels" v-if="showLabels">
				<h2 id="line_labelList_label" class="outcomeTitle"
				:class="getWinClasses(c)"
				v-for="(c, index) in entries" :style="{flexBasis:getPercent(c)+'%'}">
					<div class="index" v-if="showIndex !== false"><span>{{ index+1 }}</span></div>
					<div class="label">{{ c.label }}</div>
				</h2>
			</div>
			<div class="chunks" id="line_bar" ref="bar">
				<div id="line_bar_item" class="chunk"
				:class="getWinClasses(c)"
				v-for="(c, index) in entries" :style="{flexBasis:getPercent(c)+'%'}">
					<div class="details" id="line_bar_item_details">
						<span id="line_bar_item_details_percent" class="percent" v-if="showPercent">{{getPercent(c).toFixed(0)}}%</span>
						<span id="line_bar_item_details_votes" class="votes" v-if="showVoters"><Icon name="user" class="icon" />{{c.voters ?? c.votes}}</span>
						<span id="line_bar_item_details_points" class="points" v-if="showVotes"><Icon name="channelPoints" class="icon"/>{{c.votes}}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import type { CSSProperties } from 'vue';
import { watch } from 'vue';
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
	},
	emits:["close"],
})
class PollRenderer extends Vue {

	@Prop({type:Boolean, required:true})
	public open!: boolean;

	@Prop({type:Boolean, required:true})
	public showTimer!: boolean;

	@Prop({type:Boolean, required:true})
	public showLabels!: boolean;

	@Prop({type:Boolean, required:true})
	public showPercent!: boolean;

	@Prop({type:Boolean, required:true})
	public showVotes!: boolean;

	@Prop({type:Boolean, required:true})
	public showVoters!: boolean;

	@Prop({type:Boolean, required:true})
	public showWinner!: boolean;

	@Prop({type:Boolean, default:false})
	public showIndex!: boolean;

	@Prop({type:Number, required:true})
	public resultDuration_s!: number;

	@Prop({type:String, required:true})
	public title!: string;

	@Prop({type:String, required:true})
	public placement!: TwitchatDataTypes.ScreenPosition;

	@Prop({type:String, required:true})
	public mode!: "list" | "line";

	@Prop({type:Array, required:true})
	public entries!: TwitchatDataTypes.MessagePredictionDataOutcome[];

	@Prop({type:Number, required:true})
	public duration!: number;

	@Prop({type:Number, required:true})
	public startedAt!: number;

	// Do not show poll on build so it doesn't show up when starting a poll
	// while requesting to only show the result
	public showContent:boolean = false;

	public mounted():void {
		if(this.open) this.doOpen();
		watch(()=>this.open, (v)=>{
			if(v) this.doOpen();
			else this.doClose();
		});

		watch(()=>this.showWinner, async (v)=>{
			if(v) this.doResult();
		});
	}

	public getWinClasses(c:TwitchatDataTypes.MessagePollDataChoice):string[] {
		let res:string[] = [];
		if(this.showWinner) {
			let max = 0;
			this.entries.forEach(v=> max = Math.max(max, v.votes));
			if(c.votes >= max) res.push("win");
		}
		return res;
	}

	public getAnswerStyles(c:TwitchatDataTypes.MessagePollDataChoice):CSSProperties {
		return {
			backgroundSize: `${this.getPercent(c, true)}% 100%`,
		}
	}

	public getPercent(c:TwitchatDataTypes.MessagePollDataChoice, barSizeTarget:boolean = false):number {
		let maxVotes = 0;
		let totalVotes = 0;
		for (let i = 0; i < this.entries.length; i++) {
			totalVotes += this.entries[i]!.votes;
			maxVotes = Math.max(maxVotes, this.entries[i]!.votes);
		}
		if(totalVotes == 0) {
			if(this.mode == "list") return 0;
			return 100/this.entries.length;
		}
		if(this.mode == "list" && barSizeTarget) totalVotes = maxVotes;
		return Math.round(c.votes/Math.max(1,totalVotes) * 100);
	}

	public async doOpen():Promise<void> {
		this.showContent = true;
		await this.$nextTick();

		return new Promise((resolve) => {
			let labels = this.$refs.labels as HTMLElement
			let items = this.$refs.bar as HTMLElement[] || HTMLElement;
			if(!Array.isArray(items)) items = [items];
			const minWidth = parseInt(this.$el.minWidth || "300");
			const width = Math.max(minWidth, items[0]!.getBoundingClientRect().width);

			gsap.killTweensOf(this.$el);
			gsap.fromTo(this.$el, {scale:0}, {scale:1, duration:.5, ease:"back.out", clearProps:true});

			const progressBar = this.$refs.progress as HTMLElement;
			// Don't animate the progress bar if we're only showing the result
			// this is done by doResult()
			if(progressBar && !this.showWinner) {
				const timeSpent = Math.min(this.duration, Date.now() - this.startedAt);
				const percentDone = timeSpent / this.duration;
				const percentRemaining = 1 - percentDone;
				const duration = this.duration * percentRemaining;
				gsap.killTweensOf(progressBar);
				gsap.fromTo(progressBar, {width:(percentRemaining * 100) +"%"}, {duration:duration/1000, ease:"none", width:"0%"});
			}

			if(labels) {
				labels.removeAttribute("style");
				gsap.killTweensOf(labels);
				gsap.fromTo(labels, {width:0}, {ease:"back.out", duration:.5, width, clearProps:true});
			}

			if(this.mode == "list") {
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
								resolve();
							}});
			}else{
				const holder = this.$refs.holder as HTMLElement;
				gsap.from(holder, {scaleX:0, ease:"back.out", delay:.1, duration:.5, clearProps:true, onComplete:resolve});
			}
		})
	}

	public async doResult():Promise<void> {
		return new Promise((resolve)=>{
			const duration = this.resultDuration_s || 5;
			const progressBar = this.$refs.progress as HTMLElement;
			if(duration > 0) {
				gsap.killTweensOf(progressBar);
				if (progressBar) {
					progressBar.removeAttribute("style");
					gsap.fromTo(progressBar, {width:"100%"}, {duration, ease:"none", width:"0%", onComplete:resolve});
				}
			}else {
				resolve();
			}
		});
	}

	public async doClose():Promise<void> {
		return new Promise((resolve)=>{
			gsap.to(this.$el, {scale:0, duration:.5, ease:"back.in", onComplete:resolve});
		})
	}

}
export default toNative(PollRenderer);
</script>

<style scoped lang="less">
.pollrenderer{
	--color1: #387aff;
	--color1-fade: #387aff33;
	--color2: #f50e9b;
	--color2-fade: #f50e9b33;
	--colorProgress: var(--color1);

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
		background-color: var(--colorProgress);
		position: absolute;
		top: 0;
		left: 0;
	}

	h1 {
		text-align: center;
		margin-bottom: .25em;
		display: inline-block;
		overflow: hidden;
		word-break: break-word;
		max-width: 300px;
	}

	.battle {
		width: 100%;
		max-width: min(80vw, 800px);
		overflow: hidden;
		.labels {
			display: flex;
			flex-direction: row;
			margin-bottom: .25em;
			text-align: center;
			.outcomeTitle {
				gap: .5em;
				display: flex;
				align-items: center;
				transition: flex-basis .3s;
				min-width: 2px;
				.label {
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
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
					background-color: var(--color1);
				}
				&:nth-child(even) {
					background-color: var(--color2);
				}
			}
		}
	}

	.index {
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		flex-shrink: 0;
		width: 1.5em;
		height: 1.5em;
		border-radius: 50%;
		background-color: var(--color1);
		color: var(--color-light);
		span {
			filter: drop-shadow(-2px 0 0 var(--color1))
					drop-shadow(2px 0 0 var(--color1))
					drop-shadow(0 -2px 0 var(--color1))
					drop-shadow(0 2px 0 var(--color1));
		}
	}

	.list {
		align-self: stretch;
		.choice {
			width: 100%;
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			transform-origin: top center;
			margin: auto;

			.subContent {
				width: 100%;
				display: flex;
				flex-direction: column;
				align-items: stretch;
				transform-origin: top center;
				margin: auto;
				&:not(:last-child) {
					margin-bottom: .75em;
				}
				h2 {
					margin-bottom: .25em;
					word-break: break-word;
				}
				.bar {
					min-height: 1em;
					flex-grow: 1;
					border-radius: var(--border-radius);
					padding: .25em .5em;
					font-size: 1em;
					color: var(--color-light);
					transition: background-size .3s;
					background: linear-gradient(to right, var(--color1) 100%, var(--color1) 100%);
					background-color: var(--color1-fade);
					background-repeat: no-repeat;
					display: flex;
					justify-content: flex-end;
					align-items: center;
				}
			}
		}
		.choice:first-child:nth-last-child(2):nth-child(2),
		.choice:first-child:nth-last-child(2) ~ .choice {
			.bar {
				transition: background-size .3s;
				background: linear-gradient(to right, var(--color2) 100%, var(--color2) 100%);
				background-color: var(--color2-fade);
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

	&.win {
		.list {
			.choice {
				transition: opacity .25s;
				opacity: .5;
				.bar {
					background-color: var(--color1-fade);
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
