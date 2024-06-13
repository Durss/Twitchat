<template>
	<div class="chatcelebration chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<div class="holder">
			<Icon name="watchStreak" />	
			<i18n-t scope="global" keypath="chat.celebration.message">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
				</template>
				<template #EMOTE>
					<img class="emote" :src="'https://static-cdn.jtvnw.net/emoticons/v2/'+messageData.emoteID+'/default/light/3.0'" alt="emote">
				</template>
				<template #PRICE>
					<Icon name="bits" />
					<span>{{ messageData.cost }}</span>
				</template>
			</i18n-t>
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
	emits:["close"],
})
class ChatCelebration extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageTwitchCelebrationData;

}
export default toNative(ChatCelebration);
</script>

<style scoped lang="less">
.chatcelebration{
	
	.cost {
		font-size: .7em;
		font-style: italic;
	}

	.icon {
		border-radius: var(--border-radius);
		padding: .25em;
		height: 2em;
		width: 2em;
		flex-shrink: 0;
		vertical-align: middle;
		margin-right: 5px;
	}

	.emote {
		height: 1.5em;
	}
}
</style>