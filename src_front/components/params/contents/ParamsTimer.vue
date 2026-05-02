<template>
	<div class="paramstimer parameterContent">
		<Icon name="timer" class="icon" v-if="panelContext == false" />

		<div class="head" v-if="panelContext == false">
			<i18n-t scope="global" tag="p" keypath="timers.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()" target="_blank">{{
						t("timers.header_link_trigger")
					}}</a>
				</template>
				<template #LINK_OVERLAY>
					<a @click="openOverlays()" target="_blank">{{
						t("timers.header_link_overlay")
					}}</a>
				</template>
			</i18n-t>
		</div>

		<section class="ctas">
			<TTButton
				icon="add"
				v-if="!maxReached"
				@click="
					storeTimer.createTimer();
					buildParams();
				"
				>{{ t("timers.addBt") }}</TTButton
			>

			<PremiumLimitMessage
				v-else
				label="timers.nonpremium_limit"
				premiumLabel="timers.premium_limit"
				:max="Config.instance.MAX_TIMERS"
				:maxPremium="Config.instance.MAX_TIMERS_PREMIUM"
			/>

			<TTButton icon="overlay" @click="openOverlays()">{{ t("timers.overlayBt") }}</TTButton>
		</section>

		<draggable
			class="entryList"
			v-model="storeTimer.timerList"
			direction="vertical"
			group="timers"
			item-key="id"
			:animation="250"
			@sort="rebuildParams()"
		>
			<template
				#item="{ element: entry }: { element: TwitchatDataTypes.TimerData; index: number }"
			>
				<ToggleBlock
					class="timerEntry"
					:open="false"
					:key="entry.id"
					:editableTitle="!entry.isDefault"
					v-model:title="entry.title"
					titleDefault="..."
					:titleMaxLengh="50"
					@update:title="storeTimer.saveData()"
				>
					<template #left_actions>
						<ToggleButton
							v-model="entry.enabled"
							@click.stop
							@change="storeTimer.saveData()"
							v-if="
								!entry.isDefault &&
								((storeAuth.isPremium && entry.enabled === false) ||
									(!storeAuth.isPremium &&
										(entry.enabled == true || canEnableMore)))
							"
						/>
						<Icon name="timer" class="timerTypeIcon" v-if="entry.type == 'timer'" />
						<Icon
							name="countdown"
							class="timerTypeIcon"
							v-if="entry.type == 'countdown'"
						/>
						<div
							class="timerValue"
							:class="{ paused: entry.paused }"
							v-if="entry.startAt_ms"
						>
							{{ timer2Duration[entry.id]?.duration_str }}
						</div>
					</template>

					<template #right_actions>
						<template v-if="!entry.isDefault">
							<TTButton
								@click.stop
								:copy="entry.id"
								icon="id"
								v-tooltip="t('global.copy_id')"
								small
							/>
							<TTButton
								alert
								icon="trash"
								@click.stop="storeTimer.deleteTimer(entry.id)"
							/>
						</template>
						<template v-else>
							<TTButton
								@click.stop
								:copy="entry.id"
								icon="id"
								v-tooltip="t('global.copy_id')"
								small
							/>
						</template>
					</template>

					<div class="content">
						<div class="info" v-if="entry.isDefault">
							<Icon name="info" />
							<i18n-t
								scope="global"
								tag="span"
								:keypath="
									entry.type == 'timer'
										? 'timers.panel.hint_timer'
										: 'timers.panel.hint_countdown'
								"
							>
								<template v-if="entry.type == 'countdown'" #CMD
									><mark>/countdown...</mark></template
								>
								<template v-if="entry.type == 'timer'" #CMD
									><mark>/timer...</mark></template
								>
							</i18n-t>
						</div>

						<template v-if="!entry.isDefault">
							<SwitchButton
								v-model="entry.type"
								:icons="['timer', 'countdown']"
								:values="['timer', 'countdown']"
								:labels="[
									t('timers.form.param_type_timer'),
									t('timers.form.param_type_countdown'),
								]"
								@change="
									storeTimer.resetTimer(entry.id);
									storeTimer.saveData();
									checkForPlaceholderDuplicates();
									refreshTimers();
								"
							></SwitchButton>

							<ParamItem
								v-if="entry.type == 'countdown'"
								:paramData="param_duration[entry.id]!"
								v-model="param_duration[entry.id]!.value"
								@change="entry.duration_ms = param_duration[entry.id]!.value * 1000"
							/>

							<div
								class="card-item placeholder"
								:class="{ error: timer2PlaceholderError[entry.id] }"
								v-tooltip="t('timers.form.param_placeholder_tt')"
							>
								<Icon name="placeholder" />
								<span class="label">{{ t("timers.form.param_placeholder") }}</span>
								<PlaceholderField
									class="input-field field"
									v-model="entry.placeholderKey"
									:prefix="entry.type == 'timer' ? 'TIMER_' : 'COUNTDOWN_'"
									@change="checkForPlaceholderDuplicates()"
								/>
								<template v-if="timer2PlaceholderError[entry.id]">
									<div
										class="errorReason"
										v-if="
											[
												defaultTimerPLaceholder,
												defaultCountdownPLaceholder,
											].includes(entry.placeholderKey)
										"
									>
										{{ t("timers.form.param_placeholder_default_conflict") }}
									</div>
									<div class="errorReason" v-else>
										{{ t("timers.form.param_placeholder_conflict") }}
									</div>
								</template>
							</div>
						</template>

						<ParamItem
							v-else-if="entry.type == 'countdown'"
							:paramData="param_duration[entry.id]!"
							v-model="param_duration[entry.id]!.value"
							@change="entry.duration_ms = param_duration[entry.id]!.value * 1000"
						/>

						<div class="ctas">
							<TTButton
								icon="play"
								v-if="!entry.startAt_ms"
								@click="
									storeTimer.timerStart(entry.id);
									refreshTimers();
								"
								:disabled="!entry.enabled"
								v-tooltip="entry.enabled ? '' : t('timers.form.disabled_tt')"
								>{{ t("timers.form.start") }}</TTButton
							>

							<template v-else>
								<TTButton
									icon="pause"
									v-if="!entry.paused"
									@click="
										storeTimer.timerPause(entry.id);
										refreshTimers();
									"
									>{{ t("timers.form.pause") }}</TTButton
								>
								<TTButton
									icon="play"
									v-else
									@click="
										storeTimer.timerUnpause(entry.id);
										refreshTimers();
									"
									:disabled="!entry.enabled"
									v-tooltip="entry.enabled ? '' : t('timers.form.disabled_tt')"
									>{{ t("timers.form.unpause") }}</TTButton
								>
								<TTButton
									icon="stop"
									@click="
										storeTimer.timerStop(entry.id);
										refreshTimers();
									"
									>{{ t("timers.form.stop") }}</TTButton
								>
							</template>
						</div>
					</div>
				</ToggleBlock>
			</template>
		</draggable>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import PlaceholderField from "@/components/PlaceholderField.vue";
