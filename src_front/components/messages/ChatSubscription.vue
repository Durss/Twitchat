<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon v-if="messageData.is_gift" name="gift" alt="gift" class="icon"/>
		<Icon v-else-if="messageData.tier == 'prime'" name="prime" alt="prime" class="icon"/>
		<Icon v-else name="sub" alt="sub" class="icon"/>

		<div>
			<!-- Subgift -->
			<div class="holder" v-if="messageData.is_gift">
				<i18n-t scope="global" tag="span" :keypath="messageData.is_targetedSubgift?'chat.subscription.sub_gift_months' : 'chat.subscription.sub_gift'">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
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
							<a class="userlink" @click.stop="openUserCard(u, messageData.channel_id)">{{u.displayName}}</a>
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
				:keypath="messageData.gift_upgradeSender? 'chat.subscription.sub_gift_upgrade' : 'chat.subscription.sub_gift_upgrade_anon'">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
					</template>
					<template #GIFTER v-if="messageData.gift_upgradeSender">
						<a class="userlink" @click.stop="openUserCard(messageData.gift_upgradeSender, messageData.channel_id)">{{messageData.gift_upgradeSender.displayName}}</a>
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
						<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
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
						<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
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
				<div class="additional"
				v-if="messageData.months > 1">
					<!-- <Icon name="alert" v-tooltip="$t('chat.subscription.sub_prepaid_disclaimer')" /> -->
					<i18n-t scope="global"
					keypath="chat.subscription.sub_prepaid" :plural="messageData.months">
						<template #COUNT>
							<strong>{{ messageData.months }}</strong>
						</template>
					</i18n-t>
				</div>
	
				<!-- Sub streak -->
				<i18n-t scope="global" tag="div" class="additional"
				v-if="messageData.streakMonths > 0"
				keypath="chat.subscription.sub_streak" :plural="messageData.streakMonths">
					<template #COUNT>
						<strong>{{ messageData.streakMonths }}</strong>
					</template>
				</i18n-t>
			</div>
			
			<div class="quote" v-if="messageData.message">
				<ChatMessageChunksParser :chunks="messageData.message_chunks" :channel="messageData.channel_id" :platform="messageData.platform" />
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
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		MessageTranslation,
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
class ChatSubscription extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageSubscriptionData;

	public get classes():string[] {
		let res = ["chatsubscription", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		return res;
	}

	public get iconColor():string{
		return this.$store.common.theme == "dark" ? "#1f69ff" : "#1756d3";
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
}
export default toNative(ChatSubscription);
</script>

<style scoped lang="less">
.chatsubscription{
	&>.icon {
		color: v-bind(iconColor);
	}
	.additional {
		opacity: .8;
		.icon {
			margin-right: .25em;
			background-color: var(--color-secondary);
			color: white;
			padding: 3px;
			border-radius: 5px;
			height: 1.25em;
			vertical-align: text-bottom;
		}
	}

	.holder {
		display: flex;
		flex-direction: column;
		gap: .25em;
	}
}
</style>