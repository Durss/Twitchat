<template>
	<div class="predictionstate">
		<h1 class="title"><img src="@/assets/icons/prediction.svg">{{prediction.title}}</h1>
		
		<ProgressBar class="progress"
			:percent="progressPercent"
			:duration="this.prediction.prediction_window*1000"
			v-if="prediction.status == 'ACTIVE'" />
		
		<div class="outcomeTitle" v-if="prediction.status == 'LOCKED'"><span class="arrow">⤺</span> Choose outcome</div>
		
		<div class="choices">
			<div class="choice" v-for="(c, index) in prediction.outcomes" :key="index">
				<div class="color" v-if="prediction.status != 'LOCKED'"></div>
				<Button class="winBt"
					@click="setOutcome(c)"
					:icon="require('@/assets/icons/checkmark_white.svg')"
					v-if="prediction.status == 'LOCKED'"
					:loading="loading" />
				<div class="bar" :style="getAnswerStyles(c)">
					<div>{{c.title}}</div>
					<div>{{getPercent(c)}}% ({{c.channel_points}}pts)</div>
				</div>
			</div>
		</div>
		<div class="actions">
			<Button title="Delete prediction" @click="deletePrediction()" :loading="loading" v-if="prediction.status == 'ACTIVE'" />
			<Button title="Cancel prediction" @click="deletePrediction()" :loading="loading" v-if="prediction.status == 'LOCKED'" />
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
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

	public loading:boolean = false;
	public progressPercent:number = 0;
	
	private disposed:boolean = false;

	public get prediction():TwitchTypes.Prediction {
		return store.state.currentPrediction as TwitchTypes.Prediction;
	}

	public getPercent(c:TwitchTypes.PredictionOutcome):number {
		let totalVotes = 0;
		if(this.prediction) {
			for (let i = 0; i < this.prediction.outcomes.length; i++) {
				totalVotes += this.prediction.outcomes[i].channel_points;
			}
		}
		return Math.round(c.channel_points/Math.max(1,totalVotes) * 100);
	}

	public getAnswerStyles(c:TwitchTypes.PredictionOutcome):unknown {
		return {
			backgroundSize: `${this.getPercent(c)}% 100%`,
		}
	}

	public mounted():void {
		this.loadPredictions();

		const ellapsed = new Date().getTime() - new Date(this.prediction.created_at).getTime();
		const duration = this.prediction.prediction_window*1000;
		const timeLeft = duration - ellapsed
		this.progressPercent = ellapsed/duration;
		gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});
	}

	private async loadPredictions():Promise<void> {
		if(this.disposed) return;
		await TwitchUtils.getPredictions();
		await Utils.promisedTimeout(1000);
		this.loadPredictions();
	}


	public beforeUnmount():void {
		this.disposed = true;
	}

	public setOutcome(c:TwitchTypes.PredictionOutcome):void {
		this.loading = true;
		Utils.confirm("\""+c.title+"\" wins?", "Do you confirm this outcome?")
		.then(async ()=> {
			try {
				await TwitchUtils.endPrediction(this.prediction.id, c.id);
			}catch(error) {
				this.loading = false;
				store.state.alert = "An error occurred while chosing prediction's outcome";
			}
			this.loading = false;
		}).catch(()=> {
			this.loading = false;
		});
	}

	public deletePrediction():void {
		this.loading = true;
		Utils.confirm("Delete Prediction", "Are you sure you want to delete this prediction ? Users will be refund.")
		.then(async ()=> {
			try {
				await TwitchUtils.endPrediction(this.prediction.id, "", true);
			}catch(error) {
				this.loading = false;
				store.state.alert = "An error occurred while deleting the prediction";
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
				background-color: #f50e9b;
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
				background-color: #f50e9b;
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
				padding: 7px 15px;
				font-size: 16px;
				color: @mainColor_light;
				@c: fade(@mainColor_light, 15%);
				transition: background-size .2s;
				background: linear-gradient(to right, @c 100%, @c 100%);
				background-color: fade(@mainColor_light, 5%);
				background-repeat: no-repeat;
				justify-content: space-between;
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