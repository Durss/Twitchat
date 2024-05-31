<template>
	<div class="chattrackstart chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="music" alt="notice" class="icon"/>
		<ClearButton class="closeBt" @click.stop="deleteMessage()" small />

		<div class="messageHolder">
			<i18n-t scope="global" keypath="chat.now_playing.title">
				<template #TRACK>
					<a :href="messageData.track.url" target="_blank">
						{{ messageData.track.title }} <i>({{ messageData.track.artist }})</i>
						<Icon name="newtab" />
					</a>
				</template>
				<template #USER>
					<a class="userlink"
						:href="'https://twitch.tv/'+messageData.userOrigin!.login"
						target="_blank"
						@click.stop.prevent="openUserCard(messageData.userOrigin!)">{{messageData.userOrigin!.displayName}}</a>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ClearButton from '../ClearButton.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		ClearButton,
	},
	emits:["onRead"]
})
class ChatTrackStart extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageMusicStartData;

}
export default toNative(ChatTrackStart);
</script>

<style scoped lang="less">
.chattrackstart{
	a>.icon {
		height: 1em;
		vertical-align: middle;
		margin-left: .25em;
	}
}
</style>
