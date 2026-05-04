<template>
	<div class="paramscounters parameterContent">
		<Icon name="count" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="p" keypath="counters.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()" target="_blank">{{
						t("counters.header_link_trigger")
					}}</a>
				</template>
				<template #LINK_OVERLAY>
					<a @click="openOverlays()" target="_blank">{{
						t("counters.header_link_overlay")
					}}</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!showForm">
			<TTButton icon="add" @click="showForm = true" v-if="!maxReached">{{
				t("counters.addBt")
			}}</TTButton>

			<PremiumLimitMessage
				v-else
				label="counters.nonpremium_limit"
				premiumLabel="counters.premium_limit"
				:max="Config.instance.MAX_COUNTERS"
				:maxPremium="Config.instance.MAX_COUNTERS_PREMIUM"
			/>
		</section>

		<section class="card-item primary examples" v-if="!showForm && counterEntries.length == 0">
			<h1>{{ t("counters.examples") }}</h1>
			<OverlayCounter class="counterExample" embed :staticCounterData="counterExample" />
			<OverlayCounter class="counterExample" embed :staticCounterData="progressExample" />
		</section>

		<section class="card-item" v-if="showForm">
			<form @submit.prevent="createCounter()">
				<ParamItem
					:paramData="param_title"
					:errorMessage="t('counters.form.name_conflict')"
				/>
				<ParamItem :paramData="param_value" />
				<ParamItem :paramData="param_more" v-model="param_more.value" />
				<div class="ctas">
					<TTButton type="button" icon="cross" alert @click="cancelForm()">{{
						t("global.cancel")
					}}</TTButton>
					<TTButton
						type="submit"
						v-if="!editedCounter"
						icon="add"
						:disabled="
							param_title.value.length == 0 ||
							param_title.error ||
							param_placeholder.error
						"
						>{{ t("global.create") }}</TTButton
					>
					<TTButton
						type="submit"
						v-else
						icon="edit"
						:disabled="
							param_title.value.length == 0 ||
							param_title.error ||
							param_placeholder.error
						"
						>{{ t("counters.editBt") }}</TTButton
					>
				</div>
			</form>
		</section>

		<draggable
			class="entryList"
			v-model="counterEntries"
			direction="vertical"
			group="counters"
			item-key="counter.id"
			:animation="250"
			@sort="onSortItems()"
		>
			<template #item="{ element: entry, index }: { element: CounterEntry; index: number }">
				<ToggleBlock
					class="counterEntry"
					v-if="counterEntries.length > 0"
					:open="false"
					:key="entry.counter.id"
					:title="entry.counter.name"
					:disabled="!entry.counter.enabled"
				>
					<template #left_actions>
						<ToggleButton
							v-model="entry.counter.enabled"
							*
							@click.stop
							@change="storeCounters.saveCounters()"
							v-if="
								(storeAuth.isPremium && entry.counter.enabled === false) ||
								(!storeAuth.isPremium &&
									(entry.counter.enabled == true || canEnableMore))
							"
						/>
					</template>

					<template #right_actions>
						<template v-if="entry.counter.enabled !== false">
							<span
								class="info loop"
								v-tooltip="t('counters.loop_tt')"
								v-if="entry.counter.loop"
								><Icon name="loop" alt="loop"
							/></span>
							<span
								class="info min"
								v-tooltip="t('counters.min_tt')"
								v-if="entry.counter.min !== false"
								><Icon name="min" alt="min" />{{ entry.counter.min }}</span
							>
							<span
								class="info max"
								v-tooltip="t('counters.max_tt')"
								v-if="entry.counter.max !== false"
								><Icon name="max" alt="max" />{{ entry.counter.max }}</span
							>
							<span
								class="info user"
								v-tooltip="t('counters.user_tt')"
								v-if="entry.counter.perUser"
								><Icon name="user" alt="user" />
								{{ Object.keys(entry.counter.users ?? {}).length }}</span
							>
							<TTButton
								v-tooltip="t('counters.editBt')"
								icon="edit"
								@click.stop="editCounter(entry.counter)"
								data-close-popout
							/>
						</template>
						<TTButton
							@click.stop
							:copy="entry.counter.id"
							icon="id"
							v-tooltip="t('global.copy_id')"
							small
						/>
						<TTButton alert icon="trash" @click.stop="deleteCounter(entry)" />
					</template>

					<div class="content">
						<ParamItem
							class="value"
							v-if="!entry.counter.perUser"
							:paramData="entry.param"
							v-model="entry.param.value"
							@change="onChangeValue(entry)"
						/>

						<div class="userList" v-else>
							<template v-if="Object.keys(entry.counter.users ?? {}).length > 0">
								<div class="search">
									<input
										type="text"
										:placeholder="t('counters.form.search')"
										v-model="entry.search[entry.counter.id]"
										@input="searchUser(entry)"
									/>
									<Icon
										name="loader"
										class="loader"
										v-show="entry.idToLoading[entry.counter.id] === true"
									/>
								</div>

								<TTButton
									class="resetBt"
									v-if="entry.search[entry.counter.id]!.length === 0"
									secondary
									@click="resetUsers(entry)"
									>{{ t("counters.form.reset_all_users") }}</TTButton
								>

								<TTButton
									class="clearBt"
									v-if="entry.search[entry.counter.id]!.length === 0"
									alert
									@click="clearUsers(entry)"
									>{{ t("counters.form.clear_all_users") }}</TTButton
								>

								<TTButton
									class="loadAllBt"
									v-if="
										entry.search[entry.counter.id]!.length === 0 &&
										entry.idToAllLoaded[entry.counter.id] !== true
									"
									@click="loadUsers(entry)"
									:loading="entry.idToLoading[entry.counter.id]"
									>{{ t("counters.form.load_all_users") }}</TTButton
								>

								<div
									class="noResult"
									v-if="entry.idToNoResult[entry.counter.id] === true"
								>
									{{ t("counters.user_not_found") }}
								</div>
							</template>

							<span class="noResult" v-else>{{ t("counters.form.no_users") }}</span>

							<template
								v-if="
									entry.idToUsers[entry.counter.id] &&
									entry.idToUsers[entry.counter.id]!.length > 0
								"
							>
								<div
									class="sort"
									v-if="
										entry.idToUsers[entry.counter.id]!.filter(
											(v) => v.hide !== true,
										).length > 1
									"
								>
									<button @click="sortOn(entry, 'name')">
										{{ t("counters.form.sort_name") }}
										<template
											v-if="entry.sortType[entry.counter.id] === 'name'"
											>{{
												entry.sortDirection[entry.counter.id] == 1
													? "▼"
													: "▲"
											}}</template
										>
									</button>
									<button @click="sortOn(entry, 'points')">
										{{ t("counters.form.sort_points") }}
										<template
											v-if="entry.sortType[entry.counter.id] === 'points'"
											>{{
												entry.sortDirection[entry.counter.id] == 1
													? "▼"
													: "▲"
											}}</template
										>
									</button>
								</div>
								<div
									class="card-item alert error"
									v-if="entry.idToYoutubeConnect[entry.counter.id]"
								>
									<span>{{ t("counters.connect_youtube") }}</span>
									<TTButton
										icon="youtube"
										@click="openYoutubeConnect()"
										alert
										light
										>{{ t("counters.connect_youtubeBt") }}</TTButton
									>
								</div>
								<InfiniteList
									class="scrollableList"
									:dataset="
										entry.idToUsers[entry.counter.id]!.filter(
											(v) => v.hide !== true,
										)
									"
									:itemSize="50"
									:itemMargin="3"
									lockScroll
									v-slot="{ item }: { item: UserEntry }"
								>
									<div class="card-item userItem">
										<img
											v-if="item.user.avatar"
											:src="item.user.avatar"
											class="avatar"
											referrerpolicy="no-referrer"
										/>
										<Icon v-else name="user" class="avatar" />
										<a
											v-if="item.platform == 'twitch'"
											:href="'https://twitch.tv/' + item.user.login"
											class="login"
											target="_blank"
											>{{ item.user.login }}</a
										>
										<a
											v-else-if="item.platform == 'youtube'"
											:href="
												'https://www.youtube.com/channel/' + item.user.id
											"
											class="login"
											target="_blank"
											>{{ item.user.login }}</a
										>
										<a
											v-else-if="item.platform == 'tiktok'"
											:href="'https://www.tiktok.com/@' + item.user.login"
											class="login"
											target="_blank"
											>{{ item.user.login }}</a
										>
										<Icon name="twitch" v-if="item.platform == 'twitch'" />
										<Icon
											name="youtube"
											v-else-if="item.platform == 'youtube'"
										/>
										<Icon name="tiktok" v-else-if="item.platform == 'tiktok'" />
										<ParamItem
											class="value"
											noBackground
											:paramData="item.param"
											@input="onChangeValue(entry, item)"
										/>
										<button class="deleteBt" @click="deleteUser(entry, item)">
											<Icon name="trash" theme="light" />
										</button>
									</div>
								</InfiniteList>
							</template>
						</div>
					</div>
				</ToggleBlock>
			</template>
		</draggable>
	</div>