import SwitchButton from "@/components/SwitchButton.vue";
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import StoreProxy from "@/store/StoreProxy";
import { rebuildPlaceholdersCache } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import draggable from "vuedraggable";
import ParamItem from "../ParamItem.vue";
import type IParameterContent from "./IParameterContent";
import PremiumLimitMessage from "../PremiumLimitMessage.vue";
import Config from "@/utils/Config";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		panelContext?: boolean;
	}>(),
	{
		panelContext: false,
	},
);

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeTimer = useStoreTimer();
const storeParams = useStoreParams();

const param_duration = ref<Record<string, TwitchatDataTypes.ParameterData<number>>>({});
const timer2Duration = ref<
	Record<string, ReturnType<typeof StoreProxy.timers.getTimerComputedValue>>
>({});
const timer2PlaceholderError = ref<Record<string, boolean>>({});
const defaultTimerPLaceholder = ref<string>("");
const defaultCountdownPLaceholder = ref<string>("");

let refreshInterval = -1;

const maxReached = computed<boolean>(() => {
	const count = storeTimer.timerList.filter((v) => !v.isDefault).length;
	const max = storeAuth.isPremium
		? Config.instance.MAX_TIMERS_PREMIUM
		: Config.instance.MAX_TIMERS;
	return count >= max;
});

