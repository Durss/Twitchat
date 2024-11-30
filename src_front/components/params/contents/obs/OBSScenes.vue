<template>
	<div class="obsscenes">
		<div v-if="sceneParams.length == 0" class="card-item secondary noScene">{{ $t("obs.scenes_empty") }}</div>
		<div class="list" v-else>
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
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		ParamItem,
	}
})
class OBSScenes extends Vue {

	public sceneParams:TwitchatDataTypes.ParameterData<string, unknown, unknown, {sceneIndex:number, sceneName:string}>[] = [];

	public mounted():void {
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.listScenes();
		});
		this.listScenes();
	}

	public onSceneCommandUpdate():void {
		const params = this.sceneParams
		.map(v=> {return { scene:v.storage!, command:v.value }})
		.filter(v=> (v.command ?? "") != "");
		this.$store.obs.setOBSSceneCommands(params);
	}

	private async listScenes():Promise<void> {
		this.sceneParams = []
		const res = await OBSWebsocket.instance.getScenes();
		const storedScenes = this.$store.obs.sceneCommands;
		for (let i = 0; i < res.scenes.length; i++) {
			const scene = res.scenes[i] as {sceneIndex:number, sceneName:string};
			const storedScene = storedScenes.find((s:{scene:{sceneName:string}}) => s.scene.sceneName === scene.sceneName);
			const value = storedScene? storedScene.command : "";
			this.sceneParams.push(
				{ type:"string", value, label:scene.sceneName, storage:scene, placeholder:"!command" }
			);
		}
		await this.$nextTick();
		const items = (this.$refs.param as Vue[]).map(v => v.$el);
		gsap.from(items, {height:0, paddingTop:0, marginTop:0, paddingBottom:0, marginBottom:0, duration:0.25, stagger:0.05, clearProps:"all"});
	}

}
export default toNative(OBSScenes);
</script>

<style scoped lang="less">
.obsscenes{

	.noScene {
		text-align: center;
	}

	.list {
		gap: .25em;
		display: flex;
		flex-direction: column;
		.row {
			align-items: center;
			overflow: hidden;
	
			:deep(input), :deep(.inputHolder) {
				flex-basis: 150px;
				width: 150px;
				flex-grow: unset !important;
			}
		}
	}
}
</style>