<template>
	<div class="custombadgesmanager">
		<div class="header">
			<button class="backBt" @click="emit('close')"><Icon name="back" /></button>
			<h1>{{ t("usercard.manage_badges") }}</h1>
		</div>

		<Icon class="loader" name="loader" v-if="loading" />

		<template v-else>
			<PremiumLimitMessage
				v-if="!canCreateBadge"
				premiumLabel="usercard.badge_premium_limit"
				label="usercard.badge_nonPremium_limit"
				:max="$config.MAX_CUSTOM_BADGES"
				:maxPremium="$config.MAX_CUSTOM_BADGES_PREMIUM"
			/>

			<div class="badgeList">
				<TTButton
					class="addBt"
					v-tooltip="t('usercard.add_badgeBt_tt')"
					v-if="canCreateBadge"
					type="file"
					accept="image/*"
					transparent
					theme="secondary"
					@change="onAddBadgeFile"
				>
					<template #icon><Icon name="add" theme="secondary" /></template>
				</TTButton>

				<button
					:class="getBadgeClasses(badge.id)"
					v-for="badge in badgesList"
					:key="badge.id"
					@click="selectBadge(badge.id)"
				>
					<img :src="badge.img" />
				</button>
			</div>

			<template v-if="selectedBadgeId">
				<div
					class="card-item secondary disabledInfo"
					v-if="selectedBadge?.enabled === false"
				>
					<div>{{ t("usercard.badge_disabled") }}</div>
					<div class="enableToggle" v-if="storeAuth.isPremium">
						<label
							for="reactivate_badge"
							@click="
								selectedBadge!.enabled = !selectedBadge!.enabled;
								saveBadges();
							"
							>{{ t("usercard.badge_users_reactivate") }}</label
						>
						<ToggleButton
							id="reactivate_badge"
							v-model="selectedBadge!.enabled"
							@change="saveBadges()"
						/>
					</div>
				</div>

				<input
					class="badgeName"
					type="text"
					v-model="badgeName"
					:placeholder="t('usercard.badge_name_placeholder')"
					maxlength="50"
				/>

				<div class="ctas">
					<TTButton icon="trash" alert @click="deleteBadge(selectedBadgeId)">{{
						t("usercard.delete_badge")
					}}</TTButton>
					<TTButton icon="upload" type="file" @change="onSelectBadgeFile">{{
						t("usercard.replace_badge_file")
					}}</TTButton>
				</div>

				<h2>{{ t("usercard.badge_users") }}</h2>
				<div class="userList" v-if="getUserList(selectedBadgeId).length > 0">
					<div class="user" v-for="user in getUserList(selectedBadgeId)" :key="user.id">
						<button
							class="removeBt"
							@click="removeBadgeFromUser(selectedBadgeId, user)"
						>
							<Icon name="cross" theme="alert" />
						</button>
						<span>{{ user.displayName }}</span>
					</div>
				</div>
				<div class="noUser" v-else>{{ t("usercard.badge_users_none") }}</div>
			</template>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import { computed, nextTick, onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { useConfirm } from "@/composables/useConfirm";
import PremiumLimitMessage from "../params/PremiumLimitMessage.vue";
import ToggleButton from "../ToggleButton.vue";
import TTButton from "../TTButton.vue";

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeUsers = useStoreUsers();
const { confirm } = useConfirm();

const loading = ref<boolean>(true);
const badgeName = ref<string>("");
const selectedBadgeId = ref<string>("");

const userList = ref<TwitchatDataTypes.TwitchatUser[]>([]);

const badgesList = computed(() => storeUsers.customBadgeList);
const selectedBadge = computed(() =>
	storeUsers.customBadgeList.find((v) => v.id == selectedBadgeId.value),
);
const canCreateBadge = computed(
	() =>
		storeUsers.customBadgeList.length <
		(storeAuth.isPremium
			? Config.instance.MAX_CUSTOM_BADGES_PREMIUM
			: Config.instance.MAX_CUSTOM_BADGES),
);

/**
 * Get classes for the given badge ID
 */
function getBadgeClasses(badgeId: string): string[] {
	const res = ["badge"];
	const badge = storeUsers.customBadgeList.find((v) => v.id == badgeId);
	if (selectedBadgeId.value == badgeId) res.push("selected");
	if (badge && badge.enabled === false) res.push("disabled");
	return res;
}

/**
 * Get users related to the given badge ID
 */
function getUserList(badgeId: string): TwitchatDataTypes.TwitchatUser[] {
	const res: TwitchatDataTypes.TwitchatUser[] = [];
	const userBadges = storeUsers.customUserBadges;
	for (const uid in userBadges) {
		if (userBadges[uid]!.findIndex((v) => v.id == badgeId) > -1) {
			const user = userList.value.find((v) => v.id == uid);
			if (user) res.push(user);
		}
	}
	return res;
}

onBeforeMount(() => {
	const userBadges = storeUsers.customUserBadges;
	const uids = Object.keys(userBadges);
	const channelId = storeAuth.twitch.user.id;
	userList.value = [];
	uids.forEach((id) => {
		if (userBadges[id]!.length === 0) return;
		userList.value.push(storeUsers.getUserFrom(userBadges[id]![0]!.platform, channelId, id));
	});
	loading.value = false;

	selectBadge(storeUsers.customBadgeList[0]!.id);
});

watch(
	() => badgeName.value,
	() => onUpdateName(),
);

/**
 * Called when selecting a file for a custom badge
 * @param e
 */
function onAddBadgeFile(e: Event): void {
	const input = e.target as HTMLInputElement;

	const files = input.files;
	if (!files || files.length == 0) return;

	Utils.fileToBase64Img(files[0]!).then((base64Img) => {
		storeUsers.createCustomBadge(base64Img);
	});
}

/**
 * Called when selecting a file for a custom badge
 * @param e
 */
function onSelectBadgeFile(e: Event): void {
	const input = e.target as HTMLInputElement;

	const files = input.files;
	if (!files || files.length == 0) return;

	Utils.fileToBase64Img(files[0]!).then((base64Img) => {
		storeUsers.updateCustomBadgeImage(selectedBadgeId.value, base64Img);
		input.value = "";
	});
}

/**
 * Selects a badge
 * @param badgeId
 */
function selectBadge(badgeId: string): void {
	const badge = storeUsers.customBadgeList.find((v) => v.id == badgeId);
	if (!badge) return;
	selectedBadgeId.value = badge.id;
	badgeName.value = badge.name || "";
}

/**
 * Delete a badge
 * @param badgeId
 */
function deleteBadge(badgeId: string): void {
	confirm(
		t("usercard.delete_badge_confirm.title"),
		t("usercard.delete_badge_confirm.description"),
	)
		.then(() => {
			storeUsers.deleteCustomBadge(badgeId);
			nextTick().then(() => {
				if (storeUsers.customBadgeList.length > 0) {
					selectedBadgeId.value = storeUsers.customBadgeList[0]!.id;
				} else {
					selectedBadgeId.value = "";
				}
			});
		})
		.catch(() => {
			/*ignore*/
		});
}

/**
 * Removes the given badge from the user
 * @param user
 */
function removeBadgeFromUser(badgeId: string, user: TwitchatDataTypes.TwitchatUser): void {
	const channelId = storeAuth.twitch.user.id;
	storeUsers.removeCustomBadge(user.id, badgeId, channelId);
}

/**
 * Called when badge name is updated
 */
function onUpdateName(): void {
	const badge = storeUsers.customBadgeList.find((v) => v.id == selectedBadgeId.value);
	if (!badge) return;
	storeUsers.updateCustomBadgeName(badge.id, badgeName.value);
}

/**
 * Saves custom user badges
 */
function saveBadges(): void {
	storeUsers.saveCustomBadges();
}
</script>

<style scoped lang="less">
.custombadgesmanager {
	padding-bottom: 4px; //No idea why but this avoids scrollbar to show up when unnecessary

	.header {
		display: flex;
		flex-direction: row;
		align-items: center;
		.backBt {
			padding: 0.85em 1em;
			color: var(--color-text);
			.icon {
				height: 1em;
				transition: transform 0.15s;
			}
			&:hover {
				.icon {
					transform: scale(1.2);
				}
			}
		}
		h1 {
			font-size: 2em;
			text-align: center;
			flex-grow: 1;
		}
	}

	h2 {
		font-size: 1.5em;
		text-align: center;
		margin-top: 0.5em;
	}

	.badgeList {
		gap: 5px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		.badge {
			width: 32px;
			height: 32px;
			opacity: 0.75;
			// outline: 1px solid var(--color-text);
			background-color: var(--color-text);
			box-shadow: 2px 2px 2px 2px rgba(0, 0, 0, 0.5);
			transition: all 0.1s;
			img {
				width: 100%;
				height: 100%;
			}

			&.selected {
				opacity: 1;
				outline: 1px solid var(--color-secondary);
				z-index: 1;
				background-color: var(--color-secondary);
				width: 40px;
				height: 40px;
			}

			&.disabled {
				outline: 2px dashed var(--color-alert);
				background-color: transparent;
				background-image: repeating-linear-gradient(
					-45deg,
					var(--color-alert),
					var(--color-alert) 5px,
					transparent 5px,
					transparent 10px
				);
				img {
					opacity: 0.35;
				}
			}
		}

		.addBt {
			height: 32px;
			border: 1px dashed var(--color-secondary);
			padding: 8px;
			position: relative;
			box-shadow: unset;
			border-radius: 0;
			.icon {
				height: 100%;
				:deep(svg) {
					vertical-align: top;
				}
			}

			input {
				position: absolute;
				cursor: pointer;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				padding: 0;
				margin: 0;
				&::file-selector-button {
					cursor: pointer;
				}
			}
		}
	}

	.disabledInfo {
		text-align: center;
		.enableToggle {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			justify-content: center;
			margin-top: 0.5em;
			label {
				cursor: pointer;
			}
		}
	}

	.badgeName {
		margin: auto;
		width: 100%;
		max-width: 350px;
	}

	.ctas {
		text-align: center;
		.button:not(:last-child) {
			margin-right: 0.5em;
		}
	}

	.userList {
		row-gap: 0.5em;
		column-gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		.user {
			.removeBt {
				vertical-align: middle;
				.icon {
					height: 0.8em;
					margin-right: 0.25em;
				}
			}
		}
	}

	.noUser {
		text-align: center;
		font-style: italic;
	}

	.loader {
		margin: auto;
		display: block;
		width: fit-content;
	}
}
</style>

