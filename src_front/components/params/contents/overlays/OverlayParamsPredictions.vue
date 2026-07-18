<template>
	<div class="overlayparamspredictions overlayParamsSection">
		<div class="header">{{ t("overlay.predictions.head") }}</div>

		<a
			href="https://www.youtube.com/watch?v=IcX-KnYJuCA"
			target="_blank"
			class="youtubeTutorialBt"
		>
			<Icon name="youtube" theme="light" />
			<span>{{ t("overlay.youtube_demo_tt") }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<section class="overlayInstallCard">
			<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>
			<OverlayInstaller type="predictions" @obsSourceCreated="getOverlayPresence(true)" />

			<ToggleBlock class="shrink" small :title="t('overlay.css_customization')" :open="false">
				<CSSPollsVarStyles />
				<div class="cssHead">{{ t("overlay.predictions.css") }}</div>
				<ul class="cssStructure">
					<li>
						#holder { ... }
						<ul>
							<li>#progress { ... }</li>
							<li>#title { ... }</li>
							<li>
								#list { ... }
								<ul>
									<li>
										#list_choice { ... }
										<ul>
											<li>#list_choice_label { ... }</li>
											<li>
												#list_choice_bar { ... }
												<ul>
													<li>
														#list_choice_bar_details { ... }
														<ul>
															<li>
																#list_choice_bar_details_percent {
																... }
															</li>
															<li>
																#list_choice_bar_details_votes { ...
																}
															</li>
															<li>
																#list_choice_bar_details_points {
																... }
															</li>
														</ul>
													</li>
												</ul>
											</li>
										</ul>
									</li>
								</ul>
							</li>
							<li>
								#line { ... }
								<ul>
									<li>
										#line_labelList { ... }
										<ul>
											<li>#line_labelList_label { ... }</li>
										</ul>
									</li>
									<li>
										#line_bar { ... }
										<ul>
											<li>
												#line_bar_item { ... }
												<ul>
													<li>
														#line_bar_item_details { ... }
														<ul>
															<li>
																#line_bar_item_details_percent { ...
																}
															</li>
															<li>
																#line_bar_item_details_votes { ... }
															</li>
															<li>
																#line_bar_item_details_points { ...
																}
															</li>
														</ul>
													</li>
												</ul>
											</li>
										</ul>
									</li>
								</ul>
							</li>
						</ul>
					</li>
				</ul>
			</ToggleBlock>
		</section>

		<section>
			<ParamItem
				:paramData="param_listMode"
				v-model="params.listMode"
				@change="onChangeParam()"
			>
				<ParamItem
					:paramData="param_listModeOnlyMore2"
					class="child"
					noBackground
					v-model="params.listModeOnlyMore2"
					@change="onChangeParam()"
				/>
			</ParamItem>
			<ParamItem
				:paramData="param_showTitle"
				v-model="params.showTitle"
				@change="onChangeParam()"
			/>
			<ParamItem
				:paramData="param_showLabels"
				v-model="params.showLabels"
				@change="onChangeParam()"
			/>
			<ParamItem
				:paramData="param_showVotes"
				v-model="params.showVotes"
				@change="onChangeParam()"
			/>
			<ParamItem
				:paramData="param_showVoters"
				v-model="params.showVoters"
				@change="onChangeParam()"
			/>
			<ParamItem
				:paramData="param_showPercent"
				v-model="params.showPercent"
				@change="onChangeParam()"
			/>
			<ParamItem
				:paramData="param_showProgress"
				v-model="params.showTimer"
				@change="onChangeParam()"
			/>
			<ParamItem
				:paramData="param_hideUntilResolved"
				v-model="params.hideUntilResolved"
				@change="onChangeParam()"
			/>
			<ParamItem
				:paramData="param_showOnlyResult"
				v-model="params.showOnlyResult"
				@change="onChangeParam()"
			/>
			<ParamItem
				:paramData="param_resultDuration"
				v-model="params.resultDuration_s"
				@change="onChangeParam()"
			/>

			<div class="card-item placement">
				<p>{{ t("overlay.predictions.param_placement") }}</p>
				<PlacementSelector v-model="params.placement" @change="onChangeParam()" />
			</div>
			<TTButton
				class="center"
				v-if="overlayExists || checkingOverlayPresence"
				:loading="loading || checkingOverlayPresence"
				@click="testOverlay()"
				icon="test"
				>{{ t("overlay.predictions.testBt") }}</TTButton
			>

			<div class="center card-item alert" v-else>
				{{ t("overlay.overlay_not_configured") }}
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import PlacementSelector from "@/components/PlacementSelector.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import type { PredictionOverlayParamStoreData } from "@/store/prediction/storePrediction";
import { storePrediction as useStorePrediction } from "@/store/prediction/storePrediction";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import SetIntervalWorker from "@/utils/SetIntervalWorker";
import Utils from "@/utils/Utils";
import { nextTick, onBeforeMount, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import CSSPollsVarStyles from "./CSSPollsVarStyles.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();
const storeDebug = useStoreDebug();
const storePrediction = useStorePrediction();

const loading = ref(false);
const overlayExists = ref(false);
const checkingOverlayPresence = ref(true);

const params = ref<PredictionOverlayParamStoreData>({
	showTitle: storePrediction.overlayParams.showTitle,
	listMode: storePrediction.overlayParams.listMode,
	listModeOnlyMore2: storePrediction.overlayParams.listModeOnlyMore2,
	showLabels: storePrediction.overlayParams.showLabels,
	showVotes: storePrediction.overlayParams.showVotes,
	showVoters: storePrediction.overlayParams.showVoters,
	showPercent: storePrediction.overlayParams.showPercent,
	showTimer: storePrediction.overlayParams.showTimer,
	placement: storePrediction.overlayParams.placement,
	showOnlyResult: storePrediction.overlayParams.showOnlyResult,
	hideUntilResolved: storePrediction.overlayParams.hideUntilResolved,
	resultDuration_s: storePrediction.overlayParams.resultDuration_s,
});
const param_listMode = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "list",
	labelKey: "overlay.predictions.param_listMode",
});
const param_listModeOnlyMore2 = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.predictions.param_listModeOnlyMore2",
});
const param_showTitle = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "font",
	labelKey: "overlay.predictions.param_showTitle",
});
const param_showLabels = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "font",
	labelKey: "overlay.predictions.param_showLabels",
});
const param_showVotes = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "channelPoints",
	labelKey: "overlay.predictions.param_showVotes",
});
const param_showVoters = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "user",
	labelKey: "overlay.predictions.param_showVoters",
});
const param_showPercent = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "percent",
	labelKey: "overlay.predictions.param_showPercent",
});
const param_showProgress = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "timer",
	labelKey: "overlay.predictions.param_showProgress",
});
const param_showOnlyResult = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "prediction",
	labelKey: "overlay.predictions.param_showOnlyResult",
});
const param_resultDuration = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 5,
	min: 0,
	max: 60 * 10,
	icon: "timer",
	labelKey: "overlay.predictions.param_resultDuration",
});
const param_hideUntilResolved = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "hide",
	labelKey: "overlay.predictions.param_hideUntilResolved",
});

