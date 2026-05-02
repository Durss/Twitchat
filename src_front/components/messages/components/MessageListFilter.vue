<template>
	<div ref="rootEl" :class="classes" v-show="open || expand" @wheel.stop>
		<div class="cta" v-if="showCTA" @click="hideCTA()">
			<span class="label">{{ $t("chat.filters.cta") }}</span>
			<Icon name="right" />
		</div>

		<transition name="fade">
			<div class="hoverActions" v-if="!expand">
				<button
					class="openBt"
					@click="openFilters(true)"
					v-tooltip="{ content: $t('global.tooltips.column_edit'), placement: 'left' }"
					v-newflag="{
						id: 'messagefilters_' + Math.max(...filters.map((v) => v.storage!.newFlag)),
						date: Math.max(...filters.map((v) => v.storage!.newFlag)),
					}"
				>
					<Icon name="filters" alt="open filters" class="icon" theme="light" />
				</button>
				<button
					class="addBt"
					@click="$emit('add')"
					v-tooltip="{ content: $t('global.tooltips.column_add'), placement: 'left' }"
					v-if="storeParams.chatColumnsConfig.length < $config.MAX_CHAT_COLUMNS"
				>
					<Icon name="add" alt="add column" class="icon" theme="light" />
				</button>
				<button
					class="addBt"
					@click="moveColumn(-1)"
					v-tooltip="{ content: $t('global.tooltips.column_move'), placement: 'left' }"
					v-if="config.order > 0"
				>
					<Icon name="left" alt="add column" class="icon" theme="light" />
				</button>
				<button
					class="addBt"
					@click="moveColumn(1)"
					v-tooltip="{ content: $t('global.tooltips.column_move'), placement: 'left' }"
					v-if="config.order < storeParams.chatColumnsConfig.length - 1"
				>
					<Icon name="right" alt="add column" class="icon" theme="light" />
				</button>
				<button
					class="deleteBt"
					@click="deleteColumn()"
					v-if="canDelete"
					v-tooltip="{ content: $t('global.tooltips.column_delete'), placement: 'left' }"
				>
					<Icon name="trash" alt="delete column" class="icon" theme="light" />
				</button>
			</div>
		</transition>

		<transition name="fade">
			<div class="holder blured-background-window" v-if="expand">
				<div class="content">
					<ClearButton class="closeBt" @click="closeFilters()" />
					<div class="head">
						<h1 class="title">{{ $t("chat.filters.title") }}</h1>
					</div>

					<div class="info" v-if="expand">{{ $t("chat.filters.header") }}</div>

					<tooltip
						interactive
						theme="twitchat"
						trigger="click"
						:tag="null"
						:inlinePositioning="false"
						:maxWidth="'calc(100% - 10px)'"
						:interactiveDebounce="1000"
					>
						<template #default>
							<TTButton class="presetsBt" icon="params" secondary small
								>Presets</TTButton
							>
						</template>
						<template #content="{ hide }">
							<div class="presets">
								<TTButton
									secondary
									light
									@click="
										hide();
										preset('chat');
									"
									icon="whispers"
									small
									>{{ $t("chat.filters.preset_chat") }}</TTButton
								>
								<TTButton
									secondary
									light
									@click="
										hide();
										preset('chatSafe');
									"
									icon="shield"
									small
									>{{ $t("chat.filters.preset_chatSafe") }}</TTButton
								>
								<TTButton
									secondary
									light
									@click="
										hide();
										preset('moderation');
									"
									icon="mod"
									small
									>{{ $t("chat.filters.preset_moderation") }}</TTButton
								>
								<TTButton
									secondary
									light
									@click="
										hide();
										preset('activities');
									"
									icon="stars"
									small
									>{{ $t("chat.filters.preset_activities") }}</TTButton
								>
								<TTButton
									secondary
									light
									@click="
										hide();
										preset('moderation&activities');
									"
									icon="stars"
									small
									>{{
										$t("chat.filters.preset_moderation_and_activities")
									}}</TTButton
								>
								<TTButton
									secondary
									light
									@click="
										hide();
										preset('games');
									"
									icon="bingo"
									small
									>{{ $t("chat.filters.preset_games") }}</TTButton
								>
								<TTButton
									secondary
									light
									@click="
										hide();
										preset('revenues');
									"
									icon="coin"
									small
									>{{ $t("chat.filters.preset_revenues") }}</TTButton
								>
							</div>
						</template>
					</tooltip>

					<div class="paramsList">
						<SearchForm v-model="searchTerms" :debounceDelay="0" />
						<ParamItem
							class="toggleAll"
							v-if="!searchTerms"
							noBackground
							:paramData="param_toggleAll"
							v-model="param_toggleAll.value"
							@change="toggleAll()"
						/>

						<div
							class="item"
							v-for="filter in filteredFilters"
							:key="'filter_' + filter.storage!.type"
						>
							<Icon
								name="show"
								class="preview"
								v-if="filter.storage!.type != 'message'"
								@mouseleave="mouseLeaveItem()"
								@mouseenter="mouseEnterItem(filter.storage!)"
							/>

							<ParamItem
								:paramData="filter"
								autoFade
								@change="saveData()"
								v-model="config.filters[filter.storage!.type as 'message']"
								v-newflag="
									filter.storage!.newFlag > 0
										? {
												date: filter.storage!.newFlag,
												id: 'messagefilters_' + filter.storage!.type,
											}
										: undefined
								"
							>
								<template
									#child
									v-if="
										filter.storage?.type == whisperType &&
										config.filters.whisper === true
									"
								>
									<ToggleBlock
										class="whispersPermissions"
										:title="$t('chat.filters.whispers_permissions')"
										small
										:open="false"
									>
										<PermissionsForm
											v-model="config.whispersPermissions"
											@update:modelValue="saveData()"
											:hasFollowerFilter="false"
										/>
									</ToggleBlock>
								</template>
								<template
									#child
									v-if="
										filter.storage?.type == messageType &&
										config.filters.message === true
									"
								>
									<div class="subFilters">
										<div class="item">
											<div class="preview"></div>

											<ParamItem
												v-if="
													config.filters.message === true &&
													(!searchTerms ||
														t(param_hideUsers.labelKey || '')
															.toLowerCase()
															.includes(
																searchTerms.toLowerCase().trim(),
															))
												"
												key="subfilter_blockUsers"
												:paramData="param_hideUsers"
												@change="saveData()"
												v-model="config.userBlockList"
											/>
										</div>

										<div
											class="item"
											v-for="messageFilter in filteredMessageFilters"
											:key="'subfilter_' + messageFilter.storage!.type"
										>
											<Icon
												name="show"
												class="preview"
												v-if="messageFilter.storage!.hasPreview"
												@mouseleave="mouseLeaveItem()"
												@mouseenter="
													previewSubMessage(messageFilter.storage!)
												"
											/>
											<div v-else class="preview"></div>

											<ParamItem
												autoFade
												v-if="config.filters.message === true"
												:key="'subfilter_' + messageFilter.storage"
												:paramData="messageFilter"
												@change="saveData()"
												v-model="
													config.messageFilters[
														messageFilter.storage!.type
													]
												"
											/>
										</div>

										<template v-if="storeUsers.customBadgeList.length > 0">
											<div
												class="item"
												v-if="
													storeUsers.customBadgeList.length > 0 &&
													(!searchTerms ||
														t(param_showBadges.labelKey || '')
															.toLowerCase()
															.includes(
																searchTerms.toLowerCase().trim(),
															))
												"
											>
												<div class="preview"></div>
												<ParamItem
													key="subfilter_blockUsers"
													v-model="config.mandatoryBadges_flag"
													:paramData="param_showBadges"
													@change="saveData()"
												>
													<div class="badgeList">
														<button
															v-for="badge in storeUsers.customBadgeList"
															@click="onToggleBadge(badge.id, true)"
															:class="
																(
																	config.mandatoryBadges || []
																).includes(badge.id)
																	? 'selected'
																	: ''
															"
															:key="badge.id + '_show'"
															:title="badge.name"
															v-tooltip="badge.name"
														>
															<img
																:src="badge.img"
																:alt="badge.name"
															/>
														</button>
													</div>
												</ParamItem>
											</div>

											<div
												class="item"
												v-if="
													storeUsers.customBadgeList.length > 0 &&
													(!searchTerms ||
														t(param_hideBadges.labelKey || '')
															.toLowerCase()
															.includes(
																searchTerms.toLowerCase().trim(),
															))
												"
											>
												<div class="preview"></div>
												<ParamItem
													key="subfilter_blockUsers"
													v-model="config.forbiddenBadges_flag"
													:paramData="param_hideBadges"
													@change="saveData()"
												>
													<div class="badgeList">
														<button
															v-for="badge in storeUsers.customBadgeList"
															@click="onToggleBadge(badge.id, false)"
															:class="
																(
																	config.forbiddenBadges || []
																).includes(badge.id)
																	? 'selected'
																	: ''
															"
															:key="badge.id + '_show'"
															:title="badge.name"
															v-tooltip="badge.name"
														>
															<img
																:src="badge.img"
																:alt="badge.name"
															/>
														</button>
													</div>
												</ParamItem>
											</div>
										</template>
									</div>
								</template>
							</ParamItem>
						</div>
					</div>

					<div class="card-item alert error" v-if="error" @click="error = false">
						{{ $t("chat.filters.no_selection") }}
					</div>

					<ParamItem
						class="showPanelsHere"
						:paramData="param_showPanelsHere"
						clearToggle
						@change="saveData()"
						v-model="config.showPanelsHere"
						v-if="storeParams.chatColumnsConfig.length > 1"
					/>

					<ParamItem
						class="showGreetHere"
						:paramData="param_showGreetHere"
						clearToggle
						@change="saveData()"
						v-model="config.showGreetHere"
						v-if="storeParams.chatColumnsConfig.length > 1"
					/>

					<div class="bgColor card-item">
						<Icon name="color" />
						<span class="title">{{ $t("chat.filters.background_color") }}</span>
						<button
							class="colorBt tranparent"
							:style="{ color: 'transparent' }"
							:data-selected="'transparent' == config.backgroundColor"
							@click="config.backgroundColor = 'transparent'"
						></button>

						<button
							class="colorBt"
							v-for="color in [
								'#ff00001A',
								'#00ff001A',
								'#0000ff1A',
								'#ff00ff1A',
								'#ffff001A',
								'#00ffff1A',
							]"
							:style="{ color: color.replace(/(#[0-9a-f]{6}).*/i, '$177') }"
							:data-selected="color == config.backgroundColor"
							@click="config.backgroundColor = color"
						></button>

						<ParamItem
							class="colorBt picker"
							:paramData="param_backgroundColor"
							clearToggle
							noBackground
							@change="
								config.backgroundColor = param_backgroundColor.value;
								saveData();
							"
							@click="
								config.backgroundColor = param_backgroundColor.value;
								saveData();
							"
							v-model="param_backgroundColor.value"
							v-if="storeParams.chatColumnsConfig.length > 1"
						/>
					</div>

					<div class="channelList card-item" v-if="channels.length > 1">
						<Icon name="user" />
						<span>{{ $t("chat.filters.channels") }}</span>

						<tooltip
							interactive
							theme="twitchat"
							trigger="click"
							:tag="null"
							:inlinePositioning="false"
							:interactiveDebounce="1000"
						>
							<template #default>
								<TTButton secondary small>{{
									$t("global.select_placeholder")
								}}</TTButton>
							</template>
							<template #content="{ hide }">
								<div class="entryList">
									<button
										v-for="entry in channels"
										class="entry"
										:class="
											Object.keys(config.channelIDs || {}).includes(
												entry.user.id,
											)
												? 'selected'
												: ''
										"
										@click="clickChannel(entry)"
									>
										<img
											class="avatar"
											v-if="entry.user.avatarPath"
											:src="entry.user.avatarPath"
											:style="{ color: entry.color }"
											alt="avatar"
											referrerpolicy="no-referrer"
										/>
										<Icon :name="entry.platform" />
										<span class="pseudo">{{ entry.user.displayName }}</span>
										<Icon
											name="checkmark"
											v-if="
												Object.keys(config.channelIDs || []).includes(
													entry.user.id,
												)
											"
										/>
										<Icon name="cross" v-else />
									</button>
								</div>
							</template>
						</tooltip>
					</div>

					<div
						class="previewList"
						ref="previewList"
						v-if="loadingPreview || previewData.length > 0"
					>
						<div class="preview" v-if="loadingPreview">
							<Icon name="loader" class="loader" />
						</div>

						<div
							class="preview"
							v-for="m in previewData"
							:key="'preview_' + m.id"
							@click="clickPreview($event)"
						>
							<MessageItem :messageData="m" lightMode disableConversation />
						</div>
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script setup lang="ts">
import ClearButton from "@/components/ClearButton.vue";
import Icon from "@/components/Icon.vue";
import PermissionsForm from "@/components/PermissionsForm.vue";
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import SearchForm from "@/components/params/contents/SearchForm.vue";
import DataStore from "@/store/DataStore";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storeTiktok as useStoreTiktok } from "@/store/tiktok/storeTiktok";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import type { TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import { useI18n } from "vue-i18n";
import MessageItem from "../MessageItem.vue";

const { t } = useI18n();
const storeParams = useStoreParams();
const storeAuth = useStoreAuth();
const storeDebug = useStoreDebug();
const storeChat = useStoreChat();
const storeStream = useStoreStream();
const storeUsers = useStoreUsers();
const storeMain = useStoreMain();
const storeTiktok = useStoreTiktok();

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const previewListRef = useTemplateRef<HTMLDivElement>("previewList");

const props = withDefaults(
	defineProps<{
		open?: boolean;
		config: TwitchatDataTypes.ChatColumnsConfig;
	}>(),
	{
		open: false,
	},
);

const emit = defineEmits<{
	submit: [];
	add: [];
	change: [];
}>();

const searchTerms = ref<string>("");
const previewIndex = ref<number>(0);
const error = ref<boolean>(false);
const expand = ref<boolean>(false);
const showCTA = ref<boolean>(false);
const loadingPreview = ref<boolean>(false);
const mouseOverToggle = ref<boolean>(false);
const previewData = ref<TwitchatDataTypes.ChatMessageTypes[]>([]);
const filters = ref<
	TwitchatDataTypes.ParameterData<
		boolean,
		undefined,
		undefined,
		(typeof TwitchatDataTypes.MessageListFilterTypes)[number]
	>[]
>([]);
const messageFilters = ref<
	TwitchatDataTypes.ParameterData<
		boolean,
		unknown,
		boolean,
		(typeof TwitchatDataTypes.MessageListChatMessageFilterTypes)[number]
	>[]
>([]);
const param_toggleAll = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "chat.filters.select_all",
});
const param_showBadges = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "chat.filters.show_user_badges",
	icon: "show",
});
const param_hideBadges = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "chat.filters.hide_user_badges",
	icon: "hide",
});
const param_hideUsers = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "editablelist",
	value: "",
	labelKey: "chat.filters.hide_users",
	placeholderKey: "chat.filters.hide_users_placeholder",
	icon: "hide",
	maxLength: 25,
	max: 1000000,
});
const param_showPanelsHere = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "chat.filters.show_panels_here",
});
const param_showGreetHere = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "chat.filters.show_greet_here",
});
const param_backgroundColor = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "#ffffff",
});

