<template>
	<div class="paramsvalues parameterContent">
		<Icon name="placeholder" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="p" keypath="values.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()" target="_blank">{{
						t("values.header_link_trigger")
					}}</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!showForm">
			<TTButton icon="add" @click="showForm = true" v-if="!maxReached">{{
				t("values.addBt")
			}}</TTButton>

			<PremiumLimitMessage
				v-else
				label="values.nonpremium_limit"
				premiumLabel="values.premium_limit"
				:max="Config.instance.MAX_VALUES"
				:maxPremium="Config.instance.MAX_VALUES_PREMIUM"
			/>
		</section>

		<section class="card-item" v-if="showForm">
			<form @submit.prevent="createValue()">
				<ParamItem
					:paramData="param_title"
					:errorMessage="t('values.form.name_conflict')"
				/>
				<ParamItem :paramData="param_value" />
				<ParamItem
					:paramData="param_more"
					v-model="param_more.value"
					v-newflag="{ date: Config.instance.NEW_FLAGS_DATE_V11, id: 'values_form_more' }"
				>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_userSpecific"
						v-model="param_userSpecific.value"
						v-newflag="{
							date: Config.instance.NEW_FLAGS_DATE_V11,
							id: 'values_form_more_peruser',
						}"
					/>
					<ParamItem class="child" noBackground :paramData="param_placeholder" />
				</ParamItem>
				<div class="ctas">
					<TTButton type="button" icon="cross" alert @click="cancelForm()">{{
						t("global.cancel")
					}}</TTButton>
					<TTButton
						type="submit"
						v-if="!editedValue"
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
						>{{ t("values.editBt") }}</TTButton
					>
				</div>
			</form>
		</section>

		<draggable
			class="entryList"
			v-model="valueEntries"
			direction="vertical"
			group="values"
			item-key="value.id"
			:animation="250"
			@sort="onSortItems()"
		>
			<template #item="{ element: entry, index }: { element: ValueEntry; index: number }">
				<ToggleBlock
					class="valueEntry"
					:open="false"
					:key="entry.value.id"
					:title="entry.value.name"
					:disabled="!entry.value.enabled"
				>
					<template #left_actions>
						<ToggleButton
							v-model="entry.value.enabled"
							@click.stop
							@change="storeValues.saveValues()"
							v-if="
								(storeAuth.isPremium && entry.value.enabled === false) ||
								(!storeAuth.isPremium &&
									(entry.value.enabled == true || canEnableMore))
							"
						/>
					</template>

					<template #right_actions>
						<span
							class="info user"
							v-tooltip="t('counters.user_tt')"
							v-if="entry.value.perUser"
							><Icon name="user" alt="user" />
							{{ Object.keys(entry.value.users ?? {}).length }}</span
						>
						<TTButton
							v-tooltip="t('values.editBt')"
							data-close-popout
							icon="edit"
							@click.stop="editValue(entry.value)"
						/>
						<TTButton
							@click.stop
							:copy="entry.value.id"
							icon="id"
							v-tooltip="t('global.copy_id')"
							small
						/>
						<TTButton alert icon="trash" @click.stop="deleteValue(entry)" />
					</template>

					<div class="content">
						<ParamItem
							class="value"
							v-if="!entry.value.perUser"
							:paramData="entry.param"
							@change="onChangeValue(entry)"
						/>

						<div class="userList" v-else>
							<template v-if="Object.keys(entry.value.users ?? {}).length > 0">
								<SearchForm
									:placeholder="t('values.form.search')"
									v-model="entry.search[entry.value.id]!"
									@change="searchUser(entry)"
								/>

								<TTButton
									class="resetBt"
									v-if="entry.search[entry.value.id]!.length === 0"
									secondary
									@click="resetUsers(entry)"
									>{{ t("values.form.reset_all_users") }}</TTButton
								>

								<TTButton
									class="clearBt"
									v-if="entry.search[entry.value.id]!.length === 0"
									alert
									@click="clearUsers(entry)"
									>{{ t("values.form.clear_all_users") }}</TTButton
								>

								<TTButton
									class="loadAllBt"
									v-if="
										entry.search[entry.value.id]!.length === 0 &&
										entry.idToAllLoaded[entry.value.id] !== true
									"
									@click="loadUsers(entry)"
									:loading="entry.idToLoading[entry.value.id]"
									>{{ t("values.form.load_all_users") }}</TTButton
								>

								<div
									class="noResult"
									v-if="entry.idToNoResult[entry.value.id] === true"
								>
									{{ t("values.user_not_found") }}
								</div>
							</template>

							<span class="noResult" v-else>{{ t("values.form.no_users") }}</span>

							<template
								v-if="
									entry.idToUsers[entry.value.id] &&
									entry.idToUsers[entry.value.id]!.length > 0
								"
							>
								<div
									class="sort"
									v-if="
										entry.idToUsers[entry.value.id]!.filter(
											(v) => v.hide !== true,
										).length > 1
									"
								>
									<button disabled>{{ t("values.form.username") }}</button>
									<button disabled>{{ t("values.form.userValue") }}</button>
								</div>
								<div
									class="card-item alert error"
									v-if="entry.idToYoutubeConnect[entry.value.id]"
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
										entry.idToUsers[entry.value.id]!.filter(
											(v) => v.hide !== true,
										)
									"
									:itemSize="100"
									:itemMargin="3"
									lockScroll
									v-slot="{ item }: { item: UserEntry }"
								>
									<div class="card-item userItem">
										<div class="infos">
											<div class="head">
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
														'https://www.youtube.com/channel/' +
														item.user.id
													"
													class="login"
													target="_blank"
													>{{ item.user.login }}</a
												>
												<a
													v-else-if="item.platform == 'tiktok'"
													:href="
														'https://www.tiktok.com/@' + item.user.login
													"
													class="login"
													target="_blank"
													>{{ item.user.login }}</a
												>
												<Icon
													name="twitch"
													v-if="item.platform == 'twitch'"
												/>
												<Icon
													name="youtube"
													v-else-if="item.platform == 'youtube'"
												/>
												<Icon
													name="tiktok"
													v-else-if="item.platform == 'tiktok'"
												/>
											</div>
											<ParamItem
												class="value"
												noBackground
												:paramData="item.param"
												@input="onChangeValue(entry, item)"
											/>
										</div>
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
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import TTButton from "@/components/TTButton.vue";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { storeValues as useStoreValues } from "@/store/values/storeValues";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import ParamItem from "../ParamItem.vue";
import PremiumLimitMessage from "../PremiumLimitMessage.vue";
import type IParameterContent from "./IParameterContent";
import SearchForm from "./SearchForm.vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeUsers = useStoreUsers();
const storeValues = useStoreValues();

