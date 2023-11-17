<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<Icon v-if="messageData.is_gift" name="gift" alt="gift" class="icon"/>
		<Icon v-else-if="messageData.tier == 'prime'" name="prime" alt="prime" class="icon"/>
		<Icon v-else name="sub" alt="sub" class="icon"/>

		<div>
			<!-- Subgift -->
			<div class="holder" v-if="messageData.is_gift">
				<i18n-t scope="global" tag="span"
				:keypath="giftRecipients.length > 1? 'chat.subscription.sub_gift' : 'chat.subscription.sub_gift_months'">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
					</template>
					<template #TIER>
						<strong>{{ messageData.tier }}</strong>
					</template>
					<template #COUNT>
						<strong>{{ messageData.gift_recipients?.length }}</strong>
					</template>
					<template #MONTHS>
						<strong>{{ messageData.months > 0? messageData.months : 1 }}</strong>
					</template>
					<template #LIST>
						<span class="additionalUsers" v-if="giftRecipients.length > 0"
							v-for="u, index in giftRecipients" :key="u.id">
							<a class="userlink" @click.stop="openUserCard(u)">{{u.displayName}}</a>
							<span v-if="(index == giftRecipients.length-2)">&nbsp;{{$t("global.and")}}&nbsp;</span>
							<span v-else-if="index < giftRecipients.length-1">, </span>
						</span>
					</template>
				</i18n-t>
	
				<i18n-t scope="global" tag="div" class="additional"
				v-if="totalSubgifts && totalSubgifts > 0"
				keypath="chat.subscription.sub_gift_total" :plural="totalSubgifts">
					<template #COUNT>
						<strong>{{ totalSubgifts }}</strong>
					</template>
				</i18n-t>
			</div>
	
			<!-- Gift upgrade -->
			<div class="holder" v-else-if="messageData.is_giftUpgrade">
				<i18n-t scope="global" tag="span"
				keypath="chat.subscription.sub_gift_upgrade">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
					</template>
					<template #GIFTER>
						<a class="userlink" @click.stop="openUserCard(messageData.gift_upgradeSender!)">{{messageData.gift_upgradeSender!.displayName}}</a>
					</template>
					<template #TIER>
						<strong>{{ messageData.tier }}</strong>
					</template>
				</i18n-t>
			</div>
	
			
			<!-- Sub and Resub -->
			<div class="holder" v-else>
				<!-- Resub -->
				<i18n-t scope="global" tag="span"
				v-if="messageData.is_resub"
				:keypath="messageData.tier == 'prime'? 'chat.subscription.resub_prime' : 'chat.subscription.resub'">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
					</template>
					<template #TIER>
						<strong>{{ messageData.tier }}</strong>
					</template>
				</i18n-t>

				<!-- Normal sub -->
				<i18n-t scope="global" tag="span"
				v-else
				:keypath="messageData.tier == 'prime'? 'chat.subscription.sub_prime' : 'chat.subscription.sub'">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
					</template>
					<template #TIER>
						<strong>{{ messageData.tier }}</strong>
					</template>
				</i18n-t>
	
				<!-- Total subscription duration of this user -->
				<i18n-t scope="global" tag="div" class="additional"
				v-if="messageData.totalSubDuration > 0"
				keypath="chat.subscription.sub_duration" :plural="messageData.totalSubDuration">
					<template #COUNT>
						<strong>{{ messageData.totalSubDuration }}</strong>
					</template>
				</i18n-t>
	
				<!-- Number of months they bought in advance -->
				<i18n-t scope="global" tag="div" class="additional"
				v-if="messageData.months > 0"
				keypath="chat.subscription.sub_advance" :plural="messageData.months">
					<template #COUNT>
						<strong>{{ messageData.months }}</strong>
					</template>
				</i18n-t>
	
				<!-- Sub streak -->
				<i18n-t scope="global" tag="div" class="additional"
				v-if="messageData.streakMonths > 0"
				keypath="chat.subscription.sub_streak" :plural="messageData.streakMonths">
					<template #COUNT>
						<strong>{{ messageData.streakMonths }}</strong>
					</template>
				</i18n-t>
			</div>
			
			<div class="quote dark" v-if="messageData.message">
				<ChatMessageChunksParser :chunks="messageData.message_chunks" :channel="messageData.channel_id" :platform="messageData.platform" />
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
export default class ChatSubscription extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageSubscriptionData;

	public get classes():string[] {
		let res = ["chatsubscription", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		return res;
	}

	public get totalSubgifts():number|undefined {
		return this.messageData.user.channelInfo[this.messageData.channel_id].totalSubgifts;
	}
	
	public get giftRecipients():TwitchatDataTypes.TwitchatUser[] {
		if(this.messageData.gift_recipients && this.messageData.gift_recipients?.length > 0) {
			return this.messageData.gift_recipients;
		}
		return [];
	}

	public beforeMount(): void {
		
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}
}
</script>

<style scoped lang="less">
.chatsubscription{
	.additional {
		opacity: .8;
	}

	.holder {
		display: flex;
		flex-direction: column;
		gap: .25em;
	}
}
</style>