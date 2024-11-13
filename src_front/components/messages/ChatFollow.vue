<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="follow" alt="follow" class="icon followIcon" />

		<Icon name="youtube" v-if="messageData.platform == 'youtube'" v-tooltip="$t('chat.youtube.platform_youtube')" />
		<Icon name="tiktok" v-if="messageData.platform == 'tiktok'" v-tooltip="$t('chat.tiktok.platform_tiktok')" />

		<i18n-t scope="global" tag="span" keypath="chat.follow">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id, messageData.platform)">{{messageData.user.displayName}}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"],
})
class ChatFollow extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageFollowingData;

	public get classes():string[] {
		let res = ["chatfollow", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		return res;
	}

	public get iconColor():string{
		return this.$store.common.theme == "dark" ? "#ff38db" : "#c516a5";
	}

}
export default toNative(ChatFollow);
</script>

<style scoped lang="less">
.chatfollow{
	.followIcon {
		color: v-bind(iconColor);
	}
}
</style>