let mouseY = 0;
let disposed = false;
let touchMode = false;
let clickHandler: (e: MouseEvent | TouchEvent) => void;
let mouseMoveHandler: (e: MouseEvent | TouchEvent) => void;
let messagesCache: Partial<{
	[key in (typeof TwitchatDataTypes.MessageListFilterTypes)[number]["type"]]:
		| TwitchatDataTypes.ChatMessageTypes[]
		| null;
}> = {};
let subMessagesCache: Partial<{
	[key in keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters]:
		| TwitchatDataTypes.ChatMessageTypes[]
		| null;
}> = {};

const whisperType = computed(() => TwitchatDataTypes.TwitchatMessageType.WHISPER);
const messageType = computed(() => TwitchatDataTypes.TwitchatMessageType.MESSAGE);

const classes = computed((): string[] => {
	const res = ["messagelistfilter"];
	if (storeParams.appearance.splitViewVertical.value === true) res.push("verticalSplitMode");
	if (expand.value) res.push("expand");
	// if(forceConfig) res.push("fullSize");
	if (showCTA.value) res.push("ctaMode");
	return res;
});

const canDelete = computed((): boolean => {
	return storeParams.chatColumnsConfig.length > 1;
});

const filteredMessageFilters = computed(() => {
	const term = searchTerms.value.toLowerCase().trim();
	if (!term) return messageFilters.value;
	return messageFilters.value.filter((f) => {
		const label = f.labelKey ? t(f.labelKey).toLowerCase() : "";
		return label.includes(term);
	});
});

