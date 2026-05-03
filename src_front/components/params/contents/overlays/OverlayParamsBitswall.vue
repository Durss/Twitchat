<template>
	<div class="overlayparamsbitswall overlayParamsSection">
		<a
			href="https://www.youtube.com/watch?v=7rC4MAqAQR0"
			target="_blank"
			class="youtubeTutorialBt"
		>
			<Icon name="youtube" theme="light" />
			<span>{{ $t("overlay.youtube_demo_tt") }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<div class="header">{{ $t("overlay.bitswall.head") }}</div>

		<section class="overlayInstallCard">
			<h1><Icon name="obs" />{{ $t("bingo_grid.form.install_title") }}</h1>

			<div
				class="card-item"
				@mouseenter="showShaderEffect = true"
				@mouseleave="showShaderEffect = false"
			>
				<ParamItem
					:paramData="param_cristalEffect"
					v-model="param_cristalEffect.value"
					noBackground
				/>

				<div :class="showShaderEffect ? 'demo open' : 'demo'">
					<img
						src="@/assets/img/bitswall/cheermotes_render.gif"
						:class="param_cristalEffect.value ? 'shader' : ''"
					/>
				</div>

				<div
					class="card-item alert error"
					v-if="shaderstasticError"
					@click="shaderstasticError = false"
					ref="error"
				>
					<Icon name="alert" />
					<i18n-t scope="global" keypath="overlay.heatDistort.shadertastic_missing">
						<template #URL>
							<a href="https://www.shadertastic.com" target="_blank">{{
								$t("overlay.heatDistort.shadertastic_missing_url")
							}}</a>
						</template>
					</i18n-t>
				</div>
			</div>

			<OverlayInstaller
				type="bitswall"
				:id="
					param_cristalEffect.value
						? 'twitchat_bitswall_overlay_shader'
						: 'twitchat_bitswall_overlay'
				"
				:orderToBottom="param_cristalEffect.value"
				:sourceSuffix="param_cristalEffect.value ? '_shader' : ''"
				:queryParams="{ mode: param_cristalEffect.value ? 'shader' : 'normal' }"
				:css="'html, body{ background-color:transparent;}'"
				:sourceTransform="{
					cropLeft: param_cristalEffect.value ? 1920 : 0,
					width: param_cristalEffect.value ? 3840 : 1920,
				}"
				@obsSourceCreated="onObsSourceCreated"
			>
				<template v-if="param_cristalEffect.value">
					<h2><Icon name="info" />{{ $t("overlay.install_instructions_title") }}</h2>
					<p v-html="$t('overlay.bitswall.install_instructions')"></p>
				</template>
			</OverlayInstaller>
		</section>

		<section>
			<ParamItem :paramData="param_textureAlpha" v-model="parameters.opacity" />

			<ParamItem :paramData="param_size" v-model="parameters.size">
				<img
					class="cheerScale"
					src="@/assets/img/bitswall/10000_tex.png"
					:style="{ height: 128 * (param_size.value / 100) + 'px' }"
				/>
			</ParamItem>

			<ParamItem :paramData="param_break" v-model="parameters.break">
				<ParamItem
					:paramData="param_break_senderOnly"
					v-model="parameters.break_senderOnly"
					class="child"
					noBackground
				/>
			</ParamItem>

			<ParamItem :paramData="param_durations" v-model="param_durations.value">
				<div class="cheermotesDuration">
					<ParamItem
						:paramData="param_duration_1"
						class="cheermote"
						noBackground
						noPremiumLock
						v-model="parameters.break_durations!['1']"
					/>
					<ParamItem
						:paramData="param_duration_100"
						class="cheermote"
						noBackground
						noPremiumLock
						v-model="parameters.break_durations!['100']"
					/>
					<ParamItem
						:paramData="param_duration_1000"
						class="cheermote"
						noBackground
						noPremiumLock
						v-model="parameters.break_durations!['1000']"
					/>
					<ParamItem
						:paramData="param_duration_5000"
						class="cheermote"
						noBackground
						noPremiumLock
						v-model="parameters.break_durations!['5000']"
					/>
					<ParamItem
						:paramData="param_duration_10000"
						class="cheermote"
						noBackground
						noPremiumLock
						v-model="parameters.break_durations!['10000']"
					/>
				</div>
			</ParamItem>

			<template v-if="overlayExists">
				<TTButton class="center" :loading="loading" @click="testOverlay()" icon="test">{{
					$t("overlay.bitswall.testBt")
				}}</TTButton>
				<p class="pinnedCheersTitle">{{ $t("overlay.bitswall.simulate_pinned") }}</p>
				<div class="pinnedCheers">
					<TTButton class="center" :loading="loading" @click="testOverlay(1)" icon="test"
						>{{ $t("overlay.bitswall.simulate_pinned_level") }} 1</TTButton
					>
					<TTButton class="center" :loading="loading" @click="testOverlay(2)">2</TTButton>
					<TTButton class="center" :loading="loading" @click="testOverlay(3)">3</TTButton>
					<TTButton class="center" :loading="loading" @click="testOverlay(4)">4</TTButton>
					<TTButton class="center" :loading="loading" @click="testOverlay(5)">5</TTButton>
					<TTButton class="center" :loading="loading" @click="testOverlay(6)">6</TTButton>
					<TTButton class="center" :loading="loading" @click="testOverlay(7)">7</TTButton>
					<TTButton class="center" :loading="loading" @click="testOverlay(8)">8</TTButton>
				</div>
			</template>

			<Icon
				class="center loader card-item"
				name="loader"
				v-else-if="checkingOverlayAtStart"
			/>

			<div class="center card-item alert" v-else-if="!overlayExists">
				{{ $t("overlay.overlay_not_configured") }}
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import DataStore from "@/store/DataStore";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import { nextTick, onBeforeMount, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";
import ParamItem from "../../ParamItem.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const storeAuth = useStoreAuth();

const loading = ref(false);
const overlayExists = ref(false);
const checkingOverlayAtStart = ref(true);
const shaderstasticError = ref(false);
const showShaderEffect = ref(false);

const param_size = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 100,
	min: 10,
	max: 200,
	labelKey: "overlay.bitswall.param_size",
	icon: "scale",
});
const param_break = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.bitswall.param_break",
	icon: "click",
});
const param_break_senderOnly = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.bitswall.param_break_senderOnly",
	icon: "bits",
	tooltipKey: "heat.anonymous",
});
const param_cristalEffect = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.bitswall.param_cristalEffect",
});
const param_textureAlpha = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 75,
	min: 0,
	max: 100,
	labelKey: "overlay.bitswall.param_textureAlpha",
});
const param_durations = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	noInput: true,
	labelKey: "overlay.bitswall.param_durations",
	icon: "timer",
	premiumOnly: true,
});
const param_duration_1 = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 10,
	min: 1,
	max: 3600 * 24 - 1,
	iconURL: StoreProxy.asset("img/bitswall/1_tex.png"),
	premiumOnly: true,
});
const param_duration_100 = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 20,
	min: 1,
	max: 3600 * 24 - 1,
	iconURL: StoreProxy.asset("img/bitswall/100_tex.png"),
	premiumOnly: true,
});
const param_duration_1000 = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 30,
	min: 1,
	max: 3600 * 24 - 1,
	iconURL: StoreProxy.asset("img/bitswall/1000_tex.png"),
	premiumOnly: true,
});
const param_duration_5000 = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 40,
	min: 1,
	max: 3600 * 24 - 1,
	iconURL: StoreProxy.asset("img/bitswall/5000_tex.png"),
	premiumOnly: true,
});
const param_duration_10000 = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 50,
	min: 1,
	max: 3600 * 24 - 1,
	iconURL: StoreProxy.asset("img/bitswall/10000_tex.png"),
	premiumOnly: true,
});
const parameters = ref<TwitchatDataTypes.BitsWallOverlayData>({
	size: 25,
	opacity: 25,
	break: false,
	break_senderOnly: true,
	break_durations: {
		"1": 10,
		"100": 20,
		"1000": 30,
		"5000": 40,
		"10000": 50,
	},
});

