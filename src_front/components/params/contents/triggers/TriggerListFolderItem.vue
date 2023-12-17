<template>
	<draggable class="triggerlistfolderitem"
	:animation="250"
	group="description"
	ghostClass="ghost"
	item-key="id"
	v-model="localItems"
	@change="onChange">
		<template #item="{element, index}:{element:TriggerListEntry|TriggerListFolderEntry, index:number}">
			<ToggleBlock class="folder" :icons="['folder']"
			editableTitle medium
			v-model:title="element.label"
			:open="false"
			:titleDefault="'coucou'"
			v-if="element.type == 'folder'">
				<template #right_actions>
					<ToggleButton class="triggerToggle" />
				</template>

				<div v-if="!element.items || element.items.length == 0">no child</div>
				<TriggerListFolderItem v-else
					:items="element.items"
					:level="level + 1"
					:rewards="rewards"
					:noEdit="noEdit"
					:debugMode="debugMode"
					:triggerId="triggerId"
					@changeState="$emit('changeState', element)"
					@delete="$emit('delete', $event)"
					@duplicate="$emit('duplicate', $event)"
					@testTrigger="$emit('testTrigger',$event)"
					@select="$emit('select', $event)" />
			</ToggleBlock>

			<TriggerListItem v-else
				:noEdit="noEdit"
				:entryData="element"
				@changeState="$emit('changeState', element)"
				@delete="$emit('delete', $event)"
				@duplicate="$emit('duplicate', $event)"
				@testTrigger="$emit('testTrigger',$event)"
				@select="$emit('select', $event)"
				>
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

@Component({
	name:"TriggerListFolderItem",
	components:{
		draggable,
		ToggleBlock,
		ToggleButton,
		TriggerListItem,
	},
	emits:["sort", "changeState","delete","duplicate","testTrigger","select"],
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

	public beforeMount():void {
		this.localItems = this.items;
	}

	public onChange():void {
		this.$emit("sort", this.localItems);
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
}
</style>