</template>

<script setup lang="ts">
import InfiniteList from "@/components/InfiniteList.vue";
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import OverlayCounter from "@/components/overlays/OverlayCounter.vue";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCounters as useStoreCounters } from "@/store/counters/storeCounters";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import Config from "@/utils/Config";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import ParamItem from "../ParamItem.vue";
import PremiumLimitMessage from "../PremiumLimitMessage.vue";
import type IParameterContent from "./IParameterContent";
import Icon from "@/components/Icon.vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeCounters = useStoreCounters();
const storeParams = useStoreParams();
const storeUsers = useStoreUsers();

const showForm = ref<boolean>(false);
let timeoutSearch: number = -1;
let timeoutEdit: number = -1;
const editedCounter = ref<TwitchatDataTypes.CounterData | null>(null);
const counterEntries = ref<CounterEntry[]>([]);
const counterExample = ref<TwitchatDataTypes.CounterData>({
	id: Utils.getUUID(),
	placeholderKey: "",
	loop: false,
	perUser: false,
	value: 50,
	name: "My awesome counter",
	min: false,
	max: false,
});
const progressExample = ref<TwitchatDataTypes.CounterData>({
	id: Utils.getUUID(),
	placeholderKey: "",
	loop: false,
	perUser: false,
	value: 50,
	name: "My awesome counter",
	min: 0,
	max: 75,
});