const errorRef = useTemplateRef<HTMLDivElement>("error");

let checkInterval: number = -1;
let subcheckTimeout: number = -1;
let overlayPresenceHandler!: () => void;

onBeforeMount(() => {
	const paramsJSON = DataStore.get(DataStore.BITS_WALL_PARAMS);
	if (paramsJSON) {
		const parsed = JSON.parse(paramsJSON) as TwitchatDataTypes.BitsWallOverlayData;
		if (parsed.size != undefined) parameters.value.size = parsed.size;
		if (parsed.break != undefined) parameters.value.break = parsed.break;
		if (parsed.opacity != undefined) parameters.value.opacity = parsed.opacity;
		if (parsed.break_senderOnly != undefined)
			parameters.value.break_senderOnly = parsed.break_senderOnly;
		if (parsed.break_durations != undefined) {
			parameters.value.break_durations!["1"] = parsed.break_durations["1"] ?? 10;
			parameters.value.break_durations!["100"] = parsed.break_durations["100"] ?? 20;
			parameters.value.break_durations!["1000"] = parsed.break_durations["1000"] ?? 30;
			parameters.value.break_durations!["5000"] = parsed.break_durations["5000"] ?? 40;
			parameters.value.break_durations!["10000"] = parsed.break_durations["10000"] ?? 50;
		}
	}

	overlayPresenceHandler = () => {
		overlayExists.value = true;
		checkingOverlayAtStart.value = false;
		clearTimeout(subcheckTimeout);
	};
	PublicAPI.instance.addEventListener("ON_BITSWALL_OVERLAY_PRESENCE", overlayPresenceHandler);

	//Regularly check if the overlay exists
	checkInterval = window.setInterval(() => {
		PublicAPI.instance.broadcast("GET_BITSWALL_OVERLAY_PRESENCE");
		clearTimeout(subcheckTimeout);
		//If after 1,5s the overlay didn't answer, assume it doesn't exist
		subcheckTimeout = window.setTimeout(() => {
			overlayExists.value = false;
			checkingOverlayAtStart.value = false;
		}, 1500);
	}, 2000);

	watch(
		() => parameters.value,
		() => {
			DataStore.set(DataStore.BITS_WALL_PARAMS, parameters.value);
			PublicAPI.instance.broadcast("ON_BITSWALL_OVERLAY_CONFIGS", parameters.value);
		},
		{ deep: true },
	);
});

