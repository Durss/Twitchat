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
	@sort="onChange"
	@change="onChange">
		<template #item="{element, index}:{element:TriggerListEntry|TriggerListFolderEntry, index:number}">
			<ToggleBlock class="folder" v-if="element.type == 'folder'"
			editableTitle medium
			v-model:title="element.label"
			:ref="'folder_'+element.id"
			:open="false"
			:icons="['folder']"
			:titleDefault="'folder'"
			@update:title="$emit('change', $event)"
			@dragover="onRollover('folder_'+element.id)"
			@dragleave="onRollout('folder_'+element.id)">
				<template #right_actions>
					<div class="blockActions">
						<ToggleButton class="triggerToggle" v-model="element.enabled" />
						<TTButton class="deleteBt" icon="trash" @click.stop="deleteFolder(element)" alert></TTButton>
					</div>
				</template>

				<div :class="element.enabled === false? 'childList disabled' : 'childList'">
					<TriggerListFolderItem
						:class="!element.items || element.items.length == 0? 'emptyChildren' : ''"
						v-model:items="element.items"
						:level="level + 1"
						:rewards="rewards"
						:noEdit="noEdit"
						:debugMode="debugMode"
						:triggerId="triggerId"
						@change="onChange"
						@changeState="$emit('changeState', element)"
						@delete="$emit('delete', $event)"
						@duplicate="$emit('duplicate', $event)"
						@testTrigger="$emit('testTrigger',$event)"
						@select="$emit('select', $event)" />
	
					<div v-if="!element.items || element.items.length == 0" class="emptyFolder">{{$t("global.empty")}}</div>
				</div>
				
			</ToggleBlock>

			<TriggerListItem v-else
				:noEdit="noEdit"
				:entryData="element"
				@changeState="$emit('changeState', element)"
				@delete="$emit('delete', $event)"
				@duplicate="$emit('duplicate', $event)"
				@testTrigger="$emit('testTrigger',$event)"
				@select="$emit('select', $event)">
					<span class="triggerId" v-if="debugMode" v-click2Select
					@click.stop="">{{ element.trigger.id }}</span>
			</TriggerListItem>
		</template>
	</draggable>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerListItem from './TriggerListItem.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TriggerListEntry, TriggerListFolderEntry } from './TriggerList.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import draggable from 'vuedraggable';
import { watch } from 'vue';
import TTButton from '@/components/TTButton.vue';

@Component({
	name:"TriggerListFolderItem",
	components:{
		TTButton,
		draggable,
		ToggleBlock,
		ToggleButton,
		TriggerListItem,
	},
	emits:["update:items","change","changeState","delete","duplicate","testTrigger","select"],
})
export default class TriggerListFolderItem extends Vue {

	@Prop({default:[]})
	public rewards!:TwitchDataTypes.Reward[];

	@Prop({default:false})
	public noEdit!:boolean;

	@Prop({default:false})
	public debugMode!:boolean;

	@Prop({default:null})
	public triggerId!:string|null;

	@Prop({default:null})
	public items!:(TriggerListEntry|TriggerListFolderEntry)[];
	
	@Prop({default:0})
	public level!:number;

	public localItems:(TriggerListEntry|TriggerListFolderEntry)[] = [];
	public lastHovered:string = "";

	private refToOpenTimeout:{[key:string]:number} = {};

	public beforeMount():void {
		this.localItems = this.items;
		watch(()=>this.items, ()=> this.localItems = this.items);
	}

	public onChange(e?:{moved:{element:TriggerListEntry|TriggerListFolderEntry}, newIndex:number, oldIndex:number}):void {
		this.$emit('change', e);
		this.$emit("update:items", this.localItems);
	}

	/**
	 * Called when dragging over
	 * @param ref 
	 */
	public onRollover(ref:string):void {
		if(this.lastHovered != ref) {
			this.lastHovered = ref;
			clearTimeout(this.refToOpenTimeout[ref]);
			this.refToOpenTimeout[ref] = setTimeout(()=> {
				const block = this.$refs[ref] as ToggleBlock;
				if(block) block.localOpen = true;
				else console.warn("REF not found", ref);
				
			}, 500);
		}
	}

	public onRollout(ref:string):void {
		this.lastHovered = "";
		clearTimeout(this.refToOpenTimeout[ref]);
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

}
</script>

<style scoped lang="less">
.triggerlistfolderitem{
	display: flex;
	flex-direction: column;
	gap: 2px;

	.folder {
		margin: .25em 0;
		z-index: 998999;
	}

	.triggerId {
		.bevel();
		cursor: help !important;
		font-size: .8em;
		font-family: 'Courier New', Courier, monospace;
		opacity: .75;
		padding: 2px 5px;
		&::before {
			content: "ID: ";
			font-family: Inter;
			font-weight: bold;
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
		margin: calc(-.5em - 1px) 0;
	}
}
</style>