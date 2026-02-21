<template>
	<div class="obssceneitemselector">
		<div class="list">
			<div class="head">{{ $t("obs.scenes") }}</div>
			<button v-for="scene in sceneList"
				@click="listSceneItems(scene.sceneName)"
				:class="sceneItemClasses(scene.sceneName)">{{ scene.sceneName }}</button>
		</div>

		<div class="verticalSplitter" v-if="sceneItems.length > -1"></div>

		<div class="list" v-if="sceneItems.length > 0">
			<div class="head">{{ $t("obs.sources") }}</div>
			<template v-for="source in sceneItems" :key="source.item.sceneItemId">
				<button @click="selectItem(source.item)"
					:class="sourceItemClasses(source.item)">{{ source.item.sourceName }}</button>

				<div class="children" v-if="source.children.length">
					<button class="child" v-for="child in source.children" :key="child.sceneItemId"
						@click="selectItem(source.item); selectItem(child)"
						:class="sourceItemClasses(child)">{{ child.sourceName }}</button>
				</div>
			</template>
		</div>
		<div class="list" v-else>
			<div class="head">Sources</div>
			<div class="placeholder"> </div>
			<div class="placeholder"> </div>
			<div class="placeholder"> </div>
			<!-- <div class="placeholder">{{ $t("overlay.heatDistort.select_scene") }}</div> -->
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebSocket, { type OBSItemPath, type OBSSourceItem } from '@/utils/OBSWebSocket';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits: ['update:modelValue', 'change'],
})
class OBSSceneItemSelector extends Vue {

	@Prop({default:[]})
	public modelValue!:OBSItemPath;

	public loading:boolean = true;
	public sceneItems:{item:OBSSourceItem, children:OBSSourceItem[]}[] = [];
	public sceneList:{sceneIndex:number, sceneName:string}[] = [];

	private obsEventHandler!:()=>void;

	public mounted():void {
		this.listScenes();

		this.obsEventHandler = ()=> this.listScenes();
		OBSWebSocket.instance.socket.on("SceneCreated", this.obsEventHandler);
		OBSWebSocket.instance.socket.on("SceneRemoved", this.obsEventHandler);
		OBSWebSocket.instance.socket.on("SceneNameChanged", this.obsEventHandler);
		OBSWebSocket.instance.socket.on("SceneItemCreated", this.obsEventHandler);
		OBSWebSocket.instance.socket.on("SceneItemRemoved", this.obsEventHandler);
		OBSWebSocket.instance.socket.on("InputNameChanged", this.obsEventHandler);
		OBSWebSocket.instance.socket.on("SceneItemListReindexed", this.obsEventHandler);
	}

	public beforeUnmount():void {
		OBSWebSocket.instance.socket.off("SceneCreated", this.obsEventHandler);
		OBSWebSocket.instance.socket.off("SceneRemoved", this.obsEventHandler);
		OBSWebSocket.instance.socket.off("SceneNameChanged", this.obsEventHandler);
		OBSWebSocket.instance.socket.off("SceneItemCreated", this.obsEventHandler);
		OBSWebSocket.instance.socket.off("SceneItemRemoved", this.obsEventHandler);
		OBSWebSocket.instance.socket.off("InputNameChanged", this.obsEventHandler);
		OBSWebSocket.instance.socket.off("SceneItemListReindexed", this.obsEventHandler);
	}

	public sceneItemClasses(name:string):string[] {
		const res:string[] = [];
		if(this.modelValue.sceneName == name) res.push("selected");
		return res;
	}

	public sourceItemClasses(item:OBSSourceItem):string[] {
		const res:string[] = [];
		if(item.sourceName == this.modelValue.groupName) res.push("selected");
		if(item.sceneItemId == this.modelValue.source.id) res.push("selected");
		return res;
	}

	public async listSceneItems(sceneName:string, resetPath:boolean = true):Promise<void> {
		this.modelValue.sceneName = sceneName;
		if(resetPath) {
			this.modelValue.groupName = "";
			this.modelValue.source.id = 0;
			this.modelValue.source.name = "";
		}
		this.sceneItems = (await OBSWebSocket.instance.getSceneItems(this.modelValue.sceneName));
	}

	public async selectItem(item:OBSSourceItem):Promise<void> {
		if(item.isGroup) {
			this.modelValue.groupName = item.sourceName;
			this.modelValue.source.id = 0;
			this.modelValue.source.name = "";
		}else{
			this.modelValue.source.id = item.sceneItemId;
			this.modelValue.source.name = item.sourceName;
		}
	}

	private listScenes():void {
		OBSWebSocket.instance.getScenes().then((result)=> {
			this.sceneList = result.scenes;
			this.loading = true;
			if(this.modelValue.sceneName) {
				this.listSceneItems(this.modelValue.sceneName, false);
			}
		});
		
		this.$emit("change");
	}

}
export default toNative(OBSSceneItemSelector);
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
			border-bottom: 2px solid var(--grayout);
			background-color: var(--background-color-secondary);
			position: sticky;
			top: 0;
		}

		button {
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
			background-color: var(--color-light-fade);
			border-radius: var(--border-radius);
			padding: .25em .5em;
			opacity: .4;
			line-height: normal;
			text-align: center;
			&:nth-of-type(3) {
				opacity: .2;
			}
			&:nth-of-type(4) {
				opacity: .05;
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