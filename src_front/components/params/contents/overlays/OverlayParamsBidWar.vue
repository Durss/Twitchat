<template>
	<div class="overlayparamsbidwar overlayParamsSection">
		<div class="header">{{ t("overlay.bidWar.header") }}</div>

		<LimitCounter
			v-if="storeBidWar.bidWarList.length > 0"
			:count="storeBidWar.bidWarList.length"
			:max="$config.MAX_BID_WAR"
			:maxPremium="$config.MAX_BID_WAR_PREMIUM"
		/>

		<VueDraggable
			class="entryList"
			v-model="storeBidWar.bidWarList"
			:group="{ name: 'bidwars' }"
			handle=".header"
			:animation="250"
			@end="storeBidWar.saveData()"
		>
			<ToggleBlock
				v-for="entry in storeBidWar.bidWarList"
				editableTitle
				v-model:title="entry.title"
				:titleDefault="t('overlay.bidWar.default_title')"
				:titleMaxLengh="60"
				:open="false"
				:key="entry.id"
				:disabled="!entry.enabled"
				@update:title="onChange(entry)"
			>
				<template #right_actions>
					<TTButton
						class="actionBt"
						@click.stop
						:copy="entry.id"
						icon="id"
						v-tooltip="t('global.copy_id')"
					/>
					<TTButton @click.stop="storeBidWar.deleteBidWar(entry.id)" icon="trash" alert />
				</template>

				<template #left_actions>
					<ToggleButton
						v-model="entry.enabled"
						@change="onChange(entry)"
						@click.stop
						v-if="
							storeAuth.isPremium ||
							entry.enabled ||
							storeBidWar.bidWarList.filter((v) => v.enabled).length <
								$config.MAX_BID_WAR
						"
					/>
				</template>

				<div class="content">
					<div class="overlayInstallCard">
						<h1><Icon name="obs" />{{ t("overlay.bidWar.install_title") }}</h1>
						<OverlayInstaller
							type="bidwar"
							:sourceSuffix="entry.title"
							:id="entry.id"
							:sourceTransform="{ width: 800, height: 160 }"
						/>
					</div>

					<TipPlatformSelector
						v-model="entry.platforms"
						:label="t('overlay.bidWar.param_platforms')"
						:platforms="platformList"
						@change="onChange(entry)"
					/>

					<div class="sideList">
						<div
							class="card-item side"
							v-for="(side, index) in entry.sides"
							:key="index"
							:style="{ '--side-color': side.color }"
						>
							<div class="sideTitle">
								{{ t("overlay.bidWar.side_title", { INDEX: index + 1 }) }}
							</div>
							<ParamItem
								:paramData="param_keyword[entry.id + '_' + index]!"
								v-model="side.keyword"
								@change="onChange(entry)"
								noBackground
							/>
							<ParamItem
								:paramData="param_color[entry.id + '_' + index]!"
								v-model="side.color"
								@change="onChange(entry)"
								noBackground
							/>
							<ParamItem
								class="dark"
								:paramData="param_amount[entry.id + '_' + index]!"
								v-model="side.amount"
								@change="onChange(entry)"
							/>
						</div>
					</div>

					<CurrencyPatternInput v-model="entry.currency" @change="onChange(entry)" />

					<TTButton class="resetBt" icon="refresh" alert @click="onReset(entry.id)">{{
						t("overlay.bidWar.reset_bt")
					}}</TTButton>
				</div>
			</ToggleBlock>
		</VueDraggable>

		<section>
			<TTButton class="addBt" v-if="!maxReached" @click="addEntry()" icon="add">{{
				t("overlay.bidWar.add_bt")
			}}</TTButton>

			<PremiumLimitMessage
				v-else
				label="overlay.bidWar.non_premium_limit"
				premiumLabel="overlay.bidWar.premium_limit"
				:max="$config.MAX_BID_WAR"
				:maxPremium="$config.MAX_BID_WAR_PREMIUM"
			/>
		</section>
	</div>
</template>

<script setup lang="ts">
import CurrencyPatternInput from "@/components/CurrencyPatternInput.vue";
import Icon from "@/components/Icon.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeBidWar as useStoreBidWar } from "@/store/bid_war/storeBidWar";
import { storeMain as useStoreMain } from "@/store/storeMain";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { computed, onBeforeMount, ref } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useI18n } from "vue-i18n";
import ToggleBlock from "../../../ToggleBlock.vue";
import TTButton from "../../../TTButton.vue";
import LimitCounter from "../../LimitCounter.vue";
import ParamItem from "../../ParamItem.vue";
import PremiumLimitMessage from "../../PremiumLimitMessage.vue";
import OverlayInstaller from "./OverlayInstaller.vue";
import TipPlatformSelector from "./TipPlatformSelector.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeMain = useStoreMain();
const storeBidWar = useStoreBidWar();

/**
 * Only platforms that allow to send a message with the tip
 */
const platformList: (keyof TwitchatDataTypes.BidWarData["platforms"])[] = [
	"streamlabs",
	"streamelements",
	"tipeee",
	"kofi",
	"tiltify",
	"streamlabs_charity",
];

const param_keyword = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_amount = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_color = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});

const maxReached = computed(() => {
	const count = storeBidWar.bidWarList.length;
	const max = storeAuth.isPremium
		? Config.instance.MAX_BID_WAR_PREMIUM
		: Config.instance.MAX_BID_WAR;
	return count >= max;
});

onBeforeMount(() => {
	initParams();
});

/**
 * Create parameters for every bid war
 */
function initParams(): void {
	storeBidWar.bidWarList.forEach((entry) => {
		const id = entry.id;
		if (param_keyword.value[id + "_0"]) return;
		entry.sides.forEach((_side, index) => {
			const key = id + "_" + index;
			param_keyword.value[key] = {
				type: "string",
				value: "",
				maxLength: 30,
				labelKey: "overlay.bidWar.param_keyword",
				placeholderKey: "overlay.bidWar.param_keyword_placeholder",
				icon: "label",
			};
			param_amount.value[key] = {
				type: "number",
				value: 0,
				min: 0,
				max: 1_000_000_000,
				step: 0.01,
				labelKey: "overlay.bidWar.param_amount",
				icon: "coin",
			};
			param_color.value[key] = {
				type: "color",
				value: "",
				labelKey: "overlay.bidWar.param_color",
				icon: "color",
			};
		});
	});
}

/**
 * Saves data and updates overlay on change
 */
function onChange(entry: TwitchatDataTypes.BidWarData): void {
	storeBidWar.saveData();
	storeBidWar.broadcastStates(entry.id);
}

/**
 * Creates a new bid war
 */
function addEntry(): void {
	storeBidWar.createBidWar();
	initParams();
}

/**
 * Resets amounts after confirmation
 */
function onReset(id: string): void {
	storeMain
		.confirm(t("overlay.bidWar.reset_confirm.title"), t("overlay.bidWar.reset_confirm.message"))
		.then(() => storeBidWar.resetAmounts(id))
		.catch(() => {});
}
</script>

<style scoped lang="less">
.overlayparamsbidwar {
	.entryList,
	.content {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.sideList {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;

		.side {
			flex: 1 1 250px;
			min-width: 0;
			gap: 0.25em;
			display: flex;
			flex-direction: column;

			.sideTitle {
				gap: 0.5em;
				display: flex;
				align-items: center;
				font-weight: bold;
				&::before {
					content: "";
					width: 0.8em;
					height: 0.8em;
					border-radius: 50%;
					background-color: var(--side-color);
				}
			}
		}
	}

	.resetBt {
		align-self: center;
	}
}
</style>
