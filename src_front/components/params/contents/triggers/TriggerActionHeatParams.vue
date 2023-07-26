<template>
	<div class="TriggerActionHeatParams">
		
		<div>
			<Icon name="polygon" />{{ $t("triggers.actions.heat.select_area") }}
		</div>
		
		<ParamItem noBackground :paramData="param_clickSource" v-model="triggerData.heatClickSource" />
		
		<template v-if="param_clickSource.value=='area'">
			<div class="screenList" v-if="$store('heat').screenList.length > 0">
				<HeatScreenPreview class="screen"
				v-for="screen in $store('heat').screenList" :key="screen.id"
				selectAreaMode
				@select="(id:string) => onSelectArea(id)"
				:selectedAreas="triggerData.heatAreaIds"
				:screen="screen" />
			</div>
	
			<div class="card-item secondary noArea" v-else>
				<span class="label">{{ $t("triggers.actions.heat.no_area") }}</span>
				<Button @click="openHeatParams()">{{ $t("triggers.actions.heat.create_areaBt") }}</Button>
			</div>
		</template>
		
		<ParamItem v-else-if="obsConnect" noBackground :paramData="param_obsSources" v-model="triggerData.heatObsSource" />

		<div v-else class="card-item alert error">
			<p v-html="$t('heat.need_OBS')"></p>
			<Button @click="openOBSParams()" alert light icon="obs">{{ $t("heat.need_OBS_connectBt") }}</Button>
		</div>

		<ParamItem noBackground :paramData="param_allowAnon" v-model="triggerData.heatAllowAnon" />
		<ParamItem secondary noBackground class="cooldown" :paramData="param_globalCD" v-model="triggerData.cooldown!.global" />
		<ParamItem secondary noBackground class="cooldown" :paramData="param_userCD" v-model="triggerData.cooldown!.user" />

		<ToggleBlock class="permissions" :open="false"
		:title="$t('triggers.actions.chat.allowed_users')" :icons="['user']" medium primary>
			<PermissionsForm v-model="triggerData.permissions" />
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Icon from '@/components/Icon.vue';
import PermissionsForm from '@/components/PermissionsForm.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { OBSSourceItem } from '@/utils/OBSWebsocket';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import HeatScreenPreview from '../heat/areas/HeatScreenPreview.vue';
import OBSWebsocket from '@/utils/OBSWebsocket';

@Component({
	components:{
		Icon,
		Button,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
		HeatScreenPreview,
	},
	emits:[],
})
export default class TriggerActionHeatParams extends Vue {

	@Prop
	public triggerData!:TriggerData;
	@Prop
	public obsSources!:OBSSourceItem[];
	
	public param_clickSource:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"obs", listValues:[], labelKey:"heat.click_source", icon:"click"};
	public param_obsSources:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", listValues:[], labelKey:"heat.obs_source", icon:"obs"};
	public param_allowAnon:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"heat.param_anon", icon:"user", tooltipKey:"heat.anonymous"};
	public param_globalCD:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, icon:"timeout", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_globalCD" };
	public param_userCD:TwitchatDataTypes.ParameterData<number> = { type:"number", value:0, icon:"timeout", min:0, max:60*60*12, labelKey:"triggers.actions.chat.param_userCD" };

	public get obsConnect():boolean { return OBSWebsocket.instance.connected; }

	public beforeMount():void {
		if(!this.triggerData.heatAreaIds) this.triggerData.heatAreaIds = [];
		if(!this.triggerData.permissions) {
			this.triggerData.permissions = {
				broadcaster:true,
				mods:true,
				vips:true,
				subs:true,
				all:true,
				follower:true,
				follower_duration_ms:0,
				usersAllowed:[],
				usersRefused:[],
			}
		}
		if(!this.triggerData.cooldown) {
			this.triggerData.cooldown = {
				global:0,
				user:0,
				alert:false,
			}
		}
	}

	public mounted():void {
		
		this.param_clickSource.listValues = [
			{value:'obs', labelKey:"heat.click_source_obs"},
			{value:'area', labelKey:"heat.click_source_area"}
		];

		this.param_obsSources.listValues = (this.obsSources || []).map(v=>{
			return {value:v.sourceName, label:v.sourceName};
		});
		
		//Cleanup any area ID from the trigger that does not exist anymore
		//in the screens definitions
		const screenList = this.$store('heat').screenList;
		for (let i = 0; i < this.triggerData.heatAreaIds!.length; i++) {
			const id = this.triggerData.heatAreaIds![i];
			let found = false;
			for (let j = 0; j < screenList.length; j++) {
				if(screenList[j].areas.findIndex(v=>v.id==id) > -1) {
					found = true;
				}
			}
			if(!found) {
				this.triggerData.heatAreaIds!.splice(i, 1);
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

	public openOBSParams():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.OBS);
	}

}
</script>

<style scoped lang="less">
.TriggerActionHeatParams{
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
	}

	.permissions {
		align-self: center;
	}

	.error {
		text-align: center;
		button {
			margin-top: .5em;
		}
	}
}
</style>