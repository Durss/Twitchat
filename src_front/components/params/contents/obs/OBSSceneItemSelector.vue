<template>
	<div class="obssceneitemselector">
		<div class="list">
			<button v-for="scene in sceneList"
			@click="listSceneItems(scene.sceneName)"
			:class="sceneItemClasses(scene.sceneName)">{{ scene.sceneName }}</button>
		</div>
		<div class="list">
			<template v-for="source in sceneItems">
				<button @click="sourcePath[0] = source.item.sceneItemId; sourcePath.splice(1);"
				:class="sceneItemClasses(source.item.sceneItemId)">{{ source.item.sourceName }}</button>
				<div class="children" v-if="source.children.length">
					<button class="child" v-for="child in source.children"
					@click="sourcePath[0] = source.item.sceneItemId; sourcePath[1] = child.sceneItemId"
					:class="sceneItemClasses(child.sceneItemId)">{{ child.sourceName }}</button>
				</div>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits: ['update:modelValue', 'change'],
})
export default class OBSSceneItemSelector extends Vue {

	public loading:boolean = true;
	public currentScene:string = "";
	public sourcePath:number[] = [];
	public sceneItems:{item:OBSSourceItem, children:OBSSourceItem[]}[] = [];
	public sceneList:{sceneIndex:number, sceneName:string}[] = [];

	public mounted():void {
		OBSWebsocket.instance.getScenes().then((result)=> {
			this.sceneList = result.scenes;
			this.loading = true;
			this.listSceneItems(this.sceneList[0].sceneName);
		});
	}

	public sceneItemClasses(item:string|number):string[] {
		const res:string[] = [];
		if(this.currentScene == item) res.push("selected");
		this.sourcePath.forEach(v=> {
			if(item == v) res.push("selected");
		})
		return res;
	}

	public async listSceneItems(sceneName:string):Promise<void> {
		if(this.currentScene == sceneName) return;
		this.sourcePath = [];
		this.currentScene = sceneName;
		this.sceneItems = (await OBSWebsocket.instance.getSceneItems(this.currentScene));
	}

}
</script>

<style scoped lang="less">
.obssceneitemselector{
	gap: 1em;
	display: flex;
	flex-direction: row;
	
	.list {
		gap: .25em;
		display: flex;
		flex-direction: column;
		max-height: 250px;
		overflow-y: auto;

		button {
			border-radius: var(--border-radius);
			padding: .25em .5em;
			text-align: left;
			color: var(--color-text);
			background-color:  var(--color-light-fadest);
			transition: background-color .2s;
			&:hover {
				background-color:  var(--color-light-fader);
			}
			&.selected {
				background-color:  var(--color-primary);
				&:hover {
					background-color:  var(--color-primary-light);
				}
			}
		}

		.children {
			gap: .25em;
			display: flex;
			flex-direction: column;
			padding-left: 1em;
		}
	}
}
</style>