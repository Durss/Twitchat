<template>
	<div class="obsscenes">
		<div v-if="sceneParams.length == 0" class="noScene">You have no scene on OBS</div>
		<div class="list" v-else>
			<div class="header">
				<div>OBS Scene</div>
				<div>Chat command</div>
			</div>
			<ParamItem v-for="p in sceneParams"
				class="row"
				:key="p.label"
				:paramData="p"
				@change="onSceneCommandUpdate()"
				ref="param"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterData } from '@/store';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';

@Options({
	props:{},
	components:{
		ParamItem,
	}
})
export default class OBSScenes extends Vue {
	public sceneParams:ParameterData[] = [];

	public mounted():void {
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.listScenes();
		});
		this.listScenes();
	}

	public onSceneCommandUpdate():void {
		const params = this.sceneParams.map(v=> {return { scene:v.storage, command:v.value }});
		store.dispatch("setOBSSceneCommands", params);
	}

	private async listScenes():Promise<void> {
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
		await this.$nextTick();
		const items = (this.$refs.param as Vue[]).map(v => v.$el);
		gsap.from(items, {height:0, paddingTop:0, marginTop:0, duration:0.25, stagger:0.025, delay:.25, clearProps:"all"});
	}

}
</script>

<style scoped lang="less">
.obsscenes{

	.noScene {
		display: block;
		font-style: italic;
		text-align: center;
		background-color: @mainColor_light;
		padding: .25em .5em;
		margin: auto;
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
		}
	}
}
</style>