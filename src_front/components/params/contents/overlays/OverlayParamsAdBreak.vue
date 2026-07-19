<template>
	<div class="overlayparamsadbreak overlayParamsSection">
		<div class="card-item alert center" v-if="!scopeGranted">
			<p>{{ t("overlay.heatDistort.needs_scope") }}</p>
			<TTButton class="button" icon="obs" light alert @click="grantScopes()">{{
				t("overlay.heatDistort.grant_scopeBt")
			}}</TTButton>
		</div>

		<a
			href="https://www.youtube.com/watch?v=p_DYIjclLCM"
			target="_blank"
			class="youtubeTutorialBt"
		>
			<Icon name="youtube" theme="light" />
			<span>{{ t("overlay.youtube_demo_tt") }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<i18n-t tag="div" class="header" scope="global" keypath="overlay.adBreak.description">
			<template #DASHBOARD_LINK>
				<a
					href="https://dashboard.twitch.tv/monetization/ads/ads-manager"
					target="_blank"
					>{{ t("overlay.adBreak.description_link") }}</a
				>
			</template>
		</i18n-t>

		<section class="overlayInstallCard">
			<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>

			<OverlayInstaller type="adbreak" />

			<!-- <ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div class="head">{{ $t("overlay.adBreak.css") }}</div>
				<ul class="cssStructure">
					<li>#todo { ... }</li>
				</ul>
			</ToggleBlock> -->
		</section>

		<section>
			<ParamItem
				class="param"
				:paramData="param_showApproaching"
				v-model="localData.showApproaching"
			>
				<div class="children">
					<ParamItem
						class="child"
						:paramData="param_approachingStyle"
						noBackground
						v-model="localData.approachingStyle"
					/>
					<ParamItem
						class="child"
						:paramData="param_approachingDelay"
						noBackground
						v-model="localData.approachingDelay"
					/>
					<ParamItem
						class="child"
						:paramData="param_approachingSize"
						noBackground
						v-model="localData.approachingSize"
					/>
					<ParamItem
						class="child"
						:paramData="param_approachingThickness"
						v-if="localData.approachingStyle == 'bar'"
						noBackground
						v-model="localData.approachingThickness"
					/>
					<ParamItem
						class="child"
						:paramData="param_approachingColor"
						noBackground
						v-model="localData.approachingColor"
					/>
					<div class="placement parameter-child">
						<div class="holder">
							<p>
								<Icon name="move" class="icon" />{{
									t("overlay.adBreak.param_placement")
								}}
							</p>
							<PlacementSelector
								v-model="localData.approachingPlacement"
								:sidesOnly="localData.approachingStyle == 'bar'"
							/>
						</div>
					</div>
					<ParamItem
						class="child"
						:paramData="param_approachingLabel"
						noBackground
						v-model="localData.approachingLabel"
					/>

					<div class="center" v-if="overlayExists">
						<TTButton
							:loading="testingApproaching"
							@click="testApproaching()"
							icon="test"
							>{{ t("overlay.adBreak.testBt") }}</TTButton
						>
					</div>
					<div class="center card-item alert" v-if="!overlayExists">
						{{ t("overlay.overlay_not_configured") }}
					</div>
				</div>
			</ParamItem>

			<ParamItem class="param" :paramData="param_showRunning" v-model="localData.showRunning">
				<div class="children">
					<ParamItem
						class="child"
						:paramData="param_runningStyle"
						noBackground
						v-model="localData.runningStyle"
					/>
					<ParamItem
						class="child"
						:paramData="param_runningSize"
						noBackground
						v-model="localData.runningSize"
					/>
					<ParamItem
						class="child"
						:paramData="param_runningThickness"
						v-if="localData.runningStyle == 'bar'"
						noBackground
						v-model="localData.runningThickness"
					/>
					<ParamItem
						class="child"
						:paramData="param_runningColor"
						noBackground
						v-model="localData.runningColor"
					/>
					<div class="placement parameter-child">
						<div class="holder">
							<p>
								<Icon name="move" class="icon" />{{
									t("overlay.adBreak.param_placement")
								}}
							</p>
							<PlacementSelector
								v-model="localData.runningPlacement"
								:sidesOnly="localData.runningStyle == 'bar'"
							/>
						</div>
					</div>
					<ParamItem
						class="child"
						:paramData="param_runningLabel"
						noBackground
						v-model="localData.runningLabel"
					/>

					<div class="center" v-if="overlayExists">
						<TTButton :loading="testingRunning" @click="testRunning()" icon="test">{{
							t("overlay.adBreak.testBt")
						}}</TTButton>
					</div>
					<div class="center card-item alert" v-if="!overlayExists">
						{{ t("overlay.overlay_not_configured") }}
					</div>
				</div>
			</ParamItem>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import PlacementSelector from "@/components/PlacementSelector.vue";
import TTButton from "@/components/TTButton.vue";
import DataStore from "@/store/DataStore";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();

const overlayExists = ref(false);
const testingRunning = ref(false);
const testingApproaching = ref(false);

const param_showApproaching = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "timer",
	labelKey: "overlay.adBreak.param_showApproaching",
});
const param_showRunning = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "play",
	labelKey: "overlay.adBreak.param_showRunning",
});
const param_approachingDelay = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 30,
	max: 5 * 60,
	icon: "timer",
	labelKey: "overlay.adBreak.param_approachingDelay",
});
const param_approachingStyle = ref<
	TwitchatDataTypes.ParameterData<
		TwitchatDataTypes.AdBreakOverlayData["approachingStyle"],
		TwitchatDataTypes.AdBreakOverlayData["approachingStyle"]
	>
