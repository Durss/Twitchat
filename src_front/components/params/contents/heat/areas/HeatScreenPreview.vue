<template>
	<div :class="classes">
		<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
			<polygon
				v-for="area in polygons"
				:points="area.svgData"
				:class="getAreaClasses(area.id)"
				@click="emit('select', area.id)"
			/>
		</svg>

		<div class="obsSceneName" v-if="props.screen.activeOBSScene">
			<Icon name="obs" />{{ props.screen.activeOBSScene }}
		</div>

		<div class="enableBt" v-if="props.selectAreaMode === false && canEnable">
			<ToggleButton
				v-model="props.screen.enabled"
				@click.stop
				@change="emit('update')"
				:alert="!props.screen.enabled"
			/>
		</div>

		<div class="ctas" v-if="props.selectAreaMode === false && props.renderOnly == false">
			<button v-tooltip="t('global.edit')"><Icon name="edit" theme="primary" /></button>
			<button
				@click.stop="emit('duplicate', props.screen.id)"
				v-tooltip="t('global.duplicate')"
				v-if="props.canDuplicate !== false"
			>
				<Icon name="copy" theme="primary" />
			</button>
			<button @click.stop="emit('delete', props.screen.id)" v-tooltip="t('global.delete')">
				<Icon name="trash" theme="alert" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import type { HeatScreen } from "@/types/HeatDataTypes";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import Config from "@/utils/Config";

const props = withDefaults(
	defineProps<{
		screen: HeatScreen;
		selectAreaMode?: boolean;
		selectedAreas?: string[];
		canDuplicate?: boolean;
		renderOnly?: boolean;
	}>(),
	{
		selectAreaMode: false,
		selectedAreas: () => [],
		canDuplicate: false,
		renderOnly: false,
	},
);

const emit = defineEmits<{
	delete: [id: string];
	duplicate: [id: string];
	update: [];
	select: [id: string];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeHeat = useStoreHeat();

const classes = computed<string[]>(() => {
	const res = ["heatscreenpreview"];
	if (props.selectAreaMode === false && props.renderOnly === false) res.push("noSelect");
	if (!props.screen.enabled) res.push("disabled");
	return res;
});

const canEnable = computed<boolean>(() => {
	if (props.renderOnly !== false) return false;
	let max = Config.instance.MAX_CUSTOM_HEAT_SCREENS;
	if (storeAuth.isPremium) max = Config.instance.MAX_CUSTOM_HEAT_SCREENS_PREMIUM;
	return (
		storeHeat.screenList.filter((v) => v.enabled).length < max || props.screen.enabled != false
	);
});

const polygons = computed<{ id: string; svgData: string }[]>(() => {
	if (!props.screen) return [];
	return props.screen.areas.map((v) => {
		return {
			id: v.id,
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
		bottom: 0;
		left: 0;
		filter: drop-shadow(1px 1px 1px var(--color-text-inverse))
			drop-shadow(-1px -1px 1px var(--color-text-inverse));

		.icon {
			height: 1em;
			width: 1em;
			margin-right: 0.25em;
		}
	}

	.ctas {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		gap: 5px;
		flex-direction: row;
		background-color: var(--color-light);
		padding: 5px;
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		display: none;
		button {
			height: 1.25em;
			.icon {
				height: 100%;
			}
		}
	}

	.enableBt {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		display: none;
		background-color: var(--color-light);
		padding: 3px;
		border-top-left-radius: var(--border-radius);
		border-top-right-radius: var(--border-radius);
		color: var(--color-text-inverse);
	}

	&:hover {
		border-style: solid;
		.ctas {
			display: flex;
		}
		.enableBt {
			display: block;
		}
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

