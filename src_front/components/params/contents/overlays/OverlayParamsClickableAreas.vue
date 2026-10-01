<template>
	<div class="overlayparamsclickableareas overlayParamsSection">
		<i18n-t class="header" scope="global" tag="div" keypath="heat.areas.description">
			<template #TRIGGER_LINK>
				<a @click="openTriggers()">{{ t("heat.areas.trigger_link") }}</a>
			</template>
		</i18n-t>

		<div
			class="card-item installWarning"
			:class="{ alert: !shouldEnableClicks, secondary: shouldEnableClicks }"
			v-if="!canClickOnStream"
		>
			<Icon name="alert" />
			<div v-if="shouldEnableClicks" class="mustEnableClicks">
				<p>{{ t("heat.must_enable_clicks") }}</p>
				<TTButton
					icon="click"
					secondary
					light
					@click="enableCompanionCLicks()"
					:loading="loading"
					>{{ t("twitchat_companion.enable_click") }}</TTButton
				>
			</div>
			<i18n-t tag="div" scope="global" keypath="heat.must_enable_extension" v-else>
				<template #COMPANION>
					<a href="#" @click="openCompanion()"><strong>Twitchat companion</strong></a>
				</template>
				<template #HEAT>
					<a href="#" @click="openHeat()"><strong>Heat</strong></a>
				</template>
			</i18n-t>
		</div>

		<HeatDebug />

		<VueDraggable
			class="areaList"
			v-model="storeHeat.screenList"
			:animation="250"
			handle=".header"
		>
			<HeatScreenEntry
				v-for="screen in storeHeat.screenList"
				:data="screen"
				:key="screen.id"
			/>
		</VueDraggable>

		<div class="createForm">
			<TTButton class="addBt" v-if="canCreateScreens" @click="createScreen()" icon="add">{{
				t("heat.add_bt")
			}}</TTButton>

			<PremiumLimitMessage
				v-else
				label="heat.nonpremium_limit"
				premiumLabel="heat.premium_limit"
				:max="$config.MAX_CUSTOM_HEAT_SCREENS"
				:maxPremium="$config.MAX_CUSTOM_HEAT_SCREENS_PREMIUM"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type { HeatScreen } from "@/types/HeatDataTypes.js";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes.js";
import Config from "@/utils/Config.js";
import HeatSocket from "@/utils/twitch/HeatSocket.js";
import { computed, ref } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useI18n } from "vue-i18n";
import HeatDebug from "../heat/HeatDebug.vue";
import HeatScreenEntry from "../heat/areas/HeatScreenEntry.vue";
import PremiumLimitMessage from "../../PremiumLimitMessage.vue";
import Utils from "@/utils/Utils.js";
import { toast } from "@/utils/toast/toast.js";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeHeat = useStoreHeat();
const storeParams = useStoreParams();
const storeExtension = useStoreExtension();
const currentScreen = ref<HeatScreen | null>(null);
const loading = ref(false);

const maxScreens = computed(() => {
	return storeAuth.isPremium
		? Config.instance.MAX_CUSTOM_HEAT_SCREENS_PREMIUM
		: Config.instance.MAX_CUSTOM_HEAT_SCREENS;
});

const canCreateScreens = computed(() => {
	return storeHeat.screenList.length < maxScreens.value;
});

const shouldEnableClicks = computed(() => {
	return (
		(storeExtension.companionEnabled && !storeExtension.ebsConfigs.captureClicks) ||
		loading.value
	);
});

const canClickOnStream = computed(() => {
	if (loading.value) return false;
	if (storeExtension.companionEnabled) return storeExtension.ebsConfigs.captureClicks;
	else
		return (
			storeExtension.enabledExtensions.find((v) => v.name == "Heat") &&
			HeatSocket.instance.connected.value &&
			storeHeat.enabled
		);
});

function openTriggers(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

function openCompanion(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.TWITCHAT_COMPANION,
	);
}

function openHeat(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.HEAT,
	);
}

async function enableCompanionCLicks(): Promise<void> {
	loading.value = true;
	await Utils.promisedTimeout(100);
	storeExtension.ebsConfigs.captureClicks = true;
	const success = await storeExtension.updateEBSConfigs();
	if (!success) {
		storeExtension.ebsConfigs.captureClicks = false;
		toast(t("error.failed_updating_ebs"), { type: "error" });
	}
	loading.value = false;
}

/**
 * Called when clicking "+" (new screen) button
 */
function createScreen(): void {
	const id = storeHeat.createScreen();
	currentScreen.value = storeHeat.screenList.find((v) => v.id == id) || null;
}
</script>

<style scoped lang="less">
.overlayparamsclickableareas {
	.areaList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.createForm {
		text-align: center;
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.installWarning {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		.icon {
			height: 1.5em;
			flex-shrink: 0;
		}
	}

	.mustEnableClicks {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
