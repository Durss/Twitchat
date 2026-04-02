<template>
	<div class="triggerslogs sidePanel" ref="rootEl">
		<div class="head">
			<h1 class="title"><Icon name="broadcast" />{{ $t("triggers.logs.title") }}</h1>
			<div class="subtitle">{{ $t("triggers.logs.subtitle") }}</div>
			<ClearButton @click="close" />
		</div>

		<div class="ctas">
			<TTButton @click="refreshList()" icon="refresh" :loading="reloading">{{
				$t("global.refresh")
			}}</TTButton>
			<TTButton @click="clearList()" icon="trash" alert>{{ $t("global.clear") }}</TTButton>
		</div>

		<div class="content empty" v-if="logs.length == 0 && !reloading">
			{{ $t("triggers.logs.empty") }}
		</div>

		<div class="content empty" v-else-if="reloading">
			<Icon class="loader" name="loader" />
		</div>

		<div class="content entries" v-else-if="!reloading">
			<div v-for="item in logs" :key="item.id" :class="getTriggerClasses(item)">
				<div class="head" @click="idToExpandState[item.id] = !idToExpandState[item.id]">
					<div class="infos">
						<img
							class="icon"
							:src="getAsset('icons/' + getTriggerInfo(item.trigger)?.icon + '.svg')"
						/>
						<div class="status" v-tooltip="'error'" v-if="item.error">
							<Icon theme="light" name="cross" />
						</div>
						<div
							class="status"
							v-tooltip="'critical error'"
							v-else-if="item.criticalError"
						>
							<Icon theme="light" name="alert" />
						</div>
						<div class="status" v-tooltip="'complete'" v-else-if="item.complete">
							<Icon theme="light" name="checkmark" />
						</div>
						<div class="status" v-tooltip="'skipped'" v-else-if="item.skipped">
							<Icon theme="light" name="skip" />
						</div>
						<div class="status" v-tooltip="'pending'" v-else>
							<Icon name="loader" theme="light" />
						</div>
						<div
							class="status"
							v-tooltip="'started from<br>Test button'"
							v-if="item.testMode"
						>
							<Icon theme="light" name="test" />
						</div>
						<div class="date">{{ getFormattedTime(item.date) }}</div>
						<div class="title" v-if="getTriggerInfo(item.trigger).event?.labelKey">
							{{ $t(getTriggerInfo(item.trigger).event?.labelKey as string) }}
						</div>
						<div
							class="subtitle"
							v-if="
								getTriggerInfo(item.trigger)?.label !=
								$t(getTriggerInfo(item.trigger).event?.labelKey as string)
							"
						>
							{{ getTriggerInfo(item.trigger)!.label }}
						</div>
					</div>
					<Icon name="arrowRight" class="arrow" />
				</div>
				<div class="messages" v-if="idToExpandState[item.id] == true">
					<ul class="messages">
						<li v-for="entry in item.entries">
							<template v-if="entry.type == 'message'">
								<span class="date">{{ getFormattedTime(entry.date) }}</span>
								<span>{{ entry.value }}</span>
							</template>
							<template v-else>
								<div :class="getStepClasses(entry)">
									<div
										:class="getHeadClasses(entry)"
										@click="
											idToExpandState[entry.id] = !idToExpandState[entry.id]
										"
									>
										<span class="date">{{ getFormattedTime(entry.date) }}</span>
										<span>{{ entry.data.type }}</span>
										<Icon name="arrowRight" />
									</div>
									<ul class="messages" v-if="idToExpandState[entry.id]">
										<li v-for="mess in entry.messages">
											<span class="date">{{
												getFormattedTime(mess.date)
											}}</span>
											<span>{{ mess.value }}</span>
										</li>
									</ul>
								</div>
							</template>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TriggerData } from "@/types/TriggerActionDataTypes";
import Logger, { type LogTrigger, type LogTriggerStep } from "@/utils/Logger";
import TriggerUtils from "@/utils/TriggerUtils";
import Utils from "@/utils/Utils";
import { ref, computed, useTemplateRef } from "vue";
import { useSidePanel } from "@/composables/useSidePanel";
import { asset } from "@/composables/useAsset";
import ClearButton from "../ClearButton.vue";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";

