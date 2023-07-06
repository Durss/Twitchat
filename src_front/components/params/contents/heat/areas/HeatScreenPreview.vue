<template>
	<div :class="classes">
		<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
			<polygon v-for="p in polygons" :points="p" />
		</svg>
		<div class="enableBt">
			<ToggleButton v-model="screen.enabled" @change="$emit('update')" />
		</div>
		<div class="ctas">
			<button v-tooltip="$t('global.edit')"><Icon name="edit" theme="primary"/></button>
			<button @click.stop="$emit('duplicate', screen.id)" v-tooltip="$t('global.duplicate')"><Icon name="copy" theme="primary"/></button>
			<button @click.stop="$emit('delete', screen.id)" v-tooltip="$t('global.delete')"><Icon name="trash" theme="alert"/></button>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleButton from '@/components/ToggleButton.vue';
import type { HeatScreen } from '@/types/HeatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleButton,
	},
	emits:["delete", "duplicate", "update"],
})
export default class HeatScreenPreview extends Vue {

	@Prop
	public screen!:HeatScreen;

	public get classes():string[] {
		const res = ["heatscreenpreview"];
		if(!this.screen.enabled) res.push("disabled");
		return res;
	}
	
	public get polygons():string[] {
		if(!this.screen) return [];
		return this.screen.areas.map(v=> v.points.map(w => (w.x * 1920)+","+(w.y * 1080)).join(","));
	}

}
</script>

<style scoped lang="less">
.heatscreenpreview{
	cursor: pointer;
	position: relative;
	border-radius: var(--border-radius);
	border: 1px dashed var(--color-primary);
	background-color: var(--color-primary-fadest);
	overflow: hidden;

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
	}

	&:hover {
		border-style: solid;
		.ctas {
			display: flex;
		}
		.enableBt {
			display: block;
		}
	}

	svg {
		user-select: none;
		pointer-events: none;
		:deep(polygon) {
			fill: var(--color-primary);
		}
	}

	&.disabled {
		border: 1px dashed var(--color-alert);
		background-color: var(--color-alert-fadest);

		svg {
			:deep(polygon) {
				fill: var(--color-alert-fade);
			}
		}
	}
}
</style>