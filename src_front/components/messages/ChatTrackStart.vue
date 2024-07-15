<template>
	<div class="chattrackstart chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="music" alt="notice" class="icon"/>
		<ClearButton class="closeBt" @click.stop="deleteMessage()" small />

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" keypath="chat.now_playing.title">
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

			<i18n-t scope="global" tag="div" keypath="chat.now_playing.search" v-if="messageData.searchTerms" class="searchTerms">
				<template #TERMS>
					<strong>{{messageData.searchTerms}}</strong>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import Icon from '../Icon.vue';
import AbstractChatMessage from './AbstractChatMessage';

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
	padding-right: 2em;
	a>.icon {
		height: 1em;
		vertical-align: middle;
		margin-left: .25em;
	}

	.searchTerms {
		// display: block;
		font-style: italic;
		margin-top: .25em;
	}
}
</style>
