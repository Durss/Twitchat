<template>
	<div class="paramsobs parameterContent">
		<Icon name="obs" alt="overlay icon" class="icon" />

		<div class="head">
			<p>{{ $t("obs.header") }}</p>
			<p class="install">
				<i18n-t scope="global"  tag="i" keypath="obs.install">
					<template #OBS_VERSION>
						<strong>OBS v28+</strong>
					</template>
				</i18n-t>
			</p>
		</div>

		<ParamItem class="item enableBt" :paramData="param_enabled" v-model="param_enabled.value" />

		<div class="fadeHolder" :style="holderStyles">
			<OBSConnectForm class="connectForm" />

			<ToggleBlock class="block permissions"
			v-if="connected"
			:open="false"
			:icons="['lock_fit']"
			:title="$t('obs.permissions_title')">
				<p class="info">{{ $t("obs.permissions_head") }}</p>
				<PermissionsForm class="content" v-model="permissions" />
			</ToggleBlock>

			<ToggleBlock class="block mic"
			v-if="connected"
			:open="false"
			:icons="['microphone']"
			:title="$t('obs.microphone_title')">
				<OBSAudioSourceForm />
			</ToggleBlock>

			<ToggleBlock class="block scenes"
			v-if="connected"
			:open="false"
			:icons="['list']"
			:title="$t('obs.scenes_title')">
				<OBSScenes />
			</ToggleBlock>

			<ToggleBlock class="block browserSources"
			v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'obs_browsersources'}"
			v-if="connected"
			:open="false"
			:icons="['internet']"
			:title="$t('obs.browser_sources_title')">
				<OBSBrowserSources />
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from '@vue/runtime-core';
import type { CSSProperties } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import PermissionsForm from '../../../PermissionsForm.vue';
import ParamItem from '../../ParamItem.vue';
import OBSAudioSourceForm from '../obs/OBSAudioSourceForm.vue';
import OBSConnectForm from '../obs/OBSConnectForm.vue';
import OBSScenes from '../obs/OBSScenes.vue';
import OBSBrowserSources from '../obs/OBSBrowserSources.vue';
import type IParameterContent from '../IParameterContent';
import Utils from '@/utils/Utils';


@Component({
	components:{
		ParamItem,
		OBSScenes,
		ToggleBlock,
		OBSConnectForm,
		PermissionsForm,
		OBSBrowserSources,
		OBSAudioSourceForm,
	},
	emits:[]
})
class ConnectOBS extends Vue implements IParameterContent {

	public loading = false;
	public connected = false;
	public connectError = false;
	public connectSuccess = false;
	public showPermissions = false;
	public openConnectForm = false;
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"global.enabled", value:false};
	public permissions:TwitchatDataTypes.PermissionsData = Utils.getDefaultPermissions(true, true, false, false, false, false)

	public get holderStyles():CSSProperties {
		return {
			opacity:this.param_enabled.value === true? 1 : .5,
			pointerEvents:this.param_enabled.value === true? "all" : "none",
		};
	}

	public mounted():void {
		const port = DataStore.get(DataStore.OBS_PORT);
		const pass = DataStore.get(DataStore.OBS_PASS);
		const ip = DataStore.get(DataStore.OBS_IP);

		if(port != undefined || pass != undefined || ip != undefined) {
			this.connected = OBSWebsocket.instance.connected.value;
			this.openConnectForm = !this.connected;
		}else{
			this.openConnectForm = true;
		}

		const storedPermissions = this.$store.obs.commandsPermissions;
		this.permissions = JSON.parse(JSON.stringify(storedPermissions));//Clone object to break ref
		this.param_enabled.value = this.$store.obs.connectionEnabled ?? false;

		watch(()=> this.param_enabled.value, () => { this.paramUpdate(); })
		watch(()=> this.permissions, () => { this.onPermissionChange(); }, { deep:true })
		watch(()=> OBSWebsocket.instance.connected.value, () => {
			this.connected = OBSWebsocket.instance.connected.value;
			if(!this.connected) this.openConnectForm = true;
		});
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Called when changing commands permisions
	 */
	public async onPermissionChange():Promise<void> {
		this.$store.obs.setObsCommandsPermissions(this.permissions);
	}

	/**
	 * Called when changing OBS credentials
	 */
	private paramUpdate():void {
		this.connected = false;
		this.$store.obs.connectionEnabled = this.param_enabled.value;
		DataStore.set(DataStore.OBS_CONNECTION_ENABLED, this.param_enabled.value);
		if(!this.param_enabled.value) {
			OBSWebsocket.instance.disconnect();
		}
	}
}
export default toNative(ConnectOBS);
</script>

<style scoped lang="less">
.paramsobs{

	.fadeHolder {
		transition: opacity .2s;
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	.install {
		margin-top: 1em;
		font-size: .8em;
	}

	.block {
		.info {
			margin-bottom: 1em;
		}
		&.permissions {
			.info {
				text-align: center;
				margin-bottom: .5em;
			}
			.content {
				width: 300px;
			}
		}
	}

	.conf {
		display: flex;
		flex-direction: column;

		.info {
			margin-bottom: 1em;
		}

		.connectBt {
			display: block;
			margin: auto;
		}

		.fade-enter-active {
			transition: all 0.2s;
		}

		.fade-leave-active {
			transition: all 0.2s;
		}

		.fade-enter-from,
		.fade-leave-to {
			opacity: 0;
			transform: translateY(-10px);
		}
	}
}
</style>
