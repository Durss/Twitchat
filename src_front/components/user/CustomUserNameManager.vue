<template>
	<div class="customusernamemanager">
		<div class="header">
			<button class="backBt" @click="emit('back')"><Icon name="back" /></button>
			<h1>{{ t("usercard.manage_usernames") }}</h1>
			<button class="backBt" @click="emit('close')"><Icon name="cross" /></button>
		</div>

		<section class="card-item">
			<div class="sectionHead">
				<span class="title">{{ t("usercard.manage_usernames_add") }}</span>
			</div>
			<PremiumLimitMessage
				v-if="nonPremiumLimitReached"
				class="limit"
				premiumLabel="usercard.manage_usernames_premium_limit"
				label="usercard.manage_usernames_nonPremium_limit"
				:max="$config.MAX_CUSTOM_USERNAMES"
				:maxPremium="$config.MAX_CUSTOM_USERNAMES_PREMIUM"
			/>
			<form v-else-if="selectedUser" class="addForm" @submit.prevent="submitCustomName()">
				<span class="user">
					<img
						:src="selectedUser.profile_image_url.replace(/300x300/gi, '50x50')"
						class="avatar"
						alt="avatar"
					/>
					<span class="original">{{ selectedUser.display_name }}</span>
					<button type="button" class="removeBt" @click="selectedUser = undefined">
						<Icon name="cross" />
					</button>
				</span>
				<input
					type="text"
					v-model="customName"
					maxlength="25"
					:placeholder="t('global.login_placeholder')"
					v-autofocus
				/>
				<TTButton type="submit" icon="checkmark" :disabled="!customName.trim()" />
			</form>
			<SearchUserForm
				v-else
				inline
				v-model="selectedUser"
				:autofocus="false"
				@select="onSelectUser"
			/>
		</section>

		<section class="card-item userHolder" v-if="itemList.length > 0">
			<div class="sectionHead">
				<span class="title">{{ t("usercard.manage_usernames_list") }}</span>
				<span class="count">{{ itemList.length }} / {{ maxUsernames }}</span>
			</div>
			<input
				class="filter"
				type="text"
				v-model="filter"
				:placeholder="t('global.search_placeholder')"
				@keyup.esc.stop="filter = ''"
			/>
			<InfiniteList
				v-if="filteredList.length > 0"
				class="userList"
				lockScroll
				:dataset="filteredList"
				:itemSize="ROW_HEIGHT"
				:itemMargin="ROW_MARGIN"
				:style="{ height: listHeight + 'px' }"
				v-slot="{ item }"
			>
				<span class="card-item user">
					<form
						v-if="editedUid == item.user.id"
						class="editForm"
						@submit.prevent="submitEdit(item.user)"
					>
						<span class="original">{{ item.user.displayNameOriginal }}</span>
						<input
							type="text"
							v-model="editedName"
							maxlength="25"
							:placeholder="t('global.login_placeholder')"
							v-autofocus
							@blur="submitEdit(item.user)"
							@keyup.esc.stop="editedUid = ''"
						/>
					</form>
					<button
						v-else
						type="button"
						class="label"
						v-tooltip="t('usercard.manage_usernames_editBt')"
						@click="startEdit(item)"
					>
						<span class="original">{{ item.user.displayNameOriginal }}</span>
						<span class="rename">({{ item.customName }})</span>
					</button>
					<TTButton
						icon="trash"
						transparent
						v-tooltip="t('usercard.manage_usernames_removeBt')"
						@click="deleteCustomName(item.user.id)"
					/>
				</span>
			</InfiniteList>
			<div class="noResult" v-else>{{ t("global.no_result") }}</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Config from "@/utils/Config.js";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import InfiniteList from "../InfiniteList.vue";
import SearchUserForm from "../SearchUserForm.vue";
import TTButton from "../TTButton.vue";
import PremiumLimitMessage from "../params/PremiumLimitMessage.vue";

const emit = defineEmits<{ close: []; back: [] }>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeUsers = useStoreUsers();

type ListItem = { customName: string; user: TwitchatDataTypes.TwitchatUser };

const ROW_HEIGHT = 30;
const ROW_MARGIN = 4;
const MAX_VISIBLE_ROWS = 8;

const itemList = ref<ListItem[]>([]);
const filter = ref("");
const selectedUser = ref<TwitchDataTypes.UserInfo>();
const customName = ref("");
const editedUid = ref("");
const editedName = ref("");

const maxUsernames = computed(() => {
	return storeAuth.isPremium
		? Config.instance.MAX_CUSTOM_USERNAMES_PREMIUM
		: Config.instance.MAX_CUSTOM_USERNAMES;
});

//Only non-premium limit is enforced (see storeUsers.setCustomUsername)
const nonPremiumLimitReached = computed(
	() => !storeAuth.isPremium && itemList.value.length >= Config.instance.MAX_CUSTOM_USERNAMES,
);

const filteredList = computed(() => {
	const search = filter.value.trim().toLowerCase();
	if (!search) return itemList.value;
	return itemList.value.filter(
		(v) =>
			v.customName.toLowerCase().includes(search) ||
			v.user.displayNameOriginal.toLowerCase().includes(search) ||
			v.user.login.toLowerCase().includes(search),
	);
});

