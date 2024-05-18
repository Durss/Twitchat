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

				<template #left_actions>
					<div class="leftActions">
						<ToggleButton v-model="bingo.enabled" @click.native.stop />
					</div>
				</template>

				<template #right_actions>
					<div class="rightActions">
						<TTButton @click.stop="duplicateGrid(bingo.id)" icon="copy" v-tooltip="$t('global.duplicate')" />
						<TTButton @click.stop="$store.bingoGrid.removeGrid(bingo.id)" icon="trash" alert />
					</div>
				</template>

				<div class="form">
					<ToggleBlock :icons="['obs']" :title="$t('bingo_grid.form.install_title')" :open="false" primary>
						<OverlayInstaller type="bingogrid" :id="bingo.id" :queryParams="{bid:bingo.id}" />
					</ToggleBlock>

					<div class="card-item sizes">
						<label>
							<Icon name="scale"/>
							<span>{{ $t("bingo_grid.form.param_size") }}</span>
						</label>
						<div class="forms">
							<ParamItem :paramData="param_cols[bingo.id]" v-model="bingo.cols" @change="save(bingo)" noBackground />
							<Icon name="cross"/>
							<ParamItem :paramData="param_rows[bingo.id]" v-model="bingo.rows" @change="save(bingo)" noBackground />
						</div>
					</div>

					<ParamItem :paramData="param_textColor[bingo.id]" v-model="bingo.textColor" @change="save(bingo)" />

					<ParamItem :paramData="param_textSize[bingo.id]" v-model="bingo.textSize" @change="save(bingo)" />

					<VueDraggable
					class="card-item entryList"
					v-model="bingo.entries"
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

								<ClearButton class="moveBt" icon="move" v-if="!element.lock"></ClearButton>
							</div>
						</TransitionGroup>

						<div class="ctas">
							<TTButton @click="$store.bingoGrid.shuffleGrid(bingo.id)" icon="dice">{{ $t("bingo_grid.form.shuffle_bt") }}</TTButton>
							<TTButton @click="$store.bingoGrid.resetLabels(bingo.id)" icon="trash">{{ $t("bingo_grid.form.reset_bt") }}</TTButton>
						</div>
					</VueDraggable>
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import { type TriggerActionBingoGridData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import contenteditable from 'vue-contenteditable';
import { VueDraggable } from 'vue-draggable-plus';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import TTButton from '../TTButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ToggleButton from '../ToggleButton.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import OverlayInstaller from '../params/contents/overlays/OverlayInstaller.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ClearButton,
		ToggleBlock,
		VueDraggable,
		ToggleButton,
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
	public param_textColor:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_textSize:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
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
		this.initParams();
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
		this.$store.bingoGrid.saveData(grid.id);
	}

	/**
	 * Create a new grid
	 */
	public addGrid():void {
		const grid = this.$store.bingoGrid.addGrid();
		this.initParams();
	}

	/**
	 * Duplicate given grid ID
	 */
	public duplicateGrid(id:string):void {
		this.$store.bingoGrid.duplicateGrid(id)
		this.initParams();
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
			// if(range.endContainer instanceof HTMLElement) {
			// 	range.endContainer.innerText
			// }
			if(caretIndex > 0 && range.startContainer.firstChild) range.setStart(range.startContainer.firstChild, Math.min(entry.label.length-1, caretIndex-1));
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
	private initParams():void {
		this.$store.bingoGrid.gridList.forEach(entry=> {
			const id = entry.id;
			if(this.param_cols[id]) return;
			this.param_cols[id] = {type:"number", value:5, min:2, max:10};
			this.param_rows[id] = {type:"number", value:5, min:2, max:10};
			this.param_textSize[id] = {type:"number", value:20, min:2, max:100, labelKey:"bingo_grid.form.param_text_size", icon:"fontSize"};
			this.param_textColor[id] = {type:"color", value:"#000000", labelKey:"bingo_grid.form.param_text_color", icon:"color"};
		});
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
			.moveBt {
				position: absolute;
				top:0;
				left:0;
				right:auto;
				padding: .25em;
				display: none;
				&:hover {
					background-color: var(--background-color-fader);
					border-bottom-right-radius: var(--border-radius);
				}
			}
			&:hover {
				.lockBt, .moveBt {
					display: block;
				}
			}

			&.locked {
				outline: 1px solid var(--color-secondary-fader);
			}
		}
	}

	.sizes {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		.icon {
			height: 1em;
		}
		label {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
		.forms {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
	}

	.ctas {
		gap:.5em;
		display: flex;
		flex-direction: column;
		margin-top: .5em;
		width: 100%;
		align-items: center;
	}

	.flip-list-move {
		transition: transform .25s;
	}

	.leftActions {
		align-self: stretch;
	}

	.rightActions, .leftActions {
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
			padding: 0 .5em;
		}
	}
}
</style>
