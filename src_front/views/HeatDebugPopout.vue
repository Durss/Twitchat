<template>
	<div
		class="heatdebugpopout"
		ref="areaHolder"
		@mouseenter="hovered = true"
		@mouseleave="hovered = false"
	>
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

		<div class="keys">
			<div class="row">
				<div
					class="timeoutBar"
					v-if="typedKeys.length > 0"
					:key="typedKeys.at(-1)?.id"
				></div>
				<div
					v-for="key in typedKeys"
					class="key"
					:key="key.id"
					:style="{ '--rot': key.rotate + 'deg' }"
				>
					<svg v-if="key.icon" class="keyIcon" viewBox="0 0 24 24">
						<path :d="key.icon" />
					</svg>
					<template v-else>{{ key.label }}</template>
				</div>
			</div>
			<div class="row sent">
				<div
					v-for="(key, index) in sentKeys"
					class="key"
					:key="key.id"
					:style="{
						'--rot': key.rotate + 'deg',
						'--spin': key.rotate * 27 + 'deg',
						'--i': index,
					}"
				>
					<svg v-if="key.icon" class="keyIcon" viewBox="0 0 24 24">
						<path :d="key.icon" />
					</svg>
					<template v-else>{{ key.label }}</template>
				</div>
			</div>
		</div>

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
				:disabled="loading"
				class="cacheBt"
				@click="clearOBSCache()"
				v-tooltip="t('heat.debug.obs')"
				v-if="obsConnected"
			>
				<Icon :name="loading ? 'loader' : 'obs'" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import DataStore from "@/store/DataStore";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import OBSWebsocket from "@/utils/OBSWebsocket";
import HeatSocket from "@/utils/twitch/HeatSocket";
import Utils from "@/utils/Utils";
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

interface KeyData {
	id: number;
	label: string;
	icon?: string;
	rotate: number;
}

const MAX_KEYS = 20;
const INACTIVITY_MS = 1500;
const NAMED_KEYS: Record<string, string> = {
	" ": "␣",
	Control: "Ctrl",
	Alt: "Alt",
	Shift: "Shift",
	ArrowUp: "↑",
	ArrowDown: "↓",
	ArrowLeft: "←",
	ArrowRight: "→",
	Enter: "↵",
	Tab: "↹",
};
const KEY_ICONS: Record<string, string> = {
	" ": "M5 10v4M19 10v4M5 14h14",
	Tab: "M4 12h12M12 8l4 4-4 4M20 6v12",
	Enter: "M19 6v6H5M10 7l-5 5 5 5",
	ArrowUp: "M12 19V5M6 11l6-6 6 6",
	ArrowDown: "M12 5v14M6 13l6 6 6-6",
	ArrowLeft: "M19 12H5M11 6l-6 6 6 6",
	ArrowRight: "M5 12h14M13 6l6 6-6 6",
};

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const storeAuth = useStoreAuth();
const storeExtension = useStoreExtension();
const storeHeat = useStoreHeat();

const areaHolder = useTemplateRef("areaHolder");
const area = useTemplateRef("area");
const cursor = useTemplateRef("cursor");

const isPopout = ref(false);
const loading = ref(false);
const clicks = ref<ClickData[]>([]);
const hovered = ref(false);
const typedKeys = ref<KeyData[]>([]);
const sentKeys = ref<KeyData[]>([]);

let disposed: boolean = false;
let debugInterval: number = -1;
let keyUid: number = 0;
let sendTimeout: number = -1;
let sentTimeout: number = -1;

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
	document.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
	disposed = true;
	clearTimeout(debugInterval);
	clearTimeout(sendTimeout);
	clearTimeout(sentTimeout);
	document.removeEventListener("keydown", onKeyUp);
	document.removeEventListener("keydown", onKeyDown);
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