const showForm = ref(false);
const editedValue = ref<TwitchatDataTypes.ValueData | null>(null);
const valueEntries = ref<ValueEntry[]>([]);

let timeoutSearch: number = -1;
let timeoutEdit: number = -1;

const param_title = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 50,
	labelKey: "values.form.name",
});
const param_value = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	labelKey: "values.form.value",
});
const param_more = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	type: "boolean",
	value: false,
	labelKey: "values.form.more",
});
const param_userSpecific = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "values.form.value_user",
	icon: "user",
});
const param_placeholder = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "placeholder",
	value: "",
	maxLength: 20,
	labelKey: "values.form.placholder",
	icon: "broadcast",
	tooltipKey: "values.form.placholder_tt",
	allowedCharsRegex: "A-z0-9_",
});

const maxReached = computed<boolean>(() => {
	const count = storeValues.valueList.length;
	const max = storeAuth.isPremium
		? Config.instance.MAX_VALUES_PREMIUM
		: Config.instance.MAX_VALUES;
	return count >= max;
});

const canEnableMore = computed<boolean>(() => {
	if (storeAuth.isPremium) return false;
	const count = storeValues.valueList.filter((v) => v.enabled != false).length;
	const max = storeAuth.isPremium
		? Config.instance.MAX_VALUES_PREMIUM
		: Config.instance.MAX_VALUES;
	return count < max;
});

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

onMounted(() => {
	buildEntries();
});
watch(
	() => param_title.value.value,
	() => {
		const values = storeValues.valueList;
		const name = param_title.value.value.toLowerCase();
		let exists = false;
		for (const c of values) {
			if (c.id == editedValue.value?.id) continue;
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
		const values = storeValues.valueList;
		const placeholder = param_placeholder.value.value.toLowerCase();
		let exists = false;
		for (const c of values) {
			if (c.id == editedValue.value?.id) continue;
			if (c.placeholderKey.toLowerCase() === placeholder) {
				exists = true;
				continue;
			}
		}
		param_placeholder.value.error = exists;
		param_placeholder.value.errorMessage = exists ? t("values.form.placeholder_conflict") : "";
	},
);

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});

