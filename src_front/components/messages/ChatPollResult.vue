<template>
	<div class="chatpollresult">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/poll.svg" alt="icon" class="icon">
		<div class="content">
			<div class="title">{{messageData.title}}</div>

			<i18n-t class="creator" scope="global" tag="div" keypath="poll.form.created_by"
			v-if="messageData.creator && messageData.creator.id != me.id">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.creator.displayName}}</a>
				</template>
			</i18n-t>

			<div class="choices">
				<div v-for="o in messageData.choices" :key="o.id" class="choice" :class="getChoiceClasses(o)">
					<div class="bar" :style="getChoiceStyles(o)">
						<div class="choiceTitle">
							<img src="@/assets/icons/checkmark_white.svg" alt="checkmark" class="check">
							{{o.label}}
						</div>
						<div class="users">
							<img src="@/assets/icons/user.svg" alt="user" class="icon">
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
export default class ChatPollResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessagePollData;

	private maxVotesValue:number = 0;
	
	public get me():TwitchatDataTypes.TwitchatUser { return this.$store("auth").twitch.user; }

	public getChoiceClasses(o:TwitchatDataTypes.MessagePollDataChoice):string[] {
		const res = ["outcome"];
		if(o.votes == this.maxVotesValue) res.push("winner");
		return res;
	}

	public getChoiceStyles(o:TwitchatDataTypes.MessagePollDataChoice):{[key:string]:string} {
		let totalVotes = 0;
		if(this.messageData.choices) {
			for (let i = 0; i < this.messageData.choices.length; i++) {
				totalVotes += this.messageData.choices[i].votes;
			}
		}
		const percent = o.votes/Math.max(1,totalVotes);
		return {
			backgroundSize: `${percent * 100}% 100%`,
		};
	}

	public beforeMount(): void {
		const winningVoteCount = 0;
		let max = 0;
		for (let i = 0; i < this.messageData.choices.length; i++) {
			const e = this.messageData.choices[i];
			if(e.votes >= max) max = e.votes;
		}
		this.maxVotesValue = max;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.creator!);
	}

}
</script>

<style scoped lang="less">
.chatpollresult{
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
		.choices {
			margin-top: 5px;
			display: flex;
			flex-direction: column;
			gap: 2px;
			width: 100%;
			.choice {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				gap: 2px;
				&.winner {

					.bar > .choiceTitle > .check {
						display: block;
					}

				}
				.bar {
					width: 100%;
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					padding: 3px;
					border-radius: 5px;
					@c: fade(@mainColor_light, 25%);
					background: linear-gradient(to right, @c 100%, @c 100%);
					background-color: fade(@c, 20%);
					background-repeat: no-repeat;
					justify-content: space-evenly;

					&:hover {
						outline: 1px solid var(--mainColor_light);
					}

					.users, .choiceTitle {
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
					.choiceTitle {
						font-weight: bold;
						font-size: 1em;

						.check {
							height: 1em;
							margin-right: .5em;
							display: none;
						}
					}
				}
			}
		}
	}
}
</style>