const canEnableMore = computed<boolean>(() => {
	if (storeAuth.isPremium) return false;
	const count = storeTimer.timerList.filter((v) => v.enabled != false && !v.isDefault).length;
	const max = storeAuth.isPremium
		? Config.instance.MAX_TIMERS_PREMIUM
		: Config.instance.MAX_TIMERS;
	return count < max;
});

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

function openOverlays(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "timer");
}

/**
 * Builds up local timer list
 */
function buildParams(): void {
	for (const element of storeTimer.timerList) {
		if (param_duration.value[element.id] != undefined) continue;
		param_duration.value[element.id] = {
			type: "duration",
			value: (element.duration_ms || 60000) / 1000,
			min: 0,
			max: Number.MAX_SAFE_INTEGER,
			icon: "countdown",
			labelKey: "timers.form.param_duration",
		};
		timer2PlaceholderError.value[element.id] = false;
	}
	checkForPlaceholderDuplicates();
}

/**
 * Force rebuild of the parameters
 */
function rebuildParams(): void {
	param_duration.value = {};
	timer2PlaceholderError.value = {};
	buildParams();
}

/**
 * Refreshes the running timers values
 */
function refreshTimers(): void {
	for (const element of storeTimer.timerList) {
		timer2Duration.value[element.id] = storeTimer.getTimerComputedValue(element.id);
	}
}

/**
 * Check for duplicate placeholders
 */
function checkForPlaceholderDuplicates() {
	storeTimer.timerList.forEach((t) => {
		timer2PlaceholderError.value[t.id] = false;
	});
	for (const t of storeTimer.timerList) {
		if (!t.placeholderKey) continue;
		for (const t2 of storeTimer.timerList) {
			if (t2.id == t.id) continue;
			if (t2.type != t.type) continue;
			if (
				t2.placeholderKey &&
				t2.placeholderKey.toUpperCase() == t.placeholderKey.toUpperCase()
			) {
				timer2PlaceholderError.value[t.id] = true;
				break;
			}
		}
	}

	rebuildPlaceholdersCache();
}

onMounted(() => {
	refreshInterval = window.setInterval(() => refreshTimers(), 100);
	defaultTimerPLaceholder.value =
		storeTimer.timerList.find((v) => v.type == "timer" && v.isDefault)?.placeholderKey || "";
	defaultCountdownPLaceholder.value =
		storeTimer.timerList.find((v) => v.type == "countdown" && v.isDefault)?.placeholderKey ||
		"";

	buildParams();
});

onBeforeUnmount(() => {
	clearInterval(refreshInterval);
});

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});
</script>

<style scoped lang="less">
.paramstimer {
	.ctas {
		align-items: center;
	}

	.entryList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		// width: 100%;
		width: calc(100% - 2em);
		margin: auto;

		.info {
			text-align: center;
			font-size: 0.8em;
			margin-bottom: 0.25em;
			.icon {
				height: 1em;
				margin-right: 0.5em;
			}
		}

		.timerTypeIcon {
			width: 1em;
			z-index: 1;
		}

		.togglebutton {
			z-index: 1;
		}

		.timerValue {
			display: flex;
			text-align: center;
			font-variant-numeric: tabular-nums;
			background-color: var(--color-primary-fade);
			border-radius: 0;
			align-self: stretch;
			align-items: center;
			margin-left: -6.5em;
			padding: 0 0.5em;
			padding-left: 6.25em;
			z-index: 0;
			font-size: 0.75em;

			&.paused {
				background-color: var(--color-secondary-fader);
			}
		}

		.content {
			display: flex;
			flex-direction: column;
			gap: 0.25em;

			.placeholder {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				row-gap: 0.25em;
				.icon {
					width: 1em;
					height: 1em;
					margin-right: 0.5em;
				}
				.label {
					flex-grow: 1;
					justify-self: flex-start;
				}

				&.error {
					background-color: var(--color-alert-fader);

					.errorReason {
						background-color: var(--color-alert);
						margin: -0.5em;
						margin-top: 0;
						padding: 0.25em;
						width: calc(100% + 1em);
						text-align: center;
					}
				}
			}
			.ctas {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				gap: 0.25em;
				justify-content: center;
			}
		}
	}
}
</style>
