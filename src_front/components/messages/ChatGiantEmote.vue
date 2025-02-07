<template>
	<div class="chatgiantemote chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<div class="holder">
			<Icon name="watchStreak" />
			<i18n-t scope="global" class="label" tag="span" keypath="chat.gigantified_emote.message">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #PRICE>
					<strong>{{ messageData.cost }}</strong>
					<Icon class="bitsIcon" name="bits" />
				</template>
			</i18n-t>
			<img v-if="messageData.emoteID" class="emote large" :src="'https://static-cdn.jtvnw.net/emoticons/v2/'+messageData.emoteID+'/default/light/3.0'" alt="emote">
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import AbstractChatMessage from './AbstractChatMessage';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		Icon,
	},
	emits:['onRead'],
})
class ChatGiantEmote extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageTwitchGigantifiedEmoteData;

}
export default toNative(ChatGiantEmote);
</script>

<style scoped lang="less">
.chatgiantemote{

	.cost {
		font-size: .7em;
		font-style: italic;
	}

	.emote {
		height: 1.5em;
		&.large {
			display: inline-block;
			height: 3em;
		}
	}

	.holder {
		width: 100%;
		display: flex;
		flex-direction: row;
		align-items: center;
		.label {
			flex-grow: 1;
		}
		&>.icon {
			color: #5cffbe;
			width: 1.25em;
			height: 1.25em;
			margin-right: 5px;
			flex-shrink: 0;
		}
		.bitsIcon {
			width: 1em;
			height: 1em;
			margin-left: 2px;
			margin-bottom: -1px;
		}
	}
}
</style>
