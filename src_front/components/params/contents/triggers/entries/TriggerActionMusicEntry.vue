<template>
	<div class="TriggerActionMusicEntry triggerActionForm" v-if="!spotifyConnected">
		<div class="info warn">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.music.header">
				<template #LINK>
					<a @click="storeParams.openParamsPage(contentConnexions, 'spotify')">{{
						t("triggers.actions.music.header_link")
					}}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="TriggerActionMusicEntry triggerActionForm" v-else>
		<ParamItem :paramData="param_actions" v-model="action.musicAction" />
		<div
			v-if="isPlaylistEditAction && !canEditSpotifyPlaylists"
			class="card-item alert scopesAlert"
		>
			<p>
				<Icon name="lock_fit" />{{
					$t("triggers.actions.music.missing_playlist_edit_scopes")
				}}
			</p>
			<TTButton light alert @click="spotifyAuth()">{{ $t("global.grant_scope") }}</TTButton>
		</div>
		<template v-else>
			<template v-if="showPlaylistInput">
				<ParamItem :paramData="param_playlist" v-model="action.playlist" />
				<ParamItem
					:paramData="param_playlistPos"
					v-model="action.playlistAddToEnd"
					inverseChildrenCondition
				>
					<ParamItem
						:paramData="param_playlistPosIndex"
						v-model="action.playlistAddAt"
						class="child"
						noBackground
						placeholdersAsPopout
					/>
				</ParamItem>
			</template>
			<template v-if="showTrackInput">
				<ParamItem :paramData="param_limitDuration" v-model="action.limitDuration">
					<ParamItem
						:paramData="param_maxDuration"
						v-model="action.maxDuration"
						class="child"
						noBackground
					/>
				</ParamItem>
				<ParamItem
					:paramData="param_maxPerUser"
					v-model="param_maxPerUser.value"
					@change="onMaxPerUserChange"
				>
					<ParamItem
						:paramData="param_maxPerUser_value"
						v-model="action.maxPerUser"
						class="child"
						noBackground
					/>
				</ParamItem>
				<ParamItem :paramData="param_selection" v-model="action.musicSelectionType" />
				<ParamItem :paramData="param_track" v-model="action.track" />
				<ParamItem :paramData="param_confirmSongRequest" v-model="action.confirmMessage" />
				<ParamItem :paramData="param_failSongRequest" v-model="action.failMessage" />
			</template>
		</template>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { SpotifyScopes } from "@/types/spotify/SpotifyDataTypes";
import {
	MusicTriggerEvents,
	TriggerActionMusicEntryDataSelectionList,
	TriggerActionPlaceholders,
	TriggerEventPlaceholders,
	TriggerMusicTypes,
	TriggerTypes,
	type ITriggerPlaceholder,
	type TriggerActionMusicEntryData,
	type TriggerActionMusicEntryDataSelection,
	type TriggerData,
	type TriggerMusicTypesValue,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	action: TriggerActionMusicEntryData;
	triggerData: TriggerData;
}>();

const { t } = useI18n();
const storeParams = useStoreParams();

const param_actions = ref<
	TwitchatDataTypes.ParameterData<TriggerMusicTypesValue, TriggerMusicTypesValue>
>({
	type: "list",
	value: "0",
	listValues: [],
	icon: "music",
	labelKey: "triggers.actions.music.param_actions",
});
const param_limitDuration = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "timer",
	labelKey: "triggers.actions.music.param_limit_duration",
});
const param_maxDuration = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 300,
	icon: "timer",
	max: 3600,
	labelKey: "triggers.actions.music.param_max_duration",
});
const param_track = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	longText: true,
	value: "",
	icon: "music",
	maxLength: 500,
	labelKey: "triggers.actions.music.param_track",
});
const param_confirmSongRequest = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	longText: true,
	value: "",
	icon: "checkmark",
	maxLength: 500,
	labelKey: "triggers.actions.music.param_confirmSongRequest",
});
const param_failSongRequest = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	longText: true,
	value: "{FAIL_REASON}",
	icon: "cross",
	maxLength: 500,
	labelKey: "triggers.actions.music.param_failSongRequest",
});
const param_playlist = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "info",
	maxLength: 500,
	labelKey: "triggers.actions.music.param_playlist",
});
const param_playlistPos = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "info",
	labelKey: "triggers.actions.music.param_playlistPos",
});
const param_playlistPosIndex = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	min: 0,
	max: 9999999,
	icon: "info",
	labelKey: "triggers.actions.music.param_playlistPosIndex",
});
const param_selection = ref<TwitchatDataTypes.ParameterData<TriggerActionMusicEntryDataSelection>>({
	type: "list",
	value: "1",
	icon: "search",
	labelKey: "triggers.actions.music.param_selection",
});
const param_maxPerUser = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "user",
	labelKey: "triggers.actions.music.param_limit_perUser",
});
const param_maxPerUser_value = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	min: 0,
	max: 99,
	icon: "number",
	labelKey: "triggers.actions.music.param_max_perUser",
});

