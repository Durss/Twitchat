<template>
	<div :class="classes"
	@mouseover="$emit('onOverMessage', messageData, $event)"
	>
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon v-if="messageData.restricted" name="lock_fit" alt="notice" />
		<Icon v-else name="shield" alt="notice" />
		
		<i18n-t scope="global" v-if="messageData.restricted"
		keypath="global.moderation_action.user_restricted" tag="p">
			<template #USER>
				<a class="userlink" @click="openUserCard(messageData.user, messageData.channel_id)">{{ messageData.user.displayName }}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" @click="openUserCard(messageData.moderator, messageData.channel_id)">{{ messageData.moderator.displayName }}</a>
			</template>
		</i18n-t>
		
		<i18n-t scope="global" v-else-if="messageData.monitored"
		keypath="global.moderation_action.user_monitored" tag="p">
			<template #USER>
				<a class="userlink" @click="openUserCard(messageData.user, messageData.channel_id)">{{ messageData.user.displayName }}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" @click="openUserCard(messageData.moderator, messageData.channel_id)">{{ messageData.moderator.displayName }}</a>
			</template>
		</i18n-t>
		
		<i18n-t scope="global" v-else
		keypath="global.moderation_action.user_unflagged" tag="p">
			<template #USER>
				<a class="userlink" @click="openUserCard(messageData.user, messageData.channel_id)">{{ messageData.user.displayName }}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" @click="openUserCard(messageData.moderator, messageData.channel_id)">{{ messageData.moderator.displayName }}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
	},
	emits:['onOverMessage', 'onRead'],
})
class ChatLowTrustTreatment extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageLowtrustTreatmentData;

	public get classes():string[] {
		const res:string[] = ["chatlowtrusttreatment", "chatMessage" ,"highlight"];
		if(this.messageData.restricted) res.push("alert");
		else if(this.messageData.monitored) res.push("error");
		else res.push("success");
		return res;
	}
}
export default toNative(ChatLowTrustTreatment);
</script>

<style scoped lang="less">
.chatlowtrusttreatment{
	
}
</style>