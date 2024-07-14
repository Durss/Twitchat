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
	:disabled="noEdit"
	@sort="onChange"
	@change="onChange">
		<template #item="{element, index}:{element:TriggerListEntry|TriggerListFolderEntry, index:number}">
			<ToggleBlock class="folder" v-if="element.type == 'folder'"
			medium
			:editableTitle="!noEdit"
			v-model:title="element.label"
			v-model:open="element.expand"
			:customColor="element.color.value"
			:ref="'folder_'+element.id"
			:titleDefault="'folder'"
			@update:open="$emit('change', $event)"
			@update:title="$emit('change', $event)">
				<template #left_actions>
					<div class="blockActions">
						<ParamItem class="colorSelector"
							v-if="noEdit === false"
							@click.stop
							v-tooltip="$t('triggers.folder_color')"
							:paramData="element.color"
							v-model="element.color.value"
							@change="$emit('change', $event)" />
						<Icon name="broadcast" />
						<div class="count">x{{ element.items.filter(v=>v.type == 'trigger').length }}</div>
					</div>
				</template>
				<template #right_actions>
					<div class="blockActions">
						<ToggleButton class="triggerToggle" v-model="element.enabled" @click.stop @change="onToggleFolder(element)" />
						<TTButton class="deleteBt" icon="add" @click.stop="addTrigger(element)" v-tooltip="$t('triggers.add_triggerBt')" primary></TTButton>
						<TTButton class="deleteBt" icon="trash" v-if="noEdit === false" @click.stop="deleteFolder(element)" alert></TTButton>
					</div>
				</template>

				<div :class="element.enabled === false? 'childList disabled' : 'childList'">
					<TriggerListFolderItem
						:class="!element.items || element.items.length == 0? 'emptyChildren' : ''"
						v-model:items="element.items"
						:level="level + 1"
						:rewards="rewards"
						:noEdit="noEdit"
						:forceDisableOption="forceDisableOption"
						:debugMode="debugMode"
						:triggerId="triggerId"
						@change="onChange"
						@delete="$emit('delete', $event)"
						@duplicate="$emit('duplicate', $event)"
						@testTrigger="$emit('testTrigger',$event)"
						@createTrigger="$emit('createTrigger',$event)"
						@select="$emit('select', $event)" />

					<div v-if="!element.items || element.items.length == 0" class="emptyFolder">{{$t("global.empty")}}</div>
				</div>

			</ToggleBlock>

			<TriggerListItem v-else
				:noEdit="noEdit"
				:forceDisableOption="forceDisableOption"
				:entryData="element"
				@changeState="onToggleTrigger(element, $event)"
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
import TTButton from '@/components/TTButton.vue';
import ToggleBlock, { ToggleBlock as ToggleBlockClass } from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { RoughEase } from 'gsap/EasePack';
import { Linear, gsap } from 'gsap/gsap-core';
import { watch } from 'vue';
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
	public debugMode!:boolean;

	@Prop({default:null})
	public triggerId!:string|null;

	@Prop({default:null})
	public items!:(TriggerListEntry|TriggerListFolderEntry)[];

	@Prop({default:0})
	public level!:number;

	public localItems:(TriggerListEntry|TriggerListFolderEntry)[] = [];

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

	public onToggleTrigger(item:TriggerListEntry, el:HTMLElement):void {
		if(item.trigger.enabled
		&& !this.$store.auth.isPremium
		&& this.$store.triggers.triggerList.filter(v=>v.enabled !== false && this.$store.triggers.triggerIdToFolderEnabled[v.id] !== false).length > this.$config.MAX_TRIGGERS) {
			setTimeout(()=>{
				item.trigger.enabled = false;
			}, 350);
			this.vibrate(el);
		}else{
			this.$emit('change');
			this.$emit('changeState');
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
			setTimeout(()=>{
				folder.enabled = false;
				//Emit the revert
				this.$emit('change');
			}, 200);
			this.vibrate((this.$refs["folder_"+folder.id] as Vue).$el as HTMLElement);
		}
	}

	private vibrate(el:HTMLElement):void {
		setTimeout(()=>{
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
