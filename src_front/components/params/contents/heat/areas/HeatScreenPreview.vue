<template>
	<div :class="classes">
		<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
			<polygon v-for="area in polygons" :points="area.svgData" :class="getAreaClasses(area.id)" @click="$emit('select', area.id)" />
		</svg>
		
		<div class="obsSceneName" v-if="screen.activeOBSScene"><Icon name="obs" />{{ screen.activeOBSScene }}</div>

		<div class="enableBt" v-if="selectAreaMode === false && canEnable">
			<ToggleButton v-model="screen.enabled" @click.stop @change="$emit('update')" :alert="!screen.enabled" />
		</div>
		
		<div class="ctas" v-if="selectAreaMode === false && renderOnly == false">
			<button v-tooltip="$t('global.edit')"><Icon name="edit" theme="primary"/></button>
			<button @click.stop="$emit('duplicate', screen.id)" v-tooltip="$t('global.duplicate')" v-if="canDuplicate !== false"><Icon name="copy" theme="primary"/></button>
			<button @click.stop="$emit('delete', screen.id)" v-tooltip="$t('global.delete')"><Icon name="trash" theme="alert"/></button>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import type { HeatScreen } from '@/types/HeatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		ToggleButton,
	},
	emits:["delete", "duplicate", "update", "select"],
})
class HeatScreenPreview extends Vue {

	@Prop
	public screen!:HeatScreen;

	@Prop({default:false})
	public selectAreaMode!:boolean;

	@Prop({default:[]})
	public selectedAreas!:string[];

	@Prop({default:false, type:Boolean})
	public canDuplicate!:boolean;

	@Prop({default:false, type:Boolean})
	public renderOnly!:boolean;

	public get classes():string[] {
		const res = ["heatscreenpreview"];
		if(this.selectAreaMode === false && this.renderOnly === false) res.push("noSelect");
		if(!this.screen.enabled) res.push("disabled");
		return res;
	}

	public get canEnable():boolean {
		if(this.renderOnly !== false) return false;
		let max = this.$config.MAX_CUSTOM_HEAT_SCREENS;
		if(this.$store.auth.isPremium) max = this.$config.MAX_CUSTOM_HEAT_SCREENS_PREMIUM;
		return this.$store.heat.screenList.filter(v=>v.enabled).length < max || this.screen.enabled != false;
	}
	
	public get polygons():{id:string, svgData:string}[] {
		if(!this.screen) return [];
		return this.screen.areas.map(v=> {
			return {
				id:v.id,
				svgData:v.points.map(w => (w.x * 1920)+","+(w.y * 1080)).join(",")
			}
		});
	}

	public getAreaClasses(areaID:string):string[] {
		const res:string[] = [];
		if(this.selectedAreas.indexOf(areaID) > -1) res.push("selected");
		return res;
	}

}
export default toNative(HeatScreenPreview);
</script>

<style scoped lang="less">
.heatscreenpreview{
	position: relative;
	border-radius: var(--border-radius);
	border: 1px dashed var(--color-primary);
	background-color: var(--color-primary-fadest);
	overflow: hidden;

	.obsSceneName {
		position: absolute;
		bottom: 0;
		left: 0;
		filter: drop-shadow(1px 1px 1px var(--color-text-inverse)) drop-shadow(-1px -1px 1px var(--color-text-inverse));

		.icon {
			height: 1em;
			width: 1em;
			margin-right: .25em;
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
			stroke: var(--color-primary-light);
			stroke-width: 1rem;
			stroke-dasharray: 4rem;
			opacity: .6;
			&:hover {
				fill: transparent;
				stroke: var(--color-primary-light);
				stroke-width: 1rem;
				stroke-dasharray: 4rem;
				opacity: 1;
				stroke: var(--color-text);
				stroke-width: 1rem;
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