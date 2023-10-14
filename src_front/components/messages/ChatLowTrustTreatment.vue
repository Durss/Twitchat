<template>
	<div :class="classes"
	@mouseover="$emit('onOverMessage', messageData, $event)"
	>
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img v-if="messageData.restricted" src="@/assets/icons/lock_fit.svg" alt="notice" class="icon">
		<img v-else src="@/assets/icons/shield.svg" alt="notice" class="icon">
		
		<i18n-t scope="global" v-if="messageData.restricted"
		keypath="global.moderation_action.user_restricted" tag="p">
			<template #USER>
				<a class="userlink" @click="openUserCard(messageData.user)">{{ messageData.user.displayName }}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" @click="openUserCard(messageData.moderator)">{{ messageData.moderator.displayName }}</a>
			</template>
		</i18n-t>
		
		<i18n-t scope="global" v-else-if="messageData.monitored"
		keypath="global.moderation_action.user_monitored" tag="p">
			<template #USER>
				<a class="userlink" @click="openUserCard(messageData.user)">{{ messageData.user.displayName }}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" @click="openUserCard(messageData.moderator)">{{ messageData.moderator.displayName }}</a>
			</template>
		</i18n-t>
		
		<i18n-t scope="global" v-else
		keypath="global.moderation_action.user_unflagged" tag="p">
			<template #USER>
				<a class="userlink" @click="openUserCard(messageData.user)">{{ messageData.user.displayName }}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" @click="openUserCard(messageData.moderator)">{{ messageData.moderator.displayName }}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:['onOverMessage', 'onRead'],
})
export default class ChatLowTrustTreatment extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageLowtrustTreatmentData;

	public get classes():string[] {
		const res:string[] = ["chatlowtrusttreatment", "chatMessage" ,"highlight"];
		if(this.messageData.restricted
		|| this.messageData.monitored) res.push("alert");
		return res;
	}
}
</script>

<style scoped lang="less">
.chatlowtrusttreatment{
	
}
</style>