const param_title = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 50,
	labelKey: "counters.form.name",
});
const param_value = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	min: Number.MIN_SAFE_INTEGER,
	max: Number.MAX_SAFE_INTEGER,
	labelKey: "counters.form.value",
});
const param_more = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	type: "boolean",
	value: false,
	labelKey: "counters.form.more",
});
const param_valueMin_toggle = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	type: "boolean",
	value: false,
	labelKey: "counters.form.value_min",
	icon: "min",
});
const param_valueMin_value = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
});
const param_valueMax_toggle = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	type: "boolean",
	value: false,
	labelKey: "counters.form.value_max",
	icon: "max",
});
const param_valueMax_value = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
});
const param_valueLoop_toggle = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "counters.form.value_loop",
	icon: "loop",
});
const param_userSpecific = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "counters.form.value_user",
	icon: "user",
});
const param_placeholder = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "placeholder",
	value: "",
	maxLength: 20,
	labelKey: "counters.form.placholder",
	icon: "broadcast",
	tooltipKey: "counters.form.placholder_tt",
	allowedCharsRegex: "A-z0-9_",
});

const maxReached = computed<boolean>(() => {
	const count = storeCounters.counterList.length;
	const max = storeAuth.isPremium
		? Config.instance.MAX_COUNTERS_PREMIUM
		: Config.instance.MAX_COUNTERS;
	return count >= max;
});

const canEnableMore = computed<boolean>(() => {
	if (storeAuth.isPremium) return false;
	const count = storeCounters.counterList.filter((v) => v.enabled != false).length;
	const max = storeAuth.isPremium
		? Config.instance.MAX_COUNTERS_PREMIUM
		: Config.instance.MAX_COUNTERS;
	return count < max;
});

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

function getUserFromID(id: string): TwitchatDataTypes.TwitchatUser {
	return storeUsers.getUserFrom("twitch", storeAuth.twitch.user.id, id);
}

function openOverlays(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "counter");
}

function onNavigateBack(): boolean {
	return false;
}

/**
 * Create a new counter
 */
