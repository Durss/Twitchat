<template>
	<div class="chatpredictionresult">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/prediction.svg" alt="icon" class="icon">
		<div class="content">
			<div class="title">{{messageData.title}}</div>

			<i18n-t class="creator" scope="global" tag="div" keypath="poll.form.created_by"
			v-if="messageData.creator && messageData.creator.id != me.id">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.creator.displayName}}</a>
				</template>
			</i18n-t>

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
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatPredictionResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessagePredictionData;

	public get me():TwitchatDataTypes.TwitchatUser { return this.$store("auth").twitch.user; }

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

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.creator!);
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
		}
		.creator {
			font-size: .8em;
			font-style: italic;
		}
		.outcomes {
			margin-top: 5px;
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