const filteredFilters = computed(() => {
	const term = searchTerms.value.toLowerCase().trim();
	if (!term) return filters.value;
	const staticItems = [
		t(param_showBadges.value.labelKey!),
		t(param_hideBadges.value.labelKey!),
		t(param_hideUsers.value.labelKey!),
	];
	return filters.value.filter((f) => {
		const label = f.labelKey ? t(f.labelKey).toLowerCase() : "";
		if (label.includes(term)) return true;
		// Keep the "message" parent visible if any child messageFilter matches
		if (f.storage?.type === TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			return (
				filteredMessageFilters.value.length > 0 ||
				staticItems.some((item) => item.toLowerCase().includes(term))
			);
		}
		return false;
	});
});

const channels = computed(() => {
	let chans: {
		platform: TwitchatDataTypes.ChatPlatform;
		user: TwitchatDataTypes.TwitchatUser;
		color: string;
		isRemoteChan: boolean;
	}[] = [];

	chans.push({
		platform: "twitch",
		user: storeAuth.twitch.user,
		isRemoteChan: false,
		color: "transparent",
	});
	if (storeAuth.youtube?.user) {
		chans.push({
			platform: "youtube",
			user: storeAuth.youtube.user,
			isRemoteChan: false,
			color: "transparent",
		});
	}
	if (storeAuth.bluesky?.user) {
		chans.push({
			platform: "bluesky",
			user: storeAuth.bluesky.user,
			isRemoteChan: false,
			color: "transparent",
		});
	}

	if (storeTiktok.connected) {
		const user: TwitchatDataTypes.TwitchatUser = JSON.parse(
			JSON.stringify(storeAuth.twitch.user),
		);
		user.id = "tiktok";
		chans.push({ platform: "tiktok", user, isRemoteChan: false, color: "transparent" });
	}

	storeStream.connectedTwitchChans.forEach((entry) => {
		chans.push({
			platform: "twitch",
			user: entry.user,
			isRemoteChan: true,
			color: entry.color,
		});
	});

	return chans;
});

