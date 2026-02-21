<template>
	<div class="card-item overlaypresencechecker" v-if="obsConnected && !overlayFound">
		<Icon v-if="checkingOverlay" class="loader" name="loader" />
		<div>{{ $t("global.state_overlay_not_found", { NAME: props.overlayName }) }}</div>
		<OverlayInstaller light
			:id="props.overlayId"
			:type="props.overlayType"
			:sceneName="props.sceneName"
			@obsSourceCreated="checkOverlay()" />
	</div>
	
	<div class="card-item overlaypresencechecker" v-else-if="obsConnected && !sourceVisible">
		<Icon v-if="checkingOverlay" class="loader" name="loader" />
		<div>{{ $t("global.state_overlay_not_visible", { NAME: props.overlayName }) }}</div>
		<TTButton icon="show" light @click="showOverlay()">{{$t("global.show")}}</TTButton>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebSocket from '@/utils/OBSWebSocket';
import Utils from '@/utils/Utils';
import { onBeforeUnmount, ref } from 'vue';
import OverlayInstaller from '../params/contents/overlays/OverlayInstaller.vue';
import TTButton from '../TTButton.vue';

const obsConnected = OBSWebSocket.instance.connected;
const overlaySource = ref<{sceneName?:string, sceneItemId:number}>();
const overlayFound = ref(false);
const checkingOverlay = ref(false);
const sourceVisible = ref(false);
const props = defineProps<{
	overlayId?:string,
	sceneName?:string,
	overlayName:string,
	overlayType:TwitchatDataTypes.OverlayTypes,
}>();


async function showOverlay():Promise<void> {
	if(overlaySource.value) {
		checkingOverlay.value = true;
		await OBSWebSocket.instance.socket.call("SetSceneItemEnabled", {sceneItemEnabled:true, sceneItemId:overlaySource.value.sceneItemId, sceneName:overlaySource.value.sceneName!});
		checkOverlay();
	}
}

async function checkOverlay():Promise<void> {
	if(!obsConnected || checkingOverlay.value) return;

	const sourceRes = await OBSWebSocket.instance.getSources(true);
	const params = props.overlayId? [{k:"twitchat_overlay_id", v:props.overlayId}] : [];
	const urlRef = new URL(Utils.overlayURL(props.overlayType, params));
	
	let localOverlayFound = false;
	let localSourceVisible = false;
	checkingOverlay.value = sourceRes.length > 0;
	for (const source of sourceRes) {
		if(source.inputKind != "browser_source") continue;
		
		const settingsRes = await OBSWebSocket.instance.getSourceSettings<{is_local_file:boolean, url:string, local_file:string}>(source.sourceName);
		localOverlayFound = false;
		localSourceVisible = false;
		const localFile = settingsRes.inputSettings.is_local_file === true;
		let url = "";
		if(localFile) {
			url = settingsRes.inputSettings.local_file as string || "";
		}else{
			url = settingsRes.inputSettings.url as string || "";
		}
		url = url.toLowerCase();
		const hasValidId = props.overlayId? url.indexOf(`twitchat_overlay_id=${props.overlayId.toLowerCase()}`) > -1 : true;
		if(!hasValidId) continue;
		if(url.indexOf(document.location.host.toLowerCase()) > -1
		&& url.indexOf(urlRef.pathname.toLowerCase()) > -1) {
			localOverlayFound = true;
			if(source.sceneName) {
				const visibleRes = await OBSWebSocket.instance.socket.call("GetSceneItemEnabled", {
					sceneName:source.sceneName,
					sceneItemId:source.sceneItemId,
				});
				overlaySource.value = source;
				localSourceVisible ||= visibleRes.sceneItemEnabled;
			}
		}
	}
	checkingOverlay.value = false;
	overlayFound.value = localOverlayFound;
	sourceVisible.value = localSourceVisible;
}

let overlayCheckInterval = window.setInterval(() => checkOverlay(), 5000);

onBeforeUnmount(() => {
	window.clearInterval(overlayCheckInterval);
});
checkOverlay();
</script>

<style scoped lang="less">
.overlaypresencechecker{
	.bevel();
	background-color: rgba(0, 0, 0, .25);
	font-size: .85em;
	gap: .5em;
	padding: .5em;
	display: flex;
	flex-direction: column;
	align-items: center;
	position: relative;

	.loader {
		position: absolute;
		top: .25em;
		right: .25em;
		width: 1em;
	}
}
</style>