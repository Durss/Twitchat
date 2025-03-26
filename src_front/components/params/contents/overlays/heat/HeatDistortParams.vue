<template>
	<div class="heatdistortparams card-item selectMode" v-if="!overlayInstalled">
		<p>{{ $t("overlay.heatDistort.select_target") }}</p>

		<OBSSceneItemSelector class="sceneSelector" v-model="modelValue.obsItemPath" @change="refreshState()" />

		<OverlayInstaller type="distort"
		orderToBottom
		:css="'html, body{ background-color:transparent;}'"
		:id="modelValue.id"
		:sourceSuffix="sourceSuffix"
		:disabled="modelValue.obsItemPath.sceneName == ''"
		:sourceTransform="{positionX:-3840, width:3840}"
		:sceneName="modelValue.obsItemPath.sceneName"
		@obsSourceCreated="onObsSourceCreated">
			<h2><Icon name="info" />{{ $t("overlay.install_instructions_title") }}</h2>
			<p v-html="$t('overlay.heatDistort.install_instructions')"></p>
		</OverlayInstaller>

		<TTButton class="center" icon="cross" secondary
		@click="deleteEntry(false)">{{ $t("global.cancel") }}</TTButton>
	</div>

	<ToggleBlock medium v-else
	editableTitle
	v-model:title="modelValue.name"
	:titleDefault="sourcePathLabel"
	:subtitle="sourcePathLabel"
	class="distortionEntry"
	:style="{opacity:modelValue.enabled? 1 : .5}">
		<template #left_actions>
			<ToggleButton v-model="modelValue.enabled" big @change="onToggleState()" v-if="canEnable" />
			<Icon name="premium" v-else v-tooltip="$t('overlay.heatDistort.premium_locked')" />
		</template>

		<template #right_actions>
			<TTButton class="deleteBt" icon="trash" alert @click.stop="deleteEntry()" />
		</template>

		<div class="heatdistortparams">
			<ParamItem :paramData="param_shape" v-model="modelValue.effect" noBackground />
			<ParamItem :paramData="param_triggerOnly" v-model="modelValue.triggerOnly" noBackground inverseChildrenCondition>
				<ParamItem class="offset" :paramData="param_anon" v-model="modelValue.refuseAnon" noBackground>
					<PermissionsForm class="permissions" v-model="modelValue.permissions" />
				</ParamItem>
			</ParamItem>

			<TTButton class="center" v-if="modelValue.enabled" @click="simulateClicks()" icon="test">{{ $t("overlay.heatDistort.testBt") }}</TTButton>

			<div v-if="!heatEnabled" class="card-item alert">
				<Icon name="alert" />
				<i18n-t scope="global" keypath="overlay.heatDistort.heat_disabled">
					<template #LINK>
						<a @click.stop="openHeat()">{{ $t("overlay.heatDistort.heat_disabled_link") }}</a>
					</template>
				</i18n-t>
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import PermissionsForm from '@/components/PermissionsForm.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import HeatSocket from '@/utils/twitch/HeatSocket';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import OBSSceneItemSelector from '../../obs/OBSSceneItemSelector.vue';
import OverlayInstaller from '../OverlayInstaller.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		PermissionsForm,
		OverlayInstaller,
		OBSSceneItemSelector,
	},
	emits:["delete", "created"],
})
class HeatDistortParams extends Vue {

	@Prop
	public modelValue!:TwitchatDataTypes.HeatDistortionData;

	public overlayInstalled:boolean = false;

