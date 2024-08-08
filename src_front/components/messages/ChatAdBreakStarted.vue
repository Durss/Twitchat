<template>
	<div class="chatadbreakstarted chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="ad" alt="follow" class="icon" />

		<i18n-t scope="global" tag="span" keypath="chat.ad_break_start.label">
			<template #USER>
				<a v-if="messageData.startedBy" class="userlink" @click.stop="openUserCard(messageData.startedBy!, messageData.channel_id)">{{messageData.startedBy!.displayName}}</a>
				<strong v-else>???</strong>
			</template>
			<template #DURATION>
				<strong>{{ duration }}</strong>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
	},
	emits:["onRead"],
})
class ChatAdBreakStarted extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageAdBreakStartData;

	public duration:string = "";

	public beforeMount(): void {
		this.duration = Utils.formatDuration(this.messageData.duration_s * 1000);
	}

}
export default toNative(ChatAdBreakStarted);
</script>

<style scoped lang="less">
.chatadbreakstarted{
	
}
</style>