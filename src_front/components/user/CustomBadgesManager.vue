<template>
	<div class="custombadgesmanager">
		<div class="header">
			<button class="backBt" @click="emit('back')"><Icon name="back" /></button>
			<h1>{{ t("usercard.manage_usernames") }}</h1>
			<button class="backBt" @click="emit('close')"><Icon name="cross" /></button>
		</div>

		<Icon class="loader" name="loader" v-if="loading" />

		<template v-else>
			<section class="card-item library">
				<div class="sectionHead">
					<span class="title">{{ t("usercard.badge_list") }}</span>
					<span class="count">{{ badgesList.length }} / {{ maxBadges }}</span>
				</div>
				<div class="badgeList">
					<button
						:class="getBadgeClasses(ALL_BADGES)"
						class="all"
						v-tooltip="t('premium.cleanup.custom_badges_attribution')"
						@click="selectBadge(ALL_BADGES)"
					>
						{{ t("usercard.badge_all") }}
					</button>
					<button
						:class="getBadgeClasses(badge.id)"
						v-for="badge in badgesList"
						:key="badge.id"
						@click="selectBadge(badge.id)"
					>
						<img :src="badge.img" />
						<Icon v-if="badge.enabled === false" class="offIcon" name="alert" />
					</button>
					<label
						class="badge addBt"
						v-if="canCreateBadge"
						v-tooltip="t('usercard.add_badgeBt_tt')"
					>
						<Icon name="add" />
						<input type="file" accept="image/*" @change="onAddBadgeFile" />
					</label>
				</div>
				<PremiumLimitMessage
					class="limit"
					v-if="!canCreateBadge"
					premiumLabel="usercard.badge_premium_limit"
					label="usercard.badge_nonPremium_limit"
					:max="$config.MAX_CUSTOM_BADGES"
					:maxPremium="$config.MAX_CUSTOM_BADGES_PREMIUM"
				/>
			</section>

			<section class="card-item details" v-if="selectedBadge || showAll">
				<div class="card-item alert disabledInfo" v-if="selectedBadge?.enabled === false">
					<Icon name="alert" />
					<template v-if="canEnableBadge">
						<span class="text">{{ t("usercard.badge_disabled") }}</span>
						<ToggleButton
							light
							v-model="selectedBadge.enabled"
							v-tooltip="t('usercard.badge_users_reactivate')"
							@change="saveBadges()"
						/>
					</template>
					<span class="text" v-else>{{
						t("usercard.badge_disabled_notPremium", {
							MAX: $config.MAX_CUSTOM_BADGES,
							MAX_PREMIUM: $config.MAX_CUSTOM_BADGES_PREMIUM,
						})
					}}</span>
				</div>

				<div class="identity" v-if="selectedBadge">
					<label
						class="preview"
						:class="{ disabled: selectedBadge.enabled === false }"
						v-tooltip="t('usercard.replace_badge_file')"
					>
						<img :src="selectedBadge.img" />
						<span class="edit"><Icon name="upload" /></span>
						<input type="file" accept="image/*" @change="onSelectBadgeFile" />
					</label>
					<div class="fields">
						<input
							class="badgeName"
							type="text"
							v-model="badgeName"
							:placeholder="t('usercard.badge_name_placeholder')"
							maxlength="50"
						/>
						<div class="ctas">
							<TTButton small icon="upload" type="file" @change="onSelectBadgeFile">{{
								t("usercard.replace_badge_file")
							}}</TTButton>
							<TTButton
								small
								icon="trash"
								alert
								@click="deleteBadge(selectedBadgeId)"
								>{{ t("usercard.delete_badge") }}</TTButton
							>
						</div>
					</div>
				</div>

				<div class="sectionHead" :class="{ users: !showAll }">
					<template v-if="showAll">
						<span class="title">{{
							t("premium.cleanup.custom_badges_attribution")
						}}</span>
						<span class="count">{{ usedAttributions }} / {{ maxAttributions }}</span>
					</template>
					<template v-else>
						<span class="title">{{ t("usercard.badge_users") }}</span>
						<span class="count">{{ selectedUsers.length }}</span>
					</template>
				</div>
				<PremiumLimitMessage
					v-if="attributionLimitReached"
					class="limit"
					premiumLabel="usercard.badge_users_premium_limit"
					label="usercard.badge_users_nonPremium_limit"
					:max="$config.MAX_CUSTOM_BADGES_ATTRIBUTION"
					:maxPremium="$config.MAX_CUSTOM_BADGES_ATTRIBUTION_PREMIUM"
				/>
				<SearchUserForm
					v-else-if="!showAll"
					inline
					:autofocus="false"
					:excludedUserIds="selectedUsers.map((v) => v.id)"
					@select="giveBadgeToUser"
				/>
				<InfiniteList
					v-if="selectedUsers.length > 0"
					class="userList"
					lockScroll
					:dataset="selectedUsers"
					:itemSize="ROW_HEIGHT"
					:itemMargin="ROW_MARGIN"
					:style="{ height: listHeight + 'px' }"
					v-slot="{ item: user }"
				>
					<span class="card-item user" v-if="showAll">
						<span class="minis">
							<img
								v-for="badge in storeUsers.customUserBadges[user.id]"
								:key="badge.id"
								:src="badgeImgById.get(badge.id)"
								class="mini"
							/>
						</span>
						<span class="name">{{ user.displayName }}</span>
						<TTButton icon="trash" transparent @click="removeAllBadgesFromUser(user)" />
					</span>
					<span class="card-item user" v-else>
						<img :src="selectedBadge?.img" class="mini" />
						<span class="name">{{ user.displayName }}</span>
						<TTButton
							icon="trash"
							transparent
							@click="removeBadgeFromUser(selectedBadgeId, user)"
						/>
					</span>
				</InfiniteList>
				<div class="noUser" v-else>{{ t("usercard.badge_users_none") }}</div>
			</section>
		</template>
	</div>