>({
	type: "list",
	value: "bar",
	listValues: [],
	icon: "overlay",
	labelKey: "overlay.adBreak.param_style",
});
const param_runningStyle = ref<
	TwitchatDataTypes.ParameterData<
		TwitchatDataTypes.AdBreakOverlayData["runningStyle"],
		TwitchatDataTypes.AdBreakOverlayData["runningStyle"]
	>
>({
	type: "list",
	value: "bar",
	listValues: [],
	icon: "overlay",
	labelKey: "overlay.adBreak.param_style",
});
const param_approachingSize = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 10,
	min: 10,
	max: 100,
	icon: "fontSize",
	labelKey: "overlay.adBreak.param_size",
});
const param_runningSize = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 10,
	min: 10,
	max: 100,
	icon: "fontSize",
	labelKey: "overlay.adBreak.param_size",
});
const param_approachingThickness = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 10,
	min: 0,
	max: 100,
	icon: "thickness",
	labelKey: "overlay.adBreak.param_thickness",
});
const param_runningThickness = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 10,
	min: 0,
	max: 100,
	icon: "thickness",
	labelKey: "overlay.adBreak.param_thickness",
});
const param_approachingColor = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "#ffffff",
	icon: "pipette",
	labelKey: "overlay.adBreak.param_color",
});
const param_runningColor = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "#ffffff",
	icon: "pipette",
	labelKey: "overlay.adBreak.param_color",
});
const param_approachingLabel = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "{TIMER}s",
	longText: true,
	maxLength: 500,
	icon: "font",
	labelKey: "overlay.adBreak.param_label",
});
const param_runningLabel = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "{TIMER}s",
	longText: true,
	maxLength: 500,
	icon: "font",
	labelKey: "overlay.adBreak.param_label",
});

const localData = ref<TwitchatDataTypes.AdBreakOverlayData>({
	showApproaching: false,
	showRunning: false,
	approachingDelay: 30,
	approachingStyle: "bar",
	runningStyle: "text",
	approachingSize: 15,
	runningSize: 15,
	approachingThickness: 5,
	runningThickness: 5,
	approachingColor: "#e04e00",
	runningColor: "#b71f1f",
	approachingPlacement: "b",
	runningPlacement: "br",
	approachingLabel: t("overlay.adBreak.ad_approaching"),
	runningLabel: t("overlay.adBreak.ad_running"),
});

let checkInterval: number = -1;
let subcheckTimeout: number = -1;

const scopeGranted = computed<boolean>(() =>
	TwitchUtils.hasScopes([TwitchScopes.ADS_READ, TwitchScopes.ADS_SNOOZE]),
);

