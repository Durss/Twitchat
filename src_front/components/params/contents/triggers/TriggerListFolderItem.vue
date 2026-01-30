<template>
	<draggable class="triggerlistfolderitem"
	:animation="250"
	group="trigger"
	item-key="id"
	tag="div"
	v-model="localItems"
	:invertSwap="true"
	:swapThreshold="10"
	:emptyInsertThreshold="0"
	:disabled="noEdit !== false"
	@start="dragging = true"
	@end="dragging = false; onChange($event)">
		<template #item="{element: folder, index}:{element:TriggerListEntry|TriggerListFolderEntry, index:number}">
			<ToggleBlock class="folder" v-if="folder.type == 'folder'"
			medium
			:editableTitle="!noEdit"
			v-model:title="folder.label"
			v-model:open="folder.expand"
			:customColor="folder.color.value"
			:ref="'folder_'+folder.id"
			:titleDefault="'folder'"
			@dragstart="startDrag(folder)"
			@drop="onDrop(folder)"
			@dragenter="onDragEnter($event, folder)"
			@dragleave="onDragLeave($event, folder)"
			@update:open="$emit('change', $event)"
			@update:title="$emit('change', $event)">
				<template #left_actions>
					<div class="blockActions">
						<ParamItem class="colorSelector"
							v-if="noEdit === false"
							@click.stop
							v-tooltip="$t('triggers.folder_color')"
							:paramData="folder.color"
							v-model="folder.color.value"
							@change="$emit('change', $event)" />
						<Icon name="broadcast" />
						<div class="count">x{{ countTriggerItems(folder) }}</div>
					</div>
				</template>
				<template #right_actions>
					<div class="blockActions" v-if="selectMode === false">
						<ToggleButton class="triggerToggle" v-model="folder.enabled" @click.stop @change="onToggleFolder(folder)" />
						<TTButton class="deleteBt" icon="add" v-if="noEdit === false" @click.stop="addTrigger(folder)" v-tooltip="$t('triggers.add_triggerBt')" primary></TTButton>
						<TTButton class="deleteBt" icon="trash" v-if="noEdit === false" @click.stop="deleteFolder(folder)" alert></TTButton>
					</div>
				</template>

				<div :class="folder.enabled === false && selectMode === false? 'childList disabled' : 'childList'">
					<TriggerListFolderItem
						:class="!folder.items || folder.items.length == 0? 'emptyChildren' : ''"
						v-model:items="folder.items"
						:level="level + 1"
						:rewards="rewards"
						:noEdit="noEdit"
						:selectMode="selectMode"
						:forceDisableOption="forceDisableOption"
						:triggerId="triggerId"
						@change="onChange"
						@changeState="onToggleTrigger(folder, $event)"
						@delete="$emit('delete', $event)"
						@duplicate="$emit('duplicate', $event, folder)"
						@testTrigger="$emit('testTrigger',$event)"
						@createTrigger="$emit('createTrigger',$event)"
						@select="$emit('select', $event)" />

					<div v-if="!folder.items || folder.items.length == 0" class="emptyFolder">{{$t("global.empty")}}</div>
				</div>

			</ToggleBlock>

			<TriggerListItem v-else
				:noEdit="noEdit"
				:selectMode="selectMode"
				:forceDisableOption="forceDisableOption"
				:entryData="folder"
				@dragstart="startDrag(folder)"
				@changeState="onToggleTrigger(folder, $event)"
				@delete="$emit('delete', $event)"
				@duplicate="$emit('duplicate', $event, folder)"
				@testTrigger="$emit('testTrigger',$event)"
				@select="$emit('select', $event)">
			</TriggerListItem>
		</template>
	</draggable>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { RoughEase } from 'gsap/EasePack';
import { Linear, gsap } from 'gsap/gsap-core';
import { watch, type ComponentPublicInstance } from 'vue';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import ParamItem from '../../ParamItem.vue';
import type { TriggerListEntry, TriggerListFolderEntry } from './TriggerList.vue';
import TriggerListItem from './TriggerListItem.vue';