const spotifyConnected = computed(() => {
	return SpotifyHelper.instance.connected.value;
});
const showTrackInput = computed(() => {
	return (
		param_actions.value.value == TriggerMusicTypes.ADD_TRACK_TO_QUEUE ||
		param_actions.value.value == TriggerMusicTypes.ADD_TRACK_TO_PLAYLIST
	);
});
const showPlaylistInput = computed(() => {
	return (
		param_actions.value.value == TriggerMusicTypes.START_PLAYLIST ||
		param_actions.value.value == TriggerMusicTypes.ADD_TRACK_TO_PLAYLIST
	);
});
const isPlaylistEditAction = computed(() => {
	return param_actions.value.value == TriggerMusicTypes.ADD_TRACK_TO_PLAYLIST;
});
const contentConnexions = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.CONNECTIONS;
});
const canEditSpotifyPlaylists = computed<boolean>(() => {
	return SpotifyHelper.instance.hasScopes([
		SpotifyScopes.EDIT_PRIVATE_PLAYLISTS,
		SpotifyScopes.EDIT_PUBLIC_PLAYLISTS,
	]);
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	param_track.value.placeholderList = list;
	param_confirmSongRequest.value.placeholderList = list.concat(
		TriggerEventPlaceholders(TriggerTypes.TRACK_ADDED_TO_QUEUE),
	);
	param_failSongRequest.value.placeholderList = list.concat(
		TriggerActionPlaceholders(props.action.type),
		TriggerEventPlaceholders(TriggerTypes.TRACK_ADD_TO_QUEUE_FAILED),
	);
	param_playlist.value.placeholderList = list;
	param_playlistPosIndex.value.placeholderList = list.filter((v) => v.numberParsable);
}

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

onBeforeMount(() => {
	//List all available trigger types
	let events: TwitchatDataTypes.ParameterDataListValue<TriggerMusicTypesValue>[] = [];
	events.push({ labelKey: "triggers.actions.music.param_actions_default", value: "0" });
	MusicTriggerEvents().forEach((v) => {
		events.push({ labelKey: v.labelKey, value: v.value });
	});

	param_actions.value.value = props.action.musicAction
		? props.action.musicAction
		: events[0]!.value;
	param_actions.value.listValues = events;

	let selections: TwitchatDataTypes.ParameterDataListValue<TriggerActionMusicEntryDataSelection>[] =
		[];
	for (const element of TriggerActionMusicEntryDataSelectionList) {
		selections.push({
			value: element,
			labelKey: "triggers.actions.music.param_selection_options." + element,
		});
	}
	// Spotify limited search from 50 to 10 results.
	// If a selection type is no more available, fallback to largest available "top10"
	if (
		props.action.musicSelectionType &&
		!TriggerActionMusicEntryDataSelectionList.includes(props.action.musicSelectionType)
	) {
		props.action.musicSelectionType =
			TriggerActionMusicEntryDataSelectionList[
				TriggerActionMusicEntryDataSelectionList.length - 1
			]!;
	}
	param_selection.value.value = props.action.musicSelectionType
		? props.action.musicSelectionType
		: selections[0]!.value;
	param_selection.value.listValues = selections;

	if (props.action.playlistAddToEnd === undefined) props.action.playlistAddToEnd = true;
	if (!props.action.track) props.action.track = "";
	if (!props.action.failMessage) props.action.failMessage = "";
	if (!props.action.confirmMessage) props.action.confirmMessage = "";
	if ((props.action.maxPerUser || 0) > 0) param_maxPerUser.value.value = true;
});

/**
 * Start Spotify oAuth flow with fresh new scopes
 */
function spotifyAuth(): void {
	SpotifyHelper.instance.startAuthFlow();
}

/**
 * Resets "max per user" value when toggle is disabled
 */
function onMaxPerUserChange(): void {
	if (!param_maxPerUser.value.value) {
		props.action.maxPerUser = 0;
	}
}
</script>

<style scoped lang="less">
.TriggerActionMusicEntry {
	.scopesAlert {
		text-align: center;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.icon {
			height: 1em;
			margin-right: 0.25em;
		}
	}
}
</style>
