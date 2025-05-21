<template>
	<div class="chatautobanjoin chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="mod" alt="mod" />

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.autoban_join.message">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #RULE>
					<mark>{{ messageData.rule.label }}</mark>
				</template>
			</i18n-t>

			<div class="ctas" v-if="canUnban || canBlock">
				<Button  v-if="canUnban"
					small light
					:loading="moderating"
					icon="unban"
					@click.stop="unbanUser()">{{ $t('chat.autoban_join.unbanBt') }}</Button>

				<Button alert v-if="canBlock"
					small
					:loading="moderating"
					icon="block"
					@click.stop="blockUser()">{{ $t('chat.autoban_join.blockBt') }}</Button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessageInfoBadges from './components/ChatMessageInfoBadges.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Button: TTButton,
		ChatMessageInfoBadges,
	},
	emits:["onRead"],
})
class ChatAutobanJoin extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageAutobanJoinData;

	public moderating = false;
	public canUnban = true;
	public canBlock = true;

	public async unbanUser():Promise<void> {
		this.moderating = true;
		if(this.messageData.user.platform == "twitch") {
			await TwitchUtils.unbanUser(this.messageData.user, this.messageData.channel_id);
		}
		this.moderating = false;
		this.canUnban = false;
	}

	public async blockUser():Promise<void> {
		this.moderating = true;
		try {
			await TwitchUtils.blockUser(this.messageData.user);
		}catch(error) {}
		this.moderating = false;
		this.canBlock = false;
	}
}
export default toNative(ChatAutobanJoin);
</script>

<style scoped lang="less">
.chatautobanjoin{
	.ctas {
		display: block;
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 1em;
		margin-top: .5em;
	}
}
</style>
