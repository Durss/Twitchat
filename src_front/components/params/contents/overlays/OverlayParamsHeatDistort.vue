<template>
	<div
		class="overlayparamsheatdistort overlayParamsSection"
		:title="$t('overlay.heatDistort.title')"
		:icons="['distort']"
	>
		<a
			href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiFEaYkIgqPNw3Iwdp4ui1KD"
			target="_blank"
			class="youtubeTutorialBt"
		>
			<Icon name="youtube" theme="light" />
			<span>{{ $t("overlay.youtube_demo_tt") }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<div class="card-item alert center" v-if="!obsConnected">
			<p>{{ $t("heat.need_OBS") }}</p>
			<TTButton class="button" icon="obs" light alert @click="openObs()">{{
				$t("heat.need_OBS_connectBt")
			}}</TTButton>
		</div>

		<template v-else>
			<div class="header">{{ $t("overlay.heatDistort.description") }}</div>

			<template v-for="(item, index) in distortionList" :key="item.id">
				<HeatDistortParams
					v-model="distortionList[index]"
					@delete="deleteDistorsion"
					@created="distortionCreated"
					:ref="(el: ComponentPublicInstance | null) => { if (el) distortionRefs[item.id] = el; else delete distortionRefs[item.id] }"
				/>
			</template>

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

			<TTButton
				class="item center"
				icon="add"
				primary
				@click="addDistortion()"
				v-if="distortionList.length < maxEntries"
				>{{ $t("overlay.heatDistort.add_overlay") }}</TTButton
			>

			<TTButton
				class="item center"
				icon="add"
				premium
				@click="expandPremiumInfo = true"
				v-else-if="!expandPremiumInfo && !isPremium"
				>{{ $t("overlay.heatDistort.add_overlay") }}</TTButton
			>

			<div class="card-item maximumReached" v-else>
				<p class="label">
					<Icon name="alert" />
					<i18n-t scope="global" keypath="overlay.heatDistort.max_reached">
						<template #COUNT>{{ premiumCount }}</template>
					</i18n-t>
				</p>
				<TTButton icon="premium" premium v-if="!isPremium" @click="becomePremium()">{{
					$t("premium.become_premiumBt")
				}}</TTButton>
			</div>

			<div class="card-item item footer">
				<Icon name="alert" />
				<i18n-t scope="global" tag="span" keypath="overlay.heatDistort.install">
					<template #HEAT>
						<a @click="openHeat()">{{ $t("overlay.heatDistort.install_heat_link") }}</a>
					</template>
					<template #SHADER>
						<a href="https://www.shadertastic.com" target="_blank">{{
							$t("overlay.heatDistort.install_shader_link")
						}}</a>
					</template>
				</i18n-t>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import OBSWebsocket from "@/utils/OBSWebsocket";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onBeforeMount, ref, useTemplateRef, watch, type ComponentPublicInstance } from "vue";
import HeatDistortParams from "./heat/HeatDistortParams.vue";

const storeAuth = useStoreAuth();
const storeHeat = useStoreHeat();
const storeParams = useStoreParams();

const expandPremiumInfo = ref<boolean>(false);
const shaderstasticError = ref<boolean>(false);
const error = useTemplateRef<HTMLDivElement>("error");
const distortionRefs: Record<string, ComponentPublicInstance> = {};

const obsConnected = computed(() => OBSWebsocket.instance.connected.value);
const isPremium = computed(() => storeAuth.isPremium);
const maxEntries = computed(() =>
	isPremium.value
		? Config.instance.MAX_DISTORTION_OVERLAYS_PREMIUM
		: Config.instance.MAX_DISTORTION_OVERLAYS,
);
const premiumCount = computed(() => Config.instance.MAX_DISTORTION_OVERLAYS_PREMIUM);
const distortionList = computed(() => storeHeat.distortionList);

onBeforeMount(() => {
	watch(
		() => distortionList.value,
		() => storeHeat.saveDistorsions(),
		{ deep: true },
	);
});

function openHeat(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.HEAT,
	);
}

function openObs(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.OBS,
	);
}

function addDistortion(): void {
	const id = Utils.getUUID();
	storeHeat.distortionList.push({
		id,
		name: "",
		enabled: true,
		refuseAnon: false,
		triggerOnly: false,
		effect: "liquid",
		filterName: "",
		browserSourceName: "",
		obsItemPath: {
			groupName: "",
			sceneName: "",
			source: {
				id: 0,
				name: "",
			},
		},
		permissions: Utils.getDefaultPermissions(),
	});

	nextTick().then(() => {
		const holder = distortionRefs[id];
		if (!holder) return;
		gsap.from(holder.$el, {
			height: 0,
			paddingTop: 0,
			paddingBottom: 0,
			duration: 0.35,
			ease: "back.out",
			clearProps: "all",
		});
	});
}

function becomePremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Called when a new distotion has been created and the overlay installed
 * @param sourceName
 * @param vo
 * @param suffix
 */
async function distortionCreated(
	sourceName: string,
	vo: TwitchatDataTypes.HeatDistortionData,
	suffix: string,
): Promise<void> {
	let filterTarget = "";
	if (vo.obsItemPath.source.name) filterTarget = vo.obsItemPath.source.name;
	else if (vo.obsItemPath.groupName) filterTarget = vo.obsItemPath.groupName;
	else if (vo.obsItemPath.sceneName) filterTarget = vo.obsItemPath.sceneName;

	const filterSettings = {
		"displacement_map_source.displacement_map": sourceName,
		effect: "displacement_map_source",
		"displacement_map_source.color_space": 0,
		"displacement_map_source.displace_mode": 1,
		"displacement_map_source.displacement_strength_x": 0.05,
		"displacement_map_source.displacement_strength_y": 0.05,
	};
	const filterName = ("Heat Distortion" + suffix).substring(0, 100);
	vo.filterName = filterName;
	vo.browserSourceName = sourceName;

	const params = {
		sourceName: filterTarget,
		filterKind: "shadertastic_filter",
		filterName,
		filterSettings,
	};
	try {
		await OBSWebsocket.instance.socket.call("CreateSourceFilter", params);
	} catch (err) {
		shaderstasticError.value = true;
		//Remove browser source created before
		const sceneItem = await OBSWebsocket.instance.searchSceneItemId(
			sourceName,
			vo.obsItemPath.sceneName,
		);
		if (sceneItem) {
			await OBSWebsocket.instance.socket.call("RemoveSceneItem", {
				sceneItemId: sceneItem.itemId,
				sceneName: vo.obsItemPath.sceneName,
			});
		}

		await nextTick();
		gsap.from(error.value!, {
			duration: 0.5,
			ease: "back.out",
			padding: 0,
			height: 0,
			delay: 0.5,
		});
	}
}

function deleteDistorsion(data: TwitchatDataTypes.HeatDistortionData): void {
	storeHeat.deleteDistorsion(data);
}
</script>

<style scoped lang="less">
.overlayparamsheatdistort {
	.maximumReached {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		background-color: var(--color-premium-fader);
		.icon {
			height: 1em;
			margin-right: 0.5em;
		}
		.label {
			text-align: center;
			white-space: pre-line;
			line-height: 1.25em;
		}
	}

	&.alert {
		align-items: center;
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
}
</style>
