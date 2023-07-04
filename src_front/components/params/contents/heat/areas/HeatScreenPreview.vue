<template>
	<div class="HeatScreenPreview">
		<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
			<polygon v-for="p in polygons" :points="p" />
		</svg>
		<div class="ctas">
			<button v-tooltip="$t('global.edit')"><Icon name="edit" theme="primary"/></button>
			<button @click.stop="$emit('duplicate', screen.id)" v-tooltip="$t('global.duplicate')"><Icon name="copy" theme="primary"/></button>
			<button @click.stop="$emit('delete', screen.id)" v-tooltip="$t('global.delete')"><Icon name="trash" theme="alert"/></button>
		</div>
	</div>
</template>

<script lang="ts">
import type { HeatScreen } from '@/types/HeatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["delete", "duplicate"],
})
export default class HeatScreenPreview extends Vue {

	@Prop
	public screen!:HeatScreen;

	public get polygons():string[] {
		if(!this.screen) return [];
		return this.screen.areas.map(v=> v.points.map(w => (w.x * 1920)+","+(w.y * 1080)).join(","));
	}

}
</script>

<style scoped lang="less">
.HeatScreenPreview{
	cursor: pointer;
	position: relative;
	border-radius: var(--border-radius);
	border: 1px dashed var(--color-text);
	background-color: var(--color-text-fadest);
	overflow: hidden;

	.ctas {
		position: absolute;
		top: 0;
		right: 0;
		gap: 5px;
		flex-direction: row;
		background-color: var(--color-light);
		padding: 5px;
		border-bottom-left-radius: var(--border-radius);
		display: none;
		button {
			height: 1.25em;
			.icon {
				height: 100%;
			}
		}
	}

	&:hover {
		border-style: solid;
		.ctas {
			display: flex;
		}
	}

	svg {
		:deep(polygon) {
			fill: var(--color-text-fade);
		}
	}
}
</style>