<template>
	<div class="chatquizresult chatMessage highlight" ref="rootEl">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{
			time
		}}</span>
		<Icon name="quiz" alt="icon" class="icon" />
		<div class="content">
			<i18n-t scope="global" keypath="chat.quiz_result.title" class="title" tag="span">
				<template #TITLE>
					<strong>{{ messageData.quizResult.quizName }}</strong>
				</template>
			</i18n-t>
			<i18n-t scope="global" keypath="chat.quiz_result.info" class="subtitle" tag="span">
				<template #USER_COUNT>
					<strong>{{ rankedUsers.length }}</strong>
				</template>
				<template #WINNER>
					<strong>{{ rankedUsers[0]?.name || $t("global.loading") }}</strong>
				</template>
			</i18n-t>
			<ToggleBlock
				small
				class="leadeboard"
				:icons="['leaderboard']"
				:open="false"
				:title="$t('chat.quiz_result.leaderboard_bt')"
				@click.stop
				@update:open="onExpandLeaderboard()"
			>
				<SearchForm v-model="userSearch" :debounceDelay="0" @submit="nextSearchResult()" />
				<InfiniteList
					class="leaderboard-list"
					ref="infiniteList"
					lockScroll
					:item-size="25"
					:dataset="rankedUsers"
					:style="{ minHeight: Math.min(rankedUsers.length, 10) * 25 + 'px' }"
				>
					<template v-slot="{ item }">
						<div
							:class="{
								'leaderboard-entry': true,
								'top-1': item.rank === 1,
								'top-2': item.rank === 2,
								'top-3': item.rank === 3,
								'is-me': item.uid === storeAuth.twitch.user.id,
								clickable: !item.isAnonymous && item.platform === 'twitch',
								anon: item.isAnonymous,
							}"
						>
							<span class="rank">#{{ item.rank }}</span>
							<div v-if="item.avatarPath">
								<img :src="item.avatarPath" class="avatar" alt="avatar" />
							</div>
							<Icon v-else-if="item.isAnonymous" name="anon" class="avatar anon" />
							<Icon v-else name="avatar" class="avatar" />
							<Icon
								v-if="item.platform"
								:name="item.platform"
								class="platform-icon"
							/>
							<span
								class="name"
								v-html="highlightName(item.name) ?? $t('global.loading')"
							></span>
							<span class="score">{{ item.score.toFixed(1) }}</span>
						</div>
					</template>
				</InfiniteList>
			</ToggleBlock>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, reactive, useTemplateRef, watch } from "vue";
import InfiniteList from "../InfiniteList.vue";
import Utils from "@/utils/Utils";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { ref } from "vue";
import ToggleBlock from "../ToggleBlock.vue";
import SearchForm from "../params/contents/SearchForm.vue";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { nextTick } from "vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageQuizCompleteData;
	lightMode: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { time, openUserCard } = useChatMessage(props, emit, rootEl);
const storeAuth = useStoreAuth();
const listRef = useTemplateRef("infiniteList");
const userSearch = ref("");
const currentSearchIndex = ref(0);
let aborter: AbortController | null = null;

const rankedUsers = computed(() => {
	const users = props.messageData.quizResult.leaderboard.map((u) =>
		reactive({
			uid: u.uid,
			name: u.anon ? Utils.getNameFromOpaqueId(u.uid) : u.name,
			avatarPath: u.avatarPath,
			platform: u.platform,
			score: u.score,
			isAnonymous: u.anon,
			rank: 0,
		}),
	);

	// Add fake users
	/*
	for (let i = 0; i < 1000; i++) {
		users.push({
			uid: `fake${i}`,
			name: Utils.getNameFromOpaqueId(`fake${i}`),
			avatarPath: "",
			platform: "twitch",
			score: (Math.random() - Math.random()) * 1000,
			isAnonymous: Math.random() < 0.5,
			rank: 0,
		});
	}
	//*/

	// Sort by score descending
	// users.sort((a, b) => b.score - a.score);

	// Compute users ranks
	let currentRank = 1;
	for (let i = 0; i < users.length; i++) {
		if (i > 0 && users[i]!.score < users[i - 1]!.score) {
			currentRank = i + 1;
		}
		users[i]!.rank = currentRank;
	}
	return users;
});

const twitchUsers = rankedUsers.value
	.filter((u) => !u.isAnonymous && u.platform === "twitch" && !u.name)
	.map((u) => u.uid);
