<template>
	<div :class="classes">
		<div class="head" v-if="embedMode === false">
			<ClearButton :aria-label="$t('global.close')" @click="close()" />

			<h1 class="title"><Icon name="bingo_grid" class="icon" />{{ $t("bingo_grid.form.title") }}</h1>

			<div class="description">{{ $t("bingo_grid.form.description") }}</div>
		</div>

		<div class="content">
			<div class="createForm">
				<TTButton class="addBt"
				v-if="$store.auth.isPremium || $store.bingoGrid.gridList.length < $config.MAX_BINGO_GRIDS"
				@click="addGrid()" icon="add">{{ $t("bingo_grid.form.add_bt") }}</TTButton>

				<div class="card-item secondary" v-else-if="$store.auth.isPremium && $store.bingoGrid.gridList.length > $config.MAX_BINGO_GRIDS_PREMIUM">{{ $t("bingo_grid.form.premium_limit") }}</div>

				<div class="premium" v-else>
					<div>{{ $t("bingo_grid.form.non_premium_limit", {MAX:$config.MAX_BINGO_GRIDS_PREMIUM}) }}</div>
					<TTButton icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</TTButton>
				</div>
			</div>

			<ToggleBlock v-for="bingo in $store.bingoGrid.gridList"
			editableTitle
			v-model:title="bingo.title"
			:titleDefault="$t('bingo_grid.form.default_title')"
			:titleMaxLengh="30"
			:open="false"
			:key="bingo.id"
			@update:title="save(bingo)">

				<template #left_actions>
					<div class="leftActions">
						<ToggleButton v-model="bingo.enabled" @click.native.stop @change="save(bingo)" v-if="$store.auth.isPremium || bingo.enabled || $store.bingoGrid.gridList.filter(v=>v.enabled).length < $config.MAX_BINGO_GRIDS" />
					</div>
				</template>

				<template #right_actions>
					<div class="rightActions">
						<TTButton @click.stop="duplicateGrid(bingo.id)" icon="copy" v-tooltip="$t('global.duplicate')" v-if="!maxGridReached" />
						<TTButton @click.stop="$store.bingoGrid.removeGrid(bingo.id)" icon="trash" alert />
					</div>
				</template>

				<div class="form">
					<div class="card-item install">
						<label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
						<OverlayInstaller type="bingogrid" :sourceSuffix="bingo.title" :id="bingo.id" :queryParams="{bid:bingo.id}" :sourceTransform="{width:960, height:540}" />
					</div>

					<div class="card-item share">
						<label>
							<Icon name="share"/>
							<span>{{ $t("bingo_grid.form.share") }}</span>
						</label>
						<p class="url" v-click2Select>{{ getPublicURL(bingo.id) }}</p>
					</div>

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

					<ParamItem :paramData="param_showGrid[bingo.id]" v-model="bingo.showGrid" @change="save(bingo)" />

					<ParamItem :paramData="param_backgroundColor[bingo.id]" v-model="bingo.backgroundColor" @change="save(bingo)" />

					<ParamItem :paramData="param_backgroundAlpha[bingo.id]" v-model="bingo.backgroundAlpha" @change="save(bingo)" />

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

					<ParamItem :paramData="param_chatCmd_toggle[bingo.id]" @change="save(bingo)">
						<div class="parameter-child">
							<ParamItem class="cmdField" :paramData="param_chatCmd[bingo.id]" v-model="bingo.chatCmd" @change="save(bingo)" noBackground />
							<div class="instructions">
								<Icon name="info" />
								<i18n-t scope="global" keypath="bingo_grid.form.chat_cmd_usage">
									<template #CMD>
										<mark>{{ bingo.chatCmd }} X:Y</mark>
									</template>
								</i18n-t>
							</div>
							<ToggleBlock :icons="['lock_fit']" :title="$t('global.allowed_users')" small :open="false">
								<PermissionsForm v-model="bingo.chatCmdPermissions"></PermissionsForm>
							</ToggleBlock>
						</div>
					</ParamItem>

					<ParamItem :paramData="param_heat_toggle[bingo.id]" v-model="bingo.heatClick" @change="save(bingo)">
						<div class="parameter-child">
							<div class="instructions">
								<Icon name="info" />
								<span>{{ $t("bingo_grid.form.heat_usage") }}</span>
							</div>

							<TTButton class="heatButton" icon="heat" @click="openHeatParams()" secondary small>{{ $t("overlay.heatDistort.install_heat_link") }}</TTButton>

							<ToggleBlock :icons="['lock_fit']" :title="$t('global.allowed_users')" small :open="false">
								<PermissionsForm v-model="bingo.heatClickPermissions"></PermissionsForm>
							</ToggleBlock>
						</div>
					</ParamItem>
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import { type TriggerActionBingoGridData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
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
import PermissionsForm from '../PermissionsForm.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ClearButton,
		ToggleBlock,
		VueDraggable,
		ToggleButton,
		PermissionsForm,
		PostOnChatParam,
		contenteditable,
		OverlayInstaller,
	},
	emits:["close"]
})
 class BingoGridForm extends AbstractSidePanel {

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionBingoGridData;

	@Prop
	public triggerData!:TriggerData;

	@Prop({type:Boolean, default:false})
	public embedMode!:boolean;

	public param_cols:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_rows:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_backgroundColor:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_backgroundAlpha:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_textColor:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_textSize:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_showGrid:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_chatCmd:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_chatCmd_toggle:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_heat_toggle:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public isDragging:boolean = false;

	private lockedItems:{[key:string]:{index:number, data:TwitchatDataTypes.BingoGridConfig["entries"][number]}[]} = {};

	public getEntryClasses(col:TwitchatDataTypes.BingoGridConfig["entries"][number]) {
		let res:string[] = ["entry"];
		if(col.lock) res.push("locked");
		return res;
	}

	public get classes():string[] {
		const res = ["bingoform", "sidePanel"];
		if(this.embedMode !== false) res.push("embedMode");
		return res;
	}

	public get maxGridReached():boolean {
		if(this.$store.auth.isPremium) {
			return this.$store.bingoGrid.gridList.length >= this.$config.MAX_BINGO_GRIDS_PREMIUM;
		}else{
			return this.$store.bingoGrid.gridList.length >= this.$config.MAX_BINGO_GRIDS;
		}
	}

	public getPublicURL(gridId:string):string {
		const uid = this.$store.auth.twitch.user.id;

		return document.location.origin + this.$router.resolve({name:"bingo_grid_public", params:{uid, gridId}}).fullPath;
	}

	public async beforeMount():Promise<void> {
		this.initParams();
	}

	public mounted(): void {
		if(this.embedMode == false) {
			super.open();
		}
	}

	/**
	 * Save
	 */
	public save(grid:TwitchatDataTypes.BingoGridConfig):void {
		if(this.param_chatCmd_toggle[grid.id].value && !grid.chatCmd) {
			grid.chatCmd = "!bingo";
		}
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
	 * Opens the premium section
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
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
	 * Open heat params
	 */
	public openHeatParams():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.HEAT);
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
			this.param_backgroundColor[id] = {type:"color", value:"#000000", labelKey:"bingo_grid.form.param_background_color", icon:"color"};
			this.param_backgroundAlpha[id] = {type:"slider", value:0, min:0, max:100, labelKey:"bingo_grid.form.param_background_alpha", icon:"color"};
			this.param_textSize[id] = {type:"number", value:30, min:2, max:100, labelKey:"bingo_grid.form.param_text_size", icon:"fontSize"};
			this.param_textColor[id] = {type:"color", value:"#000000", labelKey:"bingo_grid.form.param_text_color", icon:"color"};
			this.param_showGrid[id] = {type:"boolean", value:true, labelKey:"bingo_grid.form.param_show_grid", icon:"show"};
			this.param_chatCmd[id] = {type:"string", value:"", maxLength:20, labelKey:"bingo_grid.form.param_chat_cmd", icon:"chatCommand"};
			this.param_chatCmd_toggle[id] = {type:"boolean", value:entry.chatCmd != undefined, labelKey:"bingo_grid.form.param_chat_cmd_enabled", icon:"show"};
			this.param_heat_toggle[id] = {type:"boolean", value:false, labelKey:"bingo_grid.form.param_heat_enabled", icon:"heat"};
		});
	}
}
export default toNative(BingoGridForm);
</script>

<style scoped lang="less">
.bingoform{
	min-width: 330px !important;

	.form {
		gap: .5em;
	}
	
	.createForm {
		text-align: center;
		.premium {
			background-color: var(--color-premium);
			border-radius: var(--border-radius);
			padding: .5em;
			.button {
				margin-top: .5em;
			}
		}
	}

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
			cursor: text;
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

	.sizes, .install, .share {
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
		&.install, &.share {
			flex-direction: column;
		}

		.url {
			background-color: var(--grayout);
			padding: .25em;
			border-radius: var(--border-radius);
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

	.parameter-child {
		gap: .25em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}

	.cmdField {
		:deep(.inputHolder) {
			flex-basis: 200px;
		}
	}

	.heatButton {
		margin: auto;
	}
}
</style>