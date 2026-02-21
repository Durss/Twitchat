<template>
	<div class="overlayparamsulule overlayParamsSection">
		<i18n-t class="header" scope="global" tag="div" keypath="overlay.ulule.description">
			<template #LINK>
				<a href="https://ulule.com" target="_blank">{{ $t("overlay.ulule.description_link") }}</a>
			</template>
		</i18n-t>

		<section class="card-item">
			<ParamItem :paramData="param_project" @change="saveConfigs" />
	
			<ParamItem :paramData="param_title" @change="saveConfigs" />
	
			<ParamItem :paramData="param_goals" @change="saveConfigs" />
	
			<ParamItem class="shrinkField" :paramData="param_currency" @change="saveConfigs" />
	
			<OverlayInstaller type="ulule" :url="overlayUrl" :disabled="!param_project.value" />
	
			<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div class="cssHead">{{ $t("overlay.ulule.css") }}</div>
				<ul class="cssStructure">
					<li>#holder { ... }</li>
					<li class="sublist">
						<ul>
							<li>#fill { ... }</li>
							<li>#infos { ... }</li>
							<li class="sublist">
								<ul>
									<li>#title { ... }</li>
									<li>#values { ... }</li>
									<li class="sublist">
										<ul>
											<li>#value { ... }</li>
											<li>#percent { ... }</li>
											<li>#goal { ... }</li>
										</ul>
									</li>
								</ul>
							</li>
						</ul>
					</li>
				</ul>
			</ToggleBlock>
		</section>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import DataStore from '@/store/DataStore';
import { rebuildPlaceholdersCache } from '@/types/TriggerActionDataTypes';
import OverlayInstaller from './OverlayInstaller.vue';
import Utils from '@/utils/Utils';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
		OverlayInstaller,
	},
	emits:[],
})
class OverlayParamsUlule extends Vue {

	public param_project:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:200, labelKey:"overlay.ulule.project_name", placeholder:"https://ulule.com/your-project..."}
	public param_goals:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:200, labelKey:"overlay.ulule.project_goals", placeholder:"10000,25000,50000,100000,...", tooltipKey:"overlay.ulule.project_goals_tt"}
	public param_title:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:100, labelKey:"overlay.ulule.project_title"}
	public param_currency:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"$", maxLength:5, labelKey:"overlay.ulule.project_currency"}
	
	public get overlayUrl():string {
		let project = this.param_project.value.replace(/.*ulule.[a-z]{2,3}\/([^?\/]+).*/gi, "$1");
		let url = Utils.overlayURL("ulule", [{k:"project", v:project}, {k:"goals", v:this.param_goals.value}, {k:"currency", v:this.param_currency.value}, {k:"title", v:this.param_title.value}]);
		return url;
	}

	public mounted():void {
		let p = DataStore.get(DataStore.ULULE_PROJECT);
		let g = DataStore.get(DataStore.ULULE_GOALS);
		let t = DataStore.get(DataStore.ULULE_TITLE);
		let c = DataStore.get(DataStore.ULULE_CURRENCY);
		if(p) this.param_project.value = p;
		if(g) this.param_goals.value = g;
		if(t) this.param_title.value = t;
		if(c) this.param_currency.value = c;
	}

	public saveConfigs():void {
		DataStore.remove(DataStore.ULULE_PROJECT);
		DataStore.remove(DataStore.ULULE_GOALS);
		DataStore.remove(DataStore.ULULE_TITLE);
		DataStore.remove(DataStore.ULULE_CURRENCY);
		if(this.param_project.value) DataStore.set(DataStore.ULULE_PROJECT, this.param_project.value);
		if(this.param_goals.value) DataStore.set(DataStore.ULULE_GOALS, this.param_goals.value);
		if(this.param_title.value) DataStore.set(DataStore.ULULE_TITLE, this.param_title.value);
		if(this.param_currency.value) DataStore.set(DataStore.ULULE_CURRENCY, this.param_currency.value);

		rebuildPlaceholdersCache();
	}

}
export default toNative(OverlayParamsUlule);
</script>

<style scoped lang="less">
.overlayparamsulule{
	.shrinkField {
		:deep(.inputHolder) {
			max-width: 100px;
		}
	}
}
</style>