</template>

<script setup lang="ts">
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Config from "@/utils/Config";
import { fileToBase64Img } from "@/utils/utils/fileToBase64.js";
import { computed, nextTick, onBeforeMount, ref, shallowReactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import PremiumLimitMessage from "../params/PremiumLimitMessage.vue";
import InfiniteList from "../InfiniteList.vue";
import SearchUserForm from "../SearchUserForm.vue";
import ToggleButton from "../ToggleButton.vue";
import TTButton from "../TTButton.vue";
import Icon from "../Icon.vue";

const emit = defineEmits<{ close: []; back: [] }>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeUsers = useStoreUsers();
const { confirm } = useConfirm();

const ROW_HEIGHT = 30;
const ROW_MARGIN = 4;
const MAX_VISIBLE_ROWS = 8;
//Fake badge ID listing the users of all badges
const ALL_BADGES = "all";

const loading = ref<boolean>(true);
const badgeName = ref<string>("");
const selectedBadgeId = ref<string>("");

//Map for O(1) lookups, there can be up to 10k users with badges.
//Shallow as users are already reactive store objects.
const userById = shallowReactive(new Map<string, TwitchatDataTypes.TwitchatUser>());

const badgesList = computed(() => storeUsers.customBadgeList);
const selectedBadge = computed(() =>
	storeUsers.customBadgeList.find((v) => v.id == selectedBadgeId.value),
);
const showAll = computed(() => selectedBadgeId.value == ALL_BADGES);
const badgeImgById = computed(
	() => new Map(storeUsers.customBadgeList.map((v) => [v.id, v.img] as const)),
);
const maxBadges = computed(() =>
	storeAuth.isPremium
		? Config.instance.MAX_CUSTOM_BADGES_PREMIUM
		: Config.instance.MAX_CUSTOM_BADGES,
);
const canCreateBadge = computed(() => storeUsers.customBadgeList.length < maxBadges.value);
//Non-premium limit only applies to enabled badges (see NonPremiumCleanup)
const canEnableBadge = computed(
	() =>
		storeAuth.isPremium ||
		storeUsers.customBadgeList.filter((v) => v.enabled !== false).length <
			Config.instance.MAX_CUSTOM_BADGES,
);
const selectedUsers = computed(() => getUserList(selectedBadgeId.value));
//InfiniteList fills its parent's height, grow it with the content up to a limit
const listHeight = computed(
	() => Math.min(selectedUsers.value.length, MAX_VISIBLE_ROWS) * (ROW_HEIGHT + ROW_MARGIN),
);
//Attribution slots are counted per user, whatever their badge count
//(see storeUsers.giveCustomBadge)
const usedAttributions = computed(() => Object.keys(storeUsers.customUserBadges).length);
const maxAttributions = computed(() =>
	storeAuth.isPremium
		? Config.instance.MAX_CUSTOM_BADGES_ATTRIBUTION_PREMIUM
		: Config.instance.MAX_CUSTOM_BADGES_ATTRIBUTION,
);
//Only non-premium limit is enforced
const attributionLimitReached = computed(
	() =>
		!storeAuth.isPremium &&
		usedAttributions.value >= Config.instance.MAX_CUSTOM_BADGES_ATTRIBUTION,
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
 * Get users related to the given badge ID, or users with any badge for ALL_BADGES
 */
function getUserList(badgeId: string): TwitchatDataTypes.TwitchatUser[] {
	const res: TwitchatDataTypes.TwitchatUser[] = [];
	const userBadges = storeUsers.customUserBadges;
	for (const uid in userBadges) {
		const badges = userBadges[uid]!;
		const match =
			badgeId == ALL_BADGES
				? badges.length > 0
				: badges.findIndex((v) => v.id == badgeId) > -1;
		if (match) {
			const user = userById.get(uid);
			if (user) res.push(user);
		}
	}
	return res;
}

onBeforeMount(() => {
	const userBadges = storeUsers.customUserBadges;
	const uids = Object.keys(userBadges);
	const channelId = storeAuth.twitch.user.id;
	userById.clear();
	uids.forEach((id) => {
		if (userBadges[id]!.length === 0) return;
		userById.set(id, storeUsers.getUserFrom(userBadges[id]![0]!.platform, channelId, id));
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

	fileToBase64Img(files[0]!).then((base64Img) => {
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

	fileToBase64Img(files[0]!).then((base64Img) => {
		storeUsers.updateCustomBadgeImage(selectedBadgeId.value, base64Img);
		input.value = "";
	});
}

/**
 * Selects a badge
 * @param badgeId
 */
function selectBadge(badgeId: string): void {
	if (badgeId == ALL_BADGES) {
		selectedBadgeId.value = ALL_BADGES;
		return;
	}
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
					selectBadge(storeUsers.customBadgeList[0]!.id);
				} else {
					selectBadge("");
					emit("close");
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
 * Removes all custom badges from the user, freeing an attribution slot
 * @param user
 */
function removeAllBadgesFromUser(user: TwitchatDataTypes.TwitchatUser): void {
	confirm(
		t("premium.cleanup.delete_badges_title"),
		t("premium.cleanup.delete_badges_description"),
	)
		.then(() => {
			delete storeUsers.customUserBadges[user.id];
			storeUsers.saveCustomBadges();
		})
		.catch(() => {
			/*ignore*/
		});
}

/**
 * Gives the selected badge to the given user
 * @param user
 */
function giveBadgeToUser(user: TwitchDataTypes.UserInfo): void {
	const channelId = storeAuth.twitch.user.id;
	if (!storeUsers.giveCustomBadge(user.id, "twitch", selectedBadgeId.value, channelId)) return;
	//userById is only built on mount, register newcomers so they show up
	if (!userById.has(user.id)) {
		userById.set(
			user.id,
			storeUsers.getUserFrom("twitch", channelId, user.id, user.login, user.display_name),
		);
	}
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
		&.users {
			margin-bottom: 0;
			padding-top: 0.75em;
			border-top: 1px solid var(--splitter-color, rgba(255, 255, 255, 0.1));
		}
	}

	.badgeList {
		gap: 8px;
		display: grid;
		grid-template-columns: repeat(auto-fill, 40px);
		.badge {
			width: 40px;
			height: 40px;
			padding: 4px;
			border-radius: var(--border-radius);
			background-color: rgba(255, 255, 255, 0.06);
			position: relative;
			cursor: pointer;
			transition:
				background-color 0.1s,
				box-shadow 0.1s;
			img {
				width: 100%;
				height: 100%;
				display: block;
			}
			&:hover {
				background-color: rgba(255, 255, 255, 0.15);
			}
			&.selected {
				box-shadow: 0 0 0 2px var(--color-secondary);
			}
			&.all {
				font-size: 0.7em;
				font-weight: bold;
				color: var(--color-text);
			}
			&.disabled {
				img {
					filter: grayscale(1);
					opacity: 0.4;
				}
				.offIcon {
					position: absolute;
					right: -7px;
					top: -7px;
					height: 1.25em;
					width: 1.25em;
					color: white;
					background-color: var(--color-secondary);
					padding: 0.1em 0.2em 0.2em 0.2em;
					border-radius: 50%;
				}
			}
		}
		.addBt {
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px dashed var(--color-secondary);
			background: transparent;
			color: var(--color-secondary);
			.icon {
				height: 16px;
			}
			input {
				position: absolute;
				inset: 0;
				opacity: 0;
				cursor: pointer;
			}
		}
	}
	.limit {
		margin-top: 0.75em;
		font-size: 0.85em;
	}

	.details {
		gap: 0.75em;
		display: flex;
		flex-direction: column;
		flex: 1;
		.limit {
			margin-top: 0;
		}
	}

	.disabledInfo {
		gap: 0.5em;
		display: flex;
		align-items: center;
		padding: 0.5em;
		font-size: 0.85em;
		.icon {
			height: 1.2em;
			flex-shrink: 0;
		}
		.text {
			flex-grow: 1;
		}
	}

	.identity {
		gap: 0.75em;
		display: flex;
		align-items: center;
		.preview {
			width: 72px;
			height: 72px;
			flex-shrink: 0;
			position: relative;
			cursor: pointer;
			border-radius: var(--border-radius);
			overflow: hidden;
			img {
				width: 100%;
				height: 100%;
				display: block;
			}
			&.disabled img {
				filter: grayscale(1);
				opacity: 0.4;
			}
			.edit {
				position: absolute;
				inset: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				background: rgba(0, 0, 0, 0.55);
				opacity: 0;
				transition: opacity 0.15s;
				.icon {
					height: 1.5em;
				}
			}
			&:hover .edit {
				opacity: 1;
			}
			input {
				position: absolute;
				inset: 0;
				opacity: 0;
				cursor: pointer;
			}
		}
		.fields {
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			min-width: 0;
			.badgeName {
				width: 100%;
			}
			.ctas {
				gap: 0.5em;
				display: flex;
				flex-wrap: wrap;
			}
		}
	}

	.userList {
		flex: 1;
		.user {
			gap: 0.35em;
			display: flex;
			align-items: center;
			width: 100%;
			height: 100%;
			font-size: 0.9em;
			padding-right: 0;
			.mini {
				height: 1.1em;
			}
			.minis {
				gap: 2px;
				display: flex;
				flex-shrink: 0;
				max-width: 50%;
				overflow: hidden;
			}
			.name {
				flex-grow: 1;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}
	}

	.noUser {
		font-style: italic;
		opacity: 0.7;
		text-align: center;
	}
	.loader {
		margin: auto;
		display: block;
		width: fit-content;
	}
}
</style>
