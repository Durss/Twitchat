<template>
	<div class="chattiktokshare chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="share" alt="share" class="icon"/>
		<Icon name="tiktok" alt="tiktok" class="icon"/>

		<i18n-t scope="global" keypath="chat.tiktok_share.new" tag="span">
			<template #USER>
				<a class="userlink"
					:href="getProfilePage(messageData.user)"
					target="_blank"
					@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id, messageData.platform)">{{messageData.user.displayName}}</a>
			</template>
			<template #COUNT>
				<strong>{{messageData.count}}</strong>
			</template>
			<template #IMAGE>
				<tooltip class="emote"
				:content="'<center><img src='+messageData.image+' width=\'112\' class=\'emote\'></center>'">
					<img :src="messageData.image" alt="gift emote" loading="lazy">
				</tooltip>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
class ChatTikTokShare extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageTikTokGiftData;

	@Prop
	declare childrenList:(TwitchatDataTypes.MessageTikTokGiftData)[];

	@Prop({type:Boolean, default:false})
	declare lightMode:boolean;

	@Prop({type:Number, default:0})
	public colIndex!:number;

}
export default toNative(ChatTikTokShare);
</script>

<style scoped lang="less">
.chattiktokshare{
}
</style>