function createCounter(): void {
	let placeholderKey = param_placeholder.value.value;
	if (!placeholderKey) {
		//No placeholder define, create a default one from the counter's name
		placeholderKey = Utils.slugify(param_title.value.value).toUpperCase();
		//Load all placeholders
		let hashmap: { [key: string]: boolean } = {};
		for (const c of counterEntries.value) {
			if (editedCounter.value && c.counter.id == editedCounter.value.id) continue;
			hashmap[c.counter.placeholderKey] = true;
		}
		//If a placeholder with the same name exists, adds an increment suffix
		//until a slot is available
		if (hashmap[placeholderKey]) {
			let index = 1;
			while (hashmap[placeholderKey + "_" + index]) index++;
			placeholderKey = placeholderKey + "_" + index;
		}
	}

	const data: TwitchatDataTypes.CounterData = {
		id: editedCounter.value ? editedCounter.value.id : Utils.getUUID(),
		placeholderKey,
		name: param_title.value.value,
		value: param_value.value.value,
		max: param_valueMax_toggle.value.value === true ? param_valueMax_value.value.value : false,
		min: param_valueMin_toggle.value.value === true ? param_valueMin_value.value.value : false,
		loop: param_valueLoop_toggle.value.value,
		perUser: param_userSpecific.value.value,
	};
	if (editedCounter.value) {
		editedCounter.value = null;
		storeCounters.updateCounter(data);
	} else {
		storeCounters.addCounter(data);
		buildEntries();
	}
	showForm.value = false;
	cancelForm();
}

/**
 * Called when editing the value of an existing counter
 */
function onChangeValue(entry: CounterEntry, userEntry?: UserEntry): void {
	clearTimeout(timeoutEdit);
	let diff = 0;
	timeoutEdit = window.setTimeout(() => {
		if (userEntry) {
			diff = userEntry.param.value - entry.counter.users![userEntry.user.id]!.value;
		} else {
			diff = entry.param.value - entry.counter.value;
		}
		storeCounters.increment(entry.counter.id, "ADD", diff, undefined, userEntry?.user.id);
	}, 500);
}

/**
 * Called when requesting to delete a counter
 * @param counter
 */
function deleteCounter(entry: CounterEntry): void {
	confirm(t("counters.delete_confirm.title"), t("counters.delete_confirm.desc"))
		.then(() => {
			storeCounters.delCounter(entry.counter);
			buildEntries();
		})
		.catch(() => {
			/* ignore */
		});
}

/**
 * Start a counter edition
 */
function editCounter(c: TwitchatDataTypes.CounterData): void {
	editedCounter.value = c;
	showForm.value = true;
	param_title.value.value = c.name;
	param_value.value.value = c.value;
	param_placeholder.value.value = c.placeholderKey;
	param_valueMax_toggle.value.value = c.max !== false;
	param_valueMax_value.value.value = c.max === false ? 0 : c.max;
	param_valueMin_toggle.value.value = c.min !== false;
	param_valueMin_value.value.value = c.min === false ? 0 : c.min;
	param_valueLoop_toggle.value.value = c.loop;
	param_userSpecific.value.value = c.perUser;
	param_more.value.value = c.loop || c.min !== false || c.max !== false || c.perUser;
}

/**
 * Called when canceling counter edition
 */
function cancelForm(): void {
	editedCounter.value = null;
	showForm.value = false;
	param_title.value.value = "";
	param_value.value.value = 0;
	param_placeholder.value.value = "";
	param_valueMax_toggle.value.value = false;
	param_valueMax_value.value.value = 0;
	param_valueMin_toggle.value.value = false;
	param_valueMin_value.value.value = 0;
	param_valueLoop_toggle.value.value = false;
	param_userSpecific.value.value = false;
	param_more.value.value = false;
}

/**
 * Open a user's profile info
 */
function openUserCard(user: TwitchatDataTypes.TwitchatUser): void {
	storeUsers.openUserCard(user);
}

/**
 * Open a user's profile info
 */
function deleteUser(counterEntry: CounterEntry, userEntry: UserEntry): void {
	if (!counterEntry.counter.users) return;
	delete counterEntry.counter.users[userEntry.user.id];
	counterEntry.idToUsers[counterEntry.counter.id] = counterEntry.idToUsers[
		counterEntry.counter.id
	]!.filter((v) => v.user.id != userEntry.user.id);
	storeCounters.updateCounter(counterEntry.counter);
}

