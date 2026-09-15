<template>
	<div class="qnalist sidePanel" ref="rootEl">
		<div class="head">
			<div class="title">
				<Icon name="qna" />
				<i18n-t scope="global" tag="h1" keypath="qna.list.title"></i18n-t>
			</div>
			<ClearButton @click="close()" />
			<!-- <div class="ctas">
				<TTButton secondary icon="cross">Close session</TTButton>
				<TTButton alert icon="trash">Delete session</TTButton>
			</div> -->
		</div>

		<div class="content" v-if="currentSession">
			<div class="description" v-if="currentSession.ownerId != storeAuth.twitch.user.id">
				<Icon name="mod" /> {{ t("qna.list.owner", { USER: owner.displayNameOriginal }) }}
			</div>

			<div class="description" v-else-if="currentSession.shareWithMods">
				<Icon name="mod" /> {{ t("qna.list.shared") }}
			</div>

			<div class="messageList" ref="messageList">
				<div class="noResult" v-if="messages.length === 0">
					{{ t("global.no_result") }}
				</div>
				<div v-else v-for="(m, index) in messages" :key="m.message.id" class="messageItem">
					<div class="votes" v-if="m.votes > 1" v-tooltip="t('qna.list.votes_tt')">
						<Icon name="reply" />x<strong>{{ m.votes }}</strong>
					</div>
					<MessageItem
						class="message"
						:messageData="buildFakeMessage(m)"
						:lightMode="true"
					/>

					<TTButton
						:aria-label="t('pin.highlightBt_aria')"
						@click.capture="chatHighlight(m)"
						class="button"
						small
						icon="highlight"
						v-tooltip="t('pin.highlightBt_tt')"
						:loading="highlightLoading"
						:disabled="!overlayAvailable"
					/>
					<TTButton
						:aria-label="t('pin.unpinBt_aria')"
						@click="unpin(m, index)"
						class="button"
						small
						secondary
						highlight
						icon="delete"
					/>
				</div>
			</div>

			<div class="pagination" v-if="pageCount > 1">
				<TTButton
					v-for="i in pageCount"
					:selected="pageIndex == i - 1"
					@click="pageIndex = i - 1"
					>{{ i }}</TTButton
				>
			</div>

			<div class="sessionlist">
				<div v-for="(s, index) in storeQna.activeSessions" :key="s.id" class="user">
					<TTButton
						@click="currentSessionIndex = index"
						:selected="currentSession.id == s.id"
						>{{ s.command }} <i>x{{ s.messages.length }}</i></TTButton
					>
					<TTButton
						icon="stop"
						@click="closeSession(s.id)"
						secondary
						v-if="s.open"
					></TTButton>
					<TTButton icon="trash" @click="deleteSession(s.id)" alert></TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onBeforeMount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useConfirm } from "@/composables/useConfirm";
import { useSidePanel } from "@/composables/useSidePanel";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeQna as useStoreQna } from "@/store/qna/storeQna";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import ClearButton from "../ClearButton.vue";
import TTButton from "../TTButton.vue";
import MessageItem from "../messages/MessageItem.vue";
import Icon from "../Icon.vue";

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeQna = useStoreQna();
const storeUsers = useStoreUsers();
const rootEl = useTemplateRef("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"));

const overlayAvailable = ref(false);
const highlightLoading = ref(true);
const itemsPerPage = ref(20);
const pageIndex = ref(0);
const currentSessionIndex = ref(0);

const currentSession = computed<TwitchatDataTypes.QnaSession | null>(() => {
	if (storeQna.activeSessions.length == 0) return null;
	return storeQna.activeSessions[currentSessionIndex.value]!;
});

const pageCount = computed(() => {
	if (!currentSession.value) return 0;
	return Math.ceil(currentSession.value.messages.length / itemsPerPage.value);
});

const owner = computed(() => {
	return storeUsers.getUserFrom(
		"twitch",
		storeAuth.twitch.user.id,
		currentSession.value!.ownerId,
	);
});

const messages = computed<TwitchatDataTypes.QnaSession["messages"]>(() => {
	if (!currentSession.value) return [];
	const start = pageIndex.value * itemsPerPage.value;
	return currentSession.value.messages
		.sort((a, b) => b.votes - a.votes)
		.slice(start, itemsPerPage.value + start);
});

onBeforeMount(() => {
	currentSessionIndex.value = 0;
});

