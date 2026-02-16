<template>
	<div :class="classes">
		<div class="head" v-stickyTopShadow>
			<h1 class="title"><Icon name="prediction" />{{prediction.title}}</h1>
	
			<ProgressBar class="progress"
				secondary
				:percent="progressPercent"
				:duration="prediction.duration_s*1000"
				v-if="!prediction.pendingAnswer" />

			<slot />
		</div>

		<div class="body">
			<div class="chooseOutcomeTitle" v-if="prediction.pendingAnswer && canAnswer"><span class="arrow">⤺</span> {{ $t('prediction.state.choose_outcome') }}</div>
	
			<div class="choices">
				<div class="choice" v-for="(c, index) in prediction.outcomes" :key="index">
					<div class="color" v-if="!prediction.pendingAnswer || !canAnswer"></div>
					<TTButton class="winBt"
						secondary
						@click="setOutcome(c)"
						icon="checkmark"
						v-if="prediction.pendingAnswer && canAnswer"
						:loading="loading" />
	
					<div class="bar" :style="getAnswerStyles(c)">
						<div>{{c.label}}</div>
						<div class="details">
							<span class="percent">{{getPercent(c)}}%</span>
							<span class="votes"><Icon name="user" alt="user" class="icon" />{{c.voters}}</span>
							<span class="points"><Icon name="channelPoints" alt="channelPoints" class="icon" />{{c.votes}}</span>
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
	
			<div class="actions">
				<TTButton v-if="canAnswer" @click="deletePrediction()" :loading="loading" alert>{{ $t('prediction.state.cancelBt') }}</TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import ProgressBar from '../ProgressBar.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ProgressBar,
	}
})
class PredictionState extends Vue {

	public loading = false;
	public progressPercent = 0;

	private disposed = false;

	public get me():TwitchatDataTypes.TwitchatUser { return this.$store.auth.twitch.user; }

	public get prediction():TwitchatDataTypes.MessagePredictionData {
		return this.$store.prediction.data!;
	}

	public get canAnswer():boolean {
		return this.prediction.channel_id == this.$store.auth.twitch.user.id;
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
				totalVotes += this.prediction.outcomes[i]!.votes;
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
		// const elapsed = Date.now() - this.prediction.started_at;
		// const duration = this.prediction.duration_s*1000;
		// const timeLeft = duration - elapsed
		// this.progressPercent = elapsed/duration;
		// gsap.to(this, {progressPercent:1, duration:timeLeft/1000, ease:"linear"});

		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public setOutcome(c:TwitchatDataTypes.MessagePredictionDataOutcome):void {
		this.loading = true;
		this.$confirm(this.$t('prediction.state.outcome_confirm_title'), this.$t('prediction.state.outcome_confirm_desc', {CHOICE:c.label}))
		.then(async ()=> {
			try {
				await TwitchUtils.endPrediction(this.prediction.channel_id, this.prediction.id, c.id);
			}catch(error) {
				this.loading = false;
				this.$store.common.alert(this.$t('error.prediction_outcome'));
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
				this.$store.common.alert(this.$t('error.prediction_delete'));
			}
			this.loading = false;
		}).catch(()=> {
			this.loading = false;
		});
	}

	public openUserCard():void {
		this.$store.users.openUserCard(this.prediction.creator!);
	}

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		const elapsed = Date.now() - this.prediction.started_at;
		const duration = this.prediction.duration_s * 1000;
		this.progressPercent = elapsed/duration;
	}

}
export default toNative(PredictionState);
</script>

<style scoped lang="less">
.predictionstate{

	.creator {
		font-size: .8em;
		text-align: center;
		width: calc(100% - 1em - 10px);
		font-style: italic;
	}

	.chooseOutcomeTitle {
		align-self: stretch;
		margin-left: 1em;
		color: var(--color-light);
		margin-top: -1.25em;
		margin-bottom: -.25em;
		pointer-events: none;
		.arrow {
			display: inline;
			font-size: 25px;
			display: inline-block;
			margin-right: -10px;
			margin-left: -7px;
			position: relative;
			top: -5px;
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
				width: 1em;
				height: 1em;
				display: inline-block;
				border-radius: 50%;
				align-self: center;
				margin-right: .5em;
			}
			&:first-of-type {
				.color, .winBt {
					background-color: #387aff;
				}
			}

			.winBt {
				height: 1.25em;
				width: 1.25em;
				background-color: #387aff;
				margin-right: .5em;
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
				border-radius: var(--border-radius);
				padding: .25em .5em;
				font-size: 1em;
				color: var(--color-light);
				@c: var(--color-secondary);
				transition: background-size .2s;
				background: linear-gradient(to right, @c 100%, @c 100%);
				background-color: var(--color-secondary-fadest);
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
						padding: .25em .5em;
						border-radius: var(--border-radius);
						background-color: rgba(0, 0, 0, .25);
						font-size: .8em;

						&:not(:last-child) {
							margin-right: .25em;
						}

						.icon {
							height: 1em;
							margin-right: .25em;
						}
					}
				}
			}
		}
	}

}
</style>
