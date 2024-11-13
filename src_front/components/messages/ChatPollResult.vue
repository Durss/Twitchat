<template>
	<div class="chatpollresult chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon name="poll" alt="icon" class="icon"/>
		<div class="content">
			<div class="title">{{messageData.title}}</div>

			<i18n-t class="creator" scope="global" tag="div" keypath="poll.form.created_by"
			v-if="messageData.creator && messageData.creator.id != me.id">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.creator!, messageData.channel_id)">{{messageData.creator.displayName}}</a>
				</template>
			</i18n-t>

			<div class="choices">
				<div v-for="o in messageData.choices" :key="o.id" class="choice" :class="getChoiceClasses(o)">
					<div class="infos">
						<div class="choiceTitle">
							<Icon class="check" name="checkmark" />
							{{o.label}}
						</div>
						<div class="users">
							<Icon class="icon" name="user" />
							{{o.votes}}
						</div>
					</div>
					<div class="bar" :style="getChoiceStyles(o)"></div>
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
class ChatPollResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessagePollData;

	public maxVotesValue:number = 0;
	
	public get me():TwitchatDataTypes.TwitchatUser { return this.$store.auth.twitch.user; }

	public get iconColor():string{
		return this.$store.common.theme == "dark" ? "#9147ff" : "#772ce8";
	}

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
		let max = 0;
		for (let i = 0; i < this.messageData.choices.length; i++) {
			const e = this.messageData.choices[i];
			if(e.votes >= max) max = e.votes;
		}
		this.maxVotesValue = max;
	}
}
export default toNative(ChatPollResult);
</script>

<style scoped lang="less">
.chatpollresult{
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
		.choices {
			display: flex;
			flex-direction: column;
			gap: .5em;
			width: 100%;
			margin-bottom: .5em;
			.choice {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				gap: 2px;
				filter: contrast(0);
				.infos {
					column-gap: .5em;
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					.users, .choiceTitle {
						display: flex;
						flex-direction: row;
						align-items: center;
					}
					.choiceTitle {
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
					@c: var(--background-color-fade);
					background: linear-gradient(to right, @c 100%, @c 100%);
					background-color: var(--background-color-fader);
					background-repeat: no-repeat;
				}
				&.winner {
					font-weight: 400;
					filter: unset;
					// color: var(--color-secondary);
					// .icon {
					// 	color: var(--color-secondary);
					// }
					// .bar {
					// 	@c: var(--color-secondary-fade);
					// 	background-image: linear-gradient(to right, @c 100%, @c 100%);
					// 	background-color: var(--color-secondary-fader);
					// }
					.infos > .choiceTitle > .check {
						display: block;
						margin-left: -1.25em;
					}
				}
			}
		}
	}
}
</style>