/**
 * Create a new Value
 */
function createValue(): void {
	let placeholderKey = param_placeholder.value.value;
	if (!placeholderKey) {
		//No placeholder define, create a default one from the value's name
		placeholderKey = Utils.slugify(param_title.value.value).toUpperCase();
		//Load all placeholders
		let hashmap: { [key: string]: boolean } = {};
		for (const c of valueEntries.value) {
			if (editedValue.value && c.value.id == editedValue.value.id) continue;
			hashmap[c.value.placeholderKey] = true;
		}
		//If a placeholder with the same name exists, add an increment suffix
		//until a slot is available
		if (hashmap[placeholderKey]) {
			let index = 1;
			while (hashmap[placeholderKey + "_" + index]) index++;
			placeholderKey = placeholderKey + "_" + index;
		}
	}

	const data: TwitchatDataTypes.ValueData = {
		id: editedValue.value ? editedValue.value.id : Utils.getUUID(),
		placeholderKey,
		name: param_title.value.value,
		value: param_value.value.value,
		perUser: param_userSpecific.value.value,
	};
	if (editedValue.value) {
		editedValue.value = null;
		storeValues.editValueParams(data.id, data);
	} else {
		storeValues.addValue(data);
		buildEntries();
	}
	showForm.value = false;
	cancelForm();
}

/**
 * Called when editing the value of an existing value
 */
function onChangeValue(entry: ValueEntry, userEntry?: UserEntry): void {
	clearTimeout(timeoutEdit);
	timeoutEdit = window.setTimeout(() => {
		if (userEntry) {
			storeValues.updateValue(
				entry.value.id,
				userEntry.param.value,
				undefined,
				userEntry.user.id,
			);
		} else {
			storeValues.updateValue(entry.value.id, entry.param.value);
		}
	}, 250);
}

/**
 * Called when requesting to delete a value
 * @param entry
 */
function deleteValue(entry: ValueEntry): void {
	confirm(t("values.delete_confirm.title"), t("values.delete_confirm.desc"))
		.then(() => {
			storeValues.delValue(entry.value);
			buildEntries();
		})
		.catch(() => {
			/* ignore */
		});
}

/**
 * Start a value edition
 */
function editValue(c: TwitchatDataTypes.ValueData): void {
	editedValue.value = c;
	showForm.value = true;
	param_title.value.value = c.name;
	param_value.value.value = c.value;
	param_placeholder.value.value = c.placeholderKey;
	param_userSpecific.value.value = c.perUser;
	param_more.value.value = c.perUser;
}

/**
 * Called when canceling value edition
 */
function cancelForm(): void {
	editedValue.value = null;
	showForm.value = false;
	param_title.value.value = "";
	param_value.value.value = "";
	param_placeholder.value.value = "";
	param_placeholder.value.value = "";
	param_userSpecific.value.value = false;
}

/**
 * Open a user's profile info
 */
function deleteUser(entry: ValueEntry, userEntry: UserEntry): void {
	if (!entry.value.users) return;
	delete entry.value.users[userEntry.user.id];
	entry.idToUsers[entry.value.id] = entry.idToUsers[entry.value.id]!.filter(
		(v) => v.user.id != userEntry.user.id,
	);
	storeValues.updateValue(entry.value.id, entry.value.value);
}

/**
 * Search for a user.
 * If all users are loaded, search within them.
 * If users are not loaded, query twitch for a user matching current search
 */
