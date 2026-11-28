<template>
	<div class="chatroomsettings chatMessage highlight primary" ref="rootEl">
		<Icon class="icon lock" name="lock" />
		<div class="content">
			<div>
				<i18n-t scope="global" tag="span" keypath="chat.room_settings.title">
					<template #ROOM
						><strong>#{{ props.messageData.channel_name }}</strong></template
					>
				</i18n-t>
			</div>
			<div
				class="restriction"
				v-if="props.messageData.settings.subOnly"
				:class="{ disabled: disabled.sub }"
			>
				<span><Icon class="icon" name="sub" />{{ t("chat.room_settings.sub_only") }}</span>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('sub')" small light>{{
					t("chat.room_settings.unsetBt")
				}}</TTButton>
			</div>
			<div
				class="restriction"
				v-if="props.messageData.settings.emotesOnly"
				:class="{ disabled: disabled.emote }"
			>
				<span
					><Icon class="icon" name="emote" />{{
						t("chat.room_settings.emote_only")
					}}</span
				>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('emote')" small light>{{
					t("chat.room_settings.unsetBt")
				}}</TTButton>
			</div>
			<div
				class="restriction"
				v-if="typeof props.messageData.settings.followOnly == 'number'"
				:class="{ disabled: disabled.follow }"
			>
				<span
					><Icon class="icon" name="follow" />{{
						t(
							"chat.room_settings.follow_only",
							{
								DURATION: props.messageData.settings.followOnly,
							},
							typeof props.messageData.settings.followOnly == "number" &&
								props.messageData.settings.followOnly > 0
								? 2
								: 1,
						)
					}}</span
				>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('follow')" small light>{{
					t("chat.room_settings.unsetBt")
				}}</TTButton>
			</div>
			<div
				class="restriction"
				v-if="props.messageData.settings.slowMode"
				:class="{ disabled: disabled.slow }"
			>
				<span
					><Icon class="icon" name="slow" />{{
						t(
							"chat.room_settings.slow_mode",
							{
								DURATION: props.messageData.settings.slowMode,
							},
							props.messageData.settings.slowMode,
						)
					}}</span
				>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('slow')" small light>{{
					t("chat.room_settings.unsetBt")
				}}</TTButton>
			</div>
			<div
				class="restriction"
				v-if="props.messageData.settings.chatDelay"
				:class="{ disabled: disabled.delay }"
			>
				<span
					><Icon class="icon" name="timer" />{{
						t(
							"chat.room_settings.chat_delay",
							{
								DURATION: props.messageData.settings.chatDelay,
							},
							props.messageData.settings.chatDelay,
						)
					}}</span
				>
				<TTButton v-if="isMod" class="unsetBt" @click="unset('delay')" small light>{{
					t("chat.room_settings.unsetBt")
				}}</TTButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { useChatMessage } from "@/composables/useChatMessage";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { toast } from "@/utils/toast/toast";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { onBeforeMount, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";

type RoomSetting = "sub" | "follow" | "delay" | "slow" | "emote";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageRoomSettingsData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();

const rootEl = useTemplateRef("rootEl");
useChatMessage(props, emit, rootEl);

const isMod = ref<boolean>(false);
const disabled = ref<Partial<Record<RoomSetting, boolean>>>({});

onBeforeMount(() => {
	isMod.value =
		props.messageData.platform == "twitch" &&
		storeAuth.isModerator(props.messageData.channel_id) &&
		TwitchUtils.hasScopes([TwitchScopes.SET_ROOM_SETTINGS]);
});

function unset(prop: RoomSetting): void {
	const settings: TwitchatDataTypes.IRoomSettings = {};
	switch (prop) {
		case "sub":
			settings.subOnly = false;
			break;
		case "follow":
			settings.followOnly = false;
			break;
		case "delay":
			settings.chatDelay = 0;
			break;
		case "slow":
			settings.slowMode = 0;
			break;
		case "emote":
			settings.emotesOnly = false;
			break;
	}
	TwitchUtils.setRoomSettings(props.messageData.channel_id, settings).then((res) => {
		if (res) {
			disabled.value[prop] = true;
		} else {
			toast(t("error.room_settings_update"));
		}
	});
}
</script>

<style scoped lang="less">
.chatroomsettings {
	.content {
		display: flex;
		flex-direction: column;

		.restriction {
			margin-left: 1em;
			margin-top: 0.25em;
			&.disabled {
				text-decoration: line-through;
				.unsetBt {
					display: none;
				}
			}

			.unsetBt {
				background-color: rgba(255, 255, 255, 0.1);
				margin-left: 1em;
				// padding: .75em;
			}
		}
		.icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}
	}
	& > .icon {
		height: 2.5em;
		width: auto;
		// align-self: flex-start;
	}
}
</style>