//InfiniteList fills its parent's height, grow it with the content up to a limit
const listHeight = computed(
	() => Math.min(filteredList.value.length, MAX_VISIBLE_ROWS) * (ROW_HEIGHT + ROW_MARGIN),
);

function deleteCustomName(uid: string): void {
	storeUsers.removeCustomUsername(uid);
	refreshList();
}

/**
 * Prefills the form with the user's current custom name if any
 */
function onSelectUser(user: TwitchDataTypes.UserInfo): void {
	customName.value = storeUsers.customUsernames[user.id]?.name || "";
}

/**
 * Sets the custom name of the selected user
 */
function submitCustomName(): void {
	if (!selectedUser.value) return;
	const channelId = storeAuth.twitch.user.id;
	const user = storeUsers.getUserFrom(
		"twitch",
		channelId,
		selectedUser.value.id,
		selectedUser.value.login,
		selectedUser.value.display_name,
	);
	if (storeUsers.setCustomUsername(user, customName.value, channelId, "twitch")) {
		selectedUser.value = undefined;
		customName.value = "";
		refreshList();
	}
}

/**
 * Starts inline edition of a custom name
 */
function startEdit(item: ListItem): void {
	editedUid.value = item.user.id;
	editedName.value = item.customName;
}

/**
 * Saves the inline edited custom name.
 * Called on submit AND blur, the latter also firing when the
 * input unmounts, hence the editedUid guard.
 */
function submitEdit(user: TwitchatDataTypes.TwitchatUser): void {
	if (editedUid.value != user.id) return;
	editedUid.value = "";
	//Deleting is the cross button's job, ignore empty names
	if (!editedName.value.trim()) return;
	const channelId = storeUsers.customUsernames[user.id]?.channel || storeAuth.twitch.user.id;
	storeUsers.setCustomUsername(user, editedName.value, channelId, user.platform);
	refreshList();
}

function refreshList(): void {
	const customUsernames = storeUsers.customUsernames;
	itemList.value = [];
	for (const uid in customUsernames) {
		const u = customUsernames[uid]!;
		itemList.value.push({
			user: storeUsers.getUserFrom(u.platform, u.channel, uid),
			customName: u.name,
		});
	}
}

onMounted(() => {
	refreshList();
});
</script>

<style scoped lang="less">
.customusernamemanager {
	gap: 0.75em;
	display: flex;
	flex-direction: column;
	height: 100%;

	.header {
		display: flex;
		align-items: center;
		.backBt {
			padding: 0.5em 0.75em;
			color: var(--color-text);
			.icon {
				height: 1em;
			}
		}
		h1 {
			font-size: 1.5em;
			flex-grow: 1;
			text-align: center;
			margin-top: -5px;
		}
	}

	.sectionHead {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 0.5em;
		.title {
			font-weight: bold;
		}
		.count {
			font-size: 0.85em;
			opacity: 0.6;
		}
	}

	.limit {
		font-size: 0.85em;
	}

	.addForm {
		.user {
			gap: 0.35em;
			display: inline-flex;
			align-items: center;
			padding: 0.2em 0.25em 0.2em 0.6em;
			border-radius: 2em;
			background-color: rgba(255, 255, 255, 0.08);
			font-size: 0.9em;
			.avatar {
				height: 1.5em;
				margin-left: -0.4em;
				border-radius: 50%;
			}
			.removeBt {
				display: flex;
				padding: 0.35em;
				border-radius: 50%;
				color: var(--color-text);
				opacity: 0.6;
				.icon {
					height: 0.6em;
					width: 0.6em;
				}
				&:hover {
					opacity: 1;
					background-color: var(--color-alert);
				}
			}
		}
	}

	.filter {
		width: 100%;
		margin-bottom: 0.5em;
	}

	.userHolder {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.userList {
		flex: 1;
		.user {
			display: flex;
			width: 100%;
			height: 100%;
			align-items: center;
			padding-right: 0;
			.label,
			.editForm {
				flex-grow: 1;
				min-width: 0;
				gap: 0.35em;
				display: inline-flex;
				align-items: center;
			}
			.label {
				overflow: hidden;
				white-space: nowrap;
				color: var(--color-text);
				&:hover .rename {
					opacity: 1;
					text-decoration: underline;
				}
				.original {
					flex-shrink: 0;
				}
				.rename {
					font-style: italic;
					opacity: 0.7;
					overflow: hidden;
					text-overflow: ellipsis;
				}
			}
			.editForm input {
				width: 10em;
				padding: 0.1em 0.4em;
				font-size: 1em;
			}
		}
	}

	.noResult {
		font-style: italic;
		opacity: 0.7;
		text-align: center;
	}

	.addForm {
		gap: 0.5em;
		display: flex;
		align-items: center;
		.user {
			flex-shrink: 0;
			max-width: 50%;
			.original {
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}
		input {
			flex-grow: 1;
			min-width: 0;
		}
	}
}
</style>

