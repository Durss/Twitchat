<template>
	<PollRenderer
		v-if="prediction && parameters"
		:open="show"
		:showTimer="parameters.showTimer"
		:showLabels="parameters.showLabels"
		:showPercent="parameters.showPercent"
		:showVoters="parameters.showVoters"
		:showVotes="parameters.showVotes"
		:showWinner="showWinner"
		:title="parameters.showTitle ? prediction.title : ''"
		:duration="prediction.duration_s * 1000"
		:startedAt="prediction.started_at"
		:resultDuration_s="parameters.resultDuration_s"
		:placement="parameters.placement"
		:mode="listMode ? 'list' : 'line'"
		:entries="prediction.outcomes"
		:winningId="prediction.winner?.id"
	/>
</template>

<script setup lang="ts">
import { useOverlayConnector } from "@/composables/useOverlayConnector";
import type TwitchatEvent from "@/events/TwitchatEvent";
import type { PredictionOverlayParamStoreData } from "@/store/prediction/storePrediction";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import PollRenderer from "./poll/PollRenderer.vue";

const show = ref(false);
const showWinner = ref(false);
const prediction = ref<TwitchatDataTypes.MessagePredictionData | null>(null);
const parameters = ref<PredictionOverlayParamStoreData>({
	showTitle: true,
	listMode: true,
	listModeOnlyMore2: true,
	showLabels: false,
	showPercent: false,
	showVoters: false,
	showVotes: false,
	showTimer: true,
	showOnlyResult: false,
	hideUntilResolved: true,
	resultDuration_s: 5,
	placement: "bl",
});

let parametersReceived: boolean = false;
let pendingData: TwitchatEvent<"ON_PREDICTION_PROGRESS"> | null = null;

const listMode = computed<boolean>(() => {
	return (
		parameters.value.listMode &&
		(!parameters.value.listModeOnlyMore2 ||
			(parameters.value.listModeOnlyMore2 && prediction.value!.outcomes.length > 2))
	);
});

useOverlayConnector(requestInfo);

onMounted(() => {
	PublicAPI.instance.broadcast("ON_PREDICTIONS_OVERLAY_PRESENCE");

	PublicAPI.instance.addEventListener("ON_PREDICTION_PROGRESS", onUpdatePrediction);
	PublicAPI.instance.addEventListener("ON_PREDICTION_OVERLAY_CONFIGS", onUpdateParams);
	PublicAPI.instance.addEventListener("GET_PREDICTIONS_OVERLAY_PRESENCE", onRequestPresence);
});

onBeforeUnmount(() => {
	PublicAPI.instance.removeEventListener("ON_PREDICTION_PROGRESS", onUpdatePrediction);
	PublicAPI.instance.removeEventListener("ON_PREDICTION_OVERLAY_CONFIGS", onUpdateParams);
	PublicAPI.instance.removeEventListener("GET_PREDICTIONS_OVERLAY_PRESENCE", onRequestPresence);
});

function onRequestPresence(): void {
	PublicAPI.instance.broadcast("ON_PREDICTIONS_OVERLAY_PRESENCE");
}

function requestInfo(): void {
	PublicAPI.instance.broadcast("GET_PREDICTIONS_OVERLAY_CONFIGS");
}

async function onUpdatePrediction(e: TwitchatEvent<"ON_PREDICTION_PROGRESS">): Promise<void> {
	if (!parametersReceived) {
		// overlay's parameters not received yet, put data aside
		// onUpdatePrediction() will be called by onUpdateParams() afterwards
		pendingData = e;
		requestInfo();
		return;
	}

	const newPrediction = e.data?.prediction;
	if (newPrediction && prediction.value && newPrediction.id != prediction.value.id) {
		// New prediction started while another one is still active. Close previous one
		showWinner.value = false;
		show.value = false;
		await Utils.promisedTimeout(1000);
	}
	if (!newPrediction) {
		// Empty prediction received. Hide current prediction if any
		if (prediction.value) {
			const closingId = prediction.value.id;
			showWinner.value = parameters.value.resultDuration_s > 0;
			show.value = true;
			await Utils.promisedTimeout(parameters.value.resultDuration_s * 1000);
			// A new prediction started during the result display, leave it open
			if (prediction.value?.id !== closingId) return;
			show.value = false;
			// Wait for close animation, then forget the prediction so it's not
			// displayed back the next time configs are received
			await Utils.promisedTimeout(1000);
			if (prediction.value?.id === closingId) prediction.value = null;
		}
	} else {
		show.value =
			parameters.value.showOnlyResult !== true &&
			(!newPrediction.pendingAnswer ||
				(newPrediction.pendingAnswer && parameters.value.hideUntilResolved === false));
		showWinner.value = false;
		prediction.value = newPrediction;
	}
}

async function onUpdateParams(e: TwitchatEvent<"ON_PREDICTION_OVERLAY_CONFIGS">): Promise<void> {
	parameters.value = e.data.parameters;
	parametersReceived = true;
	if (pendingData) {
		onUpdatePrediction(pendingData);
		pendingData = null;
	} else if (prediction.value && !showWinner.value) {
		show.value =
			parameters.value.showOnlyResult !== true &&
			(!prediction.value.pendingAnswer ||
				(prediction.value.pendingAnswer && parameters.value.hideUntilResolved === false));
	}
}
</script>