/**
 * Search for a user.
 * If all users are loaded, search within them.
 * If users are not loaded, query twitch for a user matching current search
 */
function searchUser(entry: CounterEntry): void {
	const counter = entry.counter;
	const search = entry.search[counter.id]!.toLowerCase();
	let preloadedUsers = entry.idToUsers[counter.id];
	entry.idToNoResult[counter.id] = false;
	if (search.length == 0) {
		if (entry.idToAllLoaded[counter.id] !== true) delete entry.idToUsers[counter.id];
		else if (preloadedUsers) preloadedUsers.forEach((v) => (v.hide = false));
		return;
	}
	//If there are more than 1 loaded users, that's because they've all been loaded
	//In this case, just search there instead of polling from twitch API
	if (entry.idToAllLoaded[counter.id] === true && preloadedUsers && preloadedUsers.length > 1) {
		let hasResult = false;
		for (const u of preloadedUsers) {
			u.hide = false;
			if (
				u.user.login.indexOf(search) == -1 &&
				u.user.login.toLowerCase().indexOf(search) == -1
			) {
				u.hide = true;
			} else {
				hasResult = true;
			}
		}
		if (hasResult) return;
	}

	if (preloadedUsers) {
		preloadedUsers.forEach((v) => (v.hide = true));
	}

	entry.idToLoading[counter.id] = true;
	entry.idToUsers[counter.id] = [];

	//Search from "login" property if it exists
	if (counter.users) {
		for (const key in counter.users) {
			const user = counter.users[key]!;
			//If entry has a login and login matches search
			if (user.login && user.login!.toLowerCase().indexOf(search) > -1) {
				entry.idToUsers[counter.id]!.push({
					hide: false,
					param: reactive({
						type: "number",
						value: user.value,
						min: counter.min || undefined,
						max: counter.max || undefined,
					}),
					platform: user.platform,
					user: {
						id: key,
						login: user.login!,
					},
				});
			}
		}
	}

	//Users not loaded yet, search user from Twitch API
	clearTimeout(timeoutSearch);
	timeoutSearch = window.setTimeout(async () => {
		const users = await TwitchUtils.getUserInfo(undefined, [search]);
		if (users.length > 0) {
			const u = users[0]!;
			if (counter.users![u.id] != undefined) {
				//If user isn't already in the results
				//and user is in the counter users
				if ((entry.counter.users || {})[u.id]) {
					const existingIndex = (entry.idToUsers[counter.id] || []).findIndex(
						(v) => v.user.id === u.id,
					);
					const value =
						counter.users && counter.users[u.id] ? counter.users![u.id]!.value : 0;
					const userEntry: UserEntry = {
						hide: false,
						param: reactive({
							type: "number",
							value: value,
							min: counter.min || undefined,
							max: counter.max || undefined,
						}),
						platform: "twitch",
						user: {
							id: u.id,
							login: u.display_name,
							avatar: u.profile_image_url,
						},
					};
					if (existingIndex > -1) {
						entry.idToUsers[counter.id]![existingIndex] = userEntry;
					} else {
						entry.idToUsers[counter.id]!.push(userEntry);
					}
				}
			}
		}
		entry.idToNoResult[counter.id] =
			(entry.idToUsers[counter.id] || []).filter((v) => !v.hide).length == 0;
		entry.idToLoading[counter.id] = false;
	}, 500);
}

/**
 * Load all users
 * @param counterItem
 */
