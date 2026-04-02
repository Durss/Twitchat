<template>
	<div class="simpletriggerlist" v-if="entryList.length > 0 && filteredItemId == ''">
		<div
			v-for="item in entryList"
			:class="classes(false)"
			:key="item.id"
			@click="emit('select', item.id)"
		>
			<div
				v-if="item.color"
				class="colorLayer"
				:style="{ backgroundColor: item.color }"
			></div>
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
		v-else-if="entryList.length === 1"
		@click="emit('select', entryList[0]!.id)"
	>
		<img
			class="icon"
			:src="entryList[0]!.iconURL"
			v-if="entryList[0]!.iconURL"
			:style="{ backgroundColor: entryList[0]!.iconBG }"
		/>
		<Icon class="icon" :name="entryList[0]!.icon" v-else-if="entryList[0]!.icon" />
		<Icon class="icon trash" name="trash" />
		<span class="label">{{ entryList[0]!.label }}</span>
	</div>

	<div v-else class="card-item alert deletedTrigger">{{ $t("triggers.missing_trigger") }}</div>
</template>

<script setup lang="ts">
import TriggerUtils from "@/utils/TriggerUtils";
import { ref, onMounted } from "vue";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import type { TriggerTreeItemData } from "@/types/TriggerActionDataTypes";

type Entry = {
	id: string;
	label: string;
	icon?: string;
	iconURL?: string;
	iconBG?: string;
	color?: string;
};

const props = withDefaults(
	defineProps<{
		filteredItemId?: string;
		primary?: boolean;
		allowFolders?: boolean;
	}>(),
	{
		filteredItemId: "",
	},
);

const emit = defineEmits<{
	select: [id: string];
}>();

const storeTriggers = useStoreTriggers();

const entryList = ref<Entry[]>([]);

function classes(selected: boolean): string[] {
	const res: string[] = ["item"];
	if (selected) res.push("selected");
	if (props.primary !== false) res.push("primary");
	return res;
}

onMounted(() => {
	entryList.value = TriggerUtils.getFlatFolderList().map((folder) => ({
		id: folder.id,
		label: folder.name || "???",
		icon: "folder",
		color: folder.color,
	}));

	const triggers = storeTriggers.triggerList;
	triggers.forEach((t) => {
		const infos = TriggerUtils.getTriggerDisplayInfo(t);
		entryList.value.push({
			id: t.id,
			label: infos.label,
			icon: infos.icon,
			iconURL: infos.iconURL,
			iconBG: infos.iconBgColor,
		});
	});

	if (props.filteredItemId != "") {
		entryList.value = entryList.value.filter((e) => e.id == props.filteredItemId);
	}
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
	position: relative;
	background-color: var(--background-color-fadest);
	transition: background-color 0.2s;
	cursor: pointer;
	border-radius: var(--border-radius);
	padding: 0.25em 0.5em;
	font-size: 0.9em;
	color: var(--color-text);
	.icon,
	.label {
		z-index: 1;
	}
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
	.colorLayer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border-radius: var(--border-radius);
		opacity: 0.25;
		z-index: 0;
	}
}

.deletedTrigger {
	cursor: pointer;
	font-size: 0.9em;
}
</style>
