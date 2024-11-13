<template>
	<div class="chatpredictionresult chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon name="prediction" alt="icon" class="icon"/>
		<div class="content">
			<div class="title">{{messageData.title}}</div>

			<i18n-t class="creator" scope="global" tag="div" keypath="poll.form.created_by"
			v-if="messageData.creator && messageData.creator.id != me.id">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.creator!, messageData.channel_id)">{{messageData.creator.displayName}}</a>
				</template>
			</i18n-t>

			<div class="outcomes">
				<div v-for="o in messageData.outcomes" :key="o.id" :class="getOutcomeClasses(o)">
					<div class="infos">
						<div class="outcomeTitle">
							<Icon class="check" name="checkmark" />
							{{o.label}}
						</div>
						<div class="percent">{{getOutcomePercent(o)}}%</div>
						<div class="users">
							<Icon class="icon" name="user" />
							{{o.voters}}
						</div>
						<div class="points">
							<Icon class="icon" name="channelPoints" />
							{{o.votes.toLocaleString()}}
						</div>
					</div>
					<div :style="getOutcomeStyles(o)" class="bar"></div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"]
})
class ChatPredictionResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessagePredictionData;

	public get me():TwitchatDataTypes.TwitchatUser { return this.$store.auth.twitch.user; }

	public get iconColor():string{
		return this.$store.common.theme == "dark" ? "#9147ff" : "#772ce8";
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

}
export default toNative(ChatPredictionResult);
</script>

<style scoped lang="less">
.chatpredictionresult{
	text-align: center;
	&>.icon {
		color: v-bind(iconColor);
	}

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
			display: flex;
			flex-direction: column;
			gap: .5em;
			width: 100%;
			margin-bottom: .5em;

			.outcome {
				filter: contrast(0);

				&:not(.noColorMode) {
					&:not(:first-of-type) {
						.bar {
							@c: #f50e9b;
							background-image: linear-gradient(to right, @c 100%, @c 100%);
							background-color: fade(@c, 20%);
						}
					}
				}

				.infos {
					column-gap: .5em;
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					.users, .outcomeTitle {
						display: flex;
						flex-direction: row;
						align-items: center;
					}
					.outcomeTitle {
						font-weight: bold;

						.check {
							display: none;
						}
					}
					.icon {
						color: var(--color-text);
						height: 1em;
						margin-right: .25em;
					}
				}

				.bar {
					width: 100%;
					height: 5px;
					border-radius: 5px;
					@c: #387aff;
					background: linear-gradient(to right, @c 100%, @c 100%);
					background-color: fade(@c, 20%);
					background-repeat: no-repeat;

					.percent, .users, .points, .outcomeTitle {
						display: flex;
						flex-direction: row;
						align-items: center;
						padding: 5px;
						border-radius: 5px;
						color: var(--color-text-light);
						background-color: rgba(0,0,0,.5);//var(--background-color-fade);
						font-size: .9em;
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
				&.winner {
					font-weight: 400;
					filter: unset;
					.infos > .outcomeTitle > .check {
						display: block;
						margin-left: -1.25em;
					}
				}
			}
		}
	}
}
</style>