onMounted(() => {
	//Check if highlight overlay exists
	Utils.getHighlightOverPresence().then((res) => {
		overlayAvailable.value = res;
		highlightLoading.value = false;
	});
});

watch(
	() => pageCount.value,
	() => {
		//Make sure we remain on last available page when items get removed
		if (pageIndex.value >= pageCount.value) {
			pageIndex.value = pageCount.value - 1;
		}
	},
);

function closeSession(id: string): void {
	confirm(t("qna.list.close_confirm.title"), t("qna.list.close_confirm.description"))
		.then(() => {
			storeQna.stopSession(id);
		})
		.catch(() => {});
}

function deleteSession(id: string): void {
	confirm(t("qna.list.delete_confirm.title"), t("qna.list.delete_confirm.description"))
		.then(() => {
			storeQna.deleteSession(id);
			if (storeQna.activeSessions.length == 0) close();
			else currentSessionIndex.value = 0;
		})
		.catch(() => {});
}

/**
 * Removes a message from pins
 * @param m
 */
async function unpin(
	message: TwitchatDataTypes.QnaSession["messages"][number],
	index: number,
): Promise<void> {
	storeQna.removeMessageFromSession(message, currentSession.value!);
}

/**
 * Highlights a message on dedicated overlay
 */
async function chatHighlight(m: TwitchatDataTypes.QnaSession["messages"][number]): Promise<void> {
	if (!overlayAvailable.value) {
		//Open parameters if overlay is not found
		storeParams.openParamsPage(
			TwitchatDataTypes.ParameterPages.OVERLAYS,
			TwitchatDataTypes.ParamDeepSections.HIGHLIGHT,
		);
	} else {
		highlightLoading.value = true;
		storeQna.highlightEntry(m);
		await Utils.promisedTimeout(1000);
		highlightLoading.value = false;
	}
}

/**
 * Builds up a fake message data to display on list
 * @param m
 */
function buildFakeMessage(
	m: TwitchatDataTypes.QnaSession["messages"][number],
): TwitchatDataTypes.MessageChatData {
	return {
		id: m.message.id,
		platform: m.platform,
		channel_id: m.channelId,
		type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		date: m.date,
		answers: [],
		is_short: false,
		message: m.message.chunks.map((v) => v.value) + " ",
		message_chunks: m.message.chunks,
		message_html: TwitchUtils.messageChunksToHTML(m.message.chunks),
		message_size: TwitchUtils.computeMessageSize(m.message.chunks),
		user: storeUsers.getUserFrom(m.platform, m.channelId, m.user.id, undefined, m.user.name),
	};
}
</script>

<style scoped lang="less">
.qnalist {
	.head {
		.ctas {
			gap: 1em;
			row-gap: 0.25em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			align-items: center;
		}
	}

	.description {
		text-align: center;
		font-style: italic;
		background-color: #00a86555;
		padding: 0.25em;
		border-radius: var(--border-radius);
		.icon {
			height: 1em;
			vertical-align: bottom;
		}
	}

	.messageList {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		gap: 0.25em;

		.noResult {
			text-align: center;
			font-style: italic;
		}

		.messageItem {
			display: flex;
			flex-direction: row;
			align-items: center;
			position: relative;
			gap: 0.25em;
			width: 100%;
			max-width: 100%;

			.message {
				flex-grow: 1;
			}

			.button {
				width: fit-content;
				min-width: fit-content;
				align-self: flex-start;
			}

			.votes {
				display: flex;
				flex-direction: row;
				align-items: center;
				padding: 4px;
				border-radius: var(--border-radius);
				background-color: var(--color-secondary);
				font-size: 12px;
				flex-shrink: 0;

				.icon {
					height: 0.8em;
					flex-shrink: 0;
					margin-right: 2px;
				}
			}
		}
	}

	.pagination {
		gap: 0.5em;
		row-gap: 0.25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		button {
			padding: 0.25em 0.5em;
			min-width: 1em;
			border-radius: var(--border-radius);
			color: var(--color-light);
			background-color: var(--color-button);
		}
	}

	.sessionlist {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		flex-shrink: 0;
		.user {
			display: flex;
			flex-direction: row;
			button {
				border-radius: 0;
			}
			button:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			button:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
				padding: 0 0.5em;
			}
		}
	}
	i {
		font-weight: normal;
		font-size: 0.9em;
		padding: 0;
	}
}
</style>
