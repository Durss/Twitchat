<template>
	<div :class="classes">
		<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
			<polygon
				v-for="area in polygons"
				:points="area.svgData"
				:class="getAreaClasses(area.id)"
				v-tooltip="area.title"
				@click="emit('select', area.id)"
			/>
		</svg>

		<div class="obsSceneName" v-if="props.screen.activeOBSScene && showObsScene">
			<Icon name="obs" />{{ props.screen.activeOBSScene }}
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import type { HeatScreen } from "@/types/HeatDataTypes";
import { computed } from "vue";

const props = withDefaults(
	defineProps<{
		screen: HeatScreen;
		selectAreaMode?: boolean;
		selectedAreas?: string[];
		renderOnly?: boolean;
		showObsScene?: boolean;
	}>(),
	{
		selectedAreas: () => [],
		showObsScene: true,
	},
);

const emit = defineEmits<{
	delete: [id: string];
	duplicate: [id: string];
	update: [];
	select: [id: string];
}>();

const classes = computed<string[]>(() => {
	const res = ["heatscreenpreview"];
	if (props.selectAreaMode === false && props.renderOnly === false) res.push("noSelect");
	if (!props.screen.enabled) res.push("disabled");
	return res;
});

const polygons = computed(() => {
	if (!props.screen) return [];
	return props.screen.areas.map((v) => {
		return {
			id: v.id,
			title: v.title,
			svgData: v.points.map((w) => w.x * 1920 + "," + w.y * 1080).join(","),
		};
	});
});

function getAreaClasses(areaID: string): string[] {
	const res: string[] = [];
	if (props.selectedAreas.indexOf(areaID) > -1) res.push("selected");
	return res;
}
</script>

<style scoped lang="less">
.heatscreenpreview {
	position: relative;
	border-radius: var(--border-radius);
	border: 1px dashed var(--color-primary);
	background-color: var(--color-primary-fadest);
	overflow: hidden;

	.obsSceneName {
		position: absolute;
		top: 3px;
		right: 3px;
		filter: drop-shadow(1px 1px 0px var(--color-text-inverse));

		.icon {
			height: 1em;
			width: 1em;
			margin-right: 0.25em;
		}
	}

	&:not(.noSelect):hover {
		border-style: solid;
		.obsSceneName {
			display: none;
		}
	}

	svg {
		:deep(polygon) {
			cursor: pointer;
			fill: var(--color-primary-fader);
			stroke: var(--color-primary-extralight);
			stroke-width: 7px;
			stroke-dasharray: 30px;
			opacity: 0.6;
			&:hover {
				fill: var(--color-primary-fade);
				opacity: 1;
				stroke: var(--color-primary-extralight);
			}
			&.selected {
				opacity: 1;
				fill: var(--color-primary-light);
				stroke: transparent;
				&:hover {
					fill: var(--color-primary-extralight);
					opacity: 1;
				}
			}
		}
	}

	&.noSelect {
		svg {
			user-select: none;
			pointer-events: none;
			:deep(polygon) {
				fill: var(--color-primary-light);
				opacity: 1;
				stroke-width: 0;
			}
		}
	}

	&.disabled {
		border: 1px dashed var(--color-alert);
		background-color: var(--color-alert-fadest);

		svg {
			:deep(polygon) {
				fill: var(--color-alert-fade);
				stroke: var(--color-alert-light);
				&.selected {
					opacity: 1;
					fill: red;
				}
			}
		}
	}
}
</style>
