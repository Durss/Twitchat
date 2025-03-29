<template>
	<div class="triggeractionbingogridentry triggerActionForm">
		<template v-if="param_grid.listValues!.length > 0">
			<ParamItem :paramData="param_grid" @change="onSelectGrid" v-model="action.bingoGrid.grid" />
			<ParamItem :paramData="param_action" v-model="action.bingoGrid.action" />
			<div class="card-item subEntries" v-if="isCellAction">
				<SwitchButton v-model="action.bingoGrid.cellActionMode"
				:values="['id', 'coords']"
				:labels="[$t('triggers.actions.bingoGrid.param_cell_id'),$t('triggers.actions.bingoGrid.param_cell_coordinates')]"></SwitchButton>
				<template v-if="action.bingoGrid.cellActionMode == 'coords'">
					<ParamItem :paramData="param_x" v-model="action.bingoGrid.x" noBackground />
					<ParamItem :paramData="param_y" v-model="action.bingoGrid.y" noBackground />
				</template>
				<template v-if="action.bingoGrid.cellActionMode == 'id'">
					<ParamItem :paramData="param_cellId" v-model="action.bingoGrid.cellId" noBackground />
				</template>
			</div>
			<ParamItem :paramData="param_name" v-model="action.bingoGrid.label" v-if="action.bingoGrid.action == 'rename' || action.bingoGrid.action == 'add_cell'" />
		</template>
		<div v-else class="info alert">
			<p>{{ $t("triggers.actions.bingoGrid.no_grid") }}</p>
			<TTButton light alert small @click="createGrid()">{{ $t("bingo_grid.form.add_bt") }}</TTButton>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import { ParamItem } from '@/components/params/ParamItem.vue';
import type { ITriggerPlaceholder, TriggerActionBingoGridData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TTButton from '@/components/TTButton.vue';
import SwitchButton from '@/components/SwitchButton.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		SwitchButton,
	},
	emits:[],
})
class TriggerActionBingoGridEntry extends AbstractTriggerActionEntry {

	public param_grid:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", icon:"bingo_grid", labelKey:"triggers.actions.bingoGrid.param_grid" };
	public param_action:TwitchatDataTypes.ParameterData<TriggerActionBingoGridData["bingoGrid"]["action"], TriggerActionBingoGridData["bingoGrid"]["action"]> = { type:"list", value:"tick", icon:"click", labelKey:"triggers.actions.bingoGrid.param_action" };
	public param_x:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, min:1, max:10, icon:"coord_x", labelKey:"triggers.actions.bingoGrid.param_x" };
	public param_y:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, min:1, max:10, icon:"coord_y", labelKey:"triggers.actions.bingoGrid.param_y" };
	public param_name:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"label", labelKey:"triggers.actions.bingoGrid.param_name" };
	public param_cellId:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", icon:"bingo_grid", labelKey:"triggers.actions.bingoGrid.param_cell" };

	@Prop
	declare action:TriggerActionBingoGridData;

	@Prop
	declare triggerData:TriggerData;

	public get isCellAction():boolean {
		return this.action.bingoGrid.action == "tick"
			|| this.action.bingoGrid.action == "untick"
			|| this.action.bingoGrid.action == "toggle"
			|| this.action.bingoGrid.action == "rename";
	}

	public beforeMount():void {
		if(!this.action.bingoGrid) {
			this.action.bingoGrid = {
				action:"tick",
				cellActionMode:"id",
				x:1,
				y:1,
				grid:"",
				label:"",
				cellId:"",
			}
		}

		this.param_grid.listValues = this.$store.bingoGrid.gridList.map(g => {
			return {
				value:g.id,
				label:(g.title ?? "")+" ("+g.cols+"x"+g.rows+")",
				disabled:!g.enabled
			}
		});

		this.param_action.listValues = [
			{value:"tick", labelKey:"triggers.actions.bingoGrid.param_action_tick"},
			{value:"untick", labelKey:"triggers.actions.bingoGrid.param_action_untick"},
			{value:"toggle", labelKey:"triggers.actions.bingoGrid.param_action_toggle"},
			{value:"tick_all", labelKey:"triggers.actions.bingoGrid.param_action_tick_all"},
			{value:"untick_all", labelKey:"triggers.actions.bingoGrid.param_action_untick_all"},
			{value:"rename", labelKey:"triggers.actions.bingoGrid.param_action_rename"},
			{value:"add_cell", labelKey:"triggers.actions.bingoGrid.param_action_add_cell"},
			{value:"shuffle", labelKey:"triggers.actions.bingoGrid.param_action_shuffle"},
		];
	}

	public mounted():void {
		this.onSelectGrid();
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_x.placeholderList = list.filter(v => v.numberParsable === true);
		this.param_y.placeholderList = list.filter(v => v.numberParsable === true);
		this.param_name.placeholderList = list;
	}

	/**
	 * Called when selecting a grid
	 */
	public onSelectGrid():void {
		// this.message_conf.placeholderList = list;
		const grid = this.$store.bingoGrid.gridList.find(g => g.id == this.param_grid.value);
		if(grid) {
			this.param_x.max = grid.cols;
			this.param_y.max = grid.rows;
			this.param_cellId.listValues = grid.entries.concat(grid.additionalEntries || []).map(cell => {
				return {
					value:cell.id,
					label:cell.label ?? ""
				}
			});
		}
	}

	/**
	 * Redirect to grid creation form
	 */
	public createGrid():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.BINGO_GRID);
	}

}
export default toNative(TriggerActionBingoGridEntry);
</script>

<style scoped lang="less">
.triggeractionbingogridentry{
	.subEntries {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
