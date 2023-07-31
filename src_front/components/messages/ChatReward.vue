<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<div class="holder">
			<div v-for="entry in rewardList" :key="entry.vo.id" class="item">
				<img :src="getIcon(entry.vo)" alt="reward" class="icon" :style="{backgroundColor:entry.vo.reward.color}">

				<span class="card-item secondary count" v-if="entry.count > 1">x{{ entry.count }}</span>
	
				<i18n-t scope="global" tag="span" keypath="chat.reward">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard()">{{entry.vo.user.displayName}}</a>
					</template>
					<template #REWARD>
						<strong>{{ entry.vo.reward.title }}</strong>
					</template>
					<template #COST>
						<span class="cost" v-if="entry.vo.reward.cost > 0">({{ entry.vo.reward.cost }}pts)</span>
					</template>
				</i18n-t>
				<div class="quote" v-if="$store('params').appearance.showRewardsInfos.value === true && entry.vo.reward.description">{{ entry.vo.reward.description }}</div>
				<div class="quote" v-if="entry.vo.message_html">
					<ChatMessageChunksParser :chunks="entry.vo.message_chunks" :channel="messageData.channel_id" :platform="messageData.platform" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';

@Component({
	components:{
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
export default class ChatReward extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageRewardRedeemData;

	public get rewardList():{count:number, vo:TwitchatDataTypes.MessageRewardRedeemData}[] {
		const res = [this.messageData];
		if(this.messageData.children) res.push(...this.messageData.children);

		const idCountDictionary :{[key:string]:number} = {};

		res.forEach(r => {
			const id = r.reward.id;
			idCountDictionary[id] = (idCountDictionary[id] || 0) + 1;
		});
		
		const finalList:{count:number, vo:TwitchatDataTypes.MessageRewardRedeemData}[] = Object.keys(idCountDictionary).map((id) => {
			return { count: idCountDictionary[id], vo: res.find(r => r.reward.id === id)! };
		});

		finalList.sort((a,b)=>{
			if(a.count != b.count) return b.count - a.count;
			if(a.vo.reward.title < b.vo.reward.title) return -1;
			if(a.vo.reward.title > b.vo.reward.title) return 1;
			return 0;
		});
		return finalList;
	}

	public get classes():string[] {
		let res = ["chatreward", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		return res;
	}

	public getIcon(reward:TwitchatDataTypes.MessageRewardRedeemData):string {
		let icon = this.$image('icons/channelPoints.svg');
		const img = reward.reward.icon;
		icon = img.hd || img.sd || icon;
		return icon;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user, this.messageData.channel_id);
	}
}
</script>

<style scoped lang="less">
.chatreward{
	.cost {
		font-size: .7em;
		font-style: italic;
	}

	.icon {
		border-radius: var(--border-radius);
		padding: .25em;
		height: 2em;
		width: 2em;
		flex-shrink: 0;
		vertical-align: middle;
		margin-right: 5px;
	}

	.count {
		padding: 3px;
		margin-right: 5px;
	}

	.item:not(:last-child) {
		margin-bottom: 1px;
	}
}
</style>