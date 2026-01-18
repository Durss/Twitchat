<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<div class="holder">
			<div v-for="entry in rewardList" :key="entry.vo.id" class="item">
				<img :src="getIcon(entry.vo)" alt="reward" class="icon" :style="{backgroundColor:entry.vo.reward.color}">

				<TTButton v-if="entry.vo.message_html == undefined && getCanRefund()"
				@click.stop="refund()"
				v-tooltip="entry.count > 1? $t('chat.reward.refundOne_tt') : $t('chat.reward.refund_tt')"
				class="refundBt"
				v-newflag="{date:1707175801147, id:'chat.reward.refundBt'}"
				icon="refundPoints"></TTButton>

				<span class="card-item secondary count" v-if="entry.count > 1">x{{ entry.count }}</span>
	
				<i18n-t scope="global" tag="span" keypath="chat.reward.message">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{entry.vo.user.displayName}}</a>
					</template>
					<template #REWARD>
						<strong>{{ entry.vo.reward.title }}</strong>
					</template>
					<template #COST>
						<span class="cost" v-if="entry.vo.reward.cost > 0">({{ entry.vo.reward.cost }}pts)</span>
					</template>
				</i18n-t>
				
				<div class="quote" v-if="$store.params.appearance.showRewardsInfos.value === true && entry.vo.reward.description">{{ entry.vo.reward.description }}</div>
			</div>
			
			<div class="prompt quote" v-if="messageData.message_html">
				<TTButton v-if="getCanRefund(messageData)"
				@click.stop="refund(messageData)"
				v-tooltip="$t('chat.reward.refund_tt')"
				class="refundBt"
				v-newflag="{date:1707175801147, id:'chat.reward.refundBt'}"
				icon="refundPoints"></TTButton>
				<ChatMessageChunksParser :chunks="messageData.message_chunks" :channel="messageData.channel_id" :platform="messageData.platform" />
			</div>
			<div class="prompt quote" v-if="childrenList" v-for="child in childrenList.filter(v=>v.message_html != undefined)" :key="child.id">
				<TTButton v-if="getCanRefund(child)"
				@click.stop="refund(child)"
				v-tooltip="$t('chat.reward.refund_tt')"
				class="refundBt"
				v-newflag="{date:1707175801147, id:'chat.reward.refundBt'}"
				icon="refundPoints"></TTButton>
				<ChatMessageChunksParser :chunks="child.message_chunks" :channel="child.channel_id" :platform="child.platform" />
			</div>
			<MessageTranslation :messageData="messageData" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';
import MessageTranslation from './MessageTranslation.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import TTButton from '../TTButton.vue';
import Database from '@/store/Database';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';

@Component({
	components:{
		TTButton,
		MessageTranslation,
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
class ChatReward extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageRewardRedeemData;

	@Prop
	declare childrenList:TwitchatDataTypes.MessageRewardRedeemData[];

	private refundableIds:{[key:string]:TwitchDataTypes.Reward} = {}

	public get rewardList():{count:number, vo:TwitchatDataTypes.MessageRewardRedeemData}[] {
		const res = [this.messageData];
		if(this.childrenList) res.push(...this.childrenList);

		const idCountDictionary :{[key:string]:number} = {};

		res.forEach(r => {
			const id = r.reward.id;
			idCountDictionary[id] = (idCountDictionary[id] || 0) + 1;
		});
		
		const finalList:{count:number, vo:TwitchatDataTypes.MessageRewardRedeemData}[] = Object.keys(idCountDictionary).map((id) => {
			return { count: idCountDictionary[id]!, vo: res.find(r => r.reward.id === id)! };
		});

		finalList.sort((a,b)=>{
			// if(a.count != b.count) return b.count - a.count;
			return a.vo.date - b.vo.date;
		});
		return finalList;
	}

	public get classes():string[] {
		let res = ["chatreward", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		return res;
	}

	public getIcon(message:TwitchatDataTypes.MessageRewardRedeemData):string {
		let icon = this.$asset('icons/channelPoints.svg');
		const img = message.reward.icon;
		icon = img.hd || img.sd || icon;
		return icon;
	}

	public getCanRefund(message?:TwitchatDataTypes.MessageRewardRedeemData):boolean {
		if(!message) {
			const list = [this.messageData];
			if(this.childrenList) list.push(...this.childrenList);
			message = list.find(v=>v.refund !== true);
		}
		if(!message) return false;
		return this.refundableIds[message.reward.id] != undefined
			&& !this.refundableIds[message.reward.id]!.should_redemptions_skip_request_queue
			&& message.redeemId != undefined
			&& message.refund !== true;
	}

	public mounted():void {
		if(this.messageData.channel_id == this.$store.auth.twitch.user.id) {
			TwitchUtils.getRewards(false, true).then(res => {
				res.forEach(v=> this.refundableIds[v.id] = v)
			})
		}
	}

	public async refund(message?:TwitchatDataTypes.MessageRewardRedeemData):Promise<void> {
		if(!message) {
			const list = [this.messageData];
			if(this.childrenList) list.push(...this.childrenList);
			message = list.find(v=>v.refund !== true);
		}
		if(!message || !message.redeemId) return;
		if(await TwitchUtils.refundRedemptions([message.redeemId], message.reward.id) != true) {
			this.$store.common.alert(this.$t("error.rewards.refund_redemption"));
		}
		message.refund = true;
		Database.instance.updateMessage(message);
	}

	public copyJSON(): void {
		super.copyJSON();
		console.log(this.rewardList.length);
		console.log(this.childrenList);
	}
}
export default toNative(ChatReward);
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

	.refundBt {
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

	.prompt {
		margin-top: .25em;
	}
}
</style>