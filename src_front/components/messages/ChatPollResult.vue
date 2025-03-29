<template>
	<div class="chatpollresult chatMessage highlight pollResult">
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
	&>.icon {
		color: v-bind(iconColor);
	}
}
</style>
