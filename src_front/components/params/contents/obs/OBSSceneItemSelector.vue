<template>
	<div class="obssceneitemselector">
		<div class="list">
			<button v-for="scene in sceneList"
			@click="listSceneItems(scene.sceneName)"
			:class="sceneItemClasses(scene.sceneName)">{{ scene.sceneName }}</button>
		</div>
		<div class="list">
			<template v-for="source in sceneItems">
				<button @click="sourcePath[0] = source.item; sourcePath.splice(1);"
				:class="sourceItemClasses(source.item)">{{ source.item.sourceName }}</button>
				<div class="children" v-if="source.children.length">
					<button class="child" v-for="child in source.children"
					@click="sourcePath[0] = source.item; sourcePath[1] = child"
					:class="sourceItemClasses(child)">{{ child.sourceName }}</button>
				</div>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits: ['update:modelValue', 'change'],
})
export default class OBSSceneItemSelector extends Vue {

	@Prop({default:[]})
	public modelValue!:string|Omit<OBSSourceItem, "sceneItemTransform">[];

	public loading:boolean = true;
	public currentScene:string = "";
	public sourcePath:OBSSourceItem[] = [];
	public sceneItems:{item:OBSSourceItem, children:OBSSourceItem[]}[] = [];
	public sceneList:{sceneIndex:number, sceneName:string}[] = [];

	public mounted():void {
		OBSWebsocket.instance.getScenes().then((result)=> {
			this.sceneList = result.scenes;
			this.loading = true;
			this.listSceneItems(this.sceneList[0].sceneName);
		});

		watch(()=>this.currentScene, ()=> this.valueChanged(), {deep:true});
		watch(()=>this.sourcePath, ()=> this.valueChanged(), {deep:true});
	}

	public sceneItemClasses(name:string):string[] {
		const res:string[] = [];
		if(this.currentScene == name) res.push("selected");
		return res;
	}

	public sourceItemClasses(item:OBSSourceItem):string[] {
		const res:string[] = [];
		this.sourcePath.forEach(v=> {
			if(item.sceneItemId == v.sceneItemId) res.push("selected");
		})
		return res;
	}

	public async listSceneItems(sceneName:string):Promise<void> {
		if(this.currentScene == sceneName) return;
		this.sourcePath = [];
		this.currentScene = sceneName;
		this.sceneItems = (await OBSWebsocket.instance.getSceneItems(this.currentScene));
		console.log(this.sceneItems);

		this.$emit("update:modelValue", [sceneName]);
	}

	public valueChanged():void {
		const path:(string|Omit<OBSSourceItem, "sceneItemTransform">)[] = [];
		
		if(this.currentScene) path.push(this.currentScene);

		if(this.sourcePath.length > 0){
			//Only keeps the declared props. OBS actuaally returns more like the transform which we don't care about
			let reduced = this.sourcePath.map((v):Omit<OBSSourceItem, "sceneItemTransform">=> {
				return {
					inputKind:v.inputKind,
					isGroup:v.isGroup,
					sceneItemId:v.sceneItemId,
					sceneItemIndex:v.sceneItemIndex,
					sourceName:v.sourceName,
					sourceType:v.sourceType,
				}
			})
			path.push(...reduced);
		}

		this.$emit("update:modelValue", path);
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