onBeforeMount(() => {
	let noConfig = true;
	for (const key in props.config.filters) {
		if (
			props.config.filters[
				key as (typeof TwitchatDataTypes.MessageListFilterTypes)[number]["type"]
			] === true
		) {
			noConfig = false;
			break;
		}
	}
	if (props.config.showGreetHere || props.config.showPanelsHere) noConfig = false;
	expand.value = noConfig;

	showCTA.value = DataStore.get(DataStore.CHAT_COL_CTA) !== "true" && props.config.order == 0;

	if (!props.config.whispersPermissions) {
		props.config.whispersPermissions = Utils.getDefaultPermissions();
	}

	filters.value = [];
	const filterList = TwitchatDataTypes.MessageListFilterTypes;
	for (const f of filterList) {
		const children: TwitchatDataTypes.ParameterData<boolean, unknown, boolean>[] = [];
		const paramData: TwitchatDataTypes.ParameterData<
			boolean,
			undefined,
			undefined,
			(typeof TwitchatDataTypes.MessageListFilterTypes)[number]
		> = {
			type: "boolean",
			value: props.config.filters[f.type] ?? true,
			labelKey: f.labelKey,
			icon: f.icon,
			twitch_scopes: f.scopes,
			storage: f,
		};

		//Force new filter to true
		if (props.config.filters[f.type] == undefined) {
			props.config.filters[f.type] = true;
		}

		filters.value.push(paramData);

		//Add sub-filters to the message types so we can filter mods, new users, automod, etc...
		if (f.type === TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			const entries = TwitchatDataTypes.MessageListChatMessageFilterTypes;
			for (const entry of entries) {
				let type = entry.type;
				if (props.config.messageFilters[type] == undefined) {
					props.config.messageFilters[type] = true;
				}

				const paramData: TwitchatDataTypes.ParameterData<boolean, unknown, string[]> = {
					type: "boolean",
					value: props.config.messageFilters[type],
					labelKey: entry.labelKey,
					storage: entry,
					icon: entry.icon,
				};

				if (entry.scopes.length > 0) paramData.twitch_scopes = entry.scopes;

				if (type == "commands") {
					const subParam: TwitchatDataTypes.ParameterData<string[]> = {
						type: "editablelist",
						longText: true,
						value: props.config.commandsBlockList,
						labelKey: "chat.filters.commands",
						placeholderKey: "chat.filters.commands_placeholder",
						icon: "hide",
						maxLength: 1000000,
						editCallback: (data) => {
							props.config.commandsBlockList = data.value;
							saveData();
						},
					};
					paramData.children = [subParam];
				}
				if (type == "short") {
					paramData.tooltipKey = "chat.filters.short_tt";
				}
				if (type == "tracked") {
					paramData.tooltipKey = "chat.filters.tracked_tt";
				}
				children.push(paramData);
			}
			messageFilters.value = children;
		}
	}

	checkForMissingScopes();

	clickHandler = (e: MouseEvent | TouchEvent) => onMouseDown(e);
	mouseMoveHandler = (e: MouseEvent | TouchEvent) => onMouseMove(e);
	document.addEventListener("touchstart", clickHandler);
	document.addEventListener("mousedown", clickHandler);
	document.addEventListener("mousemove", mouseMoveHandler);
	document.addEventListener("touchmove", mouseMoveHandler);

	//Force focus out of input when rolling out
	watch(
		() => props.open,
		() => {
			//This makes sure any data written on a text input is saved.
			//<ParamItem> uses a "lazy" update that is triggered only when input
			//looses focus. THis is why we remove the focus of the current
			//element here, just in case.
			let root = document.activeElement as HTMLElement;
			while (root && root != rootEl.value && root != document.body) {
				root = root.parentElement as HTMLElement;
			}
			if (!props.open && root == rootEl.value) {
				const el = document.activeElement as HTMLElement;
				//Do not blur if it's a <vue-select> component
				if (!el.classList.contains("vs__search")) {
					el.blur();
				}
			}
		},
	);

	watch(
		() => props.config.showPanelsHere,
		() => {
			const cols = storeParams.chatColumnsConfig;
			if (props.config.showPanelsHere) {
				cols.forEach((v) => {
					if (v.showPanelsHere && v.id != props.config.id) {
						v.showPanelsHere = false;
					}
				});
			}
		},
	);

	watch(
		() => props.config.showGreetHere,
		() => {
			const cols = storeParams.chatColumnsConfig;
			if (props.config.showGreetHere) {
				cols.forEach((v) => {
					if (v.showGreetHere && v.id != props.config.id) {
						v.showGreetHere = false;
					}
				});
			}
		},
	);

	watch(
		() => storeAuth.twitch.scopes,
		() => {
			checkForMissingScopes();
		},
	);
});

onBeforeUnmount(() => {
	disposed = true;
	document.removeEventListener("touchstart", clickHandler);
	document.removeEventListener("mousedown", clickHandler);
	document.removeEventListener("mousemove", mouseMoveHandler);
	document.removeEventListener("touchmove", mouseMoveHandler);
});

function mouseEnterItem(data: (typeof TwitchatDataTypes.MessageListFilterTypes)[number]): void {
	mouseOverToggle.value = true;
	previewMessage(data);
}

function mouseLeaveItem(): void {
	if (touchMode) return;
	mouseOverToggle.value = false;
	previewData.value = [];
}