let testing: boolean = false;
let checkInterval: number = -1;
let subcheckTimeout: number = -1;
let simulateInterval: string = "";
let simulateEndTimeout: number = -1;
let overlayPresenceHandler!: () => void;

onBeforeMount(() => {
	overlayPresenceHandler = () => {
		overlayExists.value = true;
		checkingOverlayPresence.value = false;
		clearTimeout(subcheckTimeout);
	};
	PublicAPI.instance.addEventListener("ON_PREDICTIONS_OVERLAY_PRESENCE", overlayPresenceHandler);

	//Regularly check if the overlay exists
	checkInterval = window.setInterval(() => getOverlayPresence(), 2000);
});

onBeforeUnmount(() => {
	if (testing) storePrediction.setPrediction(null);
	clearTimeout(simulateEndTimeout);
	SetIntervalWorker.instance.delete(simulateInterval);
	clearInterval(checkInterval);
	clearTimeout(subcheckTimeout);
	PublicAPI.instance.removeEventListener(
		"ON_PREDICTIONS_OVERLAY_PRESENCE",
		overlayPresenceHandler,
	);
});

/**
 * Checks if overlay exists
 */
function getOverlayPresence(showLoader: boolean = false): void {
	if (showLoader) checkingOverlayPresence.value = true;
	PublicAPI.instance.broadcast("GET_PREDICTIONS_OVERLAY_PRESENCE");
	clearTimeout(subcheckTimeout);
	//If after 1,5s the overlay didn't answer, assume it doesn't exist
	subcheckTimeout = window.setTimeout(() => {
		overlayExists.value = false;
		checkingOverlayPresence.value = false;
	}, 1500);
}

/**
 * Send fake data to overlay
 */
async function testOverlay(): Promise<void> {
	testing = true;
	const predi: TwitchatDataTypes.MessagePredictionData =
		await storeDebug.simulateMessage<TwitchatDataTypes.MessagePredictionData>(
			TwitchatDataTypes.TwitchatMessageType.PREDICTION,
			undefined,
			false,
		);
	predi.outcomes.forEach((v) => {
		v.voters = 0;
		v.votes = 0;
	});
	predi.isFake = true;
	predi.duration_s = param_showOnlyResult.value.value ? 0 : 15;
	predi.started_at = Date.now();
	SetIntervalWorker.instance.delete(simulateInterval);
	const winnerBackup = predi.winner;
	predi.winner = undefined;
	const fakeVotes = () => {
		const fakeUpdates = Math.ceil(Math.random() * 5);
		for (let i = 0; i < fakeUpdates; i++) {
			const outcome = Utils.pickRand(predi.outcomes)!;
			outcome.voters++;
			outcome.votes += Math.round(Math.random() * 100);
		}
		storePrediction.setPrediction(predi);
	};

	let pendingDuration = 2000;
	if (param_showOnlyResult.value.value == true) {
		console.log("Direct fake votes!");
		fakeVotes();
		pendingDuration = 0;
		predi.duration_s = 0;
	} else {
		console.log("Multiple fake votes!");
		simulateInterval = SetIntervalWorker.instance.create(fakeVotes, 1000);
	}

	clearTimeout(simulateEndTimeout);
	console.log("End in", predi.duration_s * 1000, "ms with pending duration", pendingDuration);
	simulateEndTimeout = window.setTimeout(() => {
		SetIntervalWorker.instance.delete(simulateInterval);
		predi.pendingAnswer = true;
		storePrediction.setPrediction(predi);

		simulateEndTimeout = window.setTimeout(async () => {
			console.log("Show winner");
			predi.winner = winnerBackup;
			storePrediction.setPrediction(predi);
			await nextTick();
			console.log("Test ended, clearing prediction");
			storePrediction.setPrediction(null);
			testing = false;
		}, pendingDuration);
	}, predi.duration_s * 1000);

	storePrediction.setPrediction(predi);
}

/**
 * Called when a param changes
 */
function onChangeParam(): void {
	storePrediction.setOverlayParams(params.value);
}
</script>

<style scoped lang="less">
.overlayparamspredictions {
	.placement {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