const emit = defineEmits<{
	close: [];
}>();

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const { close } = useSidePanel(rootEl, emit);
const { getAsset } = asset();

const reloading = ref<boolean>(false);
const idToExpandState = ref<{ [key: string]: boolean }>({});

const logs = computed<LogTrigger[]>(() => {
	return Logger.instance.getLogs("triggers").concat().reverse();
});

function getTriggerClasses(log: LogTrigger): string[] {
	const res = ["entry"];
	if (log.error) res.push("secondary");
	if (log.criticalError) res.push("alert");
	if (idToExpandState.value[log.id]) res.push("open");
	return res;
}

function getHeadClasses(step: LogTriggerStep): string[] {
	const res = ["head"];
	if (idToExpandState.value[step.id]) res.push("open");
	if (step.error) res.push("secondary");
	return res;
}

function getStepClasses(step: LogTriggerStep): string[] {
	const res = ["step"];
	if (step.error) res.push("secondary");
	return res;
}

function getTriggerInfo(trigger: TriggerData) {
	return TriggerUtils.getTriggerDisplayInfo(trigger);
}

function getFormattedTime(date: number): string {
	const d = new Date(date);
	return (
		Utils.toDigits(d.getHours()) +
		":" +
		Utils.toDigits(d.getMinutes()) +
		":" +
		Utils.toDigits(d.getSeconds()) +
		"." +
		Utils.toDigits(d.getMilliseconds(), 3)
	);
}

function refreshList(): void {
	reloading.value = true;
	window.setTimeout(() => {
		reloading.value = false;
	}, 500);
}

function clearList(): void {
	Logger.instance.clear("triggers");
	refreshList();
}
</script>

<style scoped lang="less">
.triggerslogs {
	.ctas {
		margin-top: 1em;
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}

	.entries {
		display: flex;
		flex-direction: column;
		gap: 1em;
	}

	.loader {
		height: 2em;
		margin: 0 auto;
	}

	.empty {
		text-align: center;
		font-style: italic;
	}

	.entry {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		.head {
			display: flex;
			flex-direction: row;
			background-color: var(--color-primary);
			padding: 0.2em 0.5em;
			border-radius: 0.5em;
			color: var(--color-light);
			transition: background-color.25s;
			cursor: pointer;
			.arrow {
				height: 1em;
				justify-self: flex-end;
			}

			.infos {
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				flex-grow: 1;
				.icon {
					height: 1em;
				}
				.status {
					height: 1em;
					img {
						height: 100%;
					}
				}

				.subtitle {
					font-size: 0.8em;
					background: var(--color-light);
					color: var(--color-primary);
					padding: 1.5px 5px;
					border-radius: 5px;
				}
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
		}

		&.open {
			.head > .arrow {
				transform: rotate(90deg);
			}
		}

		.date {
			font-size: 0.7em;
		}

		.messages {
			padding-left: 0.5em;
			font-size: 0.9em;
			list-style-position: inside;
			display: flex;
			flex-direction: column;
			gap: 0.5em;

			li {
				.date {
					margin-right: 0.5em;
				}
				.step {
					display: inline-flex;
					flex-direction: column;
					gap: 0.25em;
					max-width: 90%;
					.head {
						gap: 0.5em;
						display: flex;
						flex-direction: row;
						align-items: center;
						align-self: flex-start;
						background-color: var(--color-primary-dark);
						transition: background-color.25s;
						&:hover {
							background-color: var(--color-primary);
						}
						.icon {
							height: 1em;
						}
						&.open {
							.icon {
								transform: rotate(90deg);
							}
						}
						&.secondary {
							background-color: var(--color-secondary-dark);
							&:hover {
								background-color: var(--color-secondary);
							}
						}
					}
				}
			}
		}

		&.secondary {
			.head {
				background-color: var(--color-secondary);
				&:hover {
					background-color: var(--color-secondary-light);
				}
			}
		}
		&.alert {
			.head {
				background-color: var(--color-alert);
				&:hover {
					background-color: var(--color-alert-light);
				}
			}
		}
	}
}
</style>