<style scoped lang="less">
.overlaypredictions {
	background-color: var(--color-light);
	position: absolute;
	padding: 1em;
	border-radius: var(--border-radius);
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	overflow: hidden;
	transform-origin: center center;
	min-width: 20em;

	.progress {
		width: 100%;
		height: 0.5em;
		background-color: #387aff;
		position: absolute;
		top: 0;
		left: 0;
	}

	h1 {
		text-align: center;
		margin-bottom: 0.25em;
	}

	.battle {
		width: 100%;
		max-width: 800px;
		overflow: hidden;
		.labels {
			display: flex;
			flex-direction: row;
			margin-bottom: 0.25em;
			text-align: center;
			.outcomeTitle {
				display: block;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				min-width: 2px;
				transition:
					flex-basis 0.3s,
					opacity 0.5s;
			}
			.outcomeTitle:first-child:nth-last-child(2),
			.outcomeTitle:first-child:nth-last-child(2) ~ .outcomeTitle {
				flex-basis: 50% !important;
				&:first-child {
					text-align: left;
				}
				&:last-child {
					text-align: right;
				}
			}
		}

		.chunks {
			display: flex;
			flex-direction: row;
			flex-direction: row;
			border-radius: var(--border-radius);
			overflow: hidden;
			width: 100%;
			transform-origin: top center;
			.chunk {
				flex: 1;
				transition:
					flex-basis 0.3s,
					opacity 0.5s;
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: center;
				overflow: hidden;
				padding: 0.5em 0;
				&:nth-child(odd) {
					background-color: #387aff;
				}
				&:nth-child(even) {
					background-color: #f50e9b;
				}
			}
		}
	}

	.list {
		align-self: stretch;
		.choice {
			width: 100%;
			display: flex;
			flex-direction: column;
			align-items: stretch;
			overflow: hidden;
			transform-origin: top center;
			margin: auto;
			transition: opacity 0.5s;
			&:not(:last-child) {
				margin-bottom: 0.75em;
			}
			h2 {
				margin-bottom: 0.25em;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.bar {
				min-height: 1em;
				flex-grow: 1;
				border-radius: var(--border-radius);
				padding: 0.25em 0.5em;
				font-size: 1em;
				color: var(--color-light);
				@c: #387aff;
				transition: background-size 0.3s;
				background: linear-gradient(to right, @c 100%, @c 100%);
				background-color: fade(#387aff, 20%);
				background-repeat: no-repeat;
				display: flex;
				justify-content: flex-end;
				align-items: center;
			}
		}
		.choice:first-child:nth-last-child(2):nth-child(2),
		.choice:first-child:nth-last-child(2) ~ .choice {
			.bar {
				@c: #f50e9b;
				transition: background-size 0.3s;
				background: linear-gradient(to right, @c 100%, @c 100%);
				background-color: fade(#f50e9b, 20%);
				background-repeat: no-repeat;
			}
		}
	}

	.details {
		display: flex;
		flex-direction: row;
		color: var(--color-light);
		justify-content: center;

		.percent,
		.votes,
		.points {
			display: flex;
			flex-direction: row;
			align-items: center;
			padding: 0.4em 0.5em;
			border-radius: var(--border-radius);
			background-color: rgba(0, 0, 0, 0.5);
			font-size: 0.8em;
			flex-shrink: 0;
			font-variant-numeric: tabular-nums;

			&:not(:last-child) {
				margin-right: 0.25em;
			}

			.icon {
				height: 1em;
				margin-right: 0.25em;
			}
		}
	}

	// transition: transform .25s, top .25s, right .25s, bottom .25s, left .25s;
	&.position-tl {
		top: 2em;
		left: 2em;
	}

	&.position-t {
		top: 2em;
		left: 50%;
		transform: translateX(-50%);
	}

	&.position-tr {
		top: 2em;
		right: 2em;
	}

	&.position-l {
		top: 50%;
		left: 2em;
		transform: translateY(-50%);
	}

	&.position-m {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	&.position-r {
		top: 50%;
		right: 2em;
		transform: translateY(-50%);
	}

	&.position-bl {
		bottom: 2em;
		left: 2em;
	}

	&.position-b {
		bottom: 2em;
		left: 50%;
		transform: translateX(-50%);
	}

	&.position-br {
		bottom: 2em;
		right: 2em;
	}

	&.win {
		.list {
			.choice {
				opacity: 0.5;
				.bar {
					background-color: fade(#387aff, 20%);
				}
				&.win {
					opacity: 1;
					position: relative;
					overflow: visible;
					&::before {
						content: "✔";
						position: absolute;
						transform: translate(-120%, 0%);
					}
				}
			}
		}

		.battle {
			.labels {
				.outcomeTitle {
					opacity: 0.5;
					&.win {
						opacity: 1;
					}
				}
			}

			.chunks {
				.chunk {
					opacity: 0.5;
					&.win {
						opacity: 1;
					}
				}
			}
		}
	}
}
</style>
