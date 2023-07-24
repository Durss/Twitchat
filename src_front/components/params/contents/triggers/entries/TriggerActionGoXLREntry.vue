<template>
	<div class="triggeractiongoxlrentry triggerActionForm">

	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TriggerActionChatData, TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry.vue';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
export default class TriggerActionGoXLREntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionChatData;

	@Prop
	declare triggerData:TriggerData;

}
</script>

<style scoped lang="less">
.triggeractiongoxlrentry{
	
}
</style>