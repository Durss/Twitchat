<template>
	<div class="chattwitchcombo chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">

		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="bits" alt="bits" class="icon"/>

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.combo" :plural="messageData.bits">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #BITS>
					<strong>{{ messageData.bits }}</strong>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:[],
})
class ChatTwitchCombo extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCheerData;

	@Prop
	declare childrenList:TwitchatDataTypes.MessageCheerData[];

}
export default toNative(ChatTwitchCombo);
</script>

<style scoped lang="less">
.chattwitchcombo{

}
</style>
