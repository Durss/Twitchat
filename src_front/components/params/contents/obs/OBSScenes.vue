<template>
	<div class="obsscenes">
		<div v-if="sceneParams.length == 0" class="card-item secondary noScene">
			{{ t("obs.scenes_empty") }}
		</div>
		<div class="list" v-else>
			<ParamItem
				v-for="p in sceneParams"
				class="row"
				:key="p.label"
				:paramData="p"
				@change="onSceneCommandUpdate()"
				ref="param"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeOBS as useStoreOBS } from "@/store/obs/storeOBS";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import { gsap } from "gsap/gsap-core";
import { nextTick, onMounted, ref, useTemplateRef, watch, type ComponentPublicInstance } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";

const { t } = useI18n();
const storeOBS = useStoreOBS();

const param = useTemplateRef<ComponentPublicInstance[]>("param");

const sceneParams = ref<
	TwitchatDataTypes.ParameterData<
		string,
		unknown,
		unknown,
		{ sceneIndex: number; sceneName: string }
	>[]
>([]);

onMounted(() => {
	watch(
		() => OBSWebsocket.instance.connected.value,
		() => {
			listScenes();
		},
	);
	listScenes();
});

function onSceneCommandUpdate(): void {
	const params = sceneParams.value
		.map((v) => {
			return { scene: v.storage!, command: v.value };
		})
		.filter((v) => (v.command ?? "") != "");
	storeOBS.setOBSSceneCommands(params);
}

async function listScenes(): Promise<void> {
	sceneParams.value = [];
	const res = await OBSWebsocket.instance.getScenes();
	const storedScenes = storeOBS.sceneCommands;
	for (let i = 0; i < res.scenes.length; i++) {
		const scene = res.scenes[i] as { sceneIndex: number; sceneName: string };
		const storedScene = storedScenes.find(
			(s: { scene: { sceneName: string } }) => s.scene.sceneName === scene.sceneName,
		);
		const value = storedScene ? storedScene.command : "";
		sceneParams.value.push({
			type: "string",
			value,
			label: scene.sceneName,
			storage: scene,
			placeholder: "!command",
		});
	}
	await nextTick();
	const items = (param.value ?? []).map((v) => v.$el);
	gsap.from(items, {
		height: 0,
		paddingTop: 0,
		marginTop: 0,
		paddingBottom: 0,
		marginBottom: 0,
		duration: 0.25,
		stagger: 0.05,
		clearProps: "all",
	});
}
</script>

<style scoped lang="less">
.obsscenes {
	.noScene {
		text-align: center;
	}

	.list {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		.row {
			:deep(input),
			:deep(.inputHolder) {
				flex-basis: 150px;
				flex-grow: unset !important;
			}
		}
	}
}
</style>