async function previewMessage(
	filter: (typeof TwitchatDataTypes.MessageListFilterTypes)[number],
): Promise<void> {
	previewData.value = [];
	loadingPreview.value = true;
	previewIndex.value++;
	const previewIndexLoc = previewIndex.value;
	const cached = messagesCache[filter.type];
	if (cached && cached.length > 0) {
		previewData.value = cached;
		loadingPreview.value = false;
		return;
	}

	await nextTick();

	messagesCache[filter.type] = [];
	if (filter.type == TwitchatDataTypes.TwitchatMessageType.NOTICE) {
		storeDebug.simulateNotice<TwitchatDataTypes.MessageNoticeData>(
			TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateNotice<TwitchatDataTypes.MessageNoticeData>(
			TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateNotice<TwitchatDataTypes.MessageNoticeData>(
			TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(
			TwitchatDataTypes.TwitchatMessageType.CONNECT,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(
			TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(
			TwitchatDataTypes.TwitchatMessageType.BLOCKED_TERMS,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(
			TwitchatDataTypes.TwitchatMessageType.WARN_CHATTER,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(
			TwitchatDataTypes.TwitchatMessageType.WARN_ACKNOWLEDGE,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		loadingPreview.value = false;
	} else if (filter.type == TwitchatDataTypes.TwitchatMessageType.SHOUTOUT) {
		storeDebug.simulateMessage<TwitchatDataTypes.MessageShoutoutData>(
			TwitchatDataTypes.TwitchatMessageType.SHOUTOUT,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.received = false;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageShoutoutData>(
			TwitchatDataTypes.TwitchatMessageType.SHOUTOUT,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.received = true;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		loadingPreview.value = false;
	} else if (filter.type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE) {
		storeDebug.simulateMessage<TwitchatDataTypes.MessageStreamOnlineData>(
			TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageStreamOfflineData>(
			TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		loadingPreview.value = false;
	} else if (filter.type == TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST) {
		storeDebug.simulateMessage<TwitchatDataTypes.MessageUnbanRequestData>(
			TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.isResolve = false;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageUnbanRequestData>(
			TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.isResolve = true;
				data.accepted = false;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageUnbanRequestData>(
			TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.isResolve = true;
				data.accepted = true;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		loadingPreview.value = false;
	} else if (filter.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
		await storeDebug.simulateMessage<TwitchatDataTypes.MessageSubscriptionData>(
			TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.is_gift = false;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		await storeDebug.simulateMessage<TwitchatDataTypes.MessageSubscriptionData>(
			TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.is_gift = true;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageYoutubeSubscriptionData>(
			TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageYoutubeSubscriptionData>(
			TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		loadingPreview.value = false;
	} else if (filter.type == TwitchatDataTypes.TwitchatMessageType.CHEER) {
		await storeDebug.simulateMessage<TwitchatDataTypes.MessageCheerData>(
			TwitchatDataTypes.TwitchatMessageType.CHEER,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		await storeDebug.simulateMessage<TwitchatDataTypes.MessageCheerData>(
			TwitchatDataTypes.TwitchatMessageType.CHEER,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.pinned = true;
				data.pinLevel = 6;
				data.pinDuration_ms = 60000;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageYoutubeSuperChatData>(
			TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessageYoutubeSuperStickerData>(
			TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		loadingPreview.value = false;
	} else if (filter.type == TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE) {
		storeDebug.simulateMessage<TwitchatDataTypes.MessagePrivateModeratorData>(
			TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.action = "dm";
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessagePrivateModeratorData>(
			TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE,
			(data) => {
				if (!data || !mouseOverToggle.value) return;
				data.action = "question";
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		storeDebug.simulateMessage<TwitchatDataTypes.MessagePrivateModeratorData>(
			TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE,
			async (data) => {
				if (!data || !mouseOverToggle.value) return;
				data.action = "dm";
				const replyTo = await storeDebug.simulateMessage<TwitchatDataTypes.MessageChatData>(
					TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					undefined,
					false,
				);
				data.parentMessage = replyTo;
				messagesCache[filter.type]?.push(data);
				if (previewIndexLoc != previewIndex.value) return;
				previewData.value.push(data);
			},
			false,
		);
		loadingPreview.value = false;
	} else {
		storeDebug.simulateMessage<TwitchatDataTypes.ChatMessageTypes>(
			filter.type,
			(data) => {
				loadingPreview.value = false;

				if (!data || !mouseOverToggle.value) return;

				messagesCache[filter.type] = [data];

				if (previewIndexLoc != previewIndex.value) return;
				previewData.value = [data];
			},
			false,
			false,
		);
	}
}

/**
 * Called when clicking "all" toggle
 */
function toggleAll(): void {
	const select = param_toggleAll.value.value;
	type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;
	for (const filter of filters.value) {
		const type = filter.storage?.type;
		// Avoid enabling join/leave messages from "all" toggle
		if (select && (type === "join" || type === "leave")) continue;
		filter.value = select;
	}

	for (const key in props.config.messageFilters) {
		const k = key as messageFilterTypes;
		props.config.messageFilters[k] = select;
	}
}

async function previewSubMessage(
	entry: (typeof TwitchatDataTypes.MessageListChatMessageFilterTypes)[number],
): Promise<void> {
	previewData.value = [];
	loadingPreview.value = true;
	previewIndex.value++;
	mouseOverToggle.value = true;
	const previewIndexLoc = previewIndex.value;
	const cached = subMessagesCache[entry.type];
	if (cached === null) {
		previewData.value = [];
		loadingPreview.value = false;
		return; //No preview for this message
	}
	if (cached && cached.length > 0) {
		previewData.value = cached;
		loadingPreview.value = false;
		return;
	}

	await nextTick();

	subMessagesCache[entry.type] = [];
	storeDebug.simulateMessage(
		TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		(data: TwitchatDataTypes.ChatMessageTypes) => {
			loadingPreview.value = false;
			if (!data || !mouseOverToggle.value) return;

			const dataCast = data as TwitchatDataTypes.MessageChatData;

			if (entry.type == "automod") {
				let words: string[] = [];
				do {
					words.push(Utils.pickRand(dataCast.message.split(" ")));
				} while (Math.random() > 0.5);

				dataCast.twitch_automod = { reasons: ["bullying"], words };
			} else if (entry.type == "deleted") {
				dataCast.deleted = true;
			} else if (entry.type == "suspiciousUsers") {
				dataCast.twitch_isSuspicious = true;
			} else {
				subMessagesCache[entry.type] = null;
				return;
			}

			if (previewIndexLoc != previewIndex.value) return;

			previewData.value.push(data);
			subMessagesCache[entry.type] = previewData.value;
		},
		false,
		false,
	);

	if (entry.type == "automod") {
		storeDebug.simulateMessage(
			TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			(data: TwitchatDataTypes.ChatMessageTypes) => {
				if (!data || !mouseOverToggle.value) return;

				const dataCast = data as TwitchatDataTypes.MessageChatData;
				dataCast.twitch_isRestricted = true;
				const users: TwitchatDataTypes.TwitchatUser[] = [];
				const list = storeUsers.users;
				for (const user of list) {
					users.push(user);
					if (Math.random() > 0.3) break;
				}

				dataCast.twitch_sharedBanChannels = users.map((v) => {
					return { id: v.id, login: v.login };
				});

				if (previewIndexLoc != previewIndex.value) return;

				previewData.value.push(data);
				subMessagesCache[entry.type] = previewData.value;
			},
			false,
			false,
		);
	}
}

/**
 * Called when preview message is clicked.
 * Only usefull for touch interface so we can close it by clicking it
 */
function clickPreview(e: MouseEvent): void {
	e.stopPropagation();
	e.preventDefault();
	previewData.value = [];
}

/**
 * Called when a channel is clicked on the channel filter selector.
 * Only available if connected to more chans then just our Twitch channel.
 * Ex: Youtube channel or other external Twitch channels
 */
function clickChannel(entry: (typeof channels.value)[number]): void {
	//Toggle channel's state
	if (!props.config.channelIDs) props.config.channelIDs = {};
	if (props.config.channelIDs[entry.user.id]) {
		delete props.config.channelIDs[entry.user.id];
	} else {
		props.config.channelIDs[entry.user.id] = { platform: entry.platform, date: Date.now() };
	}

	//Limit history size
	if (Object.keys(props.config.channelIDs).length > 100) {
		let olderDate: number = 0;
		let olderKey: string | null = null;
		for (const key in props.config.channelIDs) {
			const entry = props.config.channelIDs[key];
			if (entry && entry.date > olderDate) {
				olderKey = key;
				olderDate = entry.date;
			}
		}
		if (olderKey) delete props.config.channelIDs[olderKey];
	}
	saveData();
}

/**
 * Called when submitting form.
 * This button is only here when creating anew column.
 * In such case user is prompted for filters selection and has
 * to select some in order to see the matching messages
 */
function submitForm(): void {
	error.value = false;
	let noSelection = true;
	for (const key in props.config.filters) {
		const typedKey = key as (typeof TwitchatDataTypes.MessageListFilterTypes)[number]["type"];
		if (props.config.filters[typedKey] === true) {
			noSelection = false;
			break;
		}
	}
	if (noSelection) {
		error.value = true;
	} else {
		emit("submit");
	}
}

/**
 * Force data save
 */
function saveData(): void {
	//Make sure the "show panels here" option is enabled in at
	//least 1 column
	nextTick(() => {
		let selectedPanelIndex = -1;
		let selectedGreetIndex = -1;
		const cols = storeParams.chatColumnsConfig;
		for (const col of cols) {
			if (col.showPanelsHere === true) selectedPanelIndex = cols.indexOf(col);
			if (col.showGreetHere === true) selectedGreetIndex = cols.indexOf(col);
		}
		if (selectedPanelIndex == -1 && selectedPanelIndex < cols.length) {
			selectedPanelIndex = props.config.order == cols.length - 1 ? 0 : cols.length - 1;
			cols[selectedPanelIndex]!.showPanelsHere = true;
		}
		if (selectedGreetIndex == -1) cols[0]!.showGreetHere = true;
	});

	//Delay save to avoid UI lag during toggle
	window.setTimeout(() => {
		emit("change");
		storeParams.saveChatColumnConfs();
	}, 300);
}

/**
 * Called when clicking a badge
 */
function onToggleBadge(badgeId: string, mandatory: boolean): void {
	let list: string[] = [];
	if (mandatory) {
		if (!props.config.mandatoryBadges) props.config.mandatoryBadges = [];
		list = props.config.mandatoryBadges;
	} else {
		if (!props.config.forbiddenBadges) props.config.forbiddenBadges = [];
		list = props.config.forbiddenBadges;
	}
	if (list.includes(badgeId)) {
		list.splice(
			list.findIndex((id) => id == badgeId),
			1,
		);
	} else {
		list.push(badgeId);
	}
	saveData();
}

/**
 * Called when clicking a preset
 */
async function preset(
	id:
		| "chat"
		| "chatSafe"
		| "moderation"
		| "activities"
		| "games"
		| "revenues"
		| "moderation&activities",
): Promise<void> {
	param_toggleAll.value.value = false;

	//Updating the "param_toggleAll" value triggers an update on all entries.
	//We need to wait for it to complete before selecting presets to avoid
	//both processes from conflicting with each other
	await nextTick();

	//Unselect all
	for (const filter of filters.value) {
		filter.value = false;
	}
	type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;
	const ids: (typeof TwitchatDataTypes.MessageListFilterTypes)[number]["type"][] = [];
	switch (id) {
		case "chat": {
			ids.push(TwitchatDataTypes.TwitchatMessageType.NOTICE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.MESSAGE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.WHISPER);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD);
			// ids.push( TwitchatDataTypes.TwitchatMessageType.JOIN );
			// ids.push( TwitchatDataTypes.TwitchatMessageType.LEAVE );
			for (const key in props.config.messageFilters) {
				const k = key as messageFilterTypes;
				props.config.messageFilters[k] = true;
			}
			break;
		}
		case "chatSafe": {
			ids.push(TwitchatDataTypes.TwitchatMessageType.NOTICE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.MESSAGE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.WHISPER);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD);
			for (const key in props.config.messageFilters) {
				const k = key as messageFilterTypes;
				props.config.messageFilters[k] =
					k != "automod" && k != "deleted" && k != "suspiciousUsers";
			}
			break;
		}
		case "moderation&activities":
		case "moderation": {
			ids.push(TwitchatDataTypes.TwitchatMessageType.BAN);
			ids.push(TwitchatDataTypes.TwitchatMessageType.UNBAN);
			ids.push(TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST);
			ids.push(TwitchatDataTypes.TwitchatMessageType.NOTICE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.RAID);
			ids.push(TwitchatDataTypes.TwitchatMessageType.SHOUTOUT);
			ids.push(TwitchatDataTypes.TwitchatMessageType.MESSAGE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.WHISPER);
			ids.push(TwitchatDataTypes.TwitchatMessageType.PINNED);
			ids.push(TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE);
			for (const key in props.config.messageFilters) {
				const k = key as messageFilterTypes;
				props.config.messageFilters[k] =
					k == "automod" ||
					k == "deleted" ||
					k == "tracked" ||
					k == "pinned" ||
					k == "suspiciousUsers" ||
					k == "moderators";
			}
			if (id == "moderation") break;
		}
		case "activities": {
			ids.push(TwitchatDataTypes.TwitchatMessageType.BAN);
			ids.push(TwitchatDataTypes.TwitchatMessageType.RAID);
			ids.push(TwitchatDataTypes.TwitchatMessageType.POLL);
			ids.push(TwitchatDataTypes.TwitchatMessageType.KOFI);
			ids.push(TwitchatDataTypes.TwitchatMessageType.CHEER);
			ids.push(TwitchatDataTypes.TwitchatMessageType.UNBAN);
			ids.push(TwitchatDataTypes.TwitchatMessageType.BINGO);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TIPEEE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.NOTICE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.RAFFLE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.REWARD);
			ids.push(TwitchatDataTypes.TwitchatMessageType.PINNED);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TILTIFY);
			ids.push(TwitchatDataTypes.TwitchatMessageType.PATREON);
			ids.push(TwitchatDataTypes.TwitchatMessageType.SHOUTOUT);
			ids.push(TwitchatDataTypes.TwitchatMessageType.FOLLOWING);
			ids.push(TwitchatDataTypes.TwitchatMessageType.COUNTDOWN);
			ids.push(TwitchatDataTypes.TwitchatMessageType.PREDICTION);
			ids.push(TwitchatDataTypes.TwitchatMessageType.STREAMLABS);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION);
			ids.push(TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST);
			ids.push(TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS);
			ids.push(TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK);
			ids.push(TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY);
			ids.push(TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START_CHAT);
			ids.push(TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE);
			// ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN );
			ids.push(TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION);
			ids.push(TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION);
			break;
		}
		case "games": {
			ids.push(TwitchatDataTypes.TwitchatMessageType.POLL);
			ids.push(TwitchatDataTypes.TwitchatMessageType.BINGO);
			ids.push(TwitchatDataTypes.TwitchatMessageType.RAFFLE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.REWARD);
			ids.push(TwitchatDataTypes.TwitchatMessageType.COUNTDOWN);
			ids.push(TwitchatDataTypes.TwitchatMessageType.PREDICTION);
			break;
		}
		case "revenues": {
			ids.push(TwitchatDataTypes.TwitchatMessageType.CHEER);
			ids.push(TwitchatDataTypes.TwitchatMessageType.KOFI);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TIPEEE);
			ids.push(TwitchatDataTypes.TwitchatMessageType.PATREON);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TILTIFY);
			ids.push(TwitchatDataTypes.TwitchatMessageType.STREAMLABS);
			ids.push(TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT);
			ids.push(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION);
			ids.push(TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS);
			ids.push(TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY);
			// ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN );
			ids.push(TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION);
			ids.push(TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE);
			break;
		}
	}

	for (let i = 0; i < ids.length; i++) {
		const filter = filters.value.find((v) => v.storage!.type === ids[i]);
		if (filter) filter.value = true;
	}

	saveData();
}

/**
 * Called when requesting to delete the current column
 */
function deleteColumn(): void {
	storeMain
		.confirm(t("chat.delete_col_confirm_title"), t("chat.delete_col_confirm_desc"))
		.then(() => {
			storeParams.delChatColumn(props.config);
		})
		.catch((error) => {
			//ignore
		});
}

/**
 * Called when requesting to move a column
 */
function moveColumn(direction: -1 | 1): void {
	storeParams.moveChatColumn(props.config, direction);
}

/**
 * Called when CTA is clicked
 */
function hideCTA(): void {
	DataStore.set(DataStore.CHAT_COL_CTA, true);
	showCTA.value = false;
}

/**
 * Called when opening filters
 */
function openFilters(viaButton: boolean = false): void {
	expand.value = true;
	if (viaButton) hideCTA();

	requestAnimationFrame(() => renderFrame());
}

/**
 * Called when opening filters
 */
function closeFilters(viaButton: boolean = false): void {
	expand.value = false;
	checkForMissingScopes();
}

/**
 * Called when the mouse moves
 */
function onMouseMove(e: MouseEvent | TouchEvent): void {
	if (!props.open) return;

	touchMode = e.type != "mousemove";
	if (!touchMode) {
		mouseY = (e as MouseEvent).clientY;
	} else {
		mouseY = (e as TouchEvent).touches[0]?.clientY || 0;
	}
}

/**
 * Called when something is clicked.
 * Closes the panel when clicking outside
 */
function onMouseDown(e: MouseEvent | TouchEvent): void {
	if (!props.open) return;

	let target = e.target as HTMLDivElement;
	const elRef = rootEl.value!;
	touchMode = e.type == "touchstart";
	while (target != document.body && target != elRef && target) {
		target = target.parentElement as HTMLDivElement;
	}
	if (target != elRef && expand.value) {
		closeFilters();
	}
}

/**
 * Move message previews
 */
function renderFrame(): void {
	if (disposed || !expand.value) return;
	requestAnimationFrame(() => renderFrame());

	const holder = previewListRef.value;
	if (!holder) return;

	const parentBounds = rootEl.value!.getBoundingClientRect();
	const bounds = holder.getBoundingClientRect();
	const margin = 50;
	let py = mouseY - parentBounds.top + margin;
	if (py + bounds.height > rootEl.value!.offsetHeight) {
		py = mouseY - parentBounds.top - bounds.height - margin;
	}

	holder.style.top = py + "px";
}

/**
 * Check if a filter that requires a missing scope is enabled
 * If so, it will be highlighted and a message will be posted
 * on chat to warn the user
 */
function checkForMissingScopes(): void {
	let missingScopes: TwitchScopesString[] = [];
	for (const f of filters.value) {
		//Keep missing scopes
		if (f.twitch_scopes && f.value === true) {
			f.twitch_scopes.forEach((s) => {
				if (!TwitchUtils.hasScopes([s])) {
					missingScopes = missingScopes.concat(s);
					f.error = true;
				}
			});
		}
	}

	//If "messages" filter is selected, check for sub filters
	if (
		filters.value.find((v) => {
			return v.storage?.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE;
		})?.value === true
	) {
		for (const f of messageFilters.value) {
			//Keep missing scopes
			if (f.twitch_scopes && f.value === true) {
				f.twitch_scopes.forEach((s) => {
					if (!TwitchUtils.hasScopes([s])) {
						missingScopes = missingScopes.concat(s);
						f.error = true;
					}
				});
			}
		}
	}

	//Search if a "missing scopes" message exists and delete it
	//A new one will be created after if necessary
	const list = storeChat.messages;
	//Only check within the last 100 messages, not a big deal if it
	//remains in the list in such case and low risks this happens
	for (let i = list.length - 1; i > Math.max(0, list.length - 100); i--) {
		const m = list[i];
		if (!m) continue;
		if (
			m.col == props.config.order &&
			m.type == TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST
		) {
			//Message found, delete it
			storeChat.deleteMessage(m);
			break;
		}
	}

	//Send a message on this column to warn for missing scopes
	if (missingScopes.length > 0) {
		const dedupeDict: { [key: string]: boolean } = {};
		storeChat.addMessage({
			type: TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST,
			date: Date.now(),
			col: props.config.order,
			id: Utils.getUUID(),
			platform: "twitchat",
			twitch_scopes: missingScopes.filter((v) => {
				//Dedupe scopes
				if (dedupeDict[v] === true) return false;
				dedupeDict[v] = true;
				return true;
			}),
			channel_id: storeAuth.twitch.user.id,
		});
	}
}
</script>

<style scoped lang="less">
.messagelistfilter {
	padding: 0;
	color: var(--color-text);
	max-height: 100%;
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: row;
	border-bottom-left-radius: 0.5em;
	transform: translateX(100%);
	transition:
		transform 0.25s,
		opacity 0.25s;
	pointer-events: none;
	max-width: 400px;
	backdrop-filter: blur(5px);

	.content {
		opacity: 1;
		transition: opacity 0.25s;

		&.fade-enter-from,
		&.fade-leave-to {
			opacity: 0;
		}
	}

	&.expand {
		transform: translateX(0);
	}

	&.verticalSplitMode {
		max-width: 700px;
		.holder {
			.content {
				width: 100%;
				max-width: 100%;
				.paramsList {
					display: flex;
					flex-direction: row;
					align-items: flex-start;
					justify-content: center;
					flex-wrap: wrap;
					margin: unset;

					.item {
						width: 300px;
					}
					.toggleAll {
						width: 300px;
						padding: 0.25em;
						// margin-right: 2.25em;
					}
					.subFilters {
						flex-basis: 100%;
						& > .item {
							margin-left: auto;
							margin-right: auto;
							&:deep(.holder)::before {
								display: none;
							}
						}
					}
				}
			}
		}
	}

	&.fullSize {
		max-width: 100%;
	}

	@actionSizes: 26px;
	@actionPadding: 0px;
	.hoverActions {
		margin-left: -@actionSizes - @actionPadding * 2;
		width: @actionSizes + @actionPadding * 2;
		display: flex;
		flex-direction: column;
		background: var(--color-primary);
		gap: 1px;
		top: 50%;
		padding: @actionPadding;
		border-bottom-left-radius: 0.25em;
		height: fit-content;
		pointer-events: painted;
		overflow: hidden;
		button {
			display: flex;
			align-items: center;
			pointer-events: all;
			padding: calc(@actionSizes / 4);
			width: @actionSizes;
			height: @actionSizes;
			min-width: @actionSizes;
			min-height: @actionSizes;
			border-radius: 0.25em;
			.icon {
				height: 100%;
				margin: auto;
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
			&.deleteBt {
				background-color: var(--color-alert);
				border-radius: 0;
				&:hover {
					background-color: var(--color-alert-light);
				}
			}
		}
	}

	&.ctaMode {
		.hoverActions {
			button:first-child {
				position: relative;
				&::before {
					content: "";
					position: absolute;
					width: 100%;
					height: 100%;
					left: 50%;
					top: 50%;
					border-radius: 0.25em;
					background-color: var(--color-light);

					transform: translate(-50%, -50%) scale(0.8);
					animation: glow 1s;
					animation-iteration-count: infinite;
					animation-timing-function: linear;
					animation-delay: 0.5s;
					@keyframes glow {
						from {
							opacity: 1;
							transform: translate(-50%, -50%) scale(0.9);
						}
						to {
							opacity: 0;
							transform: translate(-50%, -50%) scale(1.2);
						}
					}
				}
			}
		}
	}

	.cta {
		position: absolute;
		left: 0.5em;
		top: 0.5em;
		cursor: pointer;
		background-color: var(--color-secondary);
		padding: 0.25em 0.5em;
		border-radius: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		animation: bounce 0.5s;
		animation-direction: alternate;
		animation-timing-function: cubic-bezier(0.5, 0.05, 1, 0.5);
		animation-iteration-count: infinite;
		pointer-events: all;
		color: var(--color-text-light);
		transform: translateX(calc(-100% - @actionSizes - @actionPadding * 2));
		.label {
			font-size: 0.8em;
		}
		& > .icon {
			height: 0.8em;
			margin-left: 0.5em;
		}
		@keyframes bounce {
			from {
				left: -1em;
			}
			to {
				left: 0.5em;
			}
		}
	}

	.holder {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 0.5em;
		pointer-events: all;
		position: relative;
		overflow-x: hidden;
		.content {
			.closeBt {
				margin: -0.25em;
			}

			flex-grow: 1;
			display: flex;
			flex-direction: column;
			height: 100%;
			margin: auto;
			gap: 0.5em;

			& > .head {
				display: flex;
				flex-direction: row;
				width: 100%;
				align-items: center;
				.title {
					flex-grow: 1;
					text-align: center;
				}
			}

			.info {
				text-align: center;
			}
			.showPanelsHere,
			.showGreetHere,
			.bgColor {
				font-size: 0.9em;
			}
			.channelList,
			.bgColor {
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				flex-shrink: 0;
				.title {
					align-self: flex-start;
					flex-grow: 1;
					width: calc(100% - 1em - 30px);
				}
				.icon {
					flex-grow: 0;
					flex-shrink: 0;
					width: 1em;
					height: 1em;
					vertical-align: middle;
				}
			}
			.channelList {
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				.entryList {
					gap: 0.25em;
					display: flex;
					flex-direction: column;
					.entry {
						gap: 0.5em;
						display: flex;
						flex-direction: row;
						align-items: center;
						cursor: pointer;
						padding: 2px;
						padding-right: 5px;
						border-radius: var(--border-radius);
						color: #444444;
						background: #cccccc;
						text-align: left;
						opacity: 0.8;
						transition: all 0.2s;
						filter: grayscale();
						&.selected {
							filter: none;
							opacity: 1;
							background: #ffffff;
							color: var(--color-secondary);
						}
						.avatar {
							width: 1.5em;
							height: 1.5em;
							border-radius: 50%;
							border: 2px solid currentColor;
						}

						.icon {
							height: 1em;
							max-width: 1em;
							align-self: center;
						}
						.pseudo {
							text-wrap: nowrap;
							flex-grow: 1;
							overflow: hidden;
							text-overflow: ellipsis;
						}
						&:hover {
							background-color: #ffffffe0;
						}
					}
				}
			}
			.bgColor {
				.colorBt {
					width: 30px;
					height: 30px;
					border-radius: var(--border-radius);
					border: 1px solid var(--color-text-fader);
					background-color: currentColor;
					&.picker {
						background-color: transparent;
						border-color: var(--color-text);
						position: relative;
						&::before {
							content: "";
							position: absolute;
							.center();
							width: 1em;
							height: 1em;
							z-index: 1;
							pointer-events: none;
							mix-blend-mode: difference;
							background-image: url(../../../assets/icons/pipette.svg);
						}
					}
					:deep(.inputHolder) {
						height: 28px;
					}

					&.tranparent {
						overflow: hidden;
						position: relative;
						border: 1px solid var(--color-text);
						&::before {
							content: "";
							position: absolute;
							top: 0;
							left: 0;
							width: 150%;
							height: 150%;
							border-left: 1px solid var(--color-text);
							transform-origin: top left;
							transform: rotate(-45deg);
						}
					}

					&[data-selected="true"] {
						border: 2px solid var(--color-text) !important;
					}
				}
			}
			.presetsBt {
				margin: auto;
			}
			.presets {
				display: flex;
				gap: 0.25em;
				flex-direction: row;
				justify-content: space-around;
				flex-wrap: wrap;
				justify-content: center;
				padding: 0.25em;
			}

			.paramsList {
				flex: 1;
				overflow: auto;
				margin: auto;
				padding: 0 0.25em;
				gap: 2px;
				display: flex;
				flex-direction: column;
				flex-shrink: 0;
				min-height: 100px;

				.toggleAll {
					padding: 0 0.5em;
					font-size: 0.9em;
					margin-bottom: 2px;
					:deep(label) {
						text-align: right;
					}
				}
				.item {
					flex-shrink: 0;
					font-size: 0.9em;
					display: flex;
					flex-direction: row;
					align-items: center;
					:deep(.child) {
						font-size: 0.9rem;
						width: calc(100% - 0.5em);
					}
					.paramitem {
						flex-grow: 1;
					}
					.preview {
						height: 1em;
						width: 1em;
						margin-right: 0.5em;
						flex-shrink: 0;
					}
				}
				.subFilters {
					gap: 2px;
					display: flex;
					flex-direction: column;
					& > .item {
						flex-shrink: 0;
						font-size: 0.9em;
						display: flex;
						flex-direction: row;
						align-items: center;
						margin-top: 0;
					}
					.badgeList {
						margin-top: 0.5em;
						gap: 2px;
						display: flex;
						flex-direction: row;
						flex-wrap: wrap;
						justify-content: center;
						img {
							display: block;
						}
						button {
							opacity: 0.25;
							&.selected {
								opacity: 1;
								outline: 1px solid var(--color-text);
							}
						}
					}
				}
				&::-webkit-scrollbar-thumb {
					background-color: var(--color-light);
				}
			}
			& > .error {
				margin-top: 0.5em;
				text-align: center;
				font-size: 0.8em;
				font-weight: bold;
				cursor: pointer;
			}
			.ctas {
				margin-top: 0.5em;
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
			}
		}

		.previewList {
			position: absolute;
			width: 100%;
			max-width: min(100%, 500px);
			margin: auto;
			max-height: 500px;
			overflow: hidden;
			transform: translateX(-50%);
			left: 50%;
			top: 99999px;
			z-index: 100;
			padding: 0.5em;
			background-color: var(--color-text);
			box-shadow: var(--box-shadow);
			.preview {
				background-color: var(--background-color-primary);
				border-radius: var(--border-radius);
				cursor: pointer;
				& > * {
					padding: 0;
					pointer-events: none;
				}
				.loader {
					text-align: center;
					margin: auto;
					display: block;
					height: 2em;
				}

				&:not(:last-child) {
					margin-bottom: 0.25em;
				}
				&.missingScope {
					font-size: 0.8em;
					padding: 0.75em;
					text-align: center;
					font-weight: bold;
					img {
						height: 1.5em;
					}
				}
			}
			.missingScope {
				margin-bottom: 0.5em;
				text-align: center;
				.lockicon {
					height: 1.5em;
					margin-bottom: 0.25em;
				}
			}
		}
	}
}
</style>
