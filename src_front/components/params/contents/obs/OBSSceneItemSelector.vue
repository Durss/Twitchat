<template>
	<div class="obssceneitemselector">
		<div class="list">
			<div class="head">{{ t("obs.scenes") }}</div>
			<button
				v-for="scene in sceneList"
				@click="listSceneItems(scene.sceneName)"
				:class="sceneItemClasses(scene.sceneName)"
			>
				{{ scene.sceneName }}
			</button>
		</div>

		<div class="verticalSplitter" v-if="sceneItems.length > -1"></div>

		<div class="list" v-if="sceneItems.length > 0">
			<div class="head">{{ t("obs.sources") }}</div>
			<template v-for="source in sceneItems" :key="source.item.sceneItemId">
				<button @click="selectItem(source.item)" :class="sourceItemClasses(source.item)">
					{{ source.item.sourceName }}
				</button>

				<div class="children" v-if="source.children.length">
					<button
						class="child"
						v-for="child in source.children"
						:key="child.sceneItemId"
						@click="
							selectItem(source.item);
							selectItem(child);
						"
						:class="sourceItemClasses(child)"
					>
						{{ child.sourceName }}
					</button>
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

<script setup lang="ts">
import OBSWebsocket, { type OBSItemPath, type OBSSourceItem } from "@/utils/OBSWebsocket";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		modelValue?: OBSItemPath;
	}>(),
	{
		modelValue: () => [] as unknown as OBSItemPath,
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: OBSItemPath];
	change: [];
}>();

const { t } = useI18n();

const loading = ref(true);
const sceneItems = ref<{ item: OBSSourceItem; children: OBSSourceItem[] }[]>([]);
const sceneList = ref<{ sceneIndex: number; sceneName: string }[]>([]);

let obsEventHandler!: () => void;

onMounted(() => {
	listScenes();

	obsEventHandler = () => listScenes();
	OBSWebsocket.instance.socket.on("SceneCreated", obsEventHandler);
	OBSWebsocket.instance.socket.on("SceneRemoved", obsEventHandler);
	OBSWebsocket.instance.socket.on("SceneNameChanged", obsEventHandler);
	OBSWebsocket.instance.socket.on("SceneItemCreated", obsEventHandler);
	OBSWebsocket.instance.socket.on("SceneItemRemoved", obsEventHandler);
	OBSWebsocket.instance.socket.on("InputNameChanged", obsEventHandler);
	OBSWebsocket.instance.socket.on("SceneItemListReindexed", obsEventHandler);
});

onBeforeUnmount(() => {
	OBSWebsocket.instance.socket.off("SceneCreated", obsEventHandler);
	OBSWebsocket.instance.socket.off("SceneRemoved", obsEventHandler);
	OBSWebsocket.instance.socket.off("SceneNameChanged", obsEventHandler);
	OBSWebsocket.instance.socket.off("SceneItemCreated", obsEventHandler);
	OBSWebsocket.instance.socket.off("SceneItemRemoved", obsEventHandler);
	OBSWebsocket.instance.socket.off("InputNameChanged", obsEventHandler);
	OBSWebsocket.instance.socket.off("SceneItemListReindexed", obsEventHandler);
});

function sceneItemClasses(name: string): string[] {
	const res: string[] = [];
	if (props.modelValue.sceneName == name) res.push("selected");
	return res;
}

function sourceItemClasses(item: OBSSourceItem): string[] {
	const res: string[] = [];
	if (item.sourceName == props.modelValue.groupName) res.push("selected");
	if (item.sceneItemId == props.modelValue.source.id) res.push("selected");
	return res;
}

async function listSceneItems(sceneName: string, resetPath: boolean = true): Promise<void> {
	props.modelValue.sceneName = sceneName;
	if (resetPath) {
		props.modelValue.groupName = "";
		props.modelValue.source.id = 0;
		props.modelValue.source.name = "";
	}
	sceneItems.value = await OBSWebsocket.instance.getSceneItems(props.modelValue.sceneName);
}

async function selectItem(item: OBSSourceItem): Promise<void> {
	if (item.isGroup) {
		props.modelValue.groupName = item.sourceName;
		props.modelValue.source.id = 0;
		props.modelValue.source.name = "";
	} else {
		props.modelValue.source.id = item.sceneItemId;
		props.modelValue.source.name = item.sourceName;
	}
}

function listScenes(): void {
	OBSWebsocket.instance.getScenes().then((result) => {
		sceneList.value = result.scenes;
		loading.value = true;
		if (props.modelValue.sceneName) {
			listSceneItems(props.modelValue.sceneName, false);
		}
	});

	emit("change");
}
</script>

<style scoped lang="less">
.obssceneitemselector {
	gap: 0.5em;
	display: flex;
	flex-direction: row;
	width: 100%;

	.verticalSplitter {
		width: 1px;
		flex-shrink: 1;
		background-color: var(--color-light-fade);
	}

	.list {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		max-height: 250px;
		overflow-y: auto;
		flex-grow: 1;
		flex-basis: 50%;

		.head {
			text-align: center;
			font-weight: bold;
			margin-bottom: 0.5em;
			padding: 0.5em 0;
			border-bottom: 2px solid var(--grayout);
			background-color: var(--background-color-secondary);
			position: sticky;
			top: 0;
		}

		button {
			border-radius: var(--border-radius);
			padding: 0.25em 0.5em;
			text-align: left;
			color: var(--color-text);
			background-color: var(--color-light-fade);
			transition:
				background-color 0.2s,
				color 0.2s;
			&:hover {
				background-color: var(--color-light);
				color: var(--color-dark);
			}
			&.selected {
				color: var(--color-light);
				background-color: var(--color-primary);
				&:hover {
					background-color: var(--color-primary-light);
				}
			}
		}

		.placeholder {
			background-color: var(--color-light-fade);
			border-radius: var(--border-radius);
			padding: 0.25em 0.5em;
			opacity: 0.4;
			line-height: normal;
			text-align: center;
			&:nth-of-type(3) {
				opacity: 0.2;
			}
			&:nth-of-type(4) {
				opacity: 0.05;
			}
		}

		.children {
			gap: 0.25em;
			display: flex;
			flex-direction: column;
			padding-left: 1em;
		}
	}
}
</style>