async function loadUsers(counterItem: CounterEntry): Promise<void> {
	counterItem.idToLoading[counterItem.counter.id] = true;

	clearTimeout(timeoutSearch);
	let entries: UserEntry[] = [];
	let loginUpdated: boolean = false;

	const twitchUsers = await TwitchUtils.getUserInfo(
		Object.keys(counterItem.counter.users!).filter(
			(v) => counterItem.counter.users![v]!.platform == "twitch",
		),
	);
	if (twitchUsers.length > 0) {
		const channelId = storeAuth.twitch.user.id;
		twitchUsers.forEach((u) => {
			const entry = counterItem.counter.users![u.id];
			if (!entry) return null;
			const value = entry.value || 0;
			const param: TwitchatDataTypes.ParameterData<number> = reactive({
				type: "number",
				value,
				min: counterItem.counter.min || undefined,
				max: counterItem.counter.max || undefined,
			});
			const user = storeUsers.getUserFrom("twitch", channelId, u.id, u.login, u.display_name);
			if (entry.login != u.login) {
				entry.login = u.login; //Refresh login
				loginUpdated = true;
			}
			user.avatarPath = u.profile_image_url;
			const res: UserEntry = {
				param,
				hide: false,
				platform: "twitch",
				user: {
					id: user.id,
					login: user.displayNameOriginal,
					avatar: user.avatarPath,
				},
			};
			entries.push(res);
		});
	}

	const youtubeIds = Object.keys(counterItem.counter.users!).filter(
		(v) => counterItem.counter.users![v]!.platform == "youtube",
	);
	if (youtubeIds.length > 0) {
		if (YoutubeHelper.instance.connected.value) {
			const youtubeUsers = await YoutubeHelper.instance.getUserListInfo(youtubeIds);
			if (youtubeUsers.length > 0) {
				youtubeUsers.forEach((user) => {
					const entry = counterItem.counter.users![user.id];
					if (!entry) return null;
					const value = entry.value || 0;
					const param: TwitchatDataTypes.ParameterData<number> = reactive({
						type: "number",
						value,
						min: counterItem.counter.min || undefined,
						max: counterItem.counter.max || undefined,
					});
					if (entry.login != user.login) {
						entry.login = user.login; //Refresh login
						loginUpdated = true;
					}
					const res: UserEntry = {
						param,
						hide: false,
						platform: "youtube",
						user: {
							id: user.id,
							login: user.displayNameOriginal,
							avatar: user.avatarPath,
						},
					};
					entries.push(res);
				});
			}
		} else {
			youtubeIds.forEach((uid) => {
				const entry = counterItem.counter.users![uid];
				if (!entry) return null;
				const value = entry.value || 0;
				const param: TwitchatDataTypes.ParameterData<number> = reactive({
					type: "number",
					value,
					min: counterItem.counter.min || undefined,
					max: counterItem.counter.max || undefined,
				});
				const res: UserEntry = {
					param,
					hide: false,
					platform: "youtube",
					user: {
						id: uid,
						login: entry.login || "[Youtube User #" + uid.substring(0, 5) + "...]",
					},
				};
				entries.push(res);
			});
			counterItem.idToYoutubeConnect[counterItem.counter.id] = true;
		}
	}

	for (const uid in counterItem.counter.users) {
		const user = counterItem.counter.users[uid]!;
		//If entry does not exists in the loaded list, push it
		if (entries.findIndex((v) => v.user.id == uid) === -1) {
			entries.push({
				hide: false,
				param: reactive({
					type: "number",
					value: user.value,
					min: counterItem.counter.min || undefined,
					max: counterItem.counter.max || undefined,
				}),
				platform: user.platform,
				user: {
					id: uid,
					login: user.login!,
				},
			});
		}
	}

	if (entries.length > 0) {
		counterItem.idToAllLoaded[counterItem.counter.id] = true;
		counterItem.idToUsers[counterItem.counter.id] = entries;
		sortOn(counterItem);
	}
	counterItem.idToLoading[counterItem.counter.id] = false;

	if (loginUpdated) storeCounters.saveCounters();
}

/**
 * Reset all user counters to 0 or min value
 * @param entry
 */
function resetUsers(entry: CounterEntry): void {
	confirm(t("counters.reset_users_confirm.title"), t("counters.reset_users_confirm.desc"))
		.then(() => {
			//Reset counter data
			let value: number = entry.counter.min != false ? entry.counter.min : 0;
			for (const key in entry.counter.users!) {
				entry.counter.users[key]!.value = value;
			}

			//Reset view data
			if (entry.idToUsers[entry.counter.id]) {
				for (const u of entry.idToUsers[entry.counter.id]!) {
					u.param.value = 0;
				}
			}

			storeCounters.updateCounter(entry.counter);
		})
		.catch(() => {});
}

/**
 * Clears all users of a counter
 * @param entry
 */
function clearUsers(entry: CounterEntry): void {
	confirm(t("counters.delete_users_confirm.title"), t("counters.delete_users_confirm.desc"))
		.then(() => {
			//Reset counter data
			entry.counter.users = {};

			//Reset view data
			entry.idToUsers[entry.counter.id] = [];

			storeCounters.updateCounter(entry.counter);
		})
		.catch(() => {});
}

