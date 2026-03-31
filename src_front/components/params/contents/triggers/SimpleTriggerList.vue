<template>
	<div class="simpletriggerlist" v-if="triggerList.length > 0 && filteredItemId == ''">
		<div
			:class="classes(false)"
			v-for="item in triggerList"
			:key="item.id"
			@click="$emit('select', item.id)"
		>
			<img
				class="icon"
				:src="item.iconURL"
				v-if="item.iconURL"
				:style="{ backgroundColor: item.iconBG }"
			/>
			<Icon class="icon" :name="item.icon" v-else-if="item.icon" />
			<span class="label">{{ item.label }}</span>
		</div>
	</div>

	<div
		:class="classes(true)"
		v-else-if="triggerList.length === 1"
		@click="$emit('select', triggerList[0]!.id)"
	>
		<img
			class="icon"
			:src="triggerList[0]!.iconURL"
			v-if="triggerList[0]!.iconURL"
			:style="{ backgroundColor: triggerList[0]!.iconBG }"
		/>
		<Icon class="icon" :name="triggerList[0]!.icon" v-else-if="triggerList[0]!.icon" />
		<Icon class="icon trash" name="trash" />
		<span class="label">{{ triggerList[0]!.label }}</span>
	</div>

	<div v-else class="card-item alert deletedTrigger">{{ $t("triggers.missing_trigger") }}</div>
</template>

<script setup lang="ts">
import TriggerUtils from "@/utils/TriggerUtils";
import { ref, onMounted } from "vue";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";

const props = withDefaults(
	defineProps<{
		filteredItemId?: string;
		primary?: boolean;
	}>(),
	{
		filteredItemId: "",
		primary: false,
	},
);

const emit = defineEmits<{
	select: [id: string];
}>();

const storeTriggers = useStoreTriggers();

const triggerList = ref<
	{
		id: string;
		label: string;
		icon?: string;
		iconURL?: string;
		iconBG?: string;
	}[]
>([]);

function classes(selected: boolean): string[] {
	const res: string[] = ["item"];
	if (selected) res.push("selected");
	if (props.primary !== false) res.push("primary");
	return res;
}

onMounted(() => {
	//Remove deleted triggers
	const triggers = storeTriggers.triggerList;
	triggers.forEach((t) => {
		if (props.filteredItemId != "" && t.id != props.filteredItemId) return;
		const infos = TriggerUtils.getTriggerDisplayInfo(t);
		triggerList.value.push({
			id: t.id,
			label: infos.label,
			icon: infos.icon,
			iconURL: infos.iconURL,
			iconBG: infos.iconBgColor,
		});
	});
});
</script>

<style scoped lang="less">
.simpletriggerlist {
	gap: 2px;
	display: flex;
	flex-direction: column;
	max-height: 200px;
	overflow-y: auto;
}
.item {
	gap: 0.5em;
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-shrink: 0;
	background-color: var(--background-color-fadest);
	transition: background-color 0.2s;
	cursor: pointer;
	border-radius: var(--border-radius);
	padding: 0.25em 0.5em;
	font-size: 0.9em;
	color: var(--color-text);
	.icon {
		height: 1.5em;
		width: 1.5em;
		border-radius: var(--border-radius);
		object-fit: contain;
	}
	.trash {
		display: none;
	}
	&:hover {
		background-color: var(--background-color-fader);
		&.selected {
			.icon {
				display: none;
				&.trash {
					display: block;
				}
			}
			background-color: var(--color-alert);
		}
	}
	&.primary {
		color: var(--color-light);
		background-color: var(--color-primary);
		&:hover {
			background-color: var(--color-alert);
		}
	}
}

.deletedTrigger {
	cursor: pointer;
	font-size: 0.9em;
}
</style>
