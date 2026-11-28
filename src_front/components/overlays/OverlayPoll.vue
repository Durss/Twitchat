<template>
	<PollRenderer
		v-if="poll && parameters"
		:open="show"
		:showTimer="parameters.showTimer"
		:showLabels="parameters.showLabels"
		:showPercent="parameters.showPercent"
		:showVoters="parameters.showVotes"
		:showVotes="false"
		:showWinner="showWinner"
		:title="parameters.showTitle ? poll.title : ''"
		:duration="poll.duration_s * 1000"
		:startedAt="poll.started_at"
		:resultDuration_s="parameters.resultDuration_s"
		:placement="parameters.placement"
		:mode="listMode ? 'list' : 'line'"
		:entries="poll.choices"
	/>
</template>

<script setup lang="ts">
import { useOverlayConnector } from "@/composables/useOverlayConnector";
import type TwitchatEvent from "@/events/TwitchatEvent";
import type { PollOverlayParamStoreData } from "@/store/poll/storePoll";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import PollRenderer from "./poll/PollRenderer.vue";

const show = ref(false);
const showWinner = ref(false);
const poll = ref<TwitchatDataTypes.MessagePollData | null>(null);
const parameters = ref<PollOverlayParamStoreData>({
	showTitle: true,
	listMode: true,
	listModeOnlyMore2: true,
	showLabels: false,
	showPercent: false,
	showVotes: false,
	showTimer: true,
	showOnlyResult: false,
	resultDuration_s: 5,
	placement: "bl",
});

let parametersReceived: boolean = false;
let pendingData: TwitchatEvent<"ON_POLL_PROGRESS"> | null = null;

const listMode = computed<boolean>(() => {
	return (
		parameters.value.listMode &&
		(!parameters.value.listModeOnlyMore2 ||
			(parameters.value.listModeOnlyMore2 && poll.value!.choices.length > 2))
	);
});

useOverlayConnector(requestInfo);

onMounted(() => {
	PublicAPI.instance.broadcast("ON_POLLS_OVERLAY_PRESENCE");

	PublicAPI.instance.addEventListener("ON_POLL_PROGRESS", onUpdatePoll);
	PublicAPI.instance.addEventListener("ON_POLL_OVERLAY_CONFIGS", onUpdateParams);
	PublicAPI.instance.addEventListener("GET_POLLS_OVERLAY_PRESENCE", onRequestPresence);
});

onBeforeUnmount(() => {
	PublicAPI.instance.removeEventListener("ON_POLL_PROGRESS", onUpdatePoll);
	PublicAPI.instance.removeEventListener("ON_POLL_OVERLAY_CONFIGS", onUpdateParams);
	PublicAPI.instance.removeEventListener("GET_POLLS_OVERLAY_PRESENCE", onRequestPresence);
});

function onRequestPresence(): void {
	PublicAPI.instance.broadcast("ON_POLLS_OVERLAY_PRESENCE");
}

function requestInfo(): void {
	PublicAPI.instance.broadcast("GET_POLLS_OVERLAY_CONFIGS");
}

async function onUpdatePoll(e: TwitchatEvent<"ON_POLL_PROGRESS">): Promise<void> {
	if (!parametersReceived) {
		// overlay's parameters not received yet, put data aside
		// onUpdatePoll() will be called by onUpdateParams() afterwards
		pendingData = e;
		requestInfo();
		return;
	}

	const newPoll = e.data?.poll;
	if (newPoll && poll.value && newPoll.id != poll.value.id) {
		// New poll started while the previous one is still displayed
		// first hide current poll, the show the new one
		showWinner.value = false;
		show.value = false;
		await Utils.promisedTimeout(1000);
	}
	if (!newPoll) {
		// No poll given when a poll was displayed, request close
		if (poll.value) {
			const closingId = poll.value.id;
			showWinner.value = parameters.value.resultDuration_s > 0;
			show.value = true;
			await Utils.promisedTimeout(parameters.value.resultDuration_s * 1000);
			// A new poll started during the result display, leave it open
			if (poll.value?.id !== closingId) return;
			show.value = false;
			// Wait for close animation, then forget the poll so it's not
			// displayed back the next time configs are received
			await Utils.promisedTimeout(1000);
			if (poll.value?.id === closingId) poll.value = null;
		}
	} else {
		show.value = parameters.value.showOnlyResult !== true;
		showWinner.value = false;
		poll.value = newPoll;
	}
}

async function onUpdateParams(e: TwitchatEvent<"ON_POLL_OVERLAY_CONFIGS">): Promise<void> {
	parameters.value = e.data.parameters;
	parametersReceived = true;
	if (pendingData) {
		onUpdatePoll(pendingData);
		pendingData = null;
	} else if (poll.value && !showWinner.value) {
		show.value = parameters.value.showOnlyResult !== true;
	}
}
</script>
