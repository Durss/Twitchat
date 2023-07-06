<template>
	<div class="triggeractionhearparams">
		<ParamItem noBackground :paramData="param_allowAnon" v-model="triggerData.heatAllowAnon" />
		
		<div>
			<Icon name="polygon" />{{ $t("triggers.actions.heat.select_area") }}
		</div>
		
		<div class="screenList" v-if="$store('heat').screenList.length > 0">
			<HeatScreenPreview class="screen"
			v-for="screen in $store('heat').screenList" :key="screen.id"
			selectAreaMode
			@select="(id:string) => onSelectArea(id)"
			:selectedAreas="triggerData.heatAreaIds"
			:screen="screen" />
		</div>

		<div class="noArea" v-else>
			<span class="label">{{ $t("triggers.actions.heat.no_area") }}</span>
			<Button @click="openHeatParams()">{{ $t("triggers.actions.heat.create_areaBt") }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import HeatScreenPreview from '../heat/areas/HeatScreenPreview.vue';
import Button from '@/components/Button.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		Icon,
		Button,
		ParamItem,
		HeatScreenPreview,
	},
	emits:[],
})
export default class TriggerActionHearParams extends Vue {

	@Prop
	public triggerData!:TriggerData;
	
	public param_allowAnon:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"heat.param_anon", icon:"user", tooltipKey:"heat.anonymous"};

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

	public openHeatParams():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.HEAT, TwitchatDataTypes.ParamDeepSections.HEAT_AREAS);
	}

}
</script>

<style scoped lang="less">
.triggeractionhearparams{
	gap: .5em;
	display: flex;
	flex-direction: column;
	
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

	.noArea {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: .5em;

		.label {
			color: var(--color-secondary);
		}
	}
}
</style>