@Component({
	name:"TriggerListFolderItem",
	components:{
		TTButton,
		draggable,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		TriggerListItem,
	},
	emits:["update:items","change","changeState","createTrigger","delete","duplicate","testTrigger","select"],
})
class TriggerListFolderItem extends Vue {

	@Prop({default:[]})
	public rewards!:TwitchDataTypes.Reward[];

	@Prop({default:false})
	public noEdit!:boolean;

	@Prop({default:false})
	public forceDisableOption!:boolean;

	@Prop({default:false})
	public selectMode!:boolean;

	@Prop({default:null})
	public triggerId!:string|null;

	@Prop({default:null})
	public items!:(TriggerListEntry|TriggerListFolderEntry)[];

	@Prop({default:0})
	public level!:number;

	public dragging:boolean = false;
	public localItems:(TriggerListEntry|TriggerListFolderEntry)[] = [];

	private draggedEntry:TriggerListEntry|TriggerListFolderEntry|null = null;
	public dragCounter:{[id:string]:number} = {};

	public beforeMount():void {
		this.localItems = this.items;
		watch(()=>this.items, ()=> this.localItems = this.items);
	}

	public onChange(e?:{moved:{element:TriggerListEntry|TriggerListFolderEntry}, newIndex:number, oldIndex:number}):void {
		this.$emit('change', e);
		this.$emit("update:items", this.localItems);
	}

	/**
	 * Called when clicking delete button on a folder
	 * @param id
	 */
	public async deleteFolder(folder:TriggerListFolderEntry):Promise<void> {
		if(folder.items.length > 0) {
			try {
				await this.$confirm(this.$t("triggers.delete_folder_confirm.title"), this.$t("triggers.delete_folder_confirm.desc"));
			}catch(error) {
				return;
			}
		}
		let index = this.localItems.findIndex(v=>v.id == folder.id);
		this.localItems.splice(index, 1);
		folder.items.forEach(v=> {
			this.localItems.splice(index, 0, v);
			index ++;
		});
		this.onChange();
	}

	/**
	 * Called when starting to drag an item
	 * @param entry
	 */
	public startDrag(entry:TriggerListEntry|TriggerListFolderEntry):void {
		this.draggedEntry = entry;
		this.dragCounter[entry.id] = 0;
	}

	/**
	 * Called when starting to drag an item
	 * @param entry
	 */
	public onDrop(folder:TriggerListFolderEntry):void {
		if(!this.dragging) return;
		if(!this.draggedEntry) return;
		if(this.draggedEntry == folder) return;
		this.items.splice(this.items.findIndex(v=>v.id == this.draggedEntry!.id), 1);
		folder.items.push(this.draggedEntry);
		this.draggedEntry = null;
	}

	public onDragEnter(event:MouseEvent, entry:TriggerListFolderEntry):void {
		if(this.draggedEntry == entry) return
		if(!this.dragging) return
		//Drag system is fucked up. It fires dragenter/leave event for every
		//single children of the holder unless we set a "pointer-events:none" to
		//it which I can't do because ToggleBlock contains many interactive
		//children.
		//We keep track of the number of over/leaved child to know if we're
		//still over the element or not
		if(!this.dragCounter[entry.id]) this.dragCounter[entry.id] = 0;
		this.dragCounter[entry.id]! ++;
		(event.currentTarget as HTMLElement).classList.add("over");
	}

	public onDragLeave(event:MouseEvent, entry:TriggerListFolderEntry):void {
		if(this.draggedEntry == entry) return;
		if(!this.dragCounter[entry.id]) this.dragCounter[entry.id] = 0;
		if(--this.dragCounter[entry.id]! < 1) {
			this.dragCounter[entry.id] = 0;
			(event.currentTarget as HTMLElement).classList.remove("over");
		}
	}

