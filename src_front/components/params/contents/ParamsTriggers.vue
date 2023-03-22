<template>
	<div class="paramstriggers">
		<img src="@/assets/icons/broadcast_purple.svg" alt="overlay icon" class="icon">

		<i18n-t scope="global" tag="p" class="head" keypath="triggers.header">
			<template #COUNT><strong>{{ eventsCount }}</strong></template>
		</i18n-t>

		<div class="holder">
			<TriggerCreateForm
				@setContent="$emit('setContent', $event)"
				@openForm="showList=false"
				@closeForm="showList=true" />

			<TriggerList v-if="showList"
				@setContent="$emit('setContent', $event)" />
		</div>
	</div>
</template>

<script lang="ts">
import { TriggerEvents, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import TriggerCreateForm from './triggers/TriggerCreateForm.vue';
import TriggerList from './triggers/TriggerList.vue';

@Component({
	components:{
		TriggerList,
		TriggerCreateForm,
	},
	emits:["setContent"],
})
export default class ParamsTriggers extends Vue {

	public eventsCount:number = 0;
	public showList:boolean = true;

	public beforeMount():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = TriggerEvents().concat();
		this.eventsCount = events.length;

	}
}
</script>

<style scoped lang="less">
.paramstriggers{
	.parameterContent();
	
	.holder {
		display: flex;
		flex-direction: column;
		gap: 1em;
		margin-top: 1em;
	}
}
</style>