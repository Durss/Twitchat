<template>
	<div class="chattiktoksub chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="sub" alt="sub" class="icon"/>
		<Icon name="tiktok" alt="tiktok" class="icon"/>

		<i18n-t scope="global" keypath="chat.tiktok_sub.new" tag="span">
			<template #USER>
				<a class="userlink"
					:href="getProfilePage(messageData.user)"
					target="_blank"
					@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id, messageData.platform)">{{messageData.user.displayName}}</a>
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
class ChatTikTokSub extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageTikTokSubData;

	@Prop
	declare childrenList:(TwitchatDataTypes.MessageTikTokSubData)[];

	@Prop({type:Boolean, default:false})
	declare lightMode:boolean;

	@Prop({type:Number, default:0})
	public colIndex!:number;

}
export default toNative(ChatTikTokSub);
</script>

<style scoped lang="less">
.chattiktoksub{
	
}
</style>