/**
 * Sorts users on the requested field.
 * If sorting is already made on the specified field it reverses the order.
 * Otherwise it simply sorts on the specified field in the latest order direction
 * @param entry
 * @param type
 */
function sortOn(entry: CounterEntry, type?: "name" | "points"): void {
	if (type) {
		if (entry.sortType[entry.counter.id] == type)
			entry.sortDirection[entry.counter.id] = -entry.sortDirection[entry.counter.id]! as
				| 1
				| -1;
		else entry.sortType[entry.counter.id] = type;
	}

	let users = entry.idToUsers[entry.counter.id];
	if (users) {
		users.sort((a, b) => {
			if (entry.sortType[entry.counter.id] == "name") {
				if (a.user.login.toLowerCase() > b.user.login.toLowerCase())
					return entry.sortDirection[entry.counter.id]!;
				if (a.user.login.toLowerCase() < b.user.login.toLowerCase())
					return -entry.sortDirection[entry.counter.id]!;
				return 0;
			}
			if (entry.sortType[entry.counter.id] == "points") {
				if (a.param.value > b.param.value) return entry.sortDirection[entry.counter.id]!;
				if (a.param.value < b.param.value) return -entry.sortDirection[entry.counter.id]!;
				return 0;
			}
			return 0;
		});
	}
}

/**
 * Called when counters are sorted
 * Applies the sorting to original cata array
 */
function onSortItems(): void {
	const idToIndex: { [id: string]: number } = {};
	counterEntries.value.forEach((entry, index) => (idToIndex[entry.counter.id] = index));
	storeCounters.counterList.sort((a, b) => idToIndex[a.id]! - idToIndex[b.id]!);
}

/**
 * Opens YouTube connect form
 */
function openYoutubeConnect(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.YOUTUBE,
	);
}

/**
 * Builds up local counter list
 */
function buildEntries(): void {
	const list = storeCounters.counterList;
	counterEntries.value = list.map((v): CounterEntry => {
		const min = v.min == false ? Number.MIN_SAFE_INTEGER : v.min;
		const max = v.max == false ? Number.MAX_SAFE_INTEGER : v.max;
		return {
			counter: v,
			param: reactive({
				type: "number",
				value: v.value,
				min,
				max,
				labelKey: "counters.form.value",
			}),
			idToAllLoaded: {},
			idToLoading: {},
			idToNoResult: {},
			idToUsers: {},
			search: {},
			sortDirection: {},
			sortType: {},
			idToYoutubeConnect: {},
		};
	});

	for (const element of counterEntries.value) {
		element.sortType[element.counter.id] = "points";
		element.sortDirection[element.counter.id] = -1;
		element.search[element.counter.id] = "";
	}
}

onMounted(() => {
	param_more.value.children = [
		param_valueMax_toggle.value,
		param_valueMin_toggle.value,
		param_valueLoop_toggle.value,
		param_userSpecific.value,
		param_placeholder.value,
	];
	param_valueMin_toggle.value.children = [param_valueMin_value.value];
	param_valueMax_toggle.value.children = [param_valueMax_value.value];

	watch(
		() => param_title.value.value,
		() => {
			const counters = storeCounters.counterList;
			const name = param_title.value.value.toLowerCase();
			let exists = false;
			for (const c of counters) {
				if (c.id == editedCounter.value?.id) continue;
				if (c.name.toLowerCase() === name) {
					exists = true;
					continue;
				}
			}
			param_title.value.error = exists;
		},
	);

	watch(
		() => param_placeholder.value.value,
		() => {
			if (!param_placeholder.value.value) {
				param_placeholder.value.error = false;
				return;
			}
			//Check if a placeholder with the same name already exists
			const counters = storeCounters.counterList;
			const placeholder = param_placeholder.value.value.toLowerCase();
			let exists = false;
			for (const c of counters) {
				if (c.id == editedCounter.value?.id) continue;
				if (c.placeholderKey && c.placeholderKey.toLowerCase() === placeholder) {
					exists = true;
					continue;
				}
			}
			param_placeholder.value.error = exists;
			param_placeholder.value.errorMessage = exists
				? t("counters.form.placholder_conflict")
				: "";
		},
	);

	buildEntries();
});

