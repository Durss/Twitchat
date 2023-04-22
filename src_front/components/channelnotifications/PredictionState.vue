<template>
	<div :class="classes">
		<h1 class="title"><img src="@/assets/icons/prediction.svg">{{prediction.title}}</h1>
		
		<ProgressBar class="progress"
		secondary
			:percent="progressPercent"
			:duration="prediction.duration_s*1000"
			v-if="!prediction.pendingAnswer" />
		
		<div class="outcomeTitle" v-if="prediction.pendingAnswer && canAnswer"><span class="arrow">⤺</span> {{ $t('prediction.state.choose_outcome') }}</div>
		
		<div class="choices">
			<div class="choice" v-for="(c, index) in prediction.outcomes" :key="index">
				<div class="color" v-if="!prediction.pendingAnswer || !canAnswer"></div>
				<Button class="winBt"
					secondary
					@click="setOutcome(c)"
					icon="checkmark"
					v-if="prediction.pendingAnswer && canAnswer"
					:loading="loading" />

				<div class="bar" :style="getAnswerStyles(c)">
					<div>{{c.label}}</div>
					<div class="details">
						<span class="percent">{{getPercent(c)}}%</span>
						<span class="votes"><img src="@/assets/icons/user.svg" alt="user" class="icon">{{c.voters}}</span>
						<span class="points"><img src="@/assets/icons/channelPoints.svg" alt="channelPoints" class="icon">{{c.votes}}</span>
					</div>
				</div>
			</div>
		</div>

		<i18n-t class="creator" scope="global" tag="div" keypath="poll.form.created_by"
		v-if="prediction.creator && prediction.creator.id != me.id">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard()">{{prediction.creator.displayName}}</a>
			</template>
		</i18n-t>

		<Button v-if="canAnswer" @click="deletePrediction()" :loading="loading" alert>{{ $t('prediction.state.cancelBt') }}</Button>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ProgressBar from '../ProgressBar.vue';

@Component({
	components:{
		Button,
		ProgressBar,
	}
})
export default class PredictionState extends Vue {

	public loading = false;
	public progressPercent = 0;
	
	private disposed = false;

	public get me():TwitchatDataTypes.TwitchatUser { return this.$store("auth").twitch.user; }

	public get prediction():TwitchatDataTypes.MessagePredictionData {
		return this.$store("prediction").data!;
	}

	public get canAnswer():boolean {
		return this.prediction.channel_id == this.$store("auth").twitch.user.id;
	}

	public get classes():string[] {
		let res = ["predictionstate", "gameStateWindow"];
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
		// const ellapsed = Date.now() - this.prediction.started_at;
		// const duration = this.prediction.duration_s*1000;
		// const timeLeft = duration - ellapsed
		// this.progressPercent = ellapsed/duration;
		// gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});

		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public setOutcome(c:TwitchatDataTypes.MessagePredictionDataOutcome):void {
		this.loading = true;
		this.$confirm(this.$t('prediction.state.outcome_confirm_title', {CHOICE:c.label}), this.$t('prediction.state.outcome_confirm_desc'))
		.then(async ()=> {
			try {
				await TwitchUtils.endPrediction(this.prediction.channel_id, this.prediction.id, c.id);
			}catch(error) {
				this.loading = false;
				this.$store("main").alert(this.$t('error.prediction_outcome'));
			}
			this.loading = false;
		}).catch(()=> {
			this.loading = false;
		});
	}

	public deletePrediction():void {
		this.loading = true;
		this.$confirm(this.$t('prediction.state.delete_title'), this.$t('prediction.state.delete_desc'))
		.then(async ()=> {
			try {
				await TwitchUtils.endPrediction(this.prediction.channel_id, this.prediction.id, "", true);
			}catch(error) {
				this.loading = false;
				this.$store("main").alert(this.$t('error.prediction_delete'));
			}
			this.loading = false;
		}).catch(()=> {
			this.loading = false;
		});
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.prediction.creator!);
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		const ellapsed = Date.now() - this.prediction.started_at;
		const duration = this.prediction.duration_s * 1000;
		this.progressPercent = ellapsed/duration;
	}

}
</script>

<style scoped lang="less">
.predictionstate{

	.creator {
		font-size: .8em;
		text-align: center;
		margin-top: 1em;
		width: calc(100% - 1em - 10px);
		font-style: italic;
	}
	.outcomeTitle {
		align-self: stretch;
		margin-left: 1em;
		color: var(--mainColor_light);
		margin-top: -1.5em;
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
		align-self: stretch;
		.choice {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: stretch;
			&:not(:last-child) {
				margin-bottom: 5px;
			}

			.color {
				.emboss();
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
				.emboss();
				flex-grow: 1;
				display: flex;
				flex-direction: row;
				border-radius: 10px;
				padding: 4px 15px;
				font-size: 16px;
				color: var(--color-light);
				@c: var(--color-secondary);
				transition: background-size .2s;
				background: linear-gradient(to right, @c 100%, @c 100%);
				background-color: var(--color-secondary-fader);
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

}
</style>