const batches = [twitchUsers.slice(0, 100), twitchUsers.slice(100)];
TwitchUtils.getUserInfo(batches[0]).then((twitchUserList) => {
	//Update users info
	twitchUserList.forEach((user) => {
		const lbUser = rankedUsers.value.find((u) => u.uid === user.id);
		if (lbUser) {
			lbUser.name = user.display_name;
			lbUser.avatarPath = user.profile_image_url.replace("300x300", "50x50");
		}
	});
});

async function onExpandLeaderboard() {
	if (aborter) aborter.abort();
	aborter = new AbortController();

	if (aborter.signal.aborted) return;

	// Load second batch without awaiting it, as it's not critical for the initial display and can be loaded in the background
	aborter = new AbortController();
	void TwitchUtils.getUserInfo(batches[1], undefined, aborter.signal).then((users) => {
		//Update user info
		users.forEach((user) => {
			const lbUser = rankedUsers.value.find((u) => u.uid === user.id);
			if (lbUser) {
				lbUser.name = user.display_name;
				lbUser.avatarPath = user.profile_image_url.replace("300x300", "50x50");
			}
		});
	});

	if (aborter.signal.aborted) return;
	await nextTick();
	setTimeout(() => {
		if (!listRef.value) return;
		listRef.value.scrollToIndex(
			rankedUsers.value.findIndex((u) => u.uid === storeAuth.twitch.user?.id),
		);
	}, 500);
}

function highlightName(name: string | undefined): string | undefined {
	if (!name) return name;
	let search = userSearch.value.trim();
	if (!search) return name;
	if (RegExp.escape) {
		search = RegExp.escape(search);
	} else {
		// Fallback escape function if RegExp.escape is not available
		search = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	const regex = new RegExp(`(${search})`, "gi");
	return name.replace(regex, "<mark>$1</mark>");
}

function nextSearchResult() {
	if (!listRef.value) return;

	const resultList = rankedUsers.value.filter((u) =>
		u.name?.toLowerCase().includes(userSearch.value.toLowerCase()),
	);
	if (!resultList || resultList.length <= 1) return;
	currentSearchIndex.value = (currentSearchIndex.value + 1) % resultList.length;
	const targetUser = resultList[currentSearchIndex.value];
	listRef.value.scrollToIndex(
		rankedUsers.value.findIndex((u) => u.uid === targetUser?.uid),
		false,
	);
}

watch(userSearch, () => {
	if (!listRef.value) return;
	currentSearchIndex.value = 0;
	const index = rankedUsers.value.findIndex((u) =>
		u.name?.toLowerCase().includes(userSearch.value.toLowerCase()),
	);
	listRef.value.scrollToIndex(index, false);
});
</script>

<style scoped lang="less">
.chatquizresult {
	.title {
		margin-right: 1ch;
	}
	.content,
	.leadeboard {
		width: 100%;
		z-index: 0;
	}
	.searchField {
		width: 100%;
		padding: 0.25em 0.5em;
		margin-bottom: 0.5em;
		border-radius: 4px;
		font-size: 1em;
	}
	.leaderboard-list {
		width: 100%;
		max-height: 500px;
		margin: auto;
		.leaderboard-entry {
			display: flex;
			height: 25px;
			align-items: center;
			gap: 0.5em;
			padding: 0.25em 0.5em;
			font-size: 0.9em;
			border-bottom: 1px solid rgba(0, 0, 0, 1);
			content-visibility: paint;

			&.anon {
				font-style: italic;
				background-image: repeating-linear-gradient(
					-45deg,
					var(--background-color-fadest),
					var(--background-color-fadest) 10px,
					transparent 10px,
					transparent 20px
				);
			}

			&.is-me {
				border: 0.2em solid var(--color-secondary);
			}

			.rank {
				font-weight: bold;
				min-width: 2.5rem;
				text-align: left;
				flex-shrink: 0;
				font-variant: tabular-nums;
			}

			.platform-icon {
				height: 1.1em;
				flex-shrink: 0;
			}

			.avatar {
				width: 1.5em;
				height: 1.5em;
				border-radius: 50%;
				object-fit: cover;
				flex-shrink: 0;
			}

			.avatar.anon {
				border: 1px solid currentColor;
				padding: 0.25em;
			}

			.name {
				flex: 1;
				font-size: 1.25em;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			:deep(mark) {
				background: var(--color-secondary-fade);
				padding: 0;
			}

			.score {
				font-size: 1em;
				flex-shrink: 0;
				min-width: 2em;
				text-align: right;
			}
		}
	}
}
</style>
