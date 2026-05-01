<template>
	<div :class="classes" @contextmenu="onContextMenu($event, messageData, rootEl!)" ref="rootEl">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{
			time
		}}</span>

		<Icon name="follow" alt="follow" class="icon followIcon" />

		<Icon
			name="youtube"
			v-if="messageData.platform == 'youtube'"
			v-tooltip="$t('chat.youtube.platform_youtube')"
		/>
		<Icon
			name="tiktok"
			v-if="messageData.platform == 'tiktok'"
			v-tooltip="$t('chat.tiktok.platform_tiktok')"
		/>
		<Icon
			name="bluesky"
			v-if="messageData.platform == 'bluesky'"
			v-tooltip="$t('chat.bluesky.platform_bluesky')"
		/>

		<i18n-t scope="global" tag="span" :keypath="'chat.follow'">
			<template #USER>
				<a
					class="userlink"
					@click.stop="
						openUserCard(messageData.user, messageData.channel_id, messageData.platform)
					"
					>{{ messageData.user.displayName }}</a
				>
			</template>
		</i18n-t>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, useTemplateRef } from "vue";

const storeCommon = useStoreCommon();
const props = defineProps<{
	messageData: TwitchatDataTypes.MessageFollowingData;
}>();
const emit = defineEmits<{ onRead: [] }>();
const rootEl = useTemplateRef("rootEl");
const { openUserCard, onContextMenu, time } = useChatMessage(props, emit, rootEl);

const classes = computed(() => {
	let res = ["chatfollow", "chatMessage", "highlight"];
	if (props.messageData.deleted === true) res.push("deleted");
	return res;
});
const iconColor = computed(() => {
	return storeCommon.theme == "dark" ? "#ff38db" : "#c516a5";
});
</script>

<style scoped lang="less">
.chatfollow {
	.followIcon {
		color: v-bind(iconColor);
	}
}
</style>
