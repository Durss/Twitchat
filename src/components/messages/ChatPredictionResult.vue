<template>
	<div class="chatpredictionresult" @click.ctrl="copyJSON()">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/prediction.svg" alt="icon" class="icon">
		<div class="content">
			<div class="title">{{prediction.title}}</div>
			<div class="outcomes">
				<div v-for="o in prediction.outcomes" :key="o.id" :class="getOutcomeClasses(o)">
					<div class="outcomeTitle">
						<img src="@/assets/icons/checkmark_white.svg" alt="checkmark" class="check">
						{{o.title}}
					</div>
					<div :style="getOutcomeStyles(o)" class="bar">
						<div class="percent">{{getOutcomePercent(o)}}%</div>
						<div class="users">
							<img src="@/assets/icons/user.svg" alt="user" class="icon">
							{{o.users}}
						</div>
						<div class="points">
							<img src="@/assets/icons/channelPoints.svg" alt="channelPoints" class="icon">
							{{o.channel_points}}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { IRCEventDataList } from '@/utils/IRCEvent';
import { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		predictionData:Object
	},
	components:{}
})
export default class ChatPredictionResult extends Vue {
	public predictionData!:IRCEventDataList.PredictionResult;

	public get prediction():TwitchTypes.Prediction {
		return this.predictionData.data;
	}

	public get time():string {
		const d = new Date(parseInt(this.predictionData.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public getOutcomeClasses(o:TwitchTypes.PredictionOutcome):string[] {
		const res = ["outcome"];
		if(this.prediction.winning_outcome_id === o.id) res.push("winner");
		return res;
	}

	public getOutcomePercent(o:TwitchTypes.PredictionOutcome):number {
		let totalVotes = 0;
		if(this.prediction) {
			for (let i = 0; i < this.prediction.outcomes.length; i++) {
				totalVotes += this.prediction.outcomes[i].channel_points;
			}
		}
		return Math.round(o.channel_points/Math.max(1,totalVotes) * 100);
	}

	public getOutcomeStyles(o:TwitchTypes.PredictionOutcome):{[key:string]:string} {
		const percent = this.getOutcomePercent(o);
		return {
			backgroundSize: `${percent}% 100%`,
		};
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.predictionData));
		console.log(this.predictionData);
	}

}
</script>

<style scoped lang="less">
.chatpredictionresult{
	background-color: rgba(255, 255, 255, .15);
	border-radius: 5px;
	margin: 5px 0;
	padding: 5px !important;
	text-align: center;

	display: flex;
	flex-direction: row;
	align-items: center;
	color: #fff;

	&>.icon {
		width: 1.5em;
		height: 1.5em;
		object-fit: contain;
		margin-right: 20px;
	}

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
			.outcome {
				display: flex;
				flex-direction: row;
				align-items: center;
				margin-bottom: 1px;

				&:first-of-type {
					.bar {
						@c: #387aff;
						background: linear-gradient(to right, @c 100%, @c 100%);
						background-color: fade(@c, 20%);
						background-repeat: no-repeat;
					}
				}

				&.winner {
					.check { display: inline; }
				}

				.check {
					height: 1em;
					display: none;
				}
				
				.outcomeTitle {
					width: 50%;
					padding-right: 10px;
					text-align: right;
					text-overflow: ellipsis;
					overflow: hidden;
					white-space: nowrap;
				}

				.bar {
					flex-grow: 1;
					display: flex;
					flex-direction: row;
					padding: 3px;
					border-radius: 5px;
					@c: #f50e9b;
					background: linear-gradient(to right, @c 100%, @c 100%);
					background-color: fade(@c, 20%);
					background-repeat: no-repeat;
					justify-content: space-evenly;

					.percent, .users, .points {
						display: flex;
						flex-direction: row;
						align-items: center;
						padding: 5px;
						border-radius: 5px;
						background-color: rgba(0, 0, 0, .25);
						font-size: .8em;

						.icon {
							height: 1em;
							margin-right: 5px;
						}
					}
				}
			}
		}
	}
}
</style>