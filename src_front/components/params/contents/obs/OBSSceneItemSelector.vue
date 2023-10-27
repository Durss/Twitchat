<template>
	<div class="obssceneitemselector">
		<div class="list">
			<div class="head">{{ $t("obs.scenes") }}</div>
			<button v-for="scene in sceneList"
				@click="listSceneItems(scene.sceneName, true)"
				:class="sceneItemClasses(scene.sceneName)">{{ scene.sceneName }}</button>
		</div>

		<div class="verticalSplitter" v-if="sceneItems.length > -1"></div>

		<div class="list" v-if="sceneItems.length > 0">
			<div class="head">{{ $t("obs.sources") }}</div>
			<template v-for="source in sceneItems" :key="source.item.sceneItemId">
				<button @click="sourcePath[0] = source.item; sourcePath.splice(1);"
					:class="sourceItemClasses(source.item)">{{ source.item.sourceName }}</button>

				<div class="children" v-if="source.children.length">
					<button class="child" v-for="child in source.children" :key="child.sceneItemId"
						@click="sourcePath[0] = source.item; sourcePath[1] = child"
						:class="sourceItemClasses(child)">{{ child.sourceName }}</button>
				</div>
			</template>
		</div>
		<div class="list" v-else>
			<div class="head">Sources</div>
			<div class="placeholder">{{ $t("overlay.heatDistort.select_scene") }}</div>
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
	public modelValue!:(string|Omit<OBSSourceItem, "sceneItemTransform">)[];

	public loading:boolean = true;
	public currentScene:string = "";
	public sourcePath:OBSSourceItem[] = [];
	public sceneItems:{item:OBSSourceItem, children:OBSSourceItem[]}[] = [];
	public sceneList:{sceneIndex:number, sceneName:string}[] = [];

	private obsEventHandler!:()=>void;

	public mounted():void {
		if(this.modelValue.length > 0 && typeof this.modelValue[0] === "string") {
			this.currentScene = this.modelValue[0] as string;
		}
		if(this.modelValue.length > 1) {
			this.sourcePath = this.modelValue.concat().filter(v=> typeof v != "string") as OBSSourceItem[];
		}

		this.$nextTick().then(()=> {
			watch(()=>this.currentScene, ()=> this.valueChanged(), {deep:true});
			watch(()=>this.sourcePath, ()=> this.valueChanged(), {deep:true});
		})
		
		this.listScenes();

		this.obsEventHandler = ()=> this.listScenes();
		OBSWebsocket.instance.socket.on("SceneCreated", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("SceneRemoved", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("SceneNameChanged", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("SceneItemCreated", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("SceneItemRemoved", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("InputNameChanged", this.obsEventHandler);
		OBSWebsocket.instance.socket.on("SceneItemListReindexed", this.obsEventHandler);
	}

	public beforeUnmount():void {
		OBSWebsocket.instance.socket.off("SceneCreated", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("SceneRemoved", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("SceneNameChanged", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("SceneItemCreated", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("SceneItemRemoved", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("InputNameChanged", this.obsEventHandler);
		OBSWebsocket.instance.socket.off("SceneItemListReindexed", this.obsEventHandler);
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

	public async listSceneItems(sceneName:string, resetPath:boolean = false, force:boolean = false):Promise<void> {
		if(resetPath) this.sourcePath = [];
		if(this.currentScene == sceneName && force !== true) return;
		this.currentScene = sceneName;
		this.sceneItems = (await OBSWebsocket.instance.getSceneItems(this.currentScene));

		this.valueChanged();
	}

	private valueChanged():void {
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

	private listScenes():void {
		OBSWebsocket.instance.getScenes().then((result)=> {
			this.sceneList = result.scenes;
			this.loading = true;
			if(this.currentScene) {
				this.listSceneItems(this.currentScene, false, true);
			}
		});
	}

}
</script>

<style scoped lang="less">
.obssceneitemselector{
	gap: .5em;
	display: flex;
	flex-direction: row;
	width: 100%;

	.verticalSplitter{
		width: 1px;
		flex-shrink: 1;
		background-color: var(--color-light-fade);
	}
	
	.list {
		gap: .25em;
		display: flex;
		flex-direction: column;
		max-height: 250px;
		overflow-y: auto;
		flex-grow: 1;
		flex-basis: 50%;

		.head {
			text-align: center;
			font-weight: bold;
			margin-bottom: .5em;
			padding: .5em 0;
			border-bottom: 1px solid var(--color-light-fade);
			background-color: var(--color-dark-fadest);
		}

		button {
			font-size: 1rem;
			border-radius: var(--border-radius);
			padding: .25em .5em;
			text-align: left;
			color: var(--color-text);
			background-color:  var(--color-light-fade);
			transition: background-color .2s, color .2s;
			&:hover {
				background-color:  var(--color-light);
				color: var(--color-dark);
			}
			&.selected {
				color: var(--color-light);
				background-color:  var(--color-primary);
				&:hover {
					background-color:  var(--color-primary-light);
				}
			}
		}

		.placeholder {
			font-size: 1rem;
			background-color: var(--color-light-fade);
			border-radius: var(--border-radius);
			padding: .25em .5em;
			opacity: .5;
			text-align: center;
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