interface CounterEntry {
	param: TwitchatDataTypes.ParameterData<number, unknown, unknown>;
	counter: TwitchatDataTypes.CounterData;
	idToUsers: { [key: string]: UserEntry[] | null };
	idToNoResult: { [key: string]: boolean };
	idToLoading: { [key: string]: boolean };
	idToYoutubeConnect: { [key: string]: boolean };
	idToAllLoaded: { [key: string]: boolean };
	sortType: { [key: string]: "name" | "points" };
	sortDirection: { [key: string]: 1 | -1 };
	search: { [key: string]: string };
}

interface UserEntry {
	param: TwitchatDataTypes.ParameterData<number>;
	platform: TwitchatDataTypes.ChatPlatform;
	user: {
		id: string;
		login: string;
		avatar?: string;
	};
	hide: boolean;
}

defineExpose<IParameterContent>({ onNavigateBack });
</script>

<style scoped lang="less">
.paramscounters {
	section {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		max-width: 400px;

		form {
			display: flex;
			flex-direction: column;
			gap: 0.25em;
			.ctas {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: space-evenly;
			}
		}
	}

	.examples {
		text-align: center;
		.counterExample {
			color: var(--color-dark);
			font-size: 0.5em;
		}
	}

	.premiumLimit {
		text-align: center;
	}

	.entryList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.counterEntry {
		// width: 100%;
		width: calc(100% - 2em);
		max-width: 400px;
		margin: auto;
		.toggle {
			background-color: var(--color-alert);
			height: 100%;
			display: flex;
			align-items: center;
			padding: 0 0.5em;
			&:hover {
				background-color: var(--color-alert-light);
			}
			* {
				pointer-events: none;
			}
		}
		.icon {
			height: 1em;
			margin-left: 0.5em;
		}
		:deep(h2) {
			text-align: left;
			margin-right: 1em;
		}

		.info {
			gap: 0.25em;
			display: flex;
			flex-direction: row;
			cursor: default;
			align-self: center;
			.icon {
				height: 1em;
			}
		}
		.content {
			.value {
				border-radius: var(--border-radius);
				min-width: 3em;
				width: 100%;
				:deep(.content) {
					.holder {
						flex-wrap: nowrap;
					}
				}
				:deep(input) {
					font-weight: bold;
					text-align: center;
					flex-basis: unset;
				}
			}

			.userList {
				display: flex;
				flex-direction: column;
				gap: 0.5em;

				.search {
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
					gap: 0.5em;
					img {
						width: 1em;
						height: 1em;
					}
				}

				.loadAllBt,
				.clearBt,
				.resetBt {
					margin: auto;
				}

				.noResult {
					text-align: center;
					font-style: italic;
				}

				.sort {
					gap: 1px;
					display: flex;
					flex-direction: row;
					button {
						color: var(--color-light);
						border-radius: 0.5em;
						background-color: var(--color-primary);
						box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.25);
						&:hover {
							background-color: var(--color-primary-light);
						}
					}
					button:nth-child(1) {
						flex-grow: 1;
						border-top-right-radius: 0;
						border-bottom-right-radius: 0;
					}
					button:nth-child(2) {
						flex-basis: 130px;
						text-align: center;
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
					}
				}

				.scrollableList {
					height: 300px;
				}

				.userItem {
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: 0.5em;
					height: 50px;
					.login {
						font-weight: bold;
						overflow: hidden;
						text-overflow: ellipsis;
						cursor: pointer;
						width: 45%;
					}
					.avatar {
						height: 2em;
						border-radius: 50%;
						aspect-ratio: 1;
					}
					.value {
						flex-basis: 100px;
					}
					.deleteBt {
						width: 1.5em;
						padding: 1em 0;
						flex-shrink: 0;
						flex-basis: 1.5em;
						margin-right: -0.5em;
						background-color: var(--color-alert);
						flex-shrink: 0;
						.icon {
							height: 100%;
							margin: 0;
						}
						&:hover {
							background-color: var(--color-alert-light);
						}
					}
					.icon:not(.avatar) {
						height: 1em;
					}
				}
			}

			.error {
				gap: 0.5em;
				display: flex;
				flex-direction: column;
				align-items: center;
				white-space: pre-line;
				text-align: center;
			}
		}
	}
}
</style>