	public param_shape:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", icon:"distort", labelKey:"overlay.heatDistort.param_shape"};
	public param_triggerOnly:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"broadcast", labelKey:"overlay.heatDistort.param_triggerOnly", tooltipKey:"overlay.heatDistort.param_triggerOnly_tt"};
	public param_anon:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"anon", labelKey:"overlay.heatDistort.param_anon", tooltipKey:"heat.anonymous"};

	private updateDebounce:number = -1;
	private obsEventHandler!:()=>void;

	public get heatEnabled():boolean { return HeatSocket.instance.connected; }

	public get canEnable():boolean {
		return this.modelValue.enabled
			|| this.$store.auth.isPremium
			|| this.$store.heat.distortionList.filter(v=>v.enabled).length < Config.instance.MAX_DISTORTION_OVERLAYS;
	}

	public get sourcePathLabel():string {
		const chunks:string[] = [];
		if(this.modelValue.obsItemPath.sceneName) chunks.push(this.modelValue.obsItemPath.sceneName);
		if(this.modelValue.obsItemPath.groupName) chunks.push(this.modelValue.obsItemPath.groupName);
		if(this.modelValue.obsItemPath.source.name) chunks.push(this.modelValue.obsItemPath.source.name);
		return chunks.join(" => ");
	}

	public get sourceSuffix():string {
		let suffix = "";
		if(this.modelValue.obsItemPath.source.name) suffix = this.modelValue.obsItemPath.source.name;
		else if(this.modelValue.obsItemPath.groupName) suffix = this.modelValue.obsItemPath.groupName;
		else if(this.modelValue.obsItemPath.sceneName) suffix = this.modelValue.obsItemPath.sceneName;
		return " ("+suffix+")";
	}

	public async beforeMount():Promise<void> {
		if(!this.modelValue.name) this.modelValue.name = "";

		const values:TwitchatDataTypes.ParameterDataListValue<TwitchatDataTypes.HeatDistortionData["effect"]>[] = [
			{value:"liquid", labelKey:"overlay.heatDistort.distorsions.ripples"},
			{value:"expand", labelKey:"overlay.heatDistort.distorsions.expand"},
			// {value:"shrink", labelKey:"overlay.heatDistort.distorsions.shrink"},
			{value:"heart", labelKey:"overlay.heatDistort.distorsions.heart"},
		];
		this.param_shape.listValues = values;

		this.refreshState();

		this.obsEventHandler = ()=> this.refreshState();
		OBSWebsocket.instance.socket.on("SceneItemCreated", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("SceneItemRemoved", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("InputNameChanged", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("SourceFilterRemoved", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("SourceFilterCreated", this.obsEventHandler);
	}

	public beforeUnmount():void{
		OBSWebsocket.instance.socket.off("SceneItemCreated", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("SceneItemRemoved", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("InputNameChanged", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("SourceFilterRemoved", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("SourceFilterCreated", this.obsEventHandler);
	}

	public openHeat():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.HEAT);
	}

	public async onObsSourceCreated(data:{sourceName:string}):Promise<void> {
		this.$emit("created", data.sourceName, this.modelValue, this.sourceSuffix);
	}

	public deleteEntry(confirm:boolean = true):void {
		if(!confirm) {
			this.$emit("delete", this.modelValue);
			return;
		}

		this.$confirm(this.$t("overlay.heatDistort.delete_confirm"), this.$t("overlay.heatDistort.delete_confirm_desc"))
		.then(()=> {
			this.$emit("delete", this.modelValue);
		}).catch(()=>{/* ignore */});
	}

	public async refreshState():Promise<void> {
		clearTimeout(this.updateDebounce);

		const sceneName = this.modelValue.obsItemPath.groupName || this.modelValue.obsItemPath.sceneName;
		if(!sceneName) return;

		this.updateDebounce = window.setTimeout(async () => {
			let filterTarget = "";
			if(this.modelValue.obsItemPath.source.name) filterTarget = this.modelValue.obsItemPath.source.name;
			else if(this.modelValue.obsItemPath.groupName) filterTarget = this.modelValue.obsItemPath.groupName;
			else if(this.modelValue.obsItemPath.sceneName) filterTarget = this.modelValue.obsItemPath.sceneName;
			const filters = await OBSWebsocket.instance.getSourceFilters(filterTarget);
			const filter = filters.find(v=>v.filterKind == "shadertastic_filter");
			this.overlayInstalled = filter != undefined;
		}, 100);
	}

	public simulateClicks():void {
		if(HeatSocket.instance.connected) {
			const uid = this.$store.auth.twitch.user.id
			for (let i = 0; i < 5; i++) {
				const px = Math.random();
				const py = Math.random();
				window.setTimeout(()=>{
					HeatSocket.instance.fireEvent(uid, px, py, false, false, false);
				}, 250 * i);
			}
		}
	}

	public onToggleState():void {
		if(this.$store.auth.isPremium) return;
		if(this.$store.heat.distortionList.filter(v=>v.enabled).length > Config.instance.MAX_DISTORTION_OVERLAYS) {
			this.$nextTick().then(()=>{
				this.modelValue.enabled = false;
			});
		}
	}
}
export default toNative(HeatDistortParams);
</script>

<style scoped lang="less">
.heatdistortparams{
	gap: .5em;
	display: flex;
	overflow: hidden;
	flex-direction: column;

	h2 {
		text-align: center;
		font-size: 2em;
		line-height: 1.25em;
		margin-bottom: .25em;
		.icon {
			height: 1em;
			vertical-align: middle;
			margin-right: .25em;
		}
	}

	.offset {
		margin-top: .5em;
	}

	.permissions {
		align-self: center;
		margin-top: .5em;
		padding-left: 1.5em
	}

	.sceneSelector {
		.bevel();
		padding: .5em;
		border-radius: var(--border-radius);
		background-color: var(--color-dark-fadest);
		height: 250px;
	}

	&.selectMode {
		.emboss()
	}

	.permissions {
		max-width: unset;
	}
	.alert {
		text-align: center;
		.icon{
			height: 1em;
			margin-right: .5em;
		}
	}
	:deep(ul) {
		list-style: decimal;
		list-style-position: inside;
		margin-left: 1em;
	}
}
.deleteBt {
	margin: -.5em 0;
	border-radius: 0;
}
.distortionEntry {
	transition: opacity .25s;
}
</style>
