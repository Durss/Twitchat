<template>
	<div class="triggeractiontriggerentry triggerActionForm">
		<div class="field col" v-if="!action.triggerId">
			<div class="title" v-if="rewards.length > 0 && !action.triggerId">
				{{ t("triggers.actions.trigger.select") }}
			</div>

			<SimpleTriggerList class="list" @select="onSelectTrigger" :allowFolders="false" />
		</div>

		<div class="card-item field" v-else>
			<Icon name="broadcast" class="icon" />
			<div class="item title">{{ t("triggers.actions.trigger.selected") }}</div>
			<SimpleTriggerList
				:filteredItemId="action.triggerId"
				:allowFolders="false"
				@click="action.triggerId = ''"
				primary
			/>
			<button class="openTriggerBt" @click="openTrigger()"><Icon name="newtab" /></button>
		</div>

		<ToggleBlock :title="t('triggers.actions.trigger.warning_title')" :open="false" small>
			<div class="disclaimer">
				<p>{{ t("triggers.actions.trigger.warning") }}</p>
				<strong>{{ t("global.example") }}</strong>
				<span v-html="t('triggers.actions.trigger.warning_example')"></span>
			</div>
		</ToggleBlock>

		<div v-if="dependencyLoopInfos.length > 0" class="card-item alert triggerChain">
			<div class="title">{{ t("triggers.actions.trigger.loop") }}</div>
			<div class="head">{{ t("triggers.actions.trigger.loop_delails") }}</div>
			<div v-for="(d, index) in dependencyLoopInfos" :key="index" class="loopItem">
				<div class="loopInfo">
					<img v-if="d.iconURL" :src="d.iconURL" :alt="d.label" />
					<img v-if="d.icon" :src="getAsset('icons/' + d.icon + '.svg')" :alt="d.icon" />
					<span class="label">{{ d.label }}</span>
				</div>
			</div>
		</div>

		<div v-if="queueDeadlockInfos.length > 0" class="card-item alert triggerChain">
			<div class="title">{{ t("triggers.actions.trigger.queue_lock") }}</div>
			<div class="head">
				{{ t("triggers.actions.trigger.queue_lock_details", { QUEUE: queueDeadlockName }) }}
			</div>
			<div v-for="(d, index) in queueDeadlockInfos" :key="index" class="loopItem">
				<div class="loopInfo">
					<img v-if="d.iconURL" :src="d.iconURL" :alt="d.label" />
					<img v-if="d.icon" :src="getAsset('icons/' + d.icon + '.svg')" :alt="d.icon" />
					<span class="label">{{ d.label }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import { asset } from "@/composables/useAsset";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import type { TriggerActionTriggerData, TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import TriggerUtils from "@/utils/TriggerUtils";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import ToggleBlock from "../../../../ToggleBlock.vue";
import SimpleTriggerList from "../SimpleTriggerList.vue";

const props = defineProps<{
	action: TriggerActionTriggerData;
	triggerData: TriggerData;
	rewards: TwitchDataTypes.Reward[];
}>();

const { t } = useI18n();
const { getAsset } = asset();
const storeTriggers = useStoreTriggers();

const dependencyLoopInfos = ref<
	{
		label: string;
		icon: string;
		iconURL?: string | undefined;
		iconBgColor?: string | undefined;
	}[]
>([]);

/**
 * Search recusrsively for a trigger child executing on the same queue.
 */
const queueDeadlockChain = computed<TriggerData[]>(() => {
	if (!props.action.triggerId) return [];

	const triggers = storeTriggers.triggerList;
	//Queues locked by the current execution path
	const lockedQueues = new Set<string>();
	//Triggers of the current execution path, avoids infinite recursion on dependency loops
	const parents = new Set<string>([props.triggerData.id]);
	if (props.triggerData.queue) lockedQueues.add(props.triggerData.queue);

	function search(triggerId: string): TriggerData[] {
		const trigger = triggers.find((v) => v.id == triggerId);
		//Trigger not found or already on the execution path (dependency loop, reported separately)
		if (!trigger || parents.has(trigger.id)) return [];
		//This trigger would wait for a queue one of its parents is holding => deadlock
		if (trigger.queue && lockedQueues.has(trigger.queue)) return [trigger];

		if (trigger.queue) lockedQueues.add(trigger.queue);
		parents.add(trigger.id);

		let chain: TriggerData[] = [];
		for (const a of trigger.actions || []) {
			if (a.type != "trigger" || !a.triggerId) continue;
			const subChain = search(a.triggerId);
			if (subChain.length > 0) {
				chain = [trigger, ...subChain];
				break;
			}
		}

		parents.delete(trigger.id);
		if (trigger.queue) lockedQueues.delete(trigger.queue);
		return chain;
	}

	const result = search(props.action.triggerId);
	return result.length > 0 ? [props.triggerData, ...result] : [];
});

const queueDeadlockInfos = computed(() =>
	queueDeadlockChain.value.map((v) => TriggerUtils.getTriggerDisplayInfo(v)),
);

const queueDeadlockName = computed(
	() => queueDeadlockChain.value[queueDeadlockChain.value.length - 1]?.queue || "",
);

function onSelectTrigger(id: string): void {
	const trigger = storeTriggers.triggerList.find((v) => v.id == id);
	if (!trigger) return;
	props.action.triggerId = trigger.id;
	buildDependencyLoop();
}

function openTrigger(): void {
	const trigger = storeTriggers.triggerList.find((v) => v.id == props.action.triggerId);
	if (trigger) storeTriggers.openTriggerEdition(trigger);
}

function buildDependencyLoop(): void {
	const links = recursiveLoopCheck(props.triggerData);
	if (links.length > 0) {
		links.push(links[0]!);
		dependencyLoopInfos.value = links.map((v) => {
			return TriggerUtils.getTriggerDisplayInfo(v);
		});
	} else {
		dependencyLoopInfos.value = [];
	}
}

function recursiveLoopCheck(
	base: TriggerData,
	doneIds: { [key: string]: boolean } = {},
): TriggerData[] {
	if (!props.action.triggerId) return [];
	const triggers = storeTriggers.triggerList;
	let found: TriggerData[] = [];

	if (!base.actions) return [];

	for (const a of base.actions) {
		//Ignore if it's not related to the current action
		//This avoids showing a dependency loop an another action of
		//the current trigger if it's not the source of the looped dependency
		if (base == props.triggerData && a.id != props.action.id) continue;

		//If it's a trigger action
		if (a.type == "trigger") {
			//If the trigger to be called is the current one, a loop is detected
			if (a.triggerId == props.triggerData.id) {
				found.push(base);
				break;
				//If it's not the current trigger and this trigger has not yet been parsed, check deeper
				//Ignore if the trigger was already parsed to avoid detecting a loop external to the
				//current trigger. For exemple, if the selected trigger leads to a dependency loop
				//that is not part of the current trigger, this would lead to an infinite recursion.
			} else if (a.triggerId && doneIds[a.triggerId] !== true) {
				doneIds[a.triggerId] = true;
				//Check deeper
				const trigger = triggers.find((v) => v.id == a.triggerId);
				if (trigger) {
					const list = recursiveLoopCheck(trigger, doneIds);
					if (list.length > 0) {
						found.push(base);
						found = found.concat(list);
					}
				}
			}
		}
	}
	return found;
}

watch(
	() => props.action.triggerId,
	() => {
		buildDependencyLoop();
	},
);
watch(
	() => props.triggerData.type,
	() => {
		buildDependencyLoop();
	},
);

onMounted(() => {
	buildDependencyLoop();
});
</script>

<style scoped lang="less">
.triggeractiontriggerentry {
	.field {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5em;
		&.col {
			flex-direction: column;
		}

		.icon {
			height: 1em;
			margin-top: -5px;
		}

		.list {
			flex-grow: 1;
			max-height: 300px;
			width: 100%;
		}

		.openTriggerBt {
			height: 1em;
			transition: transform 0.2s;
			color: var(--color-text);
			&:hover {
				transform: scale(1.2);
			}
		}
	}

	.triggerChain {
		display: flex;
		flex-direction: column;
		align-items: center;

		.title {
			font-weight: bold;
			margin-bottom: 0.25em;
		}

		.head {
			margin-bottom: 0.5em;
		}

		.loopItem {
			cursor: default;

			&:not(:last-child) {
				&:after {
					display: block;
					content: "↓";
					margin: 0.25em 0;
					text-align: center;
				}
			}

			&:not(.loopItem ~ .loopItem),//This means "first item with class .loopItem"
			&:last-child {
				.loopInfo {
					background-color: var(--color-alert-light);
				}
			}

			.loopInfo {
				border-radius: 0.25em;
				padding: 0.25em;
				background-color: var(--color-alert-dark);
				box-shadow: 3px 3px 3px rgba(0, 0, 0, 0.35);
				img {
					height: 1em;
					vertical-align: middle;
					margin-right: 0.25em;
				}
			}
		}
	}

	.disclaimer {
		font-size: 0.9em;
		line-height: 1.3em;
	}
}
</style>
