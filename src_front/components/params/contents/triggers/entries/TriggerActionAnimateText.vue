<template>
	<div class="triggeractionanimatetext triggerActionForm">
	</div>
</template>

<script lang="ts">
import type { TriggerActionAnimatedTextData, TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{},
	emits:[],
})
class TriggerActionAnimateText extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionAnimatedTextData;

	@Prop
	declare triggerData:TriggerData;

	public beforeMount():void {

	}

}
export default toNative(TriggerActionAnimateText);
</script>

<style scoped lang="less">
.triggeractionanimatetext{

}
</style>