async function clearOBSCache(): Promise<void> {
	loading.value = true;
	OBSWebsocket.instance.clearSourceTransformCache();
	if (window.opener?.clearOBSCache) {
		window.opener.clearOBSCache();
	}
	await Utils.promisedTimeout(1000);
	loading.value = false;
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
 * Called when typing keys
 */
function onKeyDown(e: KeyboardEvent): void {
	if (!isPopout.value && !hovered.value) return;
	const target = e.target as HTMLElement;
	if (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target?.isContentEditable
	)
		return;
	if (e.key === "Backspace") {
		// Avoid browser's "back" navigation
		e.preventDefault();
		typedKeys.value.pop();
		scheduleSend();
		return;
	}
	if (e.key === "Escape") {
		// Avoid closing params
		e.preventDefault();
		return;
	}
	if (e.repeat) return;
	if (!(e.key in NAMED_KEYS) && !/^[a-zA-Z0-9.+\-/*=&#]$/.test(e.key)) return;

	const companionEnabled = isPopout.value
		? window.opener?.isHeatCompanionEnabled?.() === true
		: storeExtension.companionEnabled;
	if (!companionEnabled) return;

	//Keep browser shortcuts working
	if (!e.ctrlKey && !e.metaKey) e.preventDefault();

	typedKeys.value.push({
		id: ++keyUid,
		label: NAMED_KEYS[e.key] ?? e.key.toUpperCase(),
		icon: KEY_ICONS[e.key],
		rotate: (Math.random() - 0.5) * 20,
	});
	if (typedKeys.value.length > MAX_KEYS) typedKeys.value.shift();
	scheduleSend();
}

/**
 * Schedule keys send
 */
function scheduleSend(): void {
	clearTimeout(sendTimeout);
	if (typedKeys.value.length == 0) return;
	sendTimeout = window.setTimeout(() => sendKeys(), INACTIVITY_MS);
}

/**
 * Sends typed keys after the inactivity delay
 */
function sendKeys(): void {
	const keys = typedKeys.value.map((v) => v.label);
	sentKeys.value = typedKeys.value;
	typedKeys.value = [];

	if (isPopout.value) {
		window.opener?.simulateHeatKeys?.(keys);
	} else {
		void storeHeat.handleKeysEvent(keys, storeAuth.twitch.user.id);
	}

	// Clear keys after send CSS animation completes
	clearTimeout(sentTimeout);
	sentTimeout = window.setTimeout(() => (sentKeys.value = []), INACTIVITY_MS);
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

	.keys {
		position: absolute;
		inset: 0;
		opacity: 0.75;
		overflow: hidden;
		pointer-events: none;
		container-type: size;

		.row {
			position: absolute;
			top: 25%;
			left: 5%;
			right: 5%;
			gap: 0.4cqw;
			display: flex;
			flex-wrap: wrap;
			justify-content: center;
		}

		.timeoutBar {
			position: absolute;
			bottom: 100%;
			left: 50%;
			margin-bottom: 2cqh;
			height: 0.25cqh;
			border-radius: 0.25cqw;
			background: linear-gradient(90deg, #fff 0%, #ccc 100%);
			filter: drop-shadow(1px 2px #000000);
			transform: translateX(-50%);
			animation: timeoutBar 1.5s linear forwards;
		}

		.key {
			position: relative;
			padding: 0.5em;
			font-size: 2cqw;
			line-height: 0.8em;
			font-weight: bold;
			color: #333;
			border-radius: 0.25em;
			background: linear-gradient(0deg, #aaa 10%, #ccc 30% 70%, #fff 100%);
			filter: drop-shadow(1px 3px #000000);
			transform: rotate(var(--rot));
			animation: keyIn 0.25s cubic-bezier(0.34, 1.9, 0.64, 1);

			//Inner bevel. Negative z-index keeps it under the text as the
			//filter/transform make the key its own stacking context
			&::before {
				content: "";
				position: absolute;
				z-index: -1;
				top: 7.5%;
				left: 7.5%;
				width: 85%;
				height: 85%;
				border-radius: 0.2em;
				background: linear-gradient(180deg, #aaa 10%, #ccc 30% 70%, #fff 100%);
			}

			.keyIcon {
				display: block;
				width: 1em;
				height: 1em;
				fill: none;
				stroke: currentColor;
				stroke-width: 2.25;
				stroke-linecap: round;
				stroke-linejoin: round;
			}
		}

		.sent .key {
			background: linear-gradient(0deg, #16a34a 10%, #4ade80 30% 70%, #bbf7d0 100%);
			animation: keySent 1.1s both;
			animation-delay: calc(var(--i) * 0.02s);
			&::before {
				background: linear-gradient(180deg, #15803d 10%, #22c55e 30% 70%, #86efac 100%);
			}
		}

		@keyframes timeoutBar {
			from {
				width: 20cqw;
			}
			to {
				width: 0;
			}
		}

		@keyframes keyIn {
			from {
				opacity: 0;
				transform: rotate(var(--rot)) scale(0);
			}
		}

		@keyframes keySent {
			0% {
				transform: rotate(var(--rot)) scale(1);
			}
			10% {
				transform: rotate(var(--rot)) scale(1.25);
				animation-timing-function: ease-out;
			}
			40% {
				opacity: 1;
				transform: translateY(-1.8em) rotate(var(--rot)) scale(1.25);
				animation-timing-function: ease-in;
			}
			100% {
				opacity: 0;
				transform: translateY(30em) rotate(var(--spin)) scale(1);
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
