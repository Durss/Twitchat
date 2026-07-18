<template>
	<div class="heatdebugpopout" ref="areaHolder">
		<div
			ref="area"
			class="area"
			@click="onClickArea"
			@contextmenu="onClickArea"
			@mousemove="mouseMoveHandler"
		>
			<div class="cursor" ref="cursor"></div>
		</div>

		<div
			v-for="click in clicks"
			class="click"
			:style="getClickStyles(click)"
			:key="click.id"
		></div>

		<div class="ctas">
			<button
				class="fsBt"
				@click="goFullscreen()"
				v-tooltip="t('heat.debug.popout')"
				v-if="!isPopout"
			>
				<Icon name="newtab" />
			</button>
			<button
				class="cacheBt"
				@click="clearOBSCache()"
				v-tooltip="t('heat.debug.obs')"
				v-if="obsConnected"
			>
				<Icon name="obs" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import DataStore from "@/store/DataStore";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import OBSWebsocket from "@/utils/OBSWebsocket";
import HeatSocket from "@/utils/twitch/HeatSocket";
import {
	computed,
	onBeforeUnmount,
	onMounted,
	ref,
	useTemplateRef,
	watch,
	type CSSProperties,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

interface ClickData {
	id: number;
	px: number;
	py: number;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const storeAuth = useStoreAuth();
const storeExtension = useStoreExtension();

const areaHolder = useTemplateRef("areaHolder");
const area = useTemplateRef("area");
const cursor = useTemplateRef("cursor");

const isPopout = ref(false);
const clicks = ref<ClickData[]>([]);

let disposed: boolean = false;
let debugInterval: number = -1;

const obsConnected = computed(() => OBSWebsocket.instance.connected.value);

onMounted(() => {
	isPopout.value = route.name == "heatDebug";
	if (OBSWebsocket.instance.connected.value) {
		refreshImage();
	} else {
		watch(
			() => OBSWebsocket.instance.connected.value,
			() => {
				refreshImage();
			},
		);
	}
	document.addEventListener("keydown", onKeyUp);
});

onBeforeUnmount(() => {
	disposed = true;
	clearTimeout(debugInterval);
	document.removeEventListener("keydown", onKeyUp);
});

function getClickStyles(data: ClickData): CSSProperties {
	const bounds = areaHolder.value!.getBoundingClientRect();
	let res: CSSProperties = {};
	res.left = data.px - bounds.left + "px";
	res.top = data.py - bounds.top + "px";
	return res;
}

function mouseMoveHandler(event: MouseEvent): void {
	const bounds = area.value!.getBoundingClientRect();
	cursor.value!.style.left = event.clientX - bounds.left + "px";
	cursor.value!.style.top = event.clientY - bounds.top + "px";
}

function onClickArea(event: MouseEvent): void {
	if (event.type == "contextmenu") {
		event.preventDefault();
		clearOBSCache();
	}
	const metaKey = event.metaKey || event.ctrlKey;
	const bounds = area.value!.getBoundingClientRect();
	let px = event.clientX - bounds.x;
	let py = event.clientY - bounds.y;
	clicks.value.push({
		id: Math.random(),
		px: event.clientX,
		py: event.clientY,
	});
	window.setTimeout(() => {
		clicks.value.shift();
	}, 500);
	px = px / bounds.width;
	py = py / bounds.height;
	if (HeatSocket.instance.connected.value || storeExtension.companionEnabled) {
		const uid = storeAuth.twitch.user.id;
		HeatSocket.instance.fireEvent(uid, px, py, event.altKey, metaKey, event.shiftKey, true);
	}

	if (window.opener?.simulateHeatClick) {
		window.opener.simulateHeatClick(px, py, event.altKey, metaKey, event.shiftKey);
	}
}

function goFullscreen(): void {
	let params = `scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,directories=no,menubar=no,width=1080,height=800,left=600,top=100`;
	const url = new URL(document.location.origin + router.resolve({ name: "heatDebug" }).href);

	const port = DataStore.get(DataStore.OBS_PORT);
	const pass = DataStore.get(DataStore.OBS_PASS);
	const ip = DataStore.get(DataStore.OBS_IP);
	if (port) url.searchParams.append("obs_port", port);
	if (pass) url.searchParams.append("obs_pass", pass);
	if (ip) url.searchParams.append("obs_ip", ip);

	window.open(url, "heatDebug", params);
}

function clearOBSCache(): void {
	OBSWebsocket.instance.clearSourceTransformCache();
	if (window.opener?.clearOBSCache) {
		window.opener.clearOBSCache();
	}
}

/**
 * Show a debug field on CTRL+ALT+D
 * @param e
 */
function onKeyUp(e: KeyboardEvent): void {
	clearInterval(debugInterval);
	if (e.key.toUpperCase() == "D" && e.ctrlKey && e.altKey) {
		const bounds = area.value!.getBoundingClientRect();
		debugInterval = window.setInterval(() => {
			clearOBSCache();
			onClickArea(
				new MouseEvent("click", {
					clientX: bounds.left,
					clientY: bounds.top,
				}),
			);
		}, 100);
	}
}

/**
 * Grabs an OBS screenshot to set it as area's background
 */
async function refreshImage(): Promise<void> {
	if (disposed) return;
	const holder = areaHolder.value;
	if (holder) {
		const image = await OBSWebsocket.instance.getScreenshot();
		holder.style.backgroundImage = "url(" + image + ")";
	}

	window.setTimeout(() => refreshImage(), 60);
}
</script>

<style scoped lang="less">
.heatdebugpopout {
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	position: absolute;
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center center;
	width: 100%;
	aspect-ratio: 16/9;
	background-color: var(--color-text-inverse);

	.area {
		cursor: none;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100%;
		aspect-ratio: 16/9;
		background-color: var(--color-light-fader);

		&:hover {
			.cursor {
				display: block !important;
			}
		}
	}

	.ctas {
		position: absolute;
		top: 0.5em;
		right: 0.5em;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		.icon {
			color: var(--color-text);
		}
		button {
			cursor: pointer;
			width: 1em;
			height: 1em;
			img {
				width: 100%;
			}
		}
	}

	.click {
		z-index: 999998;
		position: absolute;
		pointer-events: none;
		top: 0;
		left: 0;
		border-radius: 50%;
		border: 1px solid var(--color-primary);
		width: 7px;
		height: 7px;
		transform-origin: center center;
		animation: expandFadeOut 0.5s linear;
		transform: translate(-50%, -50%);

		@keyframes expandFadeOut {
			0% {
				opacity: 1;
			}
			50% {
				opacity: 1;
				width: 15px;
				height: 15px;
			}
			100% {
				opacity: 0;
				width: 20px;
				height: 20px;
			}
		}
	}

	.cursor {
		.emboss();
		pointer-events: none;
		position: absolute;
		z-index: 999999;
		top: 0;
		left: 0;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background-color: var(--color-primary);
		box-shadow: 2px 2px 2px 0px rgba(0, 0, 0, 0.5);
		transform-origin: center center;
		transform: translate(-50%, -50%);
		display: none;
	}
}
</style>
