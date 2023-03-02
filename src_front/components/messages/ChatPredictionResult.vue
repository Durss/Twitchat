<template>
	<div class="chatpredictionresult" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/prediction.svg" alt="icon" class="icon">
		<div class="content">
			<div class="title">{{messageData.title}}</div>
			<div class="outcomes">
				<div v-for="o in messageData.outcomes" :key="o.id" :class="getOutcomeClasses(o)">
					<div :style="getOutcomeStyles(o)" class="bar">
						<div class="outcomeTitle">
							<img src="@/assets/icons/checkmark_white.svg" alt="checkmark" class="check">
							{{o.label}}
						</div>
						<div class="percent">{{getOutcomePercent(o)}}%</div>
						<div class="users">
							<img src="@/assets/icons/user.svg" alt="user" class="icon">
							{{o.voters}}
						</div>
						<div class="points">
							<img src="@/assets/icons/channelPoints.svg" alt="channelPoints" class="icon">
							{{o.votes}}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatPredictionResult extends Vue {

	@Prop
	public messageData!:TwitchatDataTypes.MessagePredictionData;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public getOutcomeClasses(o:TwitchatDataTypes.MessagePredictionDataOutcome):string[] {
		const res = ["outcome"];
		if(this.messageData.winner?.id === o.id) res.push("winner");
		if(this.messageData.outcomes.length > 2) res.push("noColorMode");
		return res;
	}

	public getOutcomePercent(o:TwitchatDataTypes.MessagePredictionDataOutcome):number {
		let totalVotes = 0;
		if(this.messageData) {
			for (let i = 0; i < this.messageData.outcomes.length; i++) {
				totalVotes += this.messageData.outcomes[i].votes;
			}
		}
		return Math.round(o.votes/Math.max(1,totalVotes) * 100);
	}

	public getOutcomeStyles(o:TwitchatDataTypes.MessagePredictionDataOutcome):{[key:string]:string} {
		const percent = this.getOutcomePercent(o);
		return {
			backgroundSize: `${percent}% 100%`,
		};
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

}
</script>

<style scoped lang="less">
.chatpredictionresult{
	.chatMessageHighlight();
	text-align: center;

	.content {
		flex-grow: 1;
		.title {
			font-weight: bold;
			font-size: 1.2em;
			margin-bottom: 5px;
		}
		.outcomes {
			display: flex;
			flex-direction: column;
			gap: 2px;
			width: 100%;

			.outcome {
				&.winner {
					.check { display: inline; }
				}

				&:not(.noColorMode) {
					&:not(:first-of-type) {
						.bar {
							@c: #f50e9b;
							background: linear-gradient(to right, @c 100%, @c 100%);
							background-color: fade(@c, 20%);
							background-repeat: no-repeat;
						}
					}
				}

				.check {
					height: 1em;
					display: none;
					margin-right: .5em;
				}


				.bar {
					width: 100%;
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					gap: 2px;
					padding: 3px;
					border-radius: 5px;
					@c: #387aff;
					background: linear-gradient(to right, @c 100%, @c 100%);
					background-color: fade(@c, 20%);
					background-repeat: no-repeat;
					justify-content: space-evenly;

					&:hover {
						outline: 1px solid @mainColor_light;
					}

					.percent, .users, .points, .outcomeTitle {
						display: flex;
						flex-direction: row;
						align-items: center;
						padding: 5px;
						border-radius: 5px;
						background-color: rgba(0, 0, 0, .25);
						font-size: .8em;
						align-self: center;

						.icon {
							height: 1em;
							margin-right: 5px;
						}
					}
					.outcomeTitle {
						font-weight: bold;
						font-size: 1em;
					}
				}
			}
		}
	}
}
</style>