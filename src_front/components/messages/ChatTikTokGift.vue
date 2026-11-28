<template>
	<div class="chattiktokgift chatMessage highlight" ref="rootEl">
		<Icon name="gift" alt="gift" class="icon" />
		<Icon name="tiktok" alt="tiktok" class="icon" />

		<i18n-t
			scope="global"
			keypath="chat.tiktok_gift.new"
			tag="span"
			class="holder"
			@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
		>
			<template #USER>
				<a
					class="userlink"
					:href="getProfilePage(props.messageData.user)"
					target="_blank"
					@click.prevent="
						openUserCard(
							props.messageData.user,
							props.messageData.channel_id,
							props.messageData.platform,
						)
					"
					>{{ props.messageData.user.displayName }}</a
				>
			</template>
			<template #COUNT>
				<strong>{{ props.messageData.count }}</strong>
			</template>
			<template #IMAGE>
				<tooltip
					class="emote"
					:content="
						'<center><img src=' +
						props.messageData.image +
						' width=\'112\' class=\'emote\'><br>' +
						props.messageData.giftName +
						'</center>'
					"
				>
					<img :src="props.messageData.image" alt="gift emote" loading="lazy" />
				</tooltip>
			</template>
		</i18n-t>

		<div class="diamonds">
			<img src="@/assets/icons/tiktok_diamond.svg" alt="diamonds" class="icon" />
			<strong>{{ props.messageData.diamonds }}</strong>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { useTemplateRef } from "vue";
import Icon from "../Icon.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageTikTokGiftData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{ onRead: [] }>();

const rootEl = useTemplateRef("rootEl");
const { openUserCard, onContextMenu, getProfilePage } = useChatMessage(props, emit, rootEl);
</script>

<style scoped lang="less">
.chattiktokgift {
	.holder {
		flex-grow: 1;
	}
	.diamonds {
		gap: 0.25em;
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
