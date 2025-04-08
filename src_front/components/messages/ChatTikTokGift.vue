<template>
	<div class="chattiktokgift chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="gift" alt="gift" class="icon"/>
		<Icon name="tiktok" alt="tiktok" class="icon"/>

		<i18n-t scope="global" keypath="chat.tiktok_gift.new" tag="span" class="holder"
		@contextmenu="onContextMenu($event, messageData, $el)">
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

		<div class="diamonds">
			<img src="@/assets/icons/tiktok_diamond.svg" alt="diamonds" class="icon">
			<strong>{{ messageData.diamonds }}</strong>
		</div>
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
class ChatTikTokGift extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageTikTokGiftData;

	@Prop
	declare childrenList:(TwitchatDataTypes.MessageTikTokGiftData)[];

	@Prop({type:Boolean, default:false})
	declare lightMode:boolean;

	@Prop({type:Number, default:0})
	public colIndex!:number;

}
export default toNative(ChatTikTokGift);
</script>

<style scoped lang="less">
.chattiktokgift{
	.holder {
		flex-grow: 1;
	}
	.diamonds {
		gap: .25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		font-size: 1.25em;
		.icon {
			height: 1em;
		}
	}
}
</style>
