<template>
	<div
		:class="classes"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
		ref="rootEl"
	>
		<Icon name="timeout" class="icon" v-if="props.messageData.duration_s" />
		<Icon name="ban" class="icon" v-else theme="light" />

		<div class="content">
			<div class="textContent">
				<i18n-t
					scope="global"
					class="label"
					v-if="props.messageData.duration_s"
					tag="span"
					:keypath="
						props.messageData.moderator
							? 'global.moderation_action.timeout_by'
							: 'global.moderation_action.timeout'
					"
				>
					<template #USER>
						<a
							class="userlink"
							@click="
								openUserCard(props.messageData.user, props.messageData.channel_id)
							"
							>{{ props.messageData.user.displayName }}</a
						>
					</template>
					<template #MODERATOR>
						<a
							class="userlink"
							v-if="props.messageData.moderator"
							@click="
								openUserCard(
									props.messageData.moderator!,
									props.messageData.channel_id,
								)
							"
							>{{ props.messageData.moderator.displayName }}</a
						>
					</template>
					<template #DURATION>
						<strong>{{ formattedBanDuration }}</strong>
					</template>
					<template #PLATFORM>
						<strong>{{ props.messageData.platform }}</strong>
					</template>
				</i18n-t>
				<i18n-t
					scope="global"
					class="label"
					v-else
					tag="span"
					:keypath="
						props.messageData.moderator
							? 'global.moderation_action.banned_by'
							: 'global.moderation_action.banned'
					"
				>
					<template #USER>
						<a
							class="userlink"
							@click="
								openUserCard(props.messageData.user, props.messageData.channel_id)
							"
							>{{ props.messageData.user.displayName }}</a
						>
					</template>
					<template #MODERATOR>
						<a
							class="userlink"
							v-if="props.messageData.moderator"
							@click="
								openUserCard(
									props.messageData.moderator!,
									props.messageData.channel_id,
								)
							"
							>{{ props.messageData.moderator.displayName }}</a
						>
					</template>
					<template #PLATFORM>
						<strong>{{ props.messageData.platform }}</strong>
					</template>
				</i18n-t>
				<div class="quote reason" v-if="props.messageData.reason">{{ props.messageData.reason }}</div>
			</div>
			<TTButton
				light
				alert
				small
				icon="unban"
				:loading="unbanning"
				v-if="showUnbanBt"
				@click="unbanUser()"
				>{{ t("global.moderation_action.unbanBt") }}</TTButton
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeAccessibility as useStoreAccessibility } from "@/store/accessibility/storeAccessibility";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../TTButton.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageBanData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t } = useI18n();
const storeAccessibility = useStoreAccessibility();

const rootEl = useTemplateRef("rootEl");
const { onContextMenu, openUserCard, canModerateUser } = useChatMessage(props, emit, rootEl);

const unbanning = ref(false);
const showUnbanBt = ref(true);

const formattedBanDuration = computed((): string => {
	return Utils.formatDuration(props.messageData.duration_s! * 1000);
});

const classes = computed((): string[] => {
	let res: string[] = ["chatban", "chatMessage", "highlight"];
	if (props.messageData.duration_s) res.push("error");
	else res.push("alert");
	return res;
});

onMounted(() => {
	let aria = "";
	if (props.messageData.duration_s) {
		if (props.messageData.moderator) {
			aria = t("global.moderation_action.timeout_by", {
				MODERATOR: props.messageData.moderator.displayName,
				USER: props.messageData.user.displayName,
				DURATION: props.messageData.duration_s,
			});
		} else {
			aria = t("global.moderation_action.timeout", {
				USER: props.messageData.user.displayName,
				DURATION: props.messageData.duration_s,
			});
		}
	} else {
		if (props.messageData.moderator) {
			aria = t("global.moderation_action.banned_by", {
				MODERATOR: props.messageData.moderator.displayName,
				USER: props.messageData.user.displayName,
			});
		} else {
			aria = t("global.moderation_action.banned", {
				USER: props.messageData.user.displayName,
			});
		}
	}
	storeAccessibility.setAriaPolite(aria);

	showUnbanBt.value =
		props.messageData.user.channelInfo[props.messageData.channel_id]!.is_banned &&
		props.messageData.platform != "youtube" &&
		canModerateUser(props.messageData.user, props.messageData.channel_id);
});

async function unbanUser(): Promise<void> {
	unbanning.value = true;
	await TwitchUtils.unbanUser(props.messageData.user, props.messageData.channel_id);
	await Utils.promisedTimeout(250);
	unbanning.value = false;
	showUnbanBt.value = false;
}
</script>

<style scoped lang="less">
.chatban {
	.content {
		row-gap: 0.5em;
		column-gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		flex-grow: 1;
		align-items: center;
		.textContent {
			align-self: flex-start;
			flex-grow: 1;
		}
	}
}
</style>
