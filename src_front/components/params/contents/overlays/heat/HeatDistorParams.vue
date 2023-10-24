<template>
	<div class="heatdistorparams card-item">
		<OverlayInstaller type="distort" :id="modelValue.id" :sourceSuffix="sourceSuffix">
			{{ $t("overlay.heatDistort.install_overlay") }}
		</OverlayInstaller>
		<ToggleBlock class="permissions" :open="false" medium :title="$t('overlay.heatDistort.permissions_title')" :icons="['lock_fit']">
			<PermissionsForm v-model="modelValue.permissions" />
		</ToggleBlock>
		<ParamItem :paramData="param_enabled" noBackground />
		<ParamItem :paramData="param_shape" noBackground />
		<p>Select the scene or source you want the effect to be applied to</p>
		<OBSSceneItemSelector v-model="obsSourcePath" />
		{{ obsSourcePath }}
	</div>
</template>

<script lang="ts">
import PermissionsForm from '@/components/PermissionsForm.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import OBSSceneItemSelector from '../../obs/OBSSceneItemSelector.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import OverlayInstaller from '../OverlayInstaller.vue';
import type { OBSSourceItem } from '@/utils/OBSWebsocket';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
		PermissionsForm,
		OverlayInstaller,
		OBSSceneItemSelector,
	},
	emits:[],
})
export default class HeatDistorParams extends Vue {
	
	@Prop
	public modelValue!:TwitchatDataTypes.HeatDistortionData;

	public obsSourcePath:string|Omit<OBSSourceItem, "sceneItemTransform">[] = [];

	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.heatDistort.param_enabled"};
	public param_shape:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"overlay.heatDistort.param_shape"};
	
	public get sourceSuffix():string {
		if(this.obsSourcePath.length === 0) return "";
		const item = this.obsSourcePath[ this.obsSourcePath.length-1 ]
		return typeof item == "string"? item : " ("+item.sourceName+")";
	}

}
</script>

<style scoped lang="less">
.heatdistorparams{
	gap: .5em;
	display: flex;
	flex-direction: column;

	.permissions {
		align-self: center;
	}
}
</style>