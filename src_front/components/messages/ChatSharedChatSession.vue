<template>
	<div :class="classes" @contextmenu="onContextMenu($event, messageData, rootEl!)" ref="rootEl">
		<Icon :name="icon" :alt="icon" class="icon sharedChatIcon" />

		<div class="messageHolder">
			<i18n-t
				scope="global"
				tag="span"
				v-if="messageData.event == 'join' || messageData.event == 'leave'"
				:keypath="'chat.shared_chat.' + messageData.event"
			>
				<template #USERS>
					<template v-for="(user, index) in updatedParticipants" :key="user.id">
						<a
							class="userlink"
							@click.stop="openUserCard(user, messageData.channel_id)"
							>{{ user.displayName }}</a
						>
						<span v-if="index < updatedParticipants.length - 1">, </span>
					</template>
				</template>
			</i18n-t>

			<i18n-t
				scope="global"
				tag="span"
				v-else
				:keypath="
					messageData.event == 'begin' ? 'chat.shared_chat.begin' : 'chat.shared_chat.end'
				"
			>
				<template #HOST>
					<a
						class="userlink"
						@click.stop="openUserCard(messageData.host, messageData.channel_id)"
						>{{ messageData.host.displayName }}</a
					>
				</template>
			</i18n-t>

			<i18n-t
				scope="global"
				tag="span"
				class="participants"
				v-if="otherParticipants.length > 0"
				keypath="chat.shared_chat.participants"
			>
				<template #USERS>
					<template v-for="(user, index) in otherParticipants" :key="user.id">
						<a
							class="userlink"
							@click.stop="openUserCard(user, messageData.channel_id)"
							>{{ user.displayName }}</a
						>
						<span v-if="index < otherParticipants.length - 1">, </span>
					</template>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, useTemplateRef } from "vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageSharedChatSessionData;
}>();
const emit = defineEmits<{ onRead: [] }>();
const rootEl = useTemplateRef("rootEl");
const { openUserCard, onContextMenu } = useChatMessage(props, emit, rootEl);

const classes = computed(() => {
	const res = ["chatsharedchatsession", "chatMessage", "highlight"];
	res.push(props.messageData.event);
	return res;
});

const icon = computed(() => {
	switch (props.messageData.event) {
		case "join":
			return "userAdd";
		case "leave":
			return "userDel";
		default:
			return "sharedChat";
	}
});

const updatedParticipants = computed(() =>
	props.messageData.event == "leave"
		? props.messageData.leftParticipants
		: props.messageData.newParticipants,
);

const otherParticipants = computed(() => {
	if (props.messageData.event != "begin") return [];
	return props.messageData.participants.filter(
		(v) => v.id != props.messageData.host.id && v.id != props.messageData.channel_id,
	);
});
</script>

<style scoped lang="less">
.chatsharedchatsession {
	align-items: flex-start;

	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: 0.25em;
	}

	.participants {
		font-size: 0.9em;
		font-style: italic;
	}

	&.end {
		.sharedChatIcon {
			opacity: 0.5;
		}
	}
}
</style>

