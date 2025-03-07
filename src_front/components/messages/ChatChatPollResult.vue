<template>
	<div class="chatpollresult chatMessage highlight pollResult">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon name="chatPoll" alt="icon" class="icon"/>
		<div class="content">
			<div class="title">{{messageData.poll.title}}</div>

			<div class="choices">
				<div v-for="o in messageData.poll.choices" :key="o.id" class="choice" :class="getChoiceClasses(o)">
					<div class="infos">
						<Icon class="check" name="checkmark" />
						<span class="label">{{o.label}}</span>
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
/**
 * Yeah stupid naming... but "ChatPollResult" is used for twitch polls because
 * all chat message items start with "Chat".
 */
class ChatChatPollResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageChatPollData;

	public maxVotesValue:number = 0;

	public get iconColor():string{
			return this.$store.common.theme == "dark" ? "#9147ff" : "#772ce8";
	}

	public getChoiceClasses(o:TwitchatDataTypes.MessageChatPollData["poll"]["choices"][number]):string[] {
		const res = ["outcome"];
		if(o.votes == this.maxVotesValue) res.push("winner");
		return res;
	}

	public getChoiceStyles(o:TwitchatDataTypes.MessageChatPollData["poll"]["choices"][number]):{[key:string]:string} {
		let totalVotes = 0;
		if(this.messageData.poll.choices) {
			for (let i = 0; i < this.messageData.poll.choices.length; i++) {
				totalVotes += this.messageData.poll.choices[i].votes;
			}
		}
		const percent = o.votes/Math.max(1,totalVotes);
		return {
			backgroundSize: `${percent * 100}% 100%`,
		};
	}

	public beforeMount(): void {
		let max = 0;
		for (let i = 0; i < this.messageData.poll.choices.length; i++) {
			const e = this.messageData.poll.choices[i];
			if(e.votes >= max) max = e.votes;
		}
		this.maxVotesValue = max;
	}
}
export default toNative(ChatChatPollResult);
</script>

<style scoped lang="less">
.chatpollresult{
	&>.icon {
		color: v-bind(iconColor);
	}
}
</style>
