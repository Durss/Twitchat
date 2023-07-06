<template>
	<div class="triggeractionhearparams">
		<div>
			<Icon name="polygon" />{{ $t("triggers.actions.heat.select_area") }}
		</div>
		
		<div class="screenList">
			<HeatScreenPreview class="screen"
			v-for="screen in $store('heat').screenList" :key="screen.id"
			selectAreaMode
			@select="(id:string) => onSelectArea(id)"
			:selectedAreas="triggerData.heatAreaIds"
			:screen="screen" />
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import HeatScreenPreview from '../heat/areas/HeatScreenPreview.vue';

@Component({
	components:{
		Icon,
		HeatScreenPreview,
	},
	emits:[],
})
export default class TriggerActionHearParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public mounted():void {
		if(!this.triggerData.heatAreaIds) this.triggerData.heatAreaIds = [];
		
		//Cleanup any area ID from the trigger that does not exist anymore
		//in the screens definitions
		const screenList = this.$store('heat').screenList;
		for (let i = 0; i < this.triggerData.heatAreaIds.length; i++) {
			const id = this.triggerData.heatAreaIds[i];
			let found = false;
			for (let j = 0; j < screenList.length; j++) {
				if(screenList[j].areas.findIndex(v=>v.id==id) > -1) {
					found = true;
				}
			}
			if(!found) {
				this.triggerData.heatAreaIds.splice(i, 1);
				i--;
			}
		}
	}

	public onSelectArea(id:string):void {
		if(!this.triggerData.heatAreaIds) this.triggerData.heatAreaIds = [];
		const index = this.triggerData.heatAreaIds.indexOf(id);
		if(index > -1) {
			this.triggerData.heatAreaIds.splice(index, 1);
		}else if(this.triggerData.heatAreaIds.length < 100){
			this.triggerData.heatAreaIds.push(id);
		}else{
			this.$store("main").alert("You reached the maximum of 100 clickable areas")
		}
	}

}
</script>

<style scoped lang="less">
.triggeractionhearparams{
	.icon {
		height: 1em;
		width: 1em;
		margin-right: .5em;
	}

	.screenList {
		gap: 5px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: .5em;
		.screen {
			width: 30%;
		}
	}
}
</style>