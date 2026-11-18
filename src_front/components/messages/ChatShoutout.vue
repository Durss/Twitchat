<template>
	<div
		class="chatshoutout chatMessage highlight"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
		ref="rootEl"
	>
		<Icon name="shoutout" alt="shoutout" class="icon" />

		<div class="messageHolder">
			<i18n-t
				scope="global"
				tag="span"
				v-if="props.messageData.received"
				keypath="chat.shoutout.received"
			>
				<template #CHANNEL>
					<a
						class="userlink"
						@click="openUserCard(channel, props.messageData.channel_id)"
						>{{ channel.displayName }}</a
					>
				</template>
				<template #USER>
					<a
						class="userlink"
						@click="openUserCard(props.messageData.user, props.messageData.channel_id)"
						>{{ props.messageData.user.displayName }}</a
					>
				</template>
				<template #VIEWERS>
					<strong>{{ props.messageData.viewerCount }}</strong>
				</template>
			</i18n-t>

			<i18n-t scope="global" tag="span" v-else keypath="chat.shoutout.given">
				<template #MODERATOR>
					<a
						class="userlink"
						@click="
							openUserCard(props.messageData.moderator, props.messageData.channel_id)
						"
						>{{ props.messageData.moderator.displayName }}</a
					>
				</template>
				<template #CHANNEL>
					<strong>#{{ channel.displayName }}</strong>
				</template>
				<template #USER>
					<a
						class="userlink"
						@click="openUserCard(props.messageData.user, props.messageData.channel_id)"
						>{{ props.messageData.user.displayName }}</a
					>
				</template>
				<template #VIEWERS>
					<strong>{{ props.messageData.viewerCount }}</strong>
				</template>
			</i18n-t>

			<div class="streamInfo">
				<div class="infos" v-if="props.messageData.stream.title">
					<div class="quote">
						<span>{{ props.messageData.stream.title }}</span>
						<div
							class="details messageWithTime"
							v-if="props.messageData.stream.category"
						>
							<p class="category">{{ props.messageData.stream.category }}</p>
						</div>
					</div>
				</div>

				<TTButton
					@click="shoutout()"
					v-if="props.messageData.received"
					small
					icon="shoutout"
					:loading="shoutoutLoading"
					class="soButton"
					>{{ t("chat.soBt") }}</TTButton
				>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../TTButton.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageShoutoutData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();
const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t } = useI18n();
const storeCommon = useStoreCommon();
const storeUsers = useStoreUsers();
const rootEl = useTemplateRef("rootEl");
const { onContextMenu, openUserCard } = useChatMessage(props, emit, rootEl);

const shoutoutLoading = ref(false);

const channel = storeUsers.getUserFrom(
	props.messageData.platform,
	props.messageData.channel_id,
	props.messageData.channel_id,
);

const iconColor = computed(() => {
	return storeCommon.theme == "dark" ? "#9147ff" : "#772ce8";
});

async function shoutout(): Promise<void> {
	shoutoutLoading.value = true;
	try {
		await storeUsers.shoutout(props.messageData.channel_id, props.messageData.user);
	} catch (error) {
		storeCommon.alert(t("error.shoutout"));
		console.log(error);
	}
	shoutoutLoading.value = false;
}
</script>

<style scoped lang="less">
.chatshoutout {
	align-items: flex-start;

	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: 0.25em;
	}
	& > .icon {
		color: v-bind(iconColor);
	}
}
</style>
