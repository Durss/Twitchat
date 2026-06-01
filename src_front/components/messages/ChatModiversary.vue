<template>
	<div
		class="chatmodiversary chatMessage highlight"
		@contextmenu="onContextMenu($event, messageData, $el)"
	>
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{
			time
		}}</span>

		<Icon name="modiversary" alt="modiversary" class="icon" />

		<i18n-t scope="global" tag="div" keypath="chat.user_modiversary.label">
			<template #USER>
				<a
					class="userlink"
					@click.stop="openUserCard(messageData.user, messageData.channel_id)"
					>{{ messageData.user.displayName }}</a
				>
			</template>
			<template #MONTHS>
				<strong>{{ messageData.months }}</strong>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { toNative, Component, Prop } from "vue-facing-decorator";
import AbstractChatMessage from "./AbstractChatMessage";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";
import MessageTranslation from "./MessageTranslation.vue";

@Component({
	components: {
		MessageTranslation,
		ChatMessageChunksParser,
	},
	emits: ["onRead"],
})
class ChatModiversary extends AbstractChatMessage {
	@Prop
	declare messageData: TwitchatDataTypes.MessageModiversaryData;

	public mounted(): void {}

	public beforeDestroy(): void {}
}
export default toNative(ChatModiversary);
</script>

<style scoped lang="less">
.chatmodiversary {
}
</style>
