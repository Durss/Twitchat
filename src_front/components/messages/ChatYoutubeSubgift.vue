<template>
	<div class="chatyoutubesubgift chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<div class="iconList">
			<Icon name="gift" alt="notice" class="icon subIcon"/>
			<Icon name="youtube" alt="notice" class="icon"/>
		</div>

		<!-- <img :src="messageData.user.avatarPath" class="avatar" alt="avatar" v-if="messageData.user.avatarPath" referrerpolicy="no-referrer"> -->
		
		<div class="holder">
			<i18n-t scope="global" tag="p" keypath="chat.youtube_subgift.title">
				<template #USER>
					<a class="userlink"
						:href="getProfilePage(messageData.user)"
						target="_blank"
						@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id, messageData.platform)">{{messageData.user.displayName}}</a>
				</template>
				<template #COUNT>
					<span class="count">{{ messageData.gift_count }}</span>
				</template>
				<template #TIER>
					"<span class="level">{{ messageData.levelName }}</span>"
				</template>
				<template #LIST>
					<span class="user" v-if="messageData.gift_recipients.length > 0"
						v-for="u, index in messageData.gift_recipients" :key="u.id">
						<a class="userlink" @click.stop="openUserCard(u, messageData.channel_id, messageData.platform)">{{u.displayName}}</a>
						<span v-if="(index == messageData.gift_recipients.length-2)">&nbsp;{{$t("global.and")}}&nbsp;</span>
						<span v-else-if="index < messageData.gift_recipients.length-1">, </span>
					</span>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"]
})
class ChatYoutubeSubgift extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageYoutubeSubgiftData;

	public mounted():void {
		console.log("OKOKOK");
	}

}
export default toNative(ChatYoutubeSubgift);
</script>

<style scoped lang="less">
.chatyoutubesubgift{

	.subIcon {
		color: #1f69ff;
	}
	.iconList {
		gap: .25em;
		display: flex;
		flex-direction: column;
		margin-right: 5px;
		.icon {
			width: 1.25em;
			height: 1.25em;
			min-width: 1.25em;
			min-height: 1.25em;
		}
	}
	.avatar {
		height: 2em;
		border-radius: 50%;
		margin-right: .5em;
	}
	.holder {
		gap: .25em;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		align-items: flex-start;
	}
	.level {
		font-weight: bold;
		font-style: italic;
	}
	.count {
		font-weight: bold;
	}
}
</style>