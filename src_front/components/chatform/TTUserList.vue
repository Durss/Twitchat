<template>
	<div class="ttuserlist sidePanel" ref="rootEl">
		<div class="head">
			<ClearButton @click="close" />
			<h1 class="title"><Icon name="user" />Twitchat users : {{ userCount }}</h1>
		</div>

		<div class="content" ref="content">
			<div class="noResult" v-if="!loading && userCount == 0">no user found :(</div>

			<div class="card-item stats">
				<div class="table">
					<p>Active users last 24h :</p>
					<p>{{ activeLast24h }}</p>
					<p>Active users last 7 days :</p>
					<p>{{ activeLast7days }}</p>
					<p>Active users last 30 days :</p>
					<p>{{ activeLast30days }}</p>
				</div>
				<div class="ctas">
					<TTButton small :loading="loading" icon="refresh" @click="updateList()"
						>Reload</TTButton
					>
					<div class="partners">
						<label @click="onlyPartners = !onlyPartners">Partners:</label
						><ToggleButton v-model="onlyPartners" clear />
					</div>
					<!-- <TTButton small :disabled="loading" title="Load 24h" icon="user" @click="loadTimeframe(1)" />
					<TTButton small :disabled="loading" title="Load 7d" icon="user" @click="loadTimeframe(7)" />
					<TTButton small :disabled="loading" title="Load 30d" icon="user" @click="loadTimeframe(30)" /> -->
				</div>
			</div>

			<div class="list" ref="list">
				<a
					v-for="u in filteredItems"
					:key="u.id"
					class="card-item user"
					ref="userCard"
					:href="u.user ? 'https://twitch.tv/' + u.user.login : '#'"
					target="_blank"
				>
					<div class="header" v-if="u.user">
						<img :src="getProfilePicURL(u)" alt="profile" class="icon" />

						<span class="title">
							{{ u.user.login }}
							<Icon
								name="partner"
								alt="partner"
								class="partner"
								v-if="u.user.broadcaster_type == 'partner'"
							/>
						</span>
					</div>
					<div class="header error" v-else>
						<Icon name="user" alt="profile" class="icon" theme="light" />
						<span class="title">#{{ u.id }}</span>
					</div>
					<div class="details">{{ formatDate(u) }}</div>
				</a>
			</div>

			<TTButton
				class="loadBt"
				v-if="!loading && showLoadMoreBt && users.length > 0"
				small
				title="Load more"
				icon="add"
				@click="loadNextUsers()"
			/>

			<Icon class="loader" name="loader" v-if="loading" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { asset } from "@/composables/useAsset";
import { useSidePanel } from "@/composables/useSidePanel";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, nextTick, onMounted, ref, useTemplateRef } from "vue";
import ClearButton from "../ClearButton.vue";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";
import ToggleButton from "../ToggleButton.vue";

interface UserData {
	id: string;
	date: number;
	user: TwitchDataTypes.UserInfo;
}

const emit = defineEmits<{
	close: [];
}>();

const { getAsset } = asset();
const storeCommon = useStoreCommon();
const rootEl = useTemplateRef("rootEl");
const content = useTemplateRef("content");
const list = useTemplateRef("list");
const { close } = useSidePanel(rootEl, () => emit("close"));

const users = ref<UserData[]>([]);
const usersSpool = ref<UserData[]>([]);
const loading = ref(true);
const onlyPartners = ref(false);
const showLoadMoreBt = ref(false);
const spoolChunkSize = 200;
const userCount = ref(0);
const activeLast24h = ref(0);
const activeLast7days = ref(0);
const activeLast30days = ref(0);

const filteredItems = computed<UserData[]>(() => {
	if (onlyPartners.value) {
		return usersSpool.value.filter((v) => v.user && v.user.broadcaster_type == "partner");
	}
	return usersSpool.value;
});

function formatDate(u: UserData): string {
	const d = new Date(u.date);
	return Utils.formatDate(d);
}

