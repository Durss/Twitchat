<template>
	<div class="paramsobs">
		<div class="head">
			<p>Create your own twitch alerts and allow your mods basic control over your OBS</p>
			<p class="install">In order to work, this needs <strong>OBS v27.2+</strong> and <a :href="obswsInstaller" target="_blank">OBS-websocket&nbsp;plugin&nbsp;V5</a><i>(scroll to bottom)</i> to be installed.</p>
		</div>

		<ToggleBlock class="block conf"
		:open="!connected"
		icon="info_purple"
		title="OBS credentials">
			<OBSConnectForm />
		</ToggleBlock>

		<ToggleBlock class="block permissions"
		v-if="connected"
		:open="false"
		icon="lock_purple"
		title="Permissions">
			<p class="info">Users allowed to use the chat commands</p>
			<OBSPermissions class="content" @update="onPermissionChange"
				v-model:mods="permissions.mods"
				v-model:vips="permissions.vips"
				v-model:subs="permissions.subs"
				v-model:all="permissions.all"
				v-model:users="permissions.users"
			/>
		</ToggleBlock>

		<ToggleBlock class="block mic"
		v-if="connected"
		:open="false"
		icon="microphone_purple"
		title="Control microphone">
			<OBSAudioSourceForm />
		</ToggleBlock>

		<ToggleBlock class="block scenes"
		v-if="connected"
		:open="false"
		icon="list_purple"
		title="Control scenes">
			<OBSScenes />
		</ToggleBlock>

		<!-- <ToggleBlock class="block filters"
		v-if="connected"
		:open="false"
		icon="graphicFilters_purple"
		title="Control filters">
			<OBSFilters />
		</ToggleBlock> -->

		<ToggleBlock class="block overlay"
		v-if="connected"
		:open="true"
		icon="broadcast_purple"
		title="Twitchat triggers">
			<OBSEventsAction />
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import store, { PermissionsData } from '@/store';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';
import OBSAudioSourceForm from './obs/OBSAudioSourceForm.vue';
import OBSConnectForm from './obs/OBSConnectForm.vue';
import OBSEventsAction from './obs/OBSEventsAction.vue';
import OBSFilters from './obs/OBSFilters.vue';
import OBSPermissions from './obs/OBSPermissions.vue';
import OBSScenes from './obs/OBSScenes.vue';


@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		OBSScenes,
		OBSFilters,
		ToggleBlock,
		OBSPermissions,
		OBSConnectForm,
		OBSEventsAction,
		OBSAudioSourceForm,
	},
	emits:['setContent']
})
export default class ParamsOBS extends Vue {

	public showPermissions:boolean = false;
	public permissions:PermissionsData = {
		mods: false,
		vips: false,
		subs: false,
		all: false,
		users: ""
	}

	public get obswsInstaller():string { return Config.OBS_WEBSOCKET_INSTALLER; }
	public get connected():boolean { return OBSWebsocket.instance.connected; }

	public mounted():void {
		const storedPermissions = store.state.obsPermissions;
		this.permissions.mods = storedPermissions.mods;
		this.permissions.vips = storedPermissions.vips;
		this.permissions.subs = storedPermissions.subs;
		this.permissions.all = storedPermissions.all;
		this.permissions.users = storedPermissions.users;
	}

	/**
	 * Called when changing commands permisions
	 */
	public async onPermissionChange():Promise<void> {
		store.dispatch("setOBSPermissions", this.permissions);
	}
}
</script>

<style scoped lang="less">
.paramsobs{
	.head {
		text-align: center;
		margin-bottom: 20px;
		
		.install {
			font-size: .8em;
		}
	}

	.block:not(:first-of-type) {
		margin-top: .5em;
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

	:deep(input) {
		min-width: 100px;
		//These lines seems stupide AF but they allow the input
		//to autosize to it's min length
		width: 0%;
		flex-grow: 1;
		max-width: 100px;

		text-align: center;
		
		//Hide +/- arrows
		&::-webkit-outer-spin-button,
		&::-webkit-inner-spin-button {
			display: none;
		}
	}
}
</style>