onBeforeUnmount(() => {
	clearInterval(checkInterval);
	clearTimeout(subcheckTimeout);
	PublicAPI.instance.removeEventListener("ON_BITSWALL_OVERLAY_PRESENCE", overlayPresenceHandler);
});

function testOverlay(pinLevel: number = -1): void {
	const user = storeAuth.twitch.user;
	const wsMessage = {
		channel: user.id,
		message: "",
		message_chunks: [],
		user: {
			id: user.id,
			login: user.login,
			displayName: user.displayNameOriginal,
		},
		bits: Utils.pickRand([115, 410, 715, 1510, 5210, 18410]),
		pinned: pinLevel > -1,
		pinLevel: pinLevel - 1,
	};

	PublicAPI.instance.broadcast("ON_BITS", wsMessage);
}

/**
 * Called when a new distotion has been created and the overlay installed
 * @param sourceName
 * @param vo
 * @param suffix
 */
async function onObsSourceCreated(data: { sourceName: string }): Promise<void> {
	if (param_cristalEffect.value.value !== true) return;

	let filterTarget = await OBSWebsocket.instance.getCurrentScene();

	const filterSettings = {
		effect: "displacement_map_source",
		"displacement_map_source.displacement_map": data.sourceName,
		"displacement_map_source.color_space": 0,
		"displacement_map_source.displace_mode": 1,
		"displacement_map_source.displacement_strength_x": 0.1,
		"displacement_map_source.displacement_strength_y": 0.1,
	};

	const filterName = ("BitsWall_shader (" + filterTarget + ")").substring(0, 100);
	const params = {
		sourceName: filterTarget,
		filterKind: "shadertastic_filter",
		filterName,
		filterSettings,
	};
	try {
		await OBSWebsocket.instance.socket.call("CreateSourceFilter", params);
	} catch (error) {
		shaderstasticError.value = true;
		//Remove browser source created before
		const sceneItem = await OBSWebsocket.instance.searchSceneItemId(
			data.sourceName,
			filterTarget,
		);
		if (sceneItem) {
			await OBSWebsocket.instance.socket.call("RemoveSceneItem", {
				sceneItemId: sceneItem.itemId,
				sceneName: filterTarget,
			});
		}

		await nextTick();

		gsap.from(errorRef.value as HTMLDivElement, {
			duration: 0.5,
			ease: "back.out",
			padding: 0,
			height: 0,
			delay: 0.5,
		});
	}
}
</script>

<style scoped lang="less">
.overlayparamsbitswall {
	.demo {
		@scale: 1;
		position: relative;
		width: (855px / 2) * @scale;
		max-width: 75vw;
		height: 0;
		margin: auto;
		border-radius: var(--border-radius);
		overflow: hidden;
		background-color: #022a20;
		transition: height 0.25s;
		&.open {
			margin-top: 0.5em;
			height: 100px * @scale;
		}
		img {
			height: 100px * @scale;
			position: relative;
			&:not(.shader) {
				top: 1px;
				left: -(855px / 2) * @scale - 4px;
			}
		}
	}

	.cheerScale {
		margin: auto;
		margin-top: 0.5em;
		display: block;
	}
	.pinnedCheersTitle {
		text-align: center;
	}
	.pinnedCheers {
		gap: 0;
		display: flex;
		flex-direction: row;
		justify-content: center;
		.button {
			margin: 0;
			border-radius: 0;
			&:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			&:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
		}
	}
	.error {
		text-align: center;
		white-space: pre-line;
		line-height: 1.25em;
		cursor: pointer;
		.icon {
			height: 1em;
			margin-right: 0.5em;
		}
	}

	:deep(ul) {
		list-style: decimal;
		list-style-position: inside;
		margin-left: 1em;
	}

	h2 {
		text-align: center;
		font-size: 2em;
		line-height: 1.25em;
		margin-bottom: 0.25em;
		.icon {
			height: 1em;
			vertical-align: middle;
			margin-right: 0.25em;
		}
	}

	.cheermotesDuration {
		gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		padding-top: 0.5em;
		.cheermote {
			background-color: transparent;
			:deep(.content) {
				align-items: center;
				.paramIcon {
					height: 2em !important;
					width: 2em;
					object-fit: contain;
					vertical-align: middle;
				}
			}
		}
	}
}
</style>