onMounted(() => {
	const contentEl = content.value!;
	contentEl.addEventListener("scroll", (ev: Event): void => {
		if (contentEl.clientHeight + contentEl.scrollTop >= contentEl.scrollHeight) {
			if (!loading.value) {
				loadNextUsers();
			}
		}
	});
	updateList();
});

function getProfilePicURL(u: UserData): string {
	if (!u.user.profile_image_url) return getAsset("icons/user.svg");
	return u.user.profile_image_url.replace("300x300", "70x70");
}

async function updateList(): Promise<void> {
	loading.value = true;
	users.value = [];
	usersSpool.value = [];
	try {
		const { json } = await ApiHelper.call("user/all", "GET");
		if (json.success) {
			const usersList = json.users;
			activeLast24h.value = 0;
			activeLast7days.value = 0;
			activeLast30days.value = 0;
			const offset24h = Date.now() - 24 * 60 * 60 * 1000;
			const offset7days = Date.now() - 7 * 24 * 60 * 60 * 1000;
			const offset30days = Date.now() - 30 * 24 * 60 * 60 * 1000;
			users.value = usersList.sort((a, b) => b.date - a.date);
			for (const c of usersList) {
				const date = c.date;
				if (date > offset24h) activeLast24h.value++;
				if (date > offset7days) activeLast7days.value++;
				if (date > offset30days) activeLast30days.value++;
			}
			userCount.value = users.value.length;
			loadNextUsers();
		} else {
			storeCommon.alert(json.message);
			emit("close");
		}
	} catch (err: unknown) {
		storeCommon.alert("An error occured while loading users<br>");
	}
	loading.value = false;
}

async function loadTimeframe(days: number): Promise<void> {
	const limit = Date.now() - days * 24 * 60 * 60 * 1000;
	let i = 0;
	for (; i < users.value.length; i++) {
		const u = users.value[i]!;
		if (u.date < limit) break;
	}

	if (i > 0) {
		loadNextUsers(i);
	}
}

async function loadNextUsers(chunk?: number): Promise<void> {
	loading.value = true;
	chunk = chunk ? chunk : spoolChunkSize;
	let usersChunk = users.value.splice(0, chunk);
	const ids = usersChunk.map((u) => u.id).filter((v) => parseInt(v).toString() == v);
	const channels = await TwitchUtils.getUserInfo(ids);
	for (const c of channels) {
		const index = usersChunk.findIndex((u) => u.id == c.id);
		usersChunk[index]!.user = c;
	}
	usersSpool.value = usersSpool.value.concat(usersChunk);
	loading.value = false;
	showLoadMoreBt.value = false;

	await nextTick();
	const contentEl = content.value!;
	const listEl = list.value!;
	showLoadMoreBt.value = listEl.offsetTop + listEl.clientHeight < contentEl.clientHeight;
}
</script>

<style scoped lang="less">
.ttuserlist {
	.noResult {
		.center();
		position: absolute;
		text-align: center;
	}

	.head {
		max-width: 100%;
	}

	.content {
		max-width: 100%;
		.stats {
			flex-shrink: 0;
			.table {
				display: grid;
				grid-template-columns: auto auto;
				padding: 0 1em;
				color: var(--color-text);
				p:nth-child(odd) {
					text-align: right;
					margin-right: 0.5em;
				}
				p:nth-child(even) {
					font-weight: bold;
				}
			}

			.ctas {
				margin-top: 0.5em;
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;

				.partners {
					display: flex;
					color: var(--color-text);
					label {
						cursor: pointer;
						margin-right: 0.5em;
					}
				}
			}
		}

		.list {
			@itemWidth: 200px;
			display: grid;
			gap: 0.5em;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));

			.user {
				text-decoration: none;
				color: var(--color-text);

				&:hover {
					background-color: var(--color-primary);
					.header {
						background-color: var(--color-primary-light);
					}
				}

				.header {
					.partner {
						width: 0.8em;
						vertical-align: middle;
					}

					&.error {
						background-color: var(--color-alert);
						.icon {
							background-color: var(--color-dark);
						}
					}
				}

				.details {
					font-size: 0.8em;
				}
			}
		}

		.loadBt,
		.loader {
			margin: auto;
		}
	}
}
</style>