function searchUser(entry: ValueEntry): void {
	const value = entry.value;
	const search = entry.search[value.id]!.toLowerCase();

	let preloadedUsers = entry.idToUsers[value.id];
	entry.idToNoResult[value.id] = false;
	if (entry.search[value.id]!.length == 0) {
		if (entry.idToAllLoaded[value.id] !== true) delete entry.idToUsers[value.id];
		else if (preloadedUsers) preloadedUsers.forEach((v) => (v.hide = false));
		return;
	}
	//If there are more than 1 loaded users, that's because they've all been loaded
	//In this case, just search there instead of polling from twitch API
	if (entry.idToAllLoaded[value.id] === true && preloadedUsers && preloadedUsers.length > 1) {
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

	entry.idToLoading[value.id] = true;
	entry.idToUsers[value.id] = [];

	//Search from "login" property if it exists
	if (value.users) {
		for (const key in value.users) {
			const user = value.users[key];
			//If entry has a login and login matches search
			if (user && user.login && user.login!.toLowerCase().indexOf(search) > -1) {
				entry.idToUsers[value.id]!.push({
					hide: false,
					param: reactive({ type: "string", value: user.value, maxLength: 100000 }),
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
			if (value.users![u.id] != undefined) {
				//If user isn't already in the results
				//and user is in the value users
				if ((entry.value.users || {})[u.id]) {
					const existingIndex = (entry.idToUsers[value.id] || []).findIndex(
						(v) => v.user.id === u.id,
					);
					const userEntry: UserEntry = {
						hide: false,
						param: reactive({
							type: "string",
							value:
								value.users && value.users[u.id] ? value.users![u.id]!.value : "",
							maxLength: 100000,
						}),
						platform: "twitch",
						user: {
							id: u.id,
							login: u.display_name,
							avatar: u.profile_image_url,
						},
					};
					if (existingIndex > -1) {
						entry.idToUsers[value.id]![existingIndex] = userEntry;
					} else {
						entry.idToUsers[value.id]!.push(userEntry);
					}
				}
			}
		}
		entry.idToNoResult[value.id] =
			(entry.idToUsers[value.id] || []).filter((v) => !v.hide).length == 0;
		entry.idToLoading[value.id] = false;
	}, 500);
}

/**
 * Load all users
 * @param valueItem
 */
async function loadUsers(valueItem: ValueEntry): Promise<void> {
	if ((valueItem.value.users || []).length == 0) return;

	valueItem.idToLoading[valueItem.value.id] = true;
	let entries: UserEntry[] = [];
	let loginUpdated: boolean = false;

	clearTimeout(timeoutSearch);

	//Get Twitch users
	const twitchUsers = await TwitchUtils.getUserInfo(
		Object.keys(valueItem.value.users!).filter(
			(v) => valueItem.value.users![v]!.platform == "twitch",
		),
	);
	if (twitchUsers.length > 0) {
		const channelId = storeAuth.twitch.user.id;
		twitchUsers.forEach((u) => {
			const entry = valueItem.value.users![u.id];
			if (!entry) return null;
			const value = entry.value || "";
			const param: TwitchatDataTypes.ParameterData<string> = reactive({
				type: "string",
				longText: true,
				value,
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

	//Get YouTube users
	const youtubeIds = Object.keys(valueItem.value.users!).filter(
		(v) => valueItem.value.users![v]!.platform == "youtube",
	);
	if (youtubeIds.length > 0) {
		if (YoutubeHelper.instance.connected.value) {
			const youtubeUsers = await YoutubeHelper.instance.getUserListInfo(youtubeIds);
			if (youtubeUsers.length > 0) {
				youtubeUsers.forEach((user) => {
					const entry = valueItem.value.users![user.id];
					if (!entry) return null;
					const value = entry.value || "";
					const param: TwitchatDataTypes.ParameterData<string> = reactive({
						type: "string",
						longText: true,
						value,
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
				const entry = valueItem.value.users![uid];
				if (!entry) return null;
				const value = entry.value || "";
				const param: TwitchatDataTypes.ParameterData<string> = reactive({
					type: "string",
					longText: true,
					value,
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

			valueItem.idToYoutubeConnect[valueItem.value.id] = true;
		}
	}

	for (const uid in valueItem.value.users) {
		const user = valueItem.value.users[uid]!;
		//If entry does not exists in the loaded list, push it
		if (entries.findIndex((v) => v.user.id == uid) === -1) {
			const value = user.value || "";
			entries.push({
				hide: false,
				param: reactive({ type: "string", longText: true, value }),
				platform: user.platform,
				user: {
					id: uid,
					login: user.login!,
				},
			});
		}
	}

	if (entries.length > 0) {
		valueItem.idToAllLoaded[valueItem.value.id] = true;
		valueItem.idToUsers[valueItem.value.id] = entries;
	}
	valueItem.idToLoading[valueItem.value.id] = false;

	if (loginUpdated) storeValues.saveValues();
}

/**
 * Reset all user values to empty string
 * @param entry
 */
function resetUsers(entry: ValueEntry): void {
	confirm(t("values.reset_users_confirm.title"), t("values.reset_users_confirm.desc"))
		.then(() => {
			//Reset value data
			for (const key in entry.value.users!) {
				entry.value.users![key]!.value = "";
			}

			//Reset view data
			if (entry.idToUsers[entry.value.id]) {
				for (let i = 0; i < entry.idToUsers[entry.value.id]!.length; i++) {
					const u = entry.idToUsers[entry.value.id]![i]!;
					u.param.value = "";
				}
			}

			storeValues.updateValue(entry.value.id, entry.value.value);
		})
		.catch(() => {});
}

/**
 * Clears all users of a value
 * @param entry
 */
function clearUsers(entry: ValueEntry): void {
	confirm(t("values.delete_users_confirm.title"), t("values.delete_users_confirm.desc"))
		.then(() => {
			//Reset value data
			entry.value.users = {};

			//Reset view data
			entry.idToUsers[entry.value.id] = [];

			storeValues.updateValue(entry.value.id, entry.value.value);
		})
		.catch(() => {});
}

/**
 * Called when values are sorted
 * Applies the sorting to original cata array
 */
function onSortItems(): void {
	const idToIndex: { [id: string]: number } = {};
	valueEntries.value.forEach((entry, index) => (idToIndex[entry.value.id] = index));
	storeValues.valueList.sort((a, b) => idToIndex[a.id]! - idToIndex[b.id]!);
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
 * Builds up local values list
 */
function buildEntries(): void {
	const list = storeValues.valueList;
	valueEntries.value = list.map((v): ValueEntry => {
		return {
			value: v,
			param: reactive({ type: "string", value: v.value, labelKey: "values.form.value" }),
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

	for (const element of valueEntries.value) {
		element.sortType[element.value.id] = "points";
		element.sortDirection[element.value.id] = -1;
		element.search[element.value.id] = "";
	}
}

interface ValueEntry {
	param: TwitchatDataTypes.ParameterData<string, unknown, unknown>;
	value: TwitchatDataTypes.ValueData;
	idToUsers: { [key: string]: UserEntry[] | null };
	idToNoResult: { [key: string]: boolean };
	idToLoading: { [key: string]: boolean };
	idToAllLoaded: { [key: string]: boolean };
	sortType: { [key: string]: "name" | "points" };
	sortDirection: { [key: string]: 1 | -1 };
	search: { [key: string]: string };
	idToYoutubeConnect: { [key: string]: boolean };
}

interface UserEntry {
	param: TwitchatDataTypes.ParameterData<string>;
	platform: TwitchatDataTypes.ChatPlatform;
	user: {
		id: string;
		login: string;
		avatar?: string;
	};
	hide: boolean;
}
</script>

<style scoped lang="less">
.paramsvalues {
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

			.errorDetails {
				text-align: center;
				margin-top: -0.25em;
				&.shrink {
					margin-left: 1.5em;
				}
				.text {
					//Text is inside a sub holder so we can set its font-size without
					//it impacting the margin-left of the holder specified in "em" unit
					font-size: 0.8em;
				}
			}
		}
	}

	.entryList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.valueEntry {
		// width: 100%;
		width: calc(100% - 2em);
		max-width: 400px;
		margin: auto;
		:deep(h2) {
			text-align: left;
			margin-right: 1em;
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
						cursor: default;
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
					min-height: 300px;
				}

				.userItem {
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: 0.5em;
					height: 100px;
					.infos {
						display: flex;
						flex-direction: column;
						gap: 0.5em;
						width: 100%;
						flex-grow: 1;
						.head {
							display: flex;
							flex-direction: row;
							align-items: center;
							gap: 0.5em;
							.login {
								font-weight: bold;
								flex-grow: 1;
								text-overflow: ellipsis;
								cursor: pointer;
							}
							.avatar {
								height: 2em;
								border-radius: 50%;
								aspect-ratio: 1;
							}
							.icon:not(.avatar) {
								height: 1em;
							}
						}
						.value {
							// flex-basis: 100px;
							height: 50px;
							:deep(textarea) {
								height: 50px;
								resize: none;
							}
						}
					}
					.deleteBt {
						width: 1.5em;
						padding: 1em 0.5em;
						flex-shrink: 0;
						flex-basis: 1.5em;
						margin-right: -0.5em;
						background-color: var(--color-alert);
						height: 100px;
						img {
							height: 100%;
						}
						&:hover {
							background-color: var(--color-alert-light);
						}
					}
				}
			}
		}
	}
}
</style>
