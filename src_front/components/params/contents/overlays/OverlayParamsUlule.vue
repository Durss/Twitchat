<template>
	<ToggleBlock class="overlayparamsulule" :title="$t('overlay.ulule.title')" :icons="['ulule']">
		<div class="holder">
			<div class="item">
				<div class="info">
					<i18n-t scope="global" tag="div" keypath="overlay.ulule.description">
						<template #LINK>
							<a href="https://ulule.com" target="_blank">{{ $t("overlay.ulule.description_link") }}</a>
						</template>
					</i18n-t>
				</div>
			</div>

			<ParamItem class="item" :paramData="param_project" @change="saveConfigs" />

			<ParamItem class="item" :paramData="param_title" @change="saveConfigs" />

			<ParamItem class="item" :paramData="param_goals" @change="saveConfigs" />

			<ParamItem class="item shrink" :paramData="param_currency" @change="saveConfigs" />

			<input class="item primary" type="text" v-model="overlayUrl" v-click2Select :disabled="!param_project.value">
			<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
				<div>{{ $t("overlay.ulule.css") }}</div>
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
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import DataStore from '@/store/DataStore';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
export default class OverlayParamsUlule extends Vue {

	public param_project:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:200, labelKey:"overlay.ulule.project_name", placeholder:"https://ulule.com/your-project..."}
	public param_goals:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:200, labelKey:"overlay.ulule.project_goals", placeholder:"10000,25000,50000,100000,...", tooltipKey:"overlay.ulule.project_goals_tt"}
	public param_title:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:100, labelKey:"overlay.ulule.project_title"}
	public param_currency:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"$", maxLength:5, labelKey:"overlay.ulule.project_currency"}
	
	public get overlayUrl():string {
		let project = this.param_project.value.replace(/.*ulule.[a-z]{2,3}\/([^?\/]+).*/gi, "$1");
		let url = this.$overlayURL("ulule", [{k:"project", v:project}, {k:"goals", v:this.param_goals.value}, {k:"currency", v:this.param_currency.value}, {k:"title", v:this.param_title.value}]);
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
	}

}
</script>

<style scoped lang="less">
.overlayparamsulule{
	
	.holder {
		display: flex;
		flex-direction: column;
		gap: .5em;

		ul {
			margin-top: .5em;
		}

		.item.shrink {
			:deep(.inputHolder) {
				max-width: 100px;
			}
		}
	}
	
}
</style>