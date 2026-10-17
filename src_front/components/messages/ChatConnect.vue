<template>
	<div :class="classes" ref="rootEl">
		<Icon class="icon" :name="props.messageData.type == 'connect' ? 'checkmark' : 'cross'" />

		<i18n-t
			scope="global"
			class="label"
			tag="span"
			v-if="props.messageData.type == 'connect'"
			keypath="chat.connect.on"
		>
			<template #PLATFORM
				><strong>{{ props.messageData.platform }}</strong></template
			>
			<template #ROOM
				><strong>{{ channelName }}</strong></template
			>
		</i18n-t>

		<template v-else>
			<i18n-t scope="global" class="label" tag="span" keypath="chat.connect.off">
				<template #PLATFORM
					><strong>{{ props.messageData.platform }}</strong></template
				>
				<template #ROOM
					><strong>{{ channelName }}</strong></template
				>
			</i18n-t>

			<TTButton
				v-if="showReconnectBt"
				icon="online"
				primary
				small
				@click.stop="reconnectChan()"
				>{{ t("global.reconnect") }}</TTButton
			>
		</template>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import TwitchMessengerClient from "@/messaging/TwitchMessengerClient";
import { storeAccessibility as useStoreAccessibility } from "@/store/accessibility/storeAccessibility";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../TTButton.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageConnectData | TwitchatDataTypes.MessageDisconnectData;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t } = useI18n();
const storeAccessibility = useStoreAccessibility();
const storeAuth = useStoreAuth();
const storeStream = useStoreStream();
const storeUsers = useStoreUsers();

const rootEl = useTemplateRef("rootEl");
useChatMessage(props, emit, rootEl);

const message = ref<string>("");
const channelName = ref<string>("");
const reconnecting = ref<boolean>(false);

const classes = computed<string[]>(() => {
	const res = ["chatconnect", "chatMessage"];
	if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.DISCONNECT) {
		res.push("highlight", "error");
	}
	return res;
});

const showReconnectBt = computed<boolean>(() => {
	if (reconnecting.value) return false;
	return !TwitchMessengerClient.instance.getIsConnectedToChannelID(props.messageData.channel_id);
});

onMounted(() => {
	const chan = storeUsers.getUserFrom(
		props.messageData.platform,
		props.messageData.channel_id,
		props.messageData.channel_id,
	);
	if (chan) {
		channelName.value = " #" + chan.login;
		if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.CONNECT) {
			message.value = t("chat.connect.on", {
				PLATFORM: props.messageData.platform,
				ROOM: channelName.value,
			});
		} else {
			message.value = t("chat.connect.off", { PLATFORM: props.messageData.platform });
		}
		storeAccessibility.setAriaPolite(message.value);
	}
});

async function reconnectChan(): Promise<void> {
	reconnecting.value = true;
	const chanId = props.messageData.channel_id;
	const user = storeUsers.getUserFrom(props.messageData.platform, chanId, chanId);
	if (chanId == storeAuth.twitch.user.id || chanId == storeAuth.youtube?.user.id) {
		TwitchMessengerClient.instance.connectToChannel(user.login);
	} else {
		storeStream.connectToExtraChan(user);
	}
	// Give it a bit of time before showing the button again if
	// it's still not connected
	window.setTimeout(() => {
		reconnecting.value = false;
	}, 5000);
}
</script>

<style scoped lang="less">
.chatconnect {
	font-style: italic;
	gap: 0.5em;

	.label {
		flex-basis: 100px;
		flex-grow: 1;
	}
}
</style>

