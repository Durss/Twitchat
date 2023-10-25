<template>
	<div class="heatdistorparams card-item">
		<ParamItem :paramData="param_enabled" noBackground />
		<ParamItem :paramData="param_shape" noBackground />
		<p>Select the scene or source you want the effect to be applied to</p>

		<OBSSceneItemSelector class="sceneSelector" v-model="obsSourcePath" />

		<ToggleBlock class="permissions" :open="false" medium :title="$t('overlay.heatDistort.permissions_title')" :icons="['lock_fit']">
			<PermissionsForm v-model="modelValue.permissions" />
		</ToggleBlock>
		
		<OverlayInstaller type="distort"
		:id="modelValue.id"
		:sourceSuffix="sourceSuffix"
		:sourceTransform="{positionX:3000, positionY:3000}"
		:sceneName="obsSourcePath.length > 2? (obsSourcePath[1] as OBSSourceItem).sourceName : undefined"
		:disabled="obsSourcePath.length == 0" @obsSourceCreated="onObsSourceCreated">
			{{ $t("overlay.heatDistort.install_overlay") }}
		</OverlayInstaller>
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
import OBSWebsocket from '@/utils/OBSWebsocket';

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
export default class HeatDistortParams extends Vue {
	
	@Prop
	public modelValue!:TwitchatDataTypes.HeatDistortionData;

	public obsSourcePath:string|Omit<OBSSourceItem, "sceneItemTransform">[] = [];

	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.heatDistort.param_enabled"};
	public param_shape:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"overlay.heatDistort.param_shape"};
	
	public get sourceSuffix():string {
		if(this.obsSourcePath.length === 0) return "";
		const item = this.obsSourcePath[ this.obsSourcePath.length-1 ]
		return typeof item == "string"? " ("+item+")" : " ("+item.sourceName+")";
	}

	public async mounted():Promise<void> {
		// const res = await OBSWebsocket.instance.socket.call("GetSourceFilterList", {sourceName:"Scene 2"});
		// const res = await OBSWebsocket.instance.socket.call("GetSceneItemTransform", {sceneItemId:11, sceneName:"Scene 3"});
		// const res = await OBSWebsocket.instance.socket.call("GetInputSettings", {inputName:"test"});
		// console.log(res);
		
		
		const inputSettings = {
			fps: 60,
			fps_custom: true,
			width: 200,
			height: 200,
			url: "xxx",
			restart_when_active: true,
			shutdown: true,
		};
		const res = await OBSWebsocket.instance.socket.call('CreateInput',{sceneName:"Scene 3", inputName:"zgeg", inputKind:"browser_source", inputSettings});
		await OBSWebsocket.instance.socket.call('SetSceneItemIndex',{sceneName:"Scene 3", sceneItemId:res.sceneItemId, sceneItemIndex:0});
		// res.sceneItemIds
		// await OBSWebsocket.instance.socket.call("SetSceneItemTransform", {sceneItemId:res.sceneItemId, sceneName:"Scene 3", sceneItemTransform:{positionX:3000, positionY:3000}});
	}

	public async onObsSourceCreated(data:{sourceName:string}):Promise<void> {
		let filterTarget = this.obsSourcePath[this.obsSourcePath.length-1];
		if(typeof filterTarget != "string") filterTarget = filterTarget.sourceName;
		const filterSettings = {
			"displacement_map_source.displacement_map": data.sourceName,
			"effect": "displacement_map_source"
		};
		const params = {
						sourceName: filterTarget,
						filterKind:"shadertastic_filter",
						filterName:"Heat Distortion",
						filterSettings
					};
		const res = await OBSWebsocket.instance.socket.call("CreateSourceFilter", params);
		console.log(res);
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

	.sceneSelector {
		.bevel();
		padding: .5em;
		border-radius: var(--border-radius);
		background-color: var(--color-dark-fadest);
	}
}
</style>