function grantScopes(): void {
	TwitchUtils.requestScopes([TwitchScopes.ADS_READ, TwitchScopes.ADS_SNOOZE]);
}

function onChange(): void {
	DataStore.set(DataStore.AD_BREAK_OVERLAY_PARAMS, localData.value);
	PublicAPI.instance.broadcast("ON_AD_BREAK_OVERLAY_CONFIGS", localData.value);
}

function testApproaching(): void {
	testingApproaching.value = true;
	const data: TwitchatDataTypes.CommercialData = {
		currentAdDuration_ms: 0,
		prevAdStart_at: 0,
		nextAdStart_at: Date.now() + localData.value.approachingDelay * 1000,
		nextSnooze_at: 0,
		remainingSnooze: 3,
	};
	PublicAPI.instance.broadcast("ON_AD_BREAK_OVERLAY_DATA", data);
	window.setTimeout(() => {
		testingApproaching.value = false;
	}, 250);
}

function testRunning(): void {
	testingRunning.value = true;
	const data: TwitchatDataTypes.CommercialData = {
		currentAdDuration_ms: 30000,
		prevAdStart_at: Date.now(),
		nextAdStart_at: 0,
		nextSnooze_at: 0,
		remainingSnooze: 3,
	};
	PublicAPI.instance.broadcast("ON_AD_BREAK_OVERLAY_DATA", data);
	window.setTimeout(() => {
		testingRunning.value = false;
	}, 250);
}

param_runningStyle.value.listValues = param_approachingStyle.value.listValues = [
	{ value: "bar", labelKey: "overlay.adBreak.param_styles.bar" },
	{ value: "text", labelKey: "overlay.adBreak.param_styles.text" },
];

param_approachingLabel.value.placeholderList = param_runningLabel.value.placeholderList = [
	{ tag: "TIMER", descKey: "overlay.adBreak.param_label_placeholder_timer" },
];

const storeData = DataStore.get(DataStore.AD_BREAK_OVERLAY_PARAMS);
if (storeData) {
	localData.value = JSON.parse(storeData) as TwitchatDataTypes.AdBreakOverlayData;
}

watch(localData, () => onChange(), { deep: true });

const overlayPresenceHandler = () => {
	overlayExists.value = true;
	clearTimeout(subcheckTimeout);
};
PublicAPI.instance.addEventListener("ON_AD_BREAK_OVERLAY_PRESENCE", overlayPresenceHandler);

//Regularly check if the overlay exists
checkInterval = window.setInterval(() => {
	PublicAPI.instance.broadcast("GET_AD_BREAK_OVERLAY_PRESENCE");
	clearTimeout(subcheckTimeout);
	//If after 1,5s the overlay didn't answer, assume it doesn't exist
	subcheckTimeout = window.setTimeout(() => {
		overlayExists.value = false;
	}, 1500);
}, 2000);

//Forces first data init save
onChange();

onBeforeUnmount(() => {
	clearInterval(checkInterval);
	clearTimeout(subcheckTimeout);
	PublicAPI.instance.removeEventListener("ON_AD_BREAK_OVERLAY_PRESENCE", overlayPresenceHandler);
});
</script>

<style scoped lang="less">
.overlayparamsadbreak {
	.options {
		width: 100%;
		max-width: 500px;
	}
	.children {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
	}
	.placement {
		position: relative;
		&::before {
			position: absolute;
			left: -1em;
			top: 0.1em;
			font-size: 1em;
			content: "⤷";
			display: block;
		}
		.holder {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			.icon {
				height: 1em;
				margin-right: 0.5em;
			}
			&:hover::before {
				opacity: 1;
			}

			&::before {
				content: "";
				opacity: 0;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				position: absolute;
				filter: blur(5px);
				pointer-events: none;
				background-color: var(--background-color-fadest);
				background: linear-gradient(
					170deg,
					var(--background-color-fadest) 0%,
					transparent 100%
				);
			}
		}
	}

	:deep(.paramitem) {
		.holder:not(.text) {
			.inputHolder,
			select,
			input {
				flex-basis: 200px;
			}
		}
	}
}
</style>
