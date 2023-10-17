<template>
	<div class="heatdistorparams card-item">
		<OverlayInstaller id="distort" :url="url" />
		<ToggleBlock class="permissions" :open="false" medium :title="$t('overlay.heatDistort.permissions_title')" :icons="['lock_fit']">
			<PermissionsForm v-model="modelValue.permissions" />
		</ToggleBlock>
		<ParamItem :paramData="param_enabled" noBackground />
		<ParamItem :paramData="param_shape" noBackground />
		<p>Select the scene or source you want the effect to be applied to</p>
		<OBSSceneItemSelector />
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

	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.heatDistort.param_enabled"};
	public param_shape:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"overlay.heatDistort.param_shape"};

	public url:string = "";

	public beforeMount():void {
		const url = new URL(this.$overlayURL("distort"));
		url.searchParams.append("twitchat_overlay_id", this.modelValue.id);
		this.url = url.href;
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