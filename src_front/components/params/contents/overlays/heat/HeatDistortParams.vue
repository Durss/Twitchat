<template>
	<div class="heatdistorparams card-item" v-if="selectedObsSourcePath.length === 0">
		<p>{{ $t("overlay.heatDistort.select_target") }}</p>

		<OBSSceneItemSelector class="sceneSelector" v-model="obsSourcePath" />

		<Button class="submitBt" icon="checkmark" primary
		@click="submitObsSourcePath()"
		:disabled="obsSourcePath.length == 0">{{ $t("global.submit") }}</Button>
	</div>

	<ToggleBlock :title="sourcePathLabel" medium  v-else>
		<template #right_actions>
			<Button class="deleteBt" icon="trash" alert @click.stop="deleteEntry()" />
		</template>
		<template #left_actions>
			<ToggleButton v-model="modelValue.enabled" />
		</template>
		<div class="heatdistorparams">
			<ParamItem :paramData="param_shape" v-model="modelValue.effect" noBackground />
	
			<ToggleBlock class="permissions" :open="false" medium :title="$t('overlay.heatDistort.permissions_title')" :icons="['lock_fit']">
				<PermissionsForm v-model="modelValue.permissions" />
			</ToggleBlock>
			
			<OverlayInstaller type="distort"
			orderToBottom
			:id="modelValue.id"
			:sourceSuffix="sourceSuffix"
			:sourceTransform="{positionX:3000, positionY:3000}"
			:sceneName="selectedObsSourcePath.length > 2? (selectedObsSourcePath[1] as OBSSourceItem).sourceName : undefined"
			@obsSourceCreated="onObsSourceCreated">
				{{ $t("overlay.heatDistort.install_overlay") }}
			</OverlayInstaller>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import PermissionsForm from '@/components/PermissionsForm.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { OBSSourceItem } from '@/utils/OBSWebsocket';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import OBSSceneItemSelector from '../../obs/OBSSceneItemSelector.vue';
import OverlayInstaller from '../OverlayInstaller.vue';
import { reactive } from 'vue';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		PermissionsForm,
		OverlayInstaller,
		OBSSceneItemSelector,
	},
	emits:["delete"],
})
export default class HeatDistortParams extends Vue {
	
	@Prop
	public modelValue!:TwitchatDataTypes.HeatDistortionData;

	public obsSourcePath:(string|Omit<OBSSourceItem, "sceneItemTransform">)[] = [];
	public selectedObsSourcePath:(string|Omit<OBSSourceItem, "sceneItemTransform">)[] = [];

	public param_shape:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"overlay.heatDistort.param_shape"};

	public get sourcePathLabel():string {
		const chunks:string[] = [];
		for (let i = 0; i < this.selectedObsSourcePath.length; i++) {
			const item = this.selectedObsSourcePath[i];
			if(typeof item == "string") {
				chunks.push(item);
			}else{
				chunks.push(item.sourceName);
			}
		}
		return chunks.join(" => ")
	}
	
	public get sourceSuffix():string {
		if(this.obsSourcePath.length === 0) return "";
		const item = this.obsSourcePath[ this.obsSourcePath.length-1 ]
		return typeof item == "string"? " ("+item+")" : " ("+item.sourceName+")";
	}

	public async beforeMount():Promise<void> {
		const values:TwitchatDataTypes.ParameterDataListValue<TwitchatDataTypes.HeatDistortionData["effect"]>[] = [
			{value:"liquid", label:"Liquid ripples"},
			{value:"expand", label:"Expand"},
			{value:"shrink", label:"Shrink"},
		];
		this.param_shape.listValues = values;

		this.obsSourcePath = [];
		if(this.modelValue.obsSceneName) {
			this.obsSourcePath.push(this.modelValue.obsSceneName);
		}
		if(this.modelValue.obsGroupName) {
			this.obsSourcePath.push({
				inputKind:null,
				isGroup:true,
				sceneItemId:-1,
				sourceName:this.modelValue.obsGroupName,
				sourceType:"OBS_SOURCE_TYPE_SCENE",
				sceneItemIndex:0,
			});
		}
		if(this.modelValue.obsSceneItemId > -1) {
			const sourceItem:Omit<OBSSourceItem, "sceneItemTransform"> = reactive({
				inputKind:null,
				isGroup:true,
				sceneItemId:this.modelValue.obsSceneItemId,
				sourceName:"",
				sourceType:"OBS_SOURCE_TYPE_INPUT",
				sceneItemIndex:0,
			});
			this.obsSourcePath.push(sourceItem);
			OBSWebsocket.instance.getSceneItems(this.modelValue.obsGroupName || this.modelValue.obsSceneName).then((list)=>{
				const source = list.find(v=> v.item.sceneItemId == this.modelValue.obsSceneItemId);
				if(source?.item) {
					sourceItem.sceneItemIndex = source.item.sceneItemIndex;
					sourceItem.sourceName = source.item.sourceName;
				}
			});
		}

		this.selectedObsSourcePath = this.obsSourcePath;

		// const res = await OBSWebsocket.instance.socket.call("GetSourceFilterList", {sourceName:"Scene 2"});
		// const res = await OBSWebsocket.instance.socket.call("GetSceneItemTransform", {sceneItemId:11, sceneName:"Scene 3"});
		// const res = await OBSWebsocket.instance.socket.call("GetInputSettings", {inputName:"test"});
		// console.log(res);
		
		
		// const inputSettings = {
		// 	fps: 60,
		// 	fps_custom: true,
		// 	width: 200,
		// 	height: 200,
		// 	url: "xxx",
		// 	restart_when_active: true,
		// 	shutdown: true,
		// };
		// const res = await OBSWebsocket.instance.socket.call('CreateInput',{sceneName:"Scene 3", inputName:"zgeg", inputKind:"browser_source", inputSettings});
		// await OBSWebsocket.instance.socket.call('SetSceneItemIndex',{sceneName:"Scene 3", sceneItemId:res.sceneItemId, sceneItemIndex:0});
		// res.sceneItemIds
		// await OBSWebsocket.instance.socket.call("SetSceneItemTransform", {sceneItemId:res.sceneItemId, sceneName:"Scene 3", sceneItemTransform:{positionX:3000, positionY:3000}});
		const res = await OBSWebsocket.instance.socket.call("GetSourceFilterList", {sourceName:"Image"});
		console.log(res);
	}

	public async onObsSourceCreated(data:{sourceName:string}):Promise<void> {
		let filterTarget = this.obsSourcePath[this.obsSourcePath.length-1];
		if(typeof filterTarget != "string") filterTarget = filterTarget.sourceName;
		const filterSettings = {
			"displacement_map_source.displacement_map": data.sourceName,
			"effect": "displacement_map_source",
			"displacement_map_source.color_space":0,
			"displacement_map_source.displacement_strength_x":.05,
			"displacement_map_source.displacement_strength_y":.05,
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

	public submitObsSourcePath():void {
		this.selectedObsSourcePath = this.obsSourcePath.concat();
		if(this.selectedObsSourcePath.length == 1) {
			//Only a scene is selected
			this.modelValue.obsSceneName = this.selectedObsSourcePath[0] as string;
		}else
		if(this.selectedObsSourcePath.length == 2) {
			//Scene AND source selecte
			this.modelValue.obsSceneName = this.selectedObsSourcePath[0] as string;
			this.modelValue.obsSceneItemId = (this.selectedObsSourcePath[1] as OBSSourceItem).sceneItemId;
		}else
		if(this.selectedObsSourcePath.length == 3) {
			//A group and a source are selected
			this.modelValue.obsSceneName = this.selectedObsSourcePath[0] as string;
			this.modelValue.obsGroupName = (this.selectedObsSourcePath[1] as OBSSourceItem).sourceName;
			this.modelValue.obsSceneItemId = (this.selectedObsSourcePath[2] as OBSSourceItem).sceneItemId;
		}

	}

	public deleteEntry():void {
		this.$confirm(this.$t("overlay.heatDistort.delete_confirm"))
		.then(()=> {
			this.$emit("delete", this.modelValue);
		}).catch(()=>{/* ignore */});
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

	.submitBt {
		align-self: center;
	}
}
.deleteBt {
	margin: -.5em .5em;
	border-radius: 0;
}
</style>