<template>
	<div class="chatreward">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="icon" alt="reward" class="icon">

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.reward">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
				</template>
				<template #REWARD>
					<strong>{{ messageData.reward.title }}</strong>
				</template>
				<template #COST>
					<i v-if="messageData.reward.cost > 0">({{ messageData.reward.cost }}pts)</i>
				</template>
			</i18n-t>
			<div class="quote" v-if="$store('params').appearance.showRewardsInfos.value === true && messageData.reward.description">{{ messageData.reward.description }}</div>
			<div class="quote" v-if="messageData.message_html" v-html="messageData.message_html"></div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"],
})
export default class ChatReward extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageRewardRedeemData;

	public get icon():string {
		let icon = this.$image('icons/channelPoints.svg');
		const img = this.messageData.reward.icon;
		icon = img.hd ?? img.sd;
		return icon;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user, this.messageData.channel_id);
	}
}
</script>

<style scoped lang="less">
.chatreward{
	.chatMessageHighlight();
	
	i {
		font-size: .7em;
	}
}
</style>