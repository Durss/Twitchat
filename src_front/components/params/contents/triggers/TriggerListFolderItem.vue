<template>
	<div class="triggerlistfolderitem">
		<template v-for="item in items">
			<div v-if="item.type == 'folder'">
				<div>{{ item.label }}</div>
				<TriggerListFolderItem :items="item.items"
					:rewards="rewards"
					:noEdit="noEdit"
					:debugMode="debugMode"
					:triggerId="triggerId"
					@changeState="$emit('changeState', item)"
					@delete="$emit('delete', $event)"
					@duplicate="$emit('duplicate', $event)"
					@testTrigger="$emit('testTrigger',$event)"
					@select="$emit('select', $event)" />
			</div>
			<TriggerListItem v-else
				:noEdit="noEdit" :entryData="item"
				@changeState="$emit('changeState', item)"
				@delete="$emit('delete', $event)"
				@duplicate="$emit('duplicate', $event)"
				@testTrigger="$emit('testTrigger',$event)"
				@select="$emit('select', $event)"
				>
					<span class="triggerId" v-if="debugMode" v-click2Select
					@click.stop="">{{ item.trigger.id }}</span>
			</TriggerListItem>
		</template>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerListItem from './TriggerListItem.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TriggerListEntry, TriggerListFolderEntry } from './TriggerList.vue';

@Component({
	name:"TriggerListFolderItem",
	components:{
		TriggerListItem,
	},
	emits:["changeState","delete","duplicate","testTrigger","select"],
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

}
</script>

<style scoped lang="less">
.triggerlistfolderitem{
	display: flex;
	flex-direction: column;
	gap: 2px;
}
</style>