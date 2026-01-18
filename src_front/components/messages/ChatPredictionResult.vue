<template>
	<div class="chatpredictionresult chatMessage highlight pollResult">
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

			<div class="choices">
				<div v-for="o in messageData.outcomes" :key="o.id" class="choice" :class="getOutcomeClasses(o)">
					<div class="infos">
						<Icon class="check" name="checkmark" />
						<span class="label">{{o.label}}</span>
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
		const res = [];
		if(this.messageData.winner?.id === o.id) res.push("winner");
		return res;
	}

	public getOutcomePercent(o:TwitchatDataTypes.MessagePredictionDataOutcome):number {
		let totalVotes = 0;
		if(this.messageData) {
			for (const e of this.messageData.outcomes) {
				totalVotes += e.votes;
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
	&>.icon {
		color: v-bind(iconColor);
	}
}
</style>
