<template>
	<ToggleBlock
		class="HeatScreenList"
		:title="t('heat.zone_interaction')"
		:open="true"
		:icons="['polygon']"
	>
		<div class="content">
			<i18n-t
				class="infos"
				scope="global"
				tag="div"
				keypath="heat.areas.description"
				v-if="!currentScreen"
			>
				<template #TRIGGER_LINK>
					<a @click="openTriggers()">{{ t("heat.areas.trigger_link") }}</a>
				</template>
			</i18n-t>

			<draggable
				class="areaList"
				v-if="!currentScreen"
				v-model="storeHeat.screenList"
				group="actions"
				item-key="id"
				ghost-class="ghost"
				direction="vertical"
				draggable=".item"
				:animation="250"
			>
				<template #item="{ element, index }: { element: HeatScreen; index: number }">
					<HeatScreenPreview
						class="item"
						:screen="element"
						:key="index"
						@update="editScreen(element, true)"
						@click="editScreen(element)"
						@delete="deleteScreen"
						@duplicate="duplicateScreen"
						:canDuplicate="canCreateScreens"
					/>
				</template>
				<template #footer>
					<TTButton
						class="item"
						icon="add"
						@click="createScreen()"
						v-if="canCreateScreens"
					></TTButton>

					<PremiumLimitMessage
						v-else
						label="heat.nonpremium_limit"
						premiumLabel="heat.premium_limit"
						:max="Config.instance.MAX_CUSTOM_HEAT_SCREENS"
						:maxPremium="Config.instance.MAX_CUSTOM_HEAT_SCREENS_PREMIUM"
					/>
				</template>
			</draggable>

			<HeatScreenEditor
				v-else
				:screen="currentScreen"
				@update="editScreen(currentScreen!, true)"
				@close="currentScreen = null"
			/>
		</div>
	</ToggleBlock>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type { HeatScreen } from "@/types/HeatDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import PremiumLimitMessage from "../../PremiumLimitMessage.vue";
import HeatScreenEditor from "./areas/HeatScreenEditor.vue";
import HeatScreenPreview from "./areas/HeatScreenPreview.vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeHeat = useStoreHeat();
const storeParams = useStoreParams();
const currentScreen = ref<HeatScreen | null>(null);

const maxScreens = computed(() => {
	return storeAuth.isPremium
		? Config.instance.MAX_CUSTOM_HEAT_SCREENS_PREMIUM
		: Config.instance.MAX_CUSTOM_HEAT_SCREENS;
});
const canCreateScreens = computed(() => {
	return storeHeat.screenList.length < maxScreens.value;
});

function openTriggers(): void {
	storeParams.currentPage = TwitchatDataTypes.ParameterPages.TRIGGERS;
}

/**
 * Called when clicking "+" (new screen) button
 */
function createScreen(): void {
	const id = storeHeat.createScreen();
	currentScreen.value = storeHeat.screenList.find((v) => v.id == id) || null;
}

/**
 * Called when clicking edit button
 */
function editScreen(screen: HeatScreen, saveOnly = false): void {
	if (!saveOnly) {
		currentScreen.value = screen;
	}
	storeHeat.updateScreen(screen);
}

/**
 * Called when clicking duplicate button
 */
function duplicateScreen(id: string): void {
	storeHeat.duplicateScreen(id);
}

/**
 * Called when clicking premium button
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Called when clicking delete button
 */
function deleteScreen(id: string): void {
	confirm(t("heat.areas.delete_confirm.title"), t("heat.areas.delete_confirm.description"))
		.then(() => {
			storeHeat.deleteScreen(id);
		})
		.catch((error) => {
			/*ignore*/
		});
}
</script>

<style scoped lang="less">
.HeatScreenList {
	width: 100%;

	.content {
		gap: 0.5em;
		display: flex;
		flex-direction: column;

		.infos {
			text-align: center;
		}

		.areaList {
			gap: 5px;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;

			.item:not(.premiumBt) {
				width: 30%;
				min-width: 100px;
				aspect-ratio: 16/9;

				&.premiumBt {
					:deep(.icon) {
						height: 2em;
						width: 2em;
						max-width: 2em;
					}
				}
			}
		}
	}
}
</style>
