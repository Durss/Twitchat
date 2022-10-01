<template>
	<div :class="classes">
		<h1 class="title"><img src="@/assets/icons/prediction.svg">{{prediction.title}}</h1>
		
		<ProgressBar class="progress"
			:percent="progressPercent"
			:duration="prediction.duration_s*1000"
			v-if="!prediction.pendingAnswer" />
		
		<div class="outcomeTitle" v-if="prediction.pendingAnswer"><span class="arrow">⤺</span> Choose outcome</div>
		
		<div class="choices">
			<div class="choice" v-for="(c, index) in prediction.outcomes" :key="index">
				<div class="color" v-if="prediction.pendingAnswer"></div>
				<Button class="winBt"
					@click="setOutcome(c)"
					:icon="$image('icons/checkmark_white.svg')"
					v-if="prediction.pendingAnswer"
					:loading="loading" />
				<div class="bar" :style="getAnswerStyles(c)">
					<div>{{c.label}}</div>
					<div class="details">
						<span class="percent">{{getPercent(c)}}%</span>
						<span class="votes"><img src="@/assets/icons/user.svg" alt="user" class="icon">{{c.voters.length}}</span>
						<span class="points"><img src="@/assets/icons/channelPoints.svg" alt="channelPoints" class="icon">{{c.votes}}</span>
					</div>
				</div>
			</div>
		</div>
		<div class="actions">
			<Button title="Delete prediction" @click="deletePrediction()" :loading="loading" v-if="prediction.pendingAnswer" />
			<Button title="Cancel prediction" @click="deletePrediction()" :loading="loading" v-if="prediction.pendingAnswer" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ProgressBar from '../ProgressBar.vue';

@Options({
	props:{},
	components:{
		Button,
		ProgressBar,
	}
})
export default class PredictionState extends Vue {

	public loading = false;
	public progressPercent = 0;
	
	private disposed = false;

	public get prediction():TwitchatDataTypes.MessagePredictionData {
		return this.$store("prediction").data!;
	}

	public get classes():string[] {
		let res = ["predictionstate"];
		if(this.prediction.outcomes.length > 2) res.push("noColorMode");
		return res;
	}

	public getPercent(c:TwitchatDataTypes.MessagePredictionDataOutcome):number {
		let totalVotes = 0;
		if(this.prediction) {
			for (let i = 0; i < this.prediction.outcomes.length; i++) {
				totalVotes += this.prediction.outcomes[i].votes;
			}
		}
		return Math.round(c.votes/Math.max(1,totalVotes) * 100);
	}

	public getAnswerStyles(c:TwitchatDataTypes.MessagePredictionDataOutcome):{[key:string]:string} {
		return {
			backgroundSize: `${this.getPercent(c)}% 100%`,
		}
	}

	public mounted():void {
		this.loadPredictions();

		const ellapsed = new Date().getTime() - this.prediction.started_at;
		const duration = this.prediction.duration_s*1000;
		const timeLeft = duration - ellapsed
		this.progressPercent = ellapsed/duration;
		gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});
	}

	private async loadPredictions():Promise<void> {
		if(this.disposed) return;
		//TODO if allowing to connect to somone else's chat this would close
		//the prediction right after opening it as no prediction would
		//exist on our own channel
		await TwitchUtils.getPredictions();
	}


	public beforeUnmount():void {
		this.disposed = true;
	}

	public setOutcome(c:TwitchatDataTypes.MessagePredictionDataOutcome):void {
		this.loading = true;
		this.$confirm("\""+c.label+"\" wins?", "Do you confirm this outcome?")
		.then(async ()=> {
			try {
				await TwitchUtils.endPrediction(this.prediction.id, c.id);
			}catch(error) {
				this.loading = false;
				this.$store("main").alert = "An error occurred while chosing prediction's outcome";
			}
			this.loading = false;
		}).catch(()=> {
			this.loading = false;
		});
	}

	public deletePrediction():void {
		this.loading = true;
		this.$confirm("Delete Prediction", "Are you sure you want to delete this prediction ? Users will be refund.")
		.then(async ()=> {
			try {
				await TwitchUtils.endPrediction(this.prediction.id, "", true);
			}catch(error) {
				this.loading = false;
				this.$store("main").alert = "An error occurred while deleting the prediction";
			}
			this.loading = false;
		}).catch(()=> {
			this.loading = false;
		});
	}

}
</script>

<style scoped lang="less">
.predictionstate{

	.title {
		color: @mainColor_light;
		width: 100%;
		text-align: center;
		padding-bottom: 10px;
		word-break: break-word;
		img {
			width: 20px;
			margin-right: 10px;
		}
	}

	.progress {
		margin-bottom: 20px;
	}

	.outcomeTitle {
		color: @mainColor_light;
		margin-bottom: 20px;
		margin-left: 15px;
		.arrow {
			display: inline;
			font-size: 25px;
			display: inline-block;
			margin-right: -10px;
			position: relative;
			animation: slide .5s infinite ease-in-out alternate-reverse;
			transform: rotate(-40deg);
			transform-origin: bottom right;
		}
		@keyframes slide {
			from {transform: rotate(-40deg);}
			to {transform: rotate(-60deg);}
		}
	}

	&:not(.noColorMode) {
		.choices {
			.choice {
				&:not(:first-of-type) {
					.color, .winBt {
					background-color: #f50e9b;
					}
				}
			}
		}
	}

	.choices {
		.choice {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: stretch;
			&:not(:last-child) {
				margin-bottom: 5px;
			}

			.color {
				background-color: #387aff;
				width: 20px;
				height: 20px;
				display: inline-block;
				border-radius: 50%;
				align-self: center;
				margin-right: 5px;
			}
			&:first-of-type {
				.color, .winBt {
					background-color: #387aff;
				}
			}

			.winBt {
				height: 30px;
				width: 30px;
				background-color: #387aff;
				margin-right: 5px;
				padding: 0px;
				:deep(.icon) {
					width: 18px;
					height: 18px;
				}
			}
			
			.bar {
				flex-grow: 1;
				display: flex;
				flex-direction: row;
				border-radius: 10px;
				padding: 4px 15px;
				font-size: 16px;
				color: @mainColor_light;
				@c: fade(@mainColor_light, 15%);
				transition: background-size .2s;
				background: linear-gradient(to right, @c 100%, @c 100%);
				background-color: fade(@mainColor_light, 5%);
				background-repeat: no-repeat;
				justify-content: space-between;
				align-items: center;

				.details{
					display: flex;
					flex-direction: row;

					.percent, .votes, .points {
						display: flex;
						flex-direction: row;
						align-items: center;
						padding: 5px;
						border-radius: 5px;
						background-color: rgba(0, 0, 0, .25);
						font-size: .8em;

						&:not(:last-child) {
							margin-right: 5px;
						}

						.icon {
							height: 1em;
							margin-right: 5px;
						}
					}
				}
			}
		}
	}

	.actions {
		display: flex;
		flex-direction: row;
		justify-content: center;
		margin-top: 10px;
	}
	
}
</style>