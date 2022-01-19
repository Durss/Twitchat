<template>
	<div class="predictionstate">
		<h1 class="title"><img src="@/assets/icons/prediction.svg">{{prediction.title}}</h1>
		<div class="choices">
			<div class="choice" v-for="c in prediction.outcomes" :key="c" :style="getAnswerStyles(c)">
				<div>{{c.title}}</div>
				<div>{{getPercent(c)}}% ({{c.channel_points}}pts)</div>
			</div>
		</div>
		<div class="actions">
			<Button title="Delete prediction" @click="deletePrediction()" :loading="loading" />
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class PredictionState extends Vue {

	public loading:boolean = false;

	private interval!:number;

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
			backgroundSize: `${this.getPercent(c)*2}% 100%`
		}
	}

	public mounted():void {
		this.interval = setInterval(()=> {
			TwitchUtils.getPredictions();
		}, 5000)
	}

	public beforeUnmount():void {
		clearInterval(this.interval);
	}

	public deletePrediction():void {
		this.loading = true;
		Utils.confirm("Delete Prediction", "Are you sure you want to delete this prediction ?")
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
		border-bottom: 1px solid @mainColor_light;
		padding-bottom: 10px;
		margin-bottom: 10px;
		word-break: break-word;
		img {
			width: 20px;
			margin-right: 10px;
		}
	}

	.choices {
		.choice {
			display: flex;
			flex-direction: row;
			border-radius: 10px;
			padding: 7px 15px;
			font-size: 16px;
			color: @mainColor_light;
			@c: fade(@mainColor_light, 15%);
			background: linear-gradient(to right, @c 100%, @c 100%);
			background-color: fade(@mainColor_light, 5%);
			background-repeat: no-repeat;
			justify-content: space-between;
			&:not(:last-child) {
				margin-bottom: 5px;
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