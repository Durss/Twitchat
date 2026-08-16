<template>
	<div class="overlayparamschatpolls overlayParamsSection">
		<i18n-t scope="global" tag="div" keypath="overlay.chatPoll.head" class="header">
			<template #CMD><mark>/chatpoll</mark></template>
			<template #MENU><Icon name="commands" /></template>
		</i18n-t>

		<section class="overlayInstallCard">
			<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>
			<OverlayInstaller type="chatPoll" @obsSourceCreated="getOverlayPresence(true)" />

			<ToggleBlock class="shrink" small :title="t('overlay.css_customization')" :open="false">
				<CSSPollsVarStyles />
				<div class="cssHead">{{ t("overlay.chatPoll.css") }}</div>
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
				<p>{{ t("overlay.chatPoll.param_placement") }}</p>
				<PlacementSelector v-model="params.placement" @change="onChangeParam()" />
			</div>

			<Icon class="center loader" name="loader" v-if="checkingOverlayPresence" />
			<div class="center card-item alert" v-else-if="!overlayExists">
				{{ t("overlay.overlay_not_configured") }}
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import PlacementSelector from "@/components/PlacementSelector.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import { storeChatPoll as useStoreChatPoll } from "@/store/chat_poll/storeChatPoll";
import type { PollOverlayParamStoreData } from "@/store/poll/storePoll";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import SetIntervalWorker from "@/utils/SetIntervalWorker";
import { onBeforeMount, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import CSSPollsVarStyles from "./CSSPollsVarStyles.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();
const storeChatPoll = useStoreChatPoll();

const overlayExists = ref(false);
const checkingOverlayPresence = ref(true);

const params = ref<PollOverlayParamStoreData>({
	showTitle: storeChatPoll.overlayParams.showTitle,
	listMode: storeChatPoll.overlayParams.listMode,
	listModeOnlyMore2: storeChatPoll.overlayParams.listModeOnlyMore2,
	showLabels: storeChatPoll.overlayParams.showLabels,
	showVotes: storeChatPoll.overlayParams.showVotes,
	showPercent: storeChatPoll.overlayParams.showPercent,
	showTimer: storeChatPoll.overlayParams.showTimer,
	placement: storeChatPoll.overlayParams.placement,
	showOnlyResult: storeChatPoll.overlayParams.showOnlyResult,
	resultDuration_s: storeChatPoll.overlayParams.resultDuration_s,
});
const param_listMode = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "list",
	labelKey: "overlay.chatPoll.param_listMode",
});
const param_listModeOnlyMore2 = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.chatPoll.param_listModeOnlyMore2",
});
const param_showTitle = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "font",
	labelKey: "overlay.chatPoll.param_showTitle",
});
const param_showLabels = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "font",
	labelKey: "overlay.chatPoll.param_showLabels",
});
const param_showVotes = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "user",
	labelKey: "overlay.chatPoll.param_showVotes",
});
const param_showPercent = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "percent",
	labelKey: "overlay.chatPoll.param_showPercent",
});
const param_showProgress = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "timer",
	labelKey: "overlay.chatPoll.param_showProgress",
});
const param_showOnlyResult = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "poll",
	labelKey: "overlay.chatPoll.param_showOnlyResult",
});
const param_resultDuration = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 5,
	min: 0,
	max: 60 * 10,
	icon: "timer",
	labelKey: "overlay.chatPoll.param_resultDuration",
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
	PublicAPI.instance.addEventListener("ON_CHAT_POLL_OVERLAY_PRESENCE", overlayPresenceHandler);

	//Regularly check if the overlay exists
	checkInterval = window.setInterval(() => getOverlayPresence(), 2000);
});

onBeforeUnmount(() => {
	if (testing) storeChatPoll.setCurrentPoll(null);
	SetIntervalWorker.instance.delete(simulateInterval);
	clearTimeout(simulateEndTimeout);
	clearInterval(checkInterval);
	clearTimeout(subcheckTimeout);
	PublicAPI.instance.removeEventListener("ON_CHAT_POLL_OVERLAY_PRESENCE", overlayPresenceHandler);
});

/**
 * Checks if overlay exists
 */
function getOverlayPresence(showLoader: boolean = false): void {
	if (showLoader) checkingOverlayPresence.value = true;
	PublicAPI.instance.broadcast("GET_CHAT_POLL_OVERLAY_PRESENCE");
	clearTimeout(subcheckTimeout);
	//If after 1,5s the overlay didn't answer, assume it doesn't exist
	subcheckTimeout = window.setTimeout(() => {
		overlayExists.value = false;
		checkingOverlayPresence.value = false;
	}, 1500);
}

/**
 * Called when a param changes
 */
function onChangeParam(): void {
	storeChatPoll.setOverlayParams(params.value);
}
</script>

<style scoped lang="less">
.overlayparamschatpolls {
	.placement {
		display: flex;
		flex-direction: column;
		align-items: center;
		p {
			margin-bottom: 0.5em;
		}
	}
}
</style>
