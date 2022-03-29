<template>
	<div class="paramsobs">
		<div class="head">
			<p>Allow your mods basic control over your OBS</p>
			<p class="install">In order to work, this needs <a href="https://github.com/obsproject/obs-websocket/releases">OBS-websocket plugin (v5)</a> to be installed.</p>
		</div>
		<div class="conf">
			<ParamItem :paramData="obsPort_conf" class="row"/>
			<ParamItem :paramData="obsPass_conf" class="row"/>
			<Button title="connect" @click="connect()" class="connectBt" v-if="!connected" />
			<transition name="fade">
				<div v-if="connectError" @click="connectError = false" class="error">Unable to connect with OBS. Double check the port and password and make sure you installed <a href="https://github.com/obsproject/obs-websocket/releases">OBS-websocket plugin (v5)</a></div>
			</transition>
			<transition name="fade">
				<div v-if="connectSuccess" @click="connectSuccess = false" class="success">Connected with OBS</div>
			</transition>
		</div>

		<img class="loader" src="@/assets/loader/loader.svg" alt="loader" v-if="loading">

		<div class="allowed" v-if="sceneParams && sceneParams.length > 0">
			<div class="header">Users allowed to control your OBS via the configured chat commands</div>
			<ParamItem :paramData="obsAllowed_mods" class="row" @change="onPermissionChange()"/>
			<ParamItem :paramData="obsAllowed_vips" class="row" @change="onPermissionChange()"/>
			<ParamItem :paramData="obsAllowed_subs" class="row" @change="onPermissionChange()"/>
			<ParamItem :paramData="obsAllowed_all" class="row" @change="onPermissionChange()"/>
		</div>

		<div class="list" v-if="sceneParams && sceneParams.length > 0">
			<div class="header">
				<div>OBS Scene</div>
				<div>Chat command</div>
			</div>
			<ParamItem v-for="p in sceneParams" :key="p.label" :paramData="p" @change="onSceneCommandUpdate()" class="row"/>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import store, { ParameterData } from '@/store';
import Store from '@/store/Store';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
	}
})
export default class ParamsOBS extends Vue {

	public loading:boolean = false;
	public connected:boolean = false;
	public connectError:boolean = false;
	public connectSuccess:boolean = false;
	public obsPort_conf:ParameterData = { type:"number", value:4455, label:"OBS websocket server port", min:0, max:65535, step:1 };
	public obsPass_conf:ParameterData = { type:"password", value:"", label:"OBS websocket password" };
	public obsAllowed_mods:ParameterData = { type:"toggle", value:true, label:"Moderators", icon:"mod_purple.svg" };
	public obsAllowed_vips:ParameterData = { type:"toggle", value:false, label:"VIPs", icon:"vip_purple.svg" };
	public obsAllowed_subs:ParameterData = { type:"toggle", value:false, label:"Subscribers", icon:"sub_purple.svg" };
	public obsAllowed_all:ParameterData = { type:"toggle", value:false, label:"Everyone", icon:"user_purple.svg" };
	public sceneParams:ParameterData[] = [];

	public mounted():void {
		const port = Store.get("obsPort");
		const pass = Store.get("obsPass");
		if(port) this.obsPort_conf.value = port;
		if(pass) this.obsPass_conf.value = pass;

		if(port && pass) {
			this.connected = OBSWebsocket.instance.connected;
			if(this.connected) {
				this.listScenes();
			}
		}

		watch(()=> this.obsPort_conf.value, () => { this.paramUpdate(); })
		watch(()=> this.obsPass_conf.value, () => { this.paramUpdate(); })
	}

	public async connect():Promise<void> {
		this.loading = true;
		this.connectSuccess = false;
		this.connectError = false;
		const connected = await OBSWebsocket.instance.connect(this.obsPort_conf.value as string, this.obsPass_conf.value as string, false);
		if(connected) {
			this.connected = true;
			this.connectSuccess = true;
			setTimeout(()=> {
				this.connectSuccess = false;
			}, 3000);
			this.listScenes();
		}else{
			this.connectError = true;
		}
		this.loading = false;
	}

	public onSceneCommandUpdate():void {
		const params = this.sceneParams.map(v=> {return { scene:v.storage, command:v.value }});
		store.dispatch("setOBSSceneCommands", params);
	}

	public onPermissionChange():void {
		const params = {
			mods:this.obsAllowed_mods.value,
			vips:this.obsAllowed_vips.value,
			subs:this.obsAllowed_subs.value,
			all:this.obsAllowed_all.value,
		}
		store.dispatch("setOBSPermissions", params);
	}

	private async listScenes():Promise<void> {
		this.loading = true;
		this.sceneParams = []
		const res = await OBSWebsocket.instance.getScenes();
		const storedScenes = store.state.obsSceneCommands;
		for (let i = 0; i < res.scenes.length; i++) {
			const scene = res.scenes[i] as {sceneIndex:number, sceneName:string};
			const storedScene = storedScenes.find(s => s.scene.sceneName === scene.sceneName);
			const value = storedScene? storedScene.command : "";
			this.sceneParams.push(
				{ type:"text", value, label:scene.sceneName, storage:scene, placeholder:"!command" }
			);
		}
		this.loading = false;
	}

	private paramUpdate():void {
		this.connected = false;
		this.sceneParams = [];
		Store.set("obsPort", this.obsPort_conf.value.toString());
		Store.set("obsPass", this.obsPass_conf.value as string);
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

	.loader {
		display: block;
		margin: auto;
		margin-top: 10px;
	}

	.allowed {
		margin-top: 20px;
		.header {
			font-size: 20px;
			margin-bottom: 10px;
		}
		.row {
			width: 200px;
			margin: auto;
			&:not(:first-child) {
				margin-top: 2px;
			}
		}
	}

	.conf {
		display: flex;
		flex-direction: column;

		.connectBt {
			display: block;
			margin: auto;
		}

		.error, .success {
			justify-self: center;
			color: @mainColor_light;
			display: block;
			text-align: center;
			padding: 5px;
			border-radius: 5px;
			margin: auto;
			margin-top: 10px;

			&.error {
				background-color: @mainColor_alert;
			}

			&.success {
				background-color: #1c941c;
			}
			
			a {
				color: @mainColor_light;
			}
		}
	
		/* Enter and leave animations can use different */
		/* durations and timing functions.              */
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

	.list {
		@inputWidth:150px;
		@p:calc(100% - @inputWidth - 10px);
		background: linear-gradient(90deg, rgba(255,255,255,0) calc(@p - 1px), rgba(145,71,255,1) @p, rgba(255,255,255,0) calc(@p + 1px));

		:deep(input) {
			min-width: @inputWidth;
		}

		.header {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			background-color: @mainColor_normal;
			color:@mainColor_light;
			padding: 10px;
			border-top-left-radius: 5px;
			border-top-right-radius: 5px;
			margin-bottom: 10px;
			margin-top: 20px;
		}
	}

	:deep(input) {
		min-width: 50px;
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