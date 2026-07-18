<template>
	<div class="overlayparamspolls overlayParamsSection">
		<div class="header">{{ t("overlay.polls.head") }}</div>

		<a
			href="https://www.youtube.com/watch?v=IcX-KnYJuCA"
			target="_blank"
			class="youtubeTutorialBt"
		>
			<Icon name="youtube" theme="light" />
			<span>{{ t("overlay.youtube_demo_tt") }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ t("overlay.title_install") }}</div>
			</div>
			<OverlayInstaller type="polls" @obsSourceCreated="getOverlayPresence(true)" />

			<ToggleBlock class="shrink" small :title="t('overlay.css_customization')" :open="false">
				<CSSPollsVarStyles />
				<div class="cssHead">{{ t("overlay.polls.css") }}</div>
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
				<p>{{ t("overlay.polls.param_placement") }}</p>
				<PlacementSelector v-model="params.placement" @change="onChangeParam()" />
			</div>

			<TTButton
				class="center"
				v-if="overlayExists || checkingOverlayPresence"
				:loading="loading || checkingOverlayPresence"
				@click="testOverlay()"
				icon="test"
				>{{ t("overlay.polls.testBt") }}</TTButton
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
import type { PollOverlayParamStoreData } from "@/store/poll/storePoll";
import { storePoll as useStorePoll } from "@/store/poll/storePoll";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import SetIntervalWorker from "@/utils/SetIntervalWorker";
import Utils from "@/utils/Utils";
import { onBeforeMount, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import CSSPollsVarStyles from "./CSSPollsVarStyles.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();
const storeDebug = useStoreDebug();
const storePoll = useStorePoll();

const loading = ref(false);
const overlayExists = ref(false);
const checkingOverlayPresence = ref(true);

const params = ref<PollOverlayParamStoreData>({
	showTitle: storePoll.overlayParams.showTitle,
	listMode: storePoll.overlayParams.listMode,
	listModeOnlyMore2: storePoll.overlayParams.listModeOnlyMore2,
	showLabels: storePoll.overlayParams.showLabels,
	showVotes: storePoll.overlayParams.showVotes,
	showPercent: storePoll.overlayParams.showPercent,
	showTimer: storePoll.overlayParams.showTimer,
	placement: storePoll.overlayParams.placement,
	showOnlyResult: storePoll.overlayParams.showOnlyResult,
	resultDuration_s: storePoll.overlayParams.resultDuration_s,
});
const param_listMode = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "list",
	labelKey: "overlay.polls.param_listMode",
});
const param_listModeOnlyMore2 = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.polls.param_listModeOnlyMore2",
});
const param_showTitle = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "font",
	labelKey: "overlay.polls.param_showTitle",
});
const param_showLabels = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "font",
	labelKey: "overlay.polls.param_showLabels",
});
const param_showVotes = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "user",
	labelKey: "overlay.polls.param_showVotes",
});
const param_showPercent = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "percent",
	labelKey: "overlay.polls.param_showPercent",
});
const param_showProgress = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "timer",
	labelKey: "overlay.polls.param_showProgress",
});
const param_showOnlyResult = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "poll",
	labelKey: "overlay.polls.param_showOnlyResult",
});
const param_resultDuration = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 5,
	min: 0,
	max: 60 * 10,
	icon: "timer",
	labelKey: "overlay.polls.param_resultDuration",
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
	PublicAPI.instance.addEventListener("ON_POLLS_OVERLAY_PRESENCE", overlayPresenceHandler);

	//Regularly check if the overlay exists
	checkInterval = window.setInterval(() => getOverlayPresence(), 2000);
});

onBeforeUnmount(() => {
	if (testing) storePoll.setCurrentPoll(null);
	SetIntervalWorker.instance.delete(simulateInterval);
	clearTimeout(simulateEndTimeout);
	clearInterval(checkInterval);
	clearTimeout(subcheckTimeout);
	PublicAPI.instance.removeEventListener("ON_POLLS_OVERLAY_PRESENCE", overlayPresenceHandler);
});

/**
 * Checks if overlay exists
 */
function getOverlayPresence(showLoader: boolean = false): void {
	if (showLoader) checkingOverlayPresence.value = true;
	PublicAPI.instance.broadcast("GET_POLLS_OVERLAY_PRESENCE");
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
	const poll: TwitchatDataTypes.MessagePollData =
		await storeDebug.simulateMessage<TwitchatDataTypes.MessagePollData>(
			TwitchatDataTypes.TwitchatMessageType.POLL,
			undefined,
			false,
		);
	poll.choices.forEach((v) => {
		v.votes = 0;
	});
	poll.isFake = true;
	poll.duration_s = 15;
	poll.started_at = Date.now();
	SetIntervalWorker.instance.delete(simulateInterval);
	const fakeVotes = () => {
		const fakeUpdates = Math.ceil(Math.random() * 5);
		for (let i = 0; i < fakeUpdates; i++) {
			const choice = Utils.pickRand(poll.choices)!;
			choice.votes += Math.round(Math.random() * 100);
		}
		storePoll.setCurrentPoll(poll);
	};
	if (param_showOnlyResult.value.value == true) {
		poll.duration_s = 0;
		fakeVotes();
	} else {
		simulateInterval = SetIntervalWorker.instance.create(fakeVotes, 1000);
	}

	clearTimeout(simulateEndTimeout);
	simulateEndTimeout = window.setTimeout(() => {
		SetIntervalWorker.instance.delete(simulateInterval);
		storePoll.setCurrentPoll(null);
		testing = false;
	}, poll.duration_s * 1000);

	storePoll.setCurrentPoll(poll);
}

/**
 * Called when a param changes
 */
function onChangeParam(): void {
	storePoll.setOverlayParams(params.value);
}
</script>

<style scoped lang="less">
.overlayparamspolls {
	.placement {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