	/**
	 * Toggles a trigger state
	 * @param item
	 * @param el
	 */
	public onToggleTrigger(item:TriggerListEntry | TriggerListFolderEntry, el:HTMLElement):void {
		if(item.type == "trigger" && item.trigger.enabled
		&& !this.$store.auth.isPremium
		&& this.$store.triggers.triggerList.filter(v=>v.enabled !== false && this.$store.triggers.triggerIdToFolderEnabled[v.id] !== false).length > this.$config.MAX_TRIGGERS) {
			window.setTimeout(()=>{
				item.trigger.enabled = false;
			}, 350);
			this.vibrate(el);
		}else{
			this.$emit('change');
			this.$emit('changeState', item);
		}
	}

	/**
	 * Adds a trigger within the folder
	 */
	public addTrigger(folder:TriggerListFolderEntry):void {
		this.$emit('createTrigger', folder.id);
	}

	/**
	 * Enable/disable a folder
	 */
	public onToggleFolder(folder:TriggerListFolderEntry):void {
		//First emit to update storage
		this.$emit('change');

		//If there are too much items enabled, disable the folder
		if(folder.enabled
		&& !this.$store.auth.isPremium
		&& this.$store.triggers.triggerList.filter(v=>v.enabled !== false && this.$store.triggers.triggerIdToFolderEnabled[v.id] !== false).length > this.$config.MAX_TRIGGERS) {
			//Need to wait for animation to complete
			window.setTimeout(()=>{
				folder.enabled = false;
				//Emit the revert
				this.$emit('change');
			}, 200);
			this.vibrate((this.$refs["folder_" + folder.id] as ComponentPublicInstance).$el as HTMLElement);
		}
	}

	public countTriggerItems(folder:TriggerListFolderEntry):number {
		function parseFolder(folder:TriggerListFolderEntry):number {
			let count = 0;
			folder.items.forEach(v=>{
				if(v.type == 'trigger') count ++;
				if(v.type == 'folder') count += parseFolder(v);
			});
			return count;
		}
		return parseFolder(folder);
	}

	private vibrate(el:HTMLElement):void {
		window.setTimeout(()=>{
			gsap.fromTo(el, {backgroundColor:"rgba(255,0,0,1)"}, {duration:.5, backgroundColor:"rgba(255,0,0,0)" , clearProps:"background-color"})
			gsap.fromTo(el, {x:-5}, {duration:.25, x:5, ease:RoughEase.ease.config({strength:8, points:20, template:Linear.easeNone, randomize:false}) , clearProps:"x"})
		}, 150);

	}

}
export default toNative(TriggerListFolderItem);
</script>

<style scoped lang="less">
.triggerlistfolderitem{
	display: flex;
	flex-direction: column;
	gap: 2px;

	.folder {
		margin: .25em 0;
		z-index: 998999;
		&.over {
			outline: 2px solid var(--color-secondary);
		}
	}

	.triggerToggle {
		align-self: center;
	}

	.childList {
		position: relative;
		.emptyFolder {
			text-align: center;
			font-style: italic;
			position: absolute;
			top:50%;
			transform: translateY(-50%);
			width: 100%;
			pointer-events: none;
			z-index: -1;
		}
		.emptyChildren {
			// padding: .5em;
			min-height: 1em;
		}
		:deep(.sortable-ghost) {
			background-color: var(--toggle-block-header-background-hover);
		}
		.triggerlistitem {
			transition: opacity .5s;
		}
		&.disabled {
			.triggerlistitem {
				opacity: .5;
			}
		}
	}
	.blockActions {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-self: stretch;
		align-items: center;
		z-index: 1;
		&>.icon {
			height: 1em;
		}
		.count {
			font-style: italic;
		}
		.colorSelector {
			padding: 0;
			height: 100%;
			width: 1em;
			margin-left: -.5em;
			box-shadow: 2px 0 2px rgba(0, 0, 0, .2);
			:deep(.content) {
				height: 100%;
				.holder, .inputHolder {
					border-radius: 0;
					align-self: stretch;
					height: 100%;
				}
			}
		}
		.deleteBt{
			height: 100%;
			border-radius: 0;
		}
	}
}
</style>
