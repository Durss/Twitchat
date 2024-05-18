<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<ClearButton :aria-label="$t('global.close')" @click="close()" />

			<h1 class="title"><Icon name="bingo_grid" class="icon" />{{ $t("bingo_grid.form.title") }}</h1>

			<div class="description">{{ $t("bingo_grid.form.description") }}</div>
		</div>

		<div class="content">
			<TTButton @click="addGrid()" icon="add">{{ $t("bingo_grid.form.add_bt") }}</TTButton>

			<ToggleBlock v-for="bingo in $store.bingoGrid.gridList" :title="bingo.title"
			editableTitle
			v-model:title="bingo.title"
			:titleDefault="$t('bingo_grid.form.default_title')"
			:open="false"
			:key="bingo.id">

				<template #right_actions>
					<div class="rightActions">
						<TTButton @click.stop="$store.bingoGrid.removeGrid(bingo.id)" icon="trash" alert />
					</div>
				</template>

				<div class="form">
					<ParamItem :paramData="param_rows[bingo.id]" v-model="bingo.rows" @change="save(bingo)" />
					<ParamItem :paramData="param_cols[bingo.id]" v-model="bingo.cols" @change="save(bingo)" />
					<VueDraggable
					class="card-item entryList"
					v-model="bingo.entries"
					:group="'bingoGridEntries_'+bingo.id"
					item-key="id"
					tag="transition-group"
					:component-data="{
						tag: 'div',
						name: !isDragging ? 'flip-list' : null
					}"
					filter=".locked"
					@start="onSortStart(bingo)"
					@end="onSortEnd(bingo)"
					:animation="250">
						<TransitionGroup name="flip-list">
							<div v-for="element in bingo.entries"
							:key="element.id"
							:class="getEntryClasses(element)"
							:style="{width:'calc('+(1/bingo.cols*100)+'% - 3px)'}"
							@click="focusLabel(element.id)">
								<contenteditable class="cell" tag="div"
									v-model="element.label"
									:contenteditable="true"
									:no-html="true"
									:no-nl="false"
									:ref="'label_'+element.id"
									@blur="save(bingo)"
									@input="limitLabelSize(element)" />
								<ClearButton class="lockBt"
									v-tooltip="$t('bingo_grid.form.lock_bt_tt')"
									:icon="element.lock? 'lock' : 'unlock'"
									@click.stop="element.lock = !element.lock"></ClearButton>
							</div>
						</TransitionGroup>

						<div class="footer">
							<TTButton @click="shuffleEntries(bingo)" icon="dice">{{ $t("bingo_grid.form.shuffle_bt") }}</TTButton>
						</div>
					</VueDraggable>

					<ToggleBlock :icons="['obs']" :title="$t('bingo_grid.form.install_title')" :open="false" noArrow>
						<OverlayInstaller type="bingoGrid" :id="bingo.id" />
					</ToggleBlock>
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import { type TriggerActionBingoGridData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import contenteditable from 'vue-contenteditable';
import { VueDraggable } from 'vue-draggable-plus'
import ClearButton from '../ClearButton.vue';
import Utils from '@/utils/Utils';
import OverlayInstaller from '../params/contents/overlays/OverlayInstaller.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ClearButton,
		ToggleBlock,
		VueDraggable,
		PostOnChatParam,
		contenteditable,
		OverlayInstaller,
	},
	emits:["close"]
})
 class BingoGridForm extends AbstractSidePanel {


	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionBingoGridData;

	@Prop
	public triggerData!:TriggerData;

	public param_cols:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_rows:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public isDragging:boolean = false;

	private lockedItems:{[key:string]:{index:number, data:TwitchatDataTypes.BingoGridConfig["entries"][number]}[]} = {};

	public getEntryClasses(col:TwitchatDataTypes.BingoGridConfig["entries"][number]) {
		let res:string[] = ["entry"];
		if(col.lock) res.push("locked");
		return res;
	}

	public get classes():string[] {
		const res = ["bingoform", "sidePanel"];
		if(this.triggerMode !== false) res.push("embedMode");
		return res;
	}

	public async beforeMount():Promise<void> {
		this.$store.bingoGrid.gridList.forEach(v=> {
			this.initParams(v.id);
		})
	}

	public mounted(): void {
		if(!this.triggerMode) {
			super.open();
		}
	}

	/**
	 * Save
	 */
	public save(grid:TwitchatDataTypes.BingoGridConfig):void {
		const count = grid.cols*grid.rows;
		grid.entries = grid.entries.splice(0, count);
		while(grid.entries.length < count) {
			grid.entries.push({
				id:Utils.getUUID(),
				label:"",
				lock:false,
			})
		}
		this.$store.bingoGrid.saveData();
	}

	/**
	 * Called when any value is changed
	 */
	public onValueChange():void {
		if(this.action) {
			// this.action.bingoGridData = this.finalData;
		}
	}

	/**
	 * Create a new grid
	 */
	public addGrid():void {
		const grid = this.$store.bingoGrid.addGrid();
		this.initParams(grid.id);
	}

	/**
	 * Shuffle current entries
	 */
	public shuffleEntries(grid:TwitchatDataTypes.BingoGridConfig):void {
		const entries = grid.entries;
		for (let i = entries.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			if(entries[i].lock || entries[j].lock) continue;
			[entries[i], entries[j]] = [entries[j], entries[i]];
		}
	}

	/**
	 * Limit the size of the label.
	 * Can't use maxLength because it's a content-editable tag.
	 * @param item
	 */
	public async limitLabelSize(entry:TwitchatDataTypes.BingoGridConfig["entries"][0]):Promise<void> {
		const maxLength = 60;
		const sel = window.getSelection();
		if(sel && sel.rangeCount > 0) {
			//Save caret index
			var range = sel.getRangeAt(0);
			let caretIndex = range.startOffset;
			await this.$nextTick();
			//Limit label's size
			entry.label = entry.label.substring(0, maxLength);
			await this.$nextTick();

			//Reset caret to previous position
			if(range.startContainer.firstChild) range.setStart(range.startContainer.firstChild, Math.min(entry.label.length, caretIndex-1));
		}else{
			entry.label = entry.label.substring(0, maxLength);
		}
	}

	/**
	 * Called after sorting items
	 */
	public onSortEnd(grid:TwitchatDataTypes.BingoGridConfig):void {
		this.isDragging = false;
		let items = grid.entries.filter(v=>v.lock !== true);
		this.lockedItems[grid.id].forEach(item => {
			items.splice(item.index, 0, item.data);
		})
		grid.entries = items;
		this.save(grid);
	}

	/**
	 * Called when starting to sort items
	 */
	public onSortStart(grid:TwitchatDataTypes.BingoGridConfig):void {
		this.isDragging = true;
		const entries = grid.entries;
		this.lockedItems[grid.id] = [];
		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			if(entry.lock === true) {
				this.lockedItems[grid.id].push({
					index:i,
					data:entry,
				})
			}
		}
	}

	/**
	 * Called when clicking a cell to reroute focus to editable element
	 */
	public focusLabel(id:string):void {
		((this.$refs["label_"+id] as Vue[])[0].$el as HTMLElement).focus();
	}

	/**
	 * Create parameters for a bingo entry
	 * @param id
	 */
	private initParams(id:string):void {
		this.param_cols[id] = {type:"number", icon:"cols", value:5, min:2, max:10, labelKey:"bingo_grid.form.param_cols"};
		this.param_rows[id] = {type:"number", icon:"rows", value:5, min:2, max:10, labelKey:"bingo_grid.form.param_rows"};
	}
}
export default toNative(BingoGridForm);
</script>

<style scoped lang="less">
.bingoform{
	.entryList {
		width: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 3px;
		.entry {
			display: block;
			aspect-ratio: 1/1;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			background-color: var(--grayout-fader);
			border-radius: var(--border-radius);
			position: relative;
			&.highlight {
				border: 2px solid red;
			}
			.cell {
				text-align: center;
				width: 100%;
			}
			.lockBt {
				position: absolute;
				top:0;
				right:0;
				padding: .25em;
				display: none;
				&:hover {
					background-color: var(--background-color-fader);
					border-bottom-left-radius: var(--border-radius);
				}
			}
			&:hover {
				.lockBt {
					display: block;
				}
			}

			&.locked {
				outline: 1px solid var(--color-secondary-fader);
			}
		}
	}

	.footer {
		display: flex;
		flex-direction: column;
		margin-top: .5em;
		width: 100%;
		align-items: center;
	}


	.flip-list-move {
		transition: transform .25s;
	}

	.rightActions {
		gap: .25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-shrink: 0;
		.button {
			margin: -.5em 0;
			align-self: stretch;
			border-radius: 0;
			flex-shrink: 0;
		}
	}
}
</style>, { ToggleBlock }
