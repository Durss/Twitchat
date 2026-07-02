<template>
	<div :class="classes">
		<div class="header">{{ t("overlay.credits.head") }}</div>

		<a
			href="https://www.youtube.com/watch?v=0S9SgAi8IOI"
			target="_blank"
			class="youtubeTutorialBt"
		>
			<Icon name="youtube" theme="light" />
			<span>{{ t("overlay.youtube_demo_tt") }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<section class="overlayInstallCard">
			<h1><Icon name="obs" />{{ t("bingo_grid.form.install_title") }}</h1>
			<OverlayInstaller
				class="installer"
				type="credits"
				@obsSourceCreated="getOverlayPresence(true)"
			>
				<Icon name="alert" class="alertIcon" />{{
					t("overlay.credits.manual_install_instructions")
				}}
			</OverlayInstaller>
		</section>

		<ToggleBlock :icons="['params']" small :title="t('global.settings')" :open="false">
			<div class="settings">
				<ParamItem
					:paramData="param_scale"
					v-model="storeEndingCredits.overlayData.scale"
				/>
				<ParamItem
					:paramData="param_padding"
					v-model="storeEndingCredits.overlayData.padding"
				/>
				<ParamItem
					:paramData="param_paddingTitle"
					v-model="storeEndingCredits.overlayData.paddingTitle"
				/>
				<ParamItem
					:paramData="param_fadeSize"
					v-model="storeEndingCredits.overlayData.fadeSize"
				/>
				<ParamItem
					:paramData="param_stickyTitle"
					v-model="storeEndingCredits.overlayData.stickyTitle"
				/>
				<ParamItem
					:paramData="param_fontTitle"
					v-model="storeEndingCredits.overlayData.fontTitle"
					class="fontStyle"
				>
					<template #composite>
						<ParamItem
							:paramData="param_titleColor"
							v-model="storeEndingCredits.overlayData.colorTitle"
							noBackground
							class="colorPicker"
						/>
					</template>
				</ParamItem>
				<ParamItem
					:paramData="param_fontEntry"
					v-model="storeEndingCredits.overlayData.fontEntry"
					class="fontStyle"
				>
					<template #composite>
						<ParamItem
							:paramData="param_entryColor"
							v-model="storeEndingCredits.overlayData.colorEntry"
							noBackground
							class="colorPicker"
						/>
					</template>
				</ParamItem>
				<ParamItem
					:paramData="param_textShadow"
					v-model="storeEndingCredits.overlayData.textShadow"
				/>
				<ParamItem
					:paramData="param_ignoreBots"
					v-model="storeEndingCredits.overlayData.ignoreBots"
				>
					<ParamItem
						:paramData="param_ignoreCustomBots"
						v-model="storeEndingCredits.overlayData.ignoreCustomBots"
						noBackground
						class="child"
					/>
				</ParamItem>
				<ParamItem
					:paramData="param_hideEmptySlots"
					v-model="storeEndingCredits.overlayData.hideEmptySlots"
				/>
				<ParamItem
					:paramData="param_powerUpEmotes"
					v-model="storeEndingCredits.overlayData.powerUpEmotes"
				/>
				<ParamItem
					:paramData="param_showIcons"
					v-model="storeEndingCredits.overlayData.showIcons"
				/>
				<ParamItem
					:paramData="param_startDelay"
					v-model="storeEndingCredits.overlayData.startDelay"
				/>
				<ParamItem :paramData="param_loop" v-model="storeEndingCredits.overlayData.loop" />
				<ParamItem
					:paramData="param_timing"
					v-model="storeEndingCredits.overlayData.timing"
				>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_duration"
						v-model="storeEndingCredits.overlayData.duration"
						v-if="param_timing.value == 'duration'"
						noPremiumLock
					/>
					<ParamItem
						class="child"
						noBackground
						:paramData="param_speed"
						v-model="storeEndingCredits.overlayData.speed"
						v-if="param_timing.value == 'speed'"
						noPremiumLock
					/>
				</ParamItem>
			</div>
		</ToggleBlock>

		<section class="expand">
			<div class="slots">
				<draggable
					:animation="250"
					group="description"
					ghostClass="ghost"
					item-key="id"
					handle=".slotHolder>.header"
					v-model="slots"
				>
					<template
						#item="{
							element,
							index,
						}: {
							element: TwitchatDataTypes.EndingCreditsSlotParams;
							index: number;
						}"
					>
						<ToggleBlock
							class="slotHolder"
							medium
							editableTitle
							v-model:title="element.label"
							:open="false"
							:titleMaxLengh="100"
							:key="'item_' + element.id"
							:disabled="!element.enabled"
							:titleDefault="t(getDefinitionFromSlot(element.slotType).label)"
							:premium="getDefinitionFromSlot(element.slotType).premium"
						>
							<template #left_actions>
								<div class="icons">
									<Icon name="dragZone" />
									<Icon :name="getDefinitionFromSlot(element.slotType).icon" />
									<ToggleButton v-model="element.enabled" @click.stop />
									<Icon
										name="premium"
										v-tooltip="t('premium.premium_only_tt')"
										v-if="getDefinitionFromSlot(element.slotType).premium"
									/>
								</div>
							</template>

							<template #right_actions>
								<TTButton
									icon="scroll"
									v-if="element.enabled && overlayExists"
									secondary
									@click.stop="scrollTo(element.id)"
									data-close-popout
									v-tooltip="t('overlay.credits.scroll_tt')"
								/>
								<TTButton icon="trash" @click.stop="deleteSlot(element)" alert />
							</template>

							<div class="content">
								<div
									class="card-item premium limitations"
									v-if="
										slotTypes.find((v) => v.id == element.slotType)?.premium &&
										!isPremium
									"
								>
									<p>
										<Icon name="alert" />
										{{ t("overlay.credits.premium_category") }}
									</p>
									<TTButton
										icon="premium"
										@click="openPremium()"
										light
										premium
										small
										>{{ t("premium.become_premiumBt") }}</TTButton
									>
								</div>
								<div class="card-item layout">
									<!-- <PremiumLockLayer v-if="slotTypes.find(v => v.id == element.slotType)?.premium" /> -->
									<div class="form">
										<Icon name="layout" />
										<label>{{ t("overlay.credits.param_layout") }}</label>
										<div class="layoutBtns">
											<TTButton
												icon="layout_left"
												:premium="
													getDefinitionFromSlot(element.slotType).premium
												"
												@click="element.layout = 'left'"
												:selected="element.layout == 'left'"
												v-if="
													!['text', 'polls', 'predictions'].includes(
														element.slotType,
													)
												"
											/>
											<TTButton
												icon="layout_center"
												:premium="
													getDefinitionFromSlot(element.slotType).premium
												"
												@click="element.layout = 'center'"
												:selected="element.layout == 'center'"
												v-if="
													!['text', 'polls', 'predictions'].includes(
														element.slotType,
													)
												"
											/>
											<TTButton
												icon="layout_right"
												:premium="
													getDefinitionFromSlot(element.slotType).premium
												"
												@click="element.layout = 'right'"
												:selected="element.layout == 'right'"
												v-if="
													!['text', 'polls', 'predictions'].includes(
														element.slotType,
													)
												"
											/>
											<TTButton
												icon="layout_colLeft"
												:premium="
													getDefinitionFromSlot(element.slotType).premium
												"
												@click="element.layout = 'colLeft'"
												:selected="element.layout == 'colLeft'"
											/>
											<TTButton
												icon="layout_col"
												:premium="
													getDefinitionFromSlot(element.slotType).premium
												"
												@click="element.layout = 'col'"
												:selected="element.layout == 'col'"
											/>
											<TTButton
												icon="layout_colRight"
												:premium="
													getDefinitionFromSlot(element.slotType).premium
												"
												@click="element.layout = 'colRight'"
												:selected="element.layout == 'colRight'"
											/>
											<TTButton
												icon="layout_2cols"
												:premium="
													getDefinitionFromSlot(element.slotType).premium
												"
												@click="element.layout = '2cols'"
												:selected="element.layout == '2cols'"
												v-if="
													!['text', 'polls', 'predictions'].includes(
														element.slotType,
													)
												"
											/>
											<TTButton
												icon="layout_3cols"
												:premium="
													getDefinitionFromSlot(element.slotType).premium
												"
												@click="element.layout = '3cols'"
												:selected="element.layout == '3cols'"
												v-if="
													!['text', 'polls', 'predictions'].includes(
														element.slotType,
													)
												"
											/>
										</div>
									</div>
								</div>

								<template v-if="element.slotType == 'cheers'">
									<ParamItem
										:paramData="param_normalCheers[element.id]!"
										v-model="element.showNormalCheers"
										:noPremiumLock="
											slotTypes.find((v) => v.id == element.slotType)?.premium
										"
									/>
									<ParamItem
										:paramData="param_pinnedCheers[element.id]!"
										v-model="element.showPinnedCheers"
										:noPremiumLock="
											slotTypes.find((v) => v.id == element.slotType)?.premium
										"
									/>
								</template>

								<template v-if="element.slotType == 'rewards'">
									<ParamItem
										:paramData="param_showRewardUsers[element.id]!"
										v-model="element.showRewardUsers"
										:noPremiumLock="
											slotTypes.find((v) => v.id == element.slotType)?.premium
										"
									/>
									<ParamItem
										:paramData="param_filterRewards[element.id]!"
										v-model="element.filterRewards"
										:noPremiumLock="
											slotTypes.find((v) => v.id == element.slotType)?.premium
										"
									/>
								</template>

								<template v-if="element.slotType == 'subs'">
									<div class="card-item tierList">
										<ParamItem
											:paramData="param_showSubsPrime[element.id]!"
											v-model="element.showSubsPrime"
											noBackground
											v-if="
												param_showAllActiveSubs[element.id]!.value !=
													true &&
												param_showAllActiveSubgifters[element.id]!.value !=
													true
											"
										/>
										<ParamItem
											:paramData="param_showSubsT1[element.id]!"
											v-model="element.showSubsT1"
											noBackground
										/>
										<ParamItem
											:paramData="param_showSubsT2[element.id]!"
											v-model="element.showSubsT2"
											noBackground
										/>
										<ParamItem
											:paramData="param_showSubsT3[element.id]!"
											v-model="element.showSubsT3"
											noBackground
										/>
									</div>
									<ParamItem
										:paramData="param_showAllActiveSubs[element.id]!"
										v-model="element.showAllSubs"
									/>
									<ParamItem
										:paramData="param_showAllActiveSubgifters[element.id]!"
										v-model="element.showAllSubgifters"
									/>
									<template
										v-if="
											param_showAllActiveSubs[element.id]!.value !== true &&
											param_showAllActiveSubgifters[element.id]!.value !==
												true
										"
									>
										<ParamItem
											:paramData="param_showSubs[element.id]!"
											v-model="element.showSubs"
										/>
										<ParamItem
											:paramData="param_showResubs[element.id]!"
											v-model="element.showResubs"
										/>
										<ParamItem
											:paramData="param_showSubgifts[element.id]!"
											v-model="element.showSubgifts"
										/>
										<ParamItem
											:paramData="param_showSubMonths[element.id]!"
											v-model="element.showSubMonths"
										/>
										<ParamItem
											:paramData="param_showSubsTiktok[element.id]!"
											v-model="element.showSubsTiktok"
										/>
										<ParamItem
											:paramData="param_showSubsYoutube[element.id]!"
											v-model="element.showSubsYoutube"
										/>
										<ParamItem
											:paramData="param_showSubgiftsYoutube[element.id]!"
											v-model="element.showSubgiftsYoutube"
										/>
										<ParamItem
											:paramData="param_showBadges[element.id]!"
											v-model="element.showBadges"
										/>
									</template>
									<ParamItem
										:paramData="param_sortByName[element.id]!"
										v-model="element.sortByNames"
									/>
									<ParamItem
										:paramData="param_sortBySubTypes[element.id]!"
										v-model="element.sortBySubTypes"
									/>
								</template>

								<template v-if="element.slotType == 'chatters'">
									<ParamItem
										:paramData="param_showMods[element.id]!"
										v-model="element.showMods"
									/>
									<ParamItem
										:paramData="param_showVIPs[element.id]!"
										v-model="element.showVIPs"
									/>
									<ParamItem
										:paramData="param_showSubs[element.id]!"
										v-model="element.showSubs"
									/>
									<ParamItem
										:paramData="param_showChatters[element.id]!"
										v-model="element.showChatters"
									/>
									<ParamItem
										:paramData="param_showBadges[element.id]!"
										v-model="element.showBadges"
									/>
									<ParamItem
										:paramData="param_sortByRoles[element.id]!"
										v-model="element.sortByRoles"
									/>
									<ParamItem
										:paramData="param_sortByAmounts[element.id]!"
										v-model="element.sortByAmounts"
									/>
									<ParamItem
										:paramData="param_sortByName[element.id]!"
										v-model="element.sortByNames"
									/>
								</template>

								<template v-if="element.slotType == 'hypetrains'">
									<ParamItem
										:paramData="param_showConductors[element.id]!"
										v-model="element.showTrainConductors"
										premium
										:noPremiumLock="
											slotTypes.find((v) => v.id == element.slotType)?.premium
										"
									/>
								</template>

								<template v-if="element.slotType == 'tips'">
									<ParamItem
										:paramData="param_showTipsKofi[element.id]!"
										v-model="element.showTipsKofi"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_showSubsKofi[element.id]!"
										v-model="element.showSubsKofi"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_showTipsTipeee[element.id]!"
										v-model="element.showTipsTipeee"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_showTipsStreamlabs[element.id]!"
										v-model="element.showTipsStreamlabs"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_showTipsPatreon[element.id]!"
										v-model="element.showTipsPatreon"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_showTipsStreamelements[element.id]!"
										v-model="element.showTipsStreamelements"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_sortByName[element.id]!"
										v-model="element.sortByNames"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_sortByAmounts[element.id]!"
										v-model="element.sortByAmounts"
										noPremiumLock
									/>
								</template>

								<template v-if="element.slotType == 'merch'">
									<ParamItem
										:paramData="param_showMerchKofi[element.id]!"
										v-model="element.showMerchKofi"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_showMerchStreamlabs[element.id]!"
										v-model="element.showMerchStreamlabs"
										noPremiumLock
									/>
								</template>

								<div
									class="card-item alert requirement"
									v-if="
										element.slotType == 'patreonMembers' &&
										!storePatreon.isMember
									"
								>
									<span>{{ t("overlay.credits.patreon_connect") }}</span>
									<TTButton icon="patreon" light alert @click="openPatreon">{{
										t("patreon.linkBt")
									}}</TTButton>
								</div>

								<template
									v-if="
										element.slotType == 'patreonMembers' &&
										storePatreon.isMember
									"
								>
									<ParamItem
										:paramData="param_anonLastNames[element.id]!"
										v-model="element.anonLastNames"
										noPremiumLock
									/>
									<ParamItem
										v-if="
											(param_patreonTiers[element.id]!.children ?? [])
												.length > 0
										"
										:paramData="param_patreonTiers[element.id]!"
										v-model="element.patreonTiers"
										noPremiumLock
									/>
									<div class="card-item secondary" v-else>
										<Icon name="alert" />
										{{ t("overlay.credits.patreon_no_tiers") }}
									</div>
									<ParamItem
										:paramData="param_sortByName[element.id]!"
										v-model="element.sortByNames"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_sortByAmounts[element.id]!"
										v-model="element.sortByAmounts"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_sortByTotalAmount[element.id]!"
										v-model="element.sortByTotalAmounts"
										noPremiumLock
									/>
									<ParamItem
										:paramData="param_showTotalAmount[element.id]!"
										v-model="element.showTotalAmounts"
										noPremiumLock
									>
										<ParamItem
											:paramData="param_currency[element.id]!"
											v-model="element.currency"
											:childLevel="1"
											noBackground
											noPremiumLock
										/>
									</ParamItem>
								</template>

								<template v-if="element.slotType == 'powerups'">
									<ParamItem
										:paramData="param_showPuSkin[element.id]!"
										v-model="element.showPuSkin"
									/>
									<ParamItem
										:paramData="param_showPuEmote[element.id]!"
										v-model="element.showPuEmote"
									/>
									<ParamItem
										:paramData="param_showPuCeleb[element.id]!"
										v-model="element.showPuCeleb"
									/>
									<ParamItem
										:paramData="param_filterPowerUps[element.id]!"
										v-model="element.filterPowerUps"
									/>
								</template>

								<template
									v-if="
										element.slotType == 'ytSuperSticker' ||
										element.slotType == 'ytSuperchat' ||
										element.slotType == 'tiktokGifts' ||
										element.slotType == 'tiktokShares' ||
										element.slotType == 'tiktokLikes'
									"
								>
									<ParamItem
										:paramData="param_sortByAmounts[element.id]!"
										v-model="element.sortByAmounts"
									/>
									<ParamItem
										:paramData="param_sortByName[element.id]!"
										v-model="element.sortByNames"
									/>
								</template>

								<ParamItem
									v-if="param_uniqueUsers[element.id]"
									v-model="element.uniqueUsers"
									:paramData="param_uniqueUsers[element.id]!"
									:noPremiumLock="
										slotTypes.find((v) => v.id == element.slotType)?.premium
									"
								>
									<ParamItem
										v-if="element.slotType == 'powerups'"
										:childLevel="1"
										:paramData="param_sortByAmounts[element.id]!"
										v-model="element.sortByAmounts"
										noBackground
									/>
								</ParamItem>

								<ParamItem
									v-if="
										getDefinitionFromSlot(element.slotType).hasAmount &&
										(element.slotType != 'subs' ||
											param_showAllActiveSubs[element.id]!.value !== true)
									"
									class="amounts"
									:paramData="param_showAmounts[element.id]!"
									v-model="element.showAmounts"
									:noPremiumLock="
										slotTypes.find((v) => v.id == element.slotType)?.premium
									"
								/>

								<ParamItem
									v-if="element.slotType != 'text'"
									class="maxItems"
									:paramData="param_maxItems[element.id]!"
									v-model="element.maxEntries"
									:noPremiumLock="
										slotTypes.find((v) => v.id == element.slotType)?.premium
									"
								/>

								<ParamItem
									v-else
									class="maxItems"
									:paramData="param_text[element.id]!"
									v-model="element.text"
									:noPremiumLock="
										slotTypes.find((v) => v.id == element.slotType)?.premium
									"
								/>
							</div>
						</ToggleBlock>
					</template>
				</draggable>
			</div>

			<TTButton
				class="center"
				icon="add"
				v-if="!showSlotOptions"
				@click="showSlotOptions = true"
				>{{ t("overlay.credits.add_slotBt") }}</TTButton
			>

			<div class="slotSelector" v-else>
				<ClearButton @click="showSlotOptions = false" />
				<TTButton
					class="slotBt"
					v-for="slot in slotTypes"
					v-newflag="
						slot.newFlag
							? { date: slot.newFlag, id: 'endingcredits_slot_' + slot.id + '_1' }
							: null
					"
					:icon="slot.icon"
					:premium="slot.premium"
					@click="addSlot(slot)"
					>{{ t(slot.label) }}</TTButton
				>
			</div>

			<div class="center" v-if="overlayExists">
				<TTButton
					:loading="sendingSummaryData"
					@click="testCredits()"
					icon="test"
					secondary
					>{{ t("overlay.credits.testBt") }}</TTButton
				>
			</div>

			<Icon
				class="center loader card-item"
				name="loader"
				v-else-if="checkingOverlayPresence"
			/>
			<div class="center card-item alert" v-else-if="!overlayExists">
				{{ t("overlay.overlay_not_configured") }}
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import ClearButton from "@/components/ClearButton.vue";
import Icon from "@/components/Icon.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeEndingCredits as useStoreEndingCredits } from "@/store/ending_credits/storeEndingCredits";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type { IPatreonTier } from "@/store/patreon/storePatreon";
import { storePatreon as useStorePatreon } from "@/store/patreon/storePatreon";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { TriggerEventPlaceholders, TriggerTypes } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import OverlayInstaller from "./OverlayInstaller.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import ParamItem from "@/components/params/ParamItem.vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeEndingCredits = useStoreEndingCredits();
const storeParams = useStoreParams();
const storePatreon = useStorePatreon();
const storeStream = useStoreStream();

const param_fadeSize = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 50,
	min: 0,
	max: 400,
	labelKey: "overlay.credits.param_fadeSize",
	icon: "fade",
});
const param_padding = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 100,
	min: 0,
	max: 1000,
	labelKey: "overlay.credits.param_padding",
	icon: "margin",
});
const param_paddingTitle = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 100,
	min: 0,
	max: 1000,
	labelKey: "overlay.credits.param_paddingTitle",
	icon: "margin",
});
const param_stickyTitle = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.credits.param_stickyTitle",
	icon: "pin",
});
const param_fontTitle = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "font",
	value: "",
	labelKey: "overlay.credits.param_fontTitle",
	icon: "font",
});
const param_fontEntry = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "font",
	value: "",
	labelKey: "overlay.credits.param_fontEntry",
	icon: "font",
});
const param_titleColor = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "#cccccc",
});
const param_entryColor = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "#ffffff",
});
const param_textShadow = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	value: 1,
	min: 0,
	max: 100,
	labelKey: "overlay.credits.param_textShadow",
	icon: "shadow",
});
const param_timing = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "speed",
	labelKey: "overlay.credits.param_timing",
	icon: "timer",
	premiumOnly: true,
});
const param_duration = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	min: 2,
	max: 3600,
	value: 60,
	labelKey: "overlay.credits.param_duration",
	icon: "timer",
});
const param_speed = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	min: 1,
	max: 1000,
	value: 200,
	labelKey: "overlay.credits.param_speed",
	icon: "timer",
	premiumOnly: true,
});
const param_scale = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	min: 1,
	max: 100,
	value: 30,
	labelKey: "overlay.credits.param_scale",
	icon: "scale",
});
const param_showIcons = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.credits.param_showIcons",
	icon: "show",
	premiumOnly: true,
});
const param_loop = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.credits.param_loop",
	icon: "loop",
	premiumOnly: true,
});
const param_startDelay = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	min: 0,
	max: 30,
	value: 0,
	labelKey: "overlay.credits.param_startDelay",
	icon: "countdown",
	premiumOnly: true,
});
const param_ignoreBots = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.credits.param_ignoreBots",
	icon: "bot",
});
const param_hideEmptySlots = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "overlay.credits.param_hideEmptySlots",
	icon: "hide",
});
const param_ignoreCustomBots = ref<TwitchatDataTypes.ParameterData<string[]>>({
	type: "editablelist",
	value: [],
	max: 50,
	maxLength: 25,
	labelKey: "overlay.credits.param_ignoreCustomBots",
	icon: "user",
});
const param_powerUpEmotes = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "overlay.credits.param_powerUpEmotes",
	icon: "watchStreak",
	premiumOnly: true,
});
const param_maxItems = ref<{ [key: string]: TwitchatDataTypes.ParameterData<number> }>({});
const param_showAmounts = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showSubMonths = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showBadges = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showSubs = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showResubs = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showSubgifts = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showAllActiveSubs = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<boolean, undefined, boolean>;
}>({});
const param_showSubsPrime = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showSubsT1 = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showSubsT2 = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showSubsT3 = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showAllActiveSubgifters = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<boolean, undefined, boolean>;
}>({});
const param_showSubsYoutube = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showSubsTiktok = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showSubgiftsYoutube = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_showSubsKofi = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showMods = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showVIPs = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showChatters = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_sortBySubTypes = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_sortByRoles = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_sortByAmounts = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_sortByTotalAmount = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_sortByName = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_text = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_filterRewards = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<boolean, unknown, boolean>;
}>({});
const param_showRewardUsers = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_uniqueUsers = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_normalCheers = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_pinnedCheers = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showConductors = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showMerchKofi = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showMerchStreamlabs = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_showTipsKofi = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showTipsTipeee = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showTipsPatreon = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showTipsStreamlabs = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>(
	{},
);
const param_showTipsStreamelements = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<boolean>;
}>({});
const param_showPuSkin = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showPuEmote = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showPuCeleb = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_filterPowerUps = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<boolean, unknown, boolean>;
}>({});
const param_anonLastNames = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_showTotalAmount = ref<{ [key: string]: TwitchatDataTypes.ParameterData<boolean> }>({});
const param_currency = ref<{ [key: string]: TwitchatDataTypes.ParameterData<string> }>({});
const param_patreonTiers = ref<{
	[key: string]: TwitchatDataTypes.ParameterData<
		boolean,
		unknown,
		boolean,
		unknown,
		IPatreonTier
	>;
}>({});
const slotTypes = TwitchatDataTypes.EndingCreditsSlotDefinitions;
const overlayExists = ref(false);
const sendingSummaryData = ref(false);
const showSlotOptions = ref<boolean>(false);
const checkingOverlayPresence = ref<boolean>(true);

let checkInterval: number = -1;
let subcheckTimeout: number = -1;

const isPremium = computed<boolean>(() => storeAuth.isPremium);

const slots = computed({
	get: () => storeEndingCredits.overlayData.slots,
	set: (value) => (storeEndingCredits.overlayData.slots = value),
});

const classes = computed<string[]>(() => {
	const res: string[] = ["overlayparamscredits", "overlayParamsSection"];
	if (!isPremium.value) res.push("notPremium");
	return res;
});

function getDefinitionFromSlot(
	id: TwitchatDataTypes.EndingCreditsSlotStringTypes,
): TwitchatDataTypes.EndingCreditsSlotDefinition {
	return TwitchatDataTypes.EndingCreditsSlotDefinitions.find((v) => v.id == id)!;
}

function overlayPresenceHandler(): void {
	overlayExists.value = true;
	checkingOverlayPresence.value = false;
	clearTimeout(subcheckTimeout);
}

onBeforeMount(() => {
	if (slots.value.length == 0) {
		addSlot(
			TwitchatDataTypes.EndingCreditsSlotDefinitions.find((v) => v.id == "follows")!,
			undefined,
			true,
		);
		addSlot(
			TwitchatDataTypes.EndingCreditsSlotDefinitions.find((v) => v.id == "subs")!,
			undefined,
			true,
		);
		addSlot(
			TwitchatDataTypes.EndingCreditsSlotDefinitions.find((v) => v.id == "cheers")!,
			undefined,
			true,
		);
		addSlot(
			TwitchatDataTypes.EndingCreditsSlotDefinitions.find((v) => v.id == "raids")!,
			undefined,
			true,
		);
		addSlot(
			TwitchatDataTypes.EndingCreditsSlotDefinitions.find((v) => v.id == "chatters")!,
			undefined,
			true,
		);
	} else {
		for (let i = 0; i < slots.value.length; i++) {
			const slot = slots.value[i]!;
			const defaultSlot = TwitchatDataTypes.EndingCreditsSlotDefinitions.find(
				(v) => v.id == slot.slotType,
			);
			if (!defaultSlot) {
				//Remove deleted slot
				slots.value.splice(i, 1);
				i--;
			} else {
				if (getDefinitionFromSlot(slot.slotType).premium) {
					//Disable showAmount props if user isn't premium
					if (!isPremium.value && slot.showAmounts != undefined) slot.showAmounts = false;
				} else {
					//Force amount value if missing
					if (slot.showAmounts == undefined && defaultSlot.hasAmount)
						slot.showAmounts = true;
				}
				//Max entries field is premium only, if not premium force it to 100
				if (!isPremium.value) slot.maxEntries = 100;
				if (slot.enabled === undefined) slot.enabled = true;
			}
		}

		for (const slot of slots.value) {
			addSlot(
				TwitchatDataTypes.EndingCreditsSlotDefinitions.find((v) => v.id == slot.slotType)!,
				slot,
			);
		}
	}

	param_timing.value.listValues = [
		{ value: "speed", labelKey: "overlay.credits.param_timing_speed" },
		{ value: "duration", labelKey: "overlay.credits.param_timing_duration" },
	];

	if (!isPremium.value) {
		storeEndingCredits.overlayData.showIcons = true;
		storeEndingCredits.overlayData.loop = true;
		storeEndingCredits.overlayData.powerUpEmotes = false;
		storeEndingCredits.overlayData.timing = "speed";
		storeEndingCredits.overlayData.startDelay = 0;
		storeEndingCredits.overlayData.duration = 60;
		storeEndingCredits.overlayData.speed = 200;
	} else {
		if (storeEndingCredits.overlayData.powerUpEmotes === undefined)
			storeEndingCredits.overlayData.powerUpEmotes = true;
	}

	PublicAPI.instance.addEventListener("SET_ENDING_CREDITS_PRESENCE", overlayPresenceHandler);

	//Regularly check if the overlay exists
	getOverlayPresence(true);
	checkInterval = window.setInterval(() => getOverlayPresence(), 2000);

	saveParams();
});

onBeforeUnmount(() => {
	clearInterval(checkInterval);
	clearTimeout(subcheckTimeout);
	PublicAPI.instance.removeEventListener("SET_ENDING_CREDITS_PRESENCE", overlayPresenceHandler);
});

/**
 * Checks if overlay exists
 */
function getOverlayPresence(showLoader: boolean = false): void {
	if (showLoader) checkingOverlayPresence.value = true;
	PublicAPI.instance.broadcast("GET_ENDING_CREDITS_PRESENCE");
	clearTimeout(subcheckTimeout);
	//If after 1,5s the overlay didn't answer, assume it doesn't exist
	subcheckTimeout = window.setTimeout(() => {
		overlayExists.value = false;
		checkingOverlayPresence.value = false;
	}, 1500);
}

/**
 * Opens the premium section
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Opens the Patreon connection
 */
function openPatreon(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.PATREON,
	);
}

/**
 * Deletes a slot
 */
function deleteSlot(slot: TwitchatDataTypes.EndingCreditsSlotParams): void {
	confirm(t("overlay.credits.delete_confirm_title"))
		.then(() => {
			const index = slots.value.findIndex((v) => v.id == slot.id);
			slots.value.splice(index, 1);
			delete param_maxItems.value[slot.id];
			delete param_showAmounts.value[slot.id];
			delete param_text.value[slot.id];
		})
		.catch(() => {});
}

/**
 * Adds a new category to the list
 */
async function addSlot(
	slotDef: TwitchatDataTypes.EndingCreditsSlotDefinition,
	data?: TwitchatDataTypes.EndingCreditsSlotParams,
	isDefautlSlot: boolean = false,
): Promise<void> {
	let id = data?.id || Utils.getUUID();
	let slotType = slotDef.id;
	let rewards: TwitchDataTypes.Reward[] = [];
	const entry: TwitchatDataTypes.EndingCreditsSlotParams = data || {
		id,
		slotType,
		enabled: true,
		label: t(slotDef.defaultLabel),
		layout: "col",
		maxEntries: 100,
	};

	//Create parameters
	param_maxItems.value[id] = {
		type: "number",
		icon: "max",
		min: 1,
		max: 1000,
		value: 100,
		labelKey: "overlay.credits.param_maxItems",
		premiumOnly: true,
	};
	if (slotDef.hasAmount) {
		if (entry.showAmounts === undefined) {
			entry.showAmounts = isPremium.value || !slotDef.premium;
		} else if (!isPremium.value && slotDef.premium) {
			entry.showAmounts = false;
		}
		let icon = "number";
		if (slotDef.id == "patreonMembers") icon = "date";
		param_showAmounts.value[id] = {
			type: "boolean",
			icon,
			value: entry.showAmounts || true,
			labelKey: getDefinitionFromSlot(slotType).amountLabel,
			premiumOnly: true,
		};
	}

	if (slotDef.id == "rewards") {
		if (entry.filterRewards == undefined || !isPremium.value) {
			entry.showRewardUsers = false;
			entry.filterRewards = false;
			entry.rewardIds = [];
		}
		param_showRewardUsers.value[id] = {
			type: "boolean",
			value: entry.showRewardUsers!,
			icon: "user",
			labelKey: "overlay.credits.param_showRewardUsers",
			premiumOnly: true,
		};
		param_filterRewards.value[id] = {
			type: "boolean",
			value: entry.filterRewards,
			icon: "channelPoints",
			labelKey: "overlay.credits.param_filterRewards",
			premiumOnly: true,
			twitch_scopes: [TwitchScopes.LIST_REWARDS],
		};
		if (rewards.length == 0 && TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
			rewards = (await TwitchUtils.getRewards()).sort((a, b) => a.cost - b.cost);
		}
		let children: TwitchatDataTypes.ParameterData<
			boolean,
			unknown,
			unknown,
			TwitchDataTypes.Reward
		>[] = [];
		for (const r of rewards) {
			children.push({
				type: "boolean",
				value: entry.rewardIds!.includes(r.id),
				iconURL: r.image?.url_1x,
				label: r.title,
				storage: r,
				editCallback: (data) => {
					if (data.value === true && !entry.rewardIds!.includes(data.storage!.id)) {
						entry.rewardIds!.push(data.storage!.id);
					}
					if (data.value === false && entry.rewardIds!.includes(data.storage!.id)) {
						entry.rewardIds!.splice(entry.rewardIds!.indexOf(data.storage!.id), 1);
						entry.rewardIds = entry.rewardIds!.filter((v) => v !== data.storage!.id);
					}
				},
			});
		}
		param_filterRewards.value[id]!.children = children;
	} else if (slotDef.id == "cheers") {
		entry.showNormalCheers = true;
		entry.showPinnedCheers = true;
		param_normalCheers.value[id] = {
			type: "boolean",
			value: entry.showNormalCheers,
			icon: "bits",
			labelKey: "overlay.credits.param_normalCheers",
			premiumOnly: true,
		};
		param_pinnedCheers.value[id] = {
			type: "boolean",
			value: entry.showPinnedCheers,
			icon: "pin",
			labelKey: "overlay.credits.param_pinnedCheers",
			premiumOnly: true,
		};
	} else if (slotDef.id == "chatters") {
		if (entry.showMods === undefined) {
			entry.layout = "3cols";
			if (isDefautlSlot) {
				entry.label = t("overlay.credits.moderators_label");
			}
		}
		if (entry.showMods === undefined || !isPremium.value) {
			entry.showMods = true;
			entry.showVIPs = false;
			entry.showSubs = false;
			entry.showChatters = false;
			entry.showBadges = false;
			entry.sortByNames = true;
			entry.sortByRoles = false;
			entry.sortByAmounts = false;
		}
		param_showMods.value[id] = {
			type: "boolean",
			value: entry.showMods,
			icon: "mod",
			labelKey: "overlay.credits.param_showMods",
			premiumOnly: true,
		};
		param_showVIPs.value[id] = {
			type: "boolean",
			value: entry.showVIPs!,
			icon: "vip",
			labelKey: "overlay.credits.param_showVIPs",
			premiumOnly: true,
		};
		param_showSubs.value[id] = {
			type: "boolean",
			value: entry.showSubs!,
			icon: "sub",
			labelKey: "overlay.credits.param_showSubs",
			premiumOnly: true,
		};
		param_showChatters.value[id] = {
			type: "boolean",
			value: entry.showChatters!,
			icon: "whispers",
			labelKey: "overlay.credits.param_showChatters",
			premiumOnly: true,
		};
		param_showBadges.value[id] = {
			type: "boolean",
			value: entry.showBadges!,
			icon: "badge",
			labelKey: "overlay.credits.param_showBadges",
			premiumOnly: true,
		};
		param_sortByName.value[id] = {
			type: "boolean",
			value: entry.sortByNames!,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByNames",
			premiumOnly: true,
		};
		param_sortByRoles.value[id] = {
			type: "boolean",
			value: entry.sortByRoles!,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByRoles",
			premiumOnly: true,
		};
		param_sortByAmounts.value[id] = {
			type: "boolean",
			value: entry.sortByAmounts!,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByAmount",
			premiumOnly: true,
		};
	} else if (slotDef.id == "text") {
		const placeholderList = TriggerEventPlaceholders(TriggerTypes.GLOBAL_PLACEHOLDERS).concat();
		param_text.value[id] = {
			type: "string",
			value: "",
			longText: true,
			maxLength: 1000,
			labelKey: "overlay.credits.param_freeText",
			placeholderList,
		};
	} else if (slotDef.id == "hypetrains") {
		entry.showTrainConductors = true;
		param_showConductors.value[id] = {
			type: "boolean",
			value: entry.showTrainConductors,
			icon: "user",
			labelKey: "overlay.credits.param_showConductors",
		};
	} else if (slotDef.id == "subs") {
		if (entry.showSubsPrime === undefined) entry.showSubsPrime = true;
		if (entry.showSubsT1 === undefined) entry.showSubsT1 = true;
		if (entry.showSubsT2 === undefined) entry.showSubsT2 = true;
		if (entry.showSubsT3 === undefined) entry.showSubsT3 = true;
		if (entry.showSubs === undefined) entry.showSubs = true;
		if (entry.showResubs === undefined) entry.showResubs = true;
		if (entry.showSubgifts === undefined) entry.showSubgifts = true;
		if (entry.showSubMonths === undefined) entry.showSubMonths = false;
		if (entry.showBadges == undefined || !isPremium.value) entry.showBadges = false;
		if (entry.sortByNames == undefined || !isPremium.value) entry.sortByNames = false;
		if (entry.sortBySubTypes == undefined || !isPremium.value) entry.sortBySubTypes = false;
		if (entry.showSubsYoutube == undefined || !isPremium.value) entry.showSubsYoutube = false;
		if (entry.showSubgiftsYoutube == undefined || !isPremium.value)
			entry.showSubgiftsYoutube = false;
		param_showSubs.value[id] = {
			type: "boolean",
			value: entry.showSubs,
			icon: "sub",
			labelKey: "overlay.credits.param_showSubs",
		};
		param_showResubs.value[id] = {
			type: "boolean",
			value: entry.showResubs,
			icon: "sub",
			labelKey: "overlay.credits.param_showResubs",
		};
		param_showSubgifts.value[id] = {
			type: "boolean",
			value: entry.showSubgifts,
			icon: "gift",
			labelKey: "overlay.credits.param_showSubgifts",
		};
		param_showSubsYoutube.value[id] = {
			type: "boolean",
			value: entry.showSubsYoutube,
			icon: "youtube",
			labelKey: "overlay.credits.param_showSubsYoutube",
			premiumOnly: true,
		};
		param_showSubsTiktok.value[id] = {
			type: "boolean",
			value: entry.showSubsTiktok === true,
			icon: "tiktok",
			labelKey: "overlay.credits.param_showSubsTiktok",
			premiumOnly: true,
		};
		param_showSubgiftsYoutube.value[id] = {
			type: "boolean",
			value: entry.showSubgiftsYoutube,
			icon: "youtube",
			labelKey: "overlay.credits.param_showSubgiftsYoutube",
			premiumOnly: true,
		};
		param_showSubsPrime.value[id] = {
			type: "boolean",
			value: entry.showSubsPrime === true,
			labelKey: "overlay.credits.param_showSubsPrime",
		};
		param_showAllActiveSubs.value[id] = {
			type: "boolean",
			value: entry.showAllSubs === true,
			icon: "date",
			labelKey: "overlay.credits.param_showAllActiveSubs",
		};
		param_showSubsT1.value[id] = {
			type: "boolean",
			value: entry.showSubsT1 === true,
			labelKey: "overlay.credits.param_showSubsT1",
		};
		param_showSubsT2.value[id] = {
			type: "boolean",
			value: entry.showSubsT2 === true,
			labelKey: "overlay.credits.param_showSubsT2",
		};
		param_showSubsT3.value[id] = {
			type: "boolean",
			value: entry.showSubsT3 === true,
			labelKey: "overlay.credits.param_showSubsT3",
		};
		param_showAllActiveSubgifters.value[id] = {
			type: "boolean",
			value: entry.showAllSubgifters === true,
			icon: "date",
			labelKey: "overlay.credits.param_showAllActiveSubgifters",
		};
		param_showBadges.value[id] = {
			type: "boolean",
			value: entry.showBadges,
			icon: "badge",
			labelKey: "overlay.credits.param_showSubBadges",
			premiumOnly: true,
		};
		param_sortByName.value[id] = {
			type: "boolean",
			value: entry.sortByNames,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByNames",
			premiumOnly: true,
		};
		param_sortBySubTypes.value[id] = {
			type: "boolean",
			value: entry.sortBySubTypes,
			icon: "filters",
			labelKey: "overlay.credits.param_sortBySubTypes",
			premiumOnly: true,
		};
		param_showSubMonths.value[id] = {
			type: "boolean",
			value: entry.showSubMonths,
			icon: "number",
			labelKey: "overlay.credits.param_showSubMonths",
		};
	} else if (slotDef.id == "tips") {
		if (entry.sortByNames == undefined) entry.sortByNames = false;
		if (entry.sortByAmounts == undefined) entry.sortByAmounts = false;
		if (entry.showTipsKofi === undefined) entry.showTipsKofi = true;
		if (entry.showSubsKofi === undefined) entry.showTipsKofi = entry.showSubsYoutube ?? true; //I made a mistake in the past, setting this v-model's entry to "showSubsYoutube".
		if (entry.showTipsTipeee === undefined) entry.showTipsTipeee = true;
		if (entry.showTipsPatreon === undefined) entry.showTipsPatreon = true;
		if (entry.showTipsStreamlabs === undefined) entry.showTipsStreamlabs = true;
		if (entry.showTipsStreamelements === undefined) entry.showTipsStreamelements = true;
		param_sortByName.value[id] = {
			type: "boolean",
			value: entry.sortByNames,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByNames",
			premiumOnly: true,
		};
		param_showTipsKofi.value[id] = {
			type: "boolean",
			value: entry.showTipsKofi,
			icon: "kofi",
			labelKey: "overlay.credits.param_tip_kofi",
			premiumOnly: true,
		};
		param_showTipsTipeee.value[id] = {
			type: "boolean",
			value: entry.showTipsTipeee,
			icon: "tipeee",
			labelKey: "overlay.credits.param_tip_tipeee",
			premiumOnly: true,
		};
		param_showTipsPatreon.value[id] = {
			type: "boolean",
			value: entry.showTipsPatreon,
			icon: "patreon",
			labelKey: "overlay.credits.param_tip_patreon",
			premiumOnly: true,
		};
		param_showTipsStreamlabs.value[id] = {
			type: "boolean",
			value: entry.showTipsStreamlabs,
			icon: "streamlabs",
			labelKey: "overlay.credits.param_tip_streamlabs",
			premiumOnly: true,
		};
		param_showTipsStreamelements.value[id] = {
			type: "boolean",
			value: entry.showTipsStreamelements,
			icon: "streamelements",
			labelKey: "overlay.credits.param_tip_streamelements",
			premiumOnly: true,
		};
		param_sortByAmounts.value[id] = {
			type: "boolean",
			value: entry.sortByAmounts,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByTipAmount",
			premiumOnly: true,
		};
		param_showSubsKofi.value[id] = {
			type: "boolean",
			value: entry.showSubsKofi === true,
			icon: "kofi",
			labelKey: "overlay.credits.param_showSubsKofi",
			premiumOnly: true,
		};
	} else if (slotDef.id == "merch") {
		if (entry.showMerchKofi === undefined) entry.showMerchKofi = true;
		if (entry.showMerchStreamlabs === undefined) entry.showMerchStreamlabs = true;
		param_showMerchKofi.value[id] = {
			type: "boolean",
			value: entry.showMerchKofi,
			icon: "kofi",
			labelKey: "overlay.credits.param_merch_kofi",
			premiumOnly: true,
		};
		param_showMerchStreamlabs.value[id] = {
			type: "boolean",
			value: entry.showMerchStreamlabs,
			icon: "streamlabs",
			labelKey: "overlay.credits.param_merch_streamlabs",
			premiumOnly: true,
		};
	} else if (slotDef.id == "powerups") {
		if (entry.showPuSkin === undefined) entry.showPuSkin = true;
		if (entry.showPuEmote === undefined) entry.showPuEmote = true;
		if (entry.showPuCeleb === undefined) entry.showPuCeleb = true;
		if (entry.sortByAmounts == undefined) entry.sortByAmounts = true;
		param_showPuSkin.value[id] = {
			type: "boolean",
			value: entry.showPuSkin,
			icon: "whispers",
			labelKey: "overlay.credits.param_showPuSkin",
		};
		param_showPuEmote.value[id] = {
			type: "boolean",
			value: entry.showPuEmote,
			icon: "emote",
			labelKey: "overlay.credits.param_showPuEmote",
		};
		param_showPuCeleb.value[id] = {
			type: "boolean",
			value: entry.showPuCeleb,
			icon: "party",
			labelKey: "overlay.credits.param_showPuCeleb",
		};
		param_sortByAmounts.value[id] = {
			type: "boolean",
			value: entry.sortByAmounts,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByPuCount",
			premiumOnly: true,
		};
		if (entry.filterPowerUps == undefined) {
			entry.filterPowerUps = false;
			entry.powerUpIds = [];
		}
		param_filterPowerUps.value[id] = {
			type: "boolean",
			value: entry.filterPowerUps,
			icon: "watchStreak",
			labelKey: "overlay.credits.param_filterPowerUps",
			twitch_scopes: [TwitchScopes.READ_CHEER],
		};
		let powerUps: TwitchDataTypes.CustomPowerUp[] = [];
		if (TwitchUtils.hasScopes([TwitchScopes.READ_CHEER])) {
			powerUps = (await TwitchUtils.getCustomPowerUps()).sort((a, b) => a.bits - b.bits);
		}
		const puChildren: TwitchatDataTypes.ParameterData<
			boolean,
			unknown,
			unknown,
			TwitchDataTypes.CustomPowerUp
		>[] = [];
		for (const p of powerUps) {
			puChildren.push({
				type: "boolean",
				value: entry.powerUpIds!.includes(p.id),
				iconURL: p.default_image?.url_1x || p.image.url_1x,
				label: p.title,
				storage: p,
				editCallback: (data) => {
					if (data.value === true && !entry.powerUpIds!.includes(data.storage!.id)) {
						entry.powerUpIds!.push(data.storage!.id);
					}
					if (data.value === false && entry.powerUpIds!.includes(data.storage!.id)) {
						entry.powerUpIds = entry.powerUpIds!.filter((v) => v !== data.storage!.id);
					}
				},
			});
		}
		param_filterPowerUps.value[id]!.children = puChildren;
	} else if (slotDef.id == "patreonMembers") {
		if (entry.currency == undefined) entry.currency = "€";
		if (entry.sortByNames == undefined) entry.sortByNames = true;
		if (entry.sortByAmounts == undefined) entry.sortByAmounts = true;
		if (entry.anonLastNames == undefined) entry.anonLastNames = true;
		if (entry.showTotalAmounts == undefined) entry.showTotalAmounts = false;
		if (entry.sortByTotalAmounts == undefined) entry.sortByTotalAmounts = false;
		if (entry.patreonTiers == undefined)
			entry.patreonTiers = storePatreon.tierList.map((v) => v.id) || [];

		param_anonLastNames.value[id] = {
			type: "boolean",
			value: entry.anonLastNames,
			icon: "anon",
			labelKey: "overlay.credits.param_anonLastNames",
			premiumOnly: true,
		};
		param_sortByName.value[id] = {
			type: "boolean",
			value: entry.sortByNames,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByNames",
			premiumOnly: true,
		};
		param_sortByAmounts.value[id] = {
			type: "boolean",
			value: entry.sortByAmounts,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByDuration",
			premiumOnly: true,
		};
		param_sortByTotalAmount.value[id] = {
			type: "boolean",
			value: entry.sortByTotalAmounts,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByTotalAmount",
			premiumOnly: true,
		};
		param_showTotalAmount.value[id] = {
			type: "boolean",
			value: entry.showTotalAmounts,
			icon: "coin",
			labelKey: "overlay.credits.param_showTotalAmount",
			premiumOnly: true,
		};
		param_patreonTiers.value[id] = {
			type: "boolean",
			value: true,
			noInput: true,
			icon: "patreon",
			labelKey: "overlay.credits.param_patreonTiers",
			premiumOnly: true,
		};
		param_currency.value[id] = {
			type: "string",
			value: entry.currency,
			maxLength: 5,
			labelKey: "overlay.credits.param_currency",
			premiumOnly: true,
		};

		param_filterRewards.value[id] = {
			type: "boolean",
			value: true,
			icon: "channelPoints",
			labelKey: "overlay.credits.param_filterRewards",
			premiumOnly: true,
			twitch_scopes: [TwitchScopes.LIST_REWARDS],
		};
		if (rewards.length == 0 && TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
			rewards = (await TwitchUtils.getRewards()).sort((a, b) => a.cost - b.cost);
		}
		let children: TwitchatDataTypes.ParameterData<boolean, unknown, unknown, IPatreonTier>[] =
			[];
		const tierList = storePatreon.tierList;
		for (const tier of tierList) {
			//Skip "free" tier
			if (tier.attributes.amount_cents == 0) continue;
			children.push({
				type: "boolean",
				value: entry.patreonTiers!.includes(tier.id),
				label: tier.attributes.title, // + " - cost:" + tier.attributes.amount_cents/100,
				storage: tier,
				editCallback: (data) => {
					if (data.value === true && !entry.patreonTiers!.includes(data.storage!.id)) {
						entry.patreonTiers!.push(data.storage!.id);
					}
					if (data.value === false && entry.patreonTiers!.includes(data.storage!.id)) {
						entry.patreonTiers!.splice(
							entry.patreonTiers!.indexOf(data.storage!.id),
							1,
						);
						entry.patreonTiers = entry.patreonTiers!.filter(
							(v) => v !== data.storage!.id,
						);
					}
				},
			});
		}
		param_patreonTiers.value[id]!.children = children;
	} else if (
		slotDef.id == "ytSuperSticker" ||
		slotDef.id == "ytSuperchat" ||
		slotDef.id == "tiktokGifts" ||
		slotDef.id == "tiktokLikes" ||
		slotDef.id == "tiktokShares"
	) {
		if (entry.sortByNames == undefined || !isPremium.value) entry.sortByNames = false;
		if (entry.sortByAmounts == undefined || !isPremium.value) entry.sortByAmounts = false;
		param_sortByName.value[id] = {
			type: "boolean",
			value: entry.sortByNames,
			icon: "filters",
			labelKey: "overlay.credits.param_sortByNames",
			premiumOnly: true,
		};
		const labelKey = {
			tiktokGifts: "param_sortByGiftAmount",
			tiktokLikes: "param_sortByLikeCount",
			tiktokShares: "param_sortByShareCount",
			ytSuperSticker: "param_sortByTipAmount",
			ytSuperchat: "param_sortByTipAmouns",
		}[slotDef.id];
		param_sortByAmounts.value[id] = {
			type: "boolean",
			value: entry.sortByAmounts,
			icon: "filters",
			labelKey: "overlay.credits." + labelKey,
			premiumOnly: true,
		};
	}

	if (slotDef.canMerge) {
		if (entry.uniqueUsers === undefined || !isPremium.value) entry.uniqueUsers = false;
		param_uniqueUsers.value[id] = {
			type: "boolean",
			value: false,
			icon: "merge",
			labelKey: "overlay.credits.param_uniqueUsers",
			premiumOnly: true,
		};
	}
	if (!data) slots.value.push(entry);
	saveParams();
}

/**
 * Send fake data
 */
async function testCredits(): Promise<void> {
	sendingSummaryData.value = true;
	const summary = await storeStream.getSummary(undefined, true, true);
	PublicAPI.instance.broadcast("SET_ENDING_CREDITS_DATA", summary);
	sendingSummaryData.value = false;
}

/**
 * Scrolls to
 */
async function scrollTo(id: string): Promise<void> {
	PublicAPI.instance.broadcast("SET_ENDING_CREDITS_CONTROL", { scrollToSectionID: id });
}

/**
 * Saves current parameters
 */
async function saveParams(): Promise<void> {
	storeEndingCredits.saveParams();
}

watch(
	() => storeEndingCredits.overlayData,
	() => saveParams(),
	{ deep: true },
);
</script>

<style scoped lang="less">
.overlayparamscredits {
	.parameters {
		min-width: 100%;
		.fontStyle {
			:deep(label) {
				flex-basis: 200px;
			}
			.colorPicker {
				width: 30px;
				min-width: 30px;
				margin-left: 5px;
				flex: 1;
				:deep(.inputHolder) {
					height: 30px;
				}
			}
		}
	}

	section.expand {
		width: 100%;
	}

	.settings {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
	}

	.slots {
		.slotHolder {
			position: relative;
			margin: 0.25em 0;
			// border: 1px solid var(--color-text);
			border-radius: var(--border-radius);
			& > :deep(.header) {
				cursor: move;
				justify-content: space-between;
				background-color: var(--color-text-fadest);
				transition: background-color 0.2s;
				&:hover {
					background-color: var(--color-text-fader);
				}
			}
			.icons {
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				.icon {
					height: 1em;
					min-width: 1em;
				}
			}
			.titleHolder {
				display: flex;
				flex-direction: row;
				align-items: center;
				.icon {
					height: 1em;
				}
				.title {
					position: relative;
					.label,
					.default {
						cursor: text;
						min-width: 2em;
						font-weight: bold;
						// flex-grow: 1;
						padding: 0.25em 0.5em;
						border-radius: var(--border-radius);

						&.label {
							&:hover,
							&:active,
							&:focus {
								.bevel();
								background-color: var(--color-text-inverse-fader);
								// border: 1px double var(--color-light);
								// border-style: groove;
							}
						}
					}
					.label {
						position: relative;
						z-index: 1;
						min-width: 100px;
						padding-right: 2em;
						word-break: break-word;
						line-height: 1.2em;
					}
					.default {
						position: absolute;
						text-wrap: nowrap;
						opacity: 0.8;
						font-style: italic;
						top: 0;
						left: 50%;
						transform: translateX(-50%);
						padding-right: 2em;
					}
				}
				& > .icon {
					margin-left: -1.5em;
				}
			}
			.content {
				gap: 0.25em;
				display: flex;
				flex-direction: column;
				position: relative;

				.limitations {
					text-align: center;
					.icon {
						height: 1em;
					}
					.button {
						margin-top: 0.5em;
					}
				}
				.layout {
					width: 100%;
					position: relative;
					.form {
						gap: 0.5em;
						display: flex;
						flex-direction: row;
						align-items: center;
						position: relative;
						&::before {
							content: "";
							opacity: 0;
							top: 0;
							left: 0;
							width: 100%;
							height: 100%;
							position: absolute;
							filter: blur(5px);
							pointer-events: none;
							background-color: var(--background-color-fadest);
							background: linear-gradient(
								170deg,
								var(--background-color-fadest) 0%,
								transparent 100%
							);
						}
						&:hover::before {
							opacity: 1;
						}
						.icon {
							height: 1em;
						}
						label {
							flex-grow: 1;
						}

						.layoutBtns {
							gap: 0.5em;
							display: flex;
							flex-direction: row;
							flex-wrap: wrap;
							justify-content: flex-end;
							.button {
								width: 2em;
								opacity: 1; //Do not fade when disabled as its holder will already be faded
							}
						}
					}
				}

				.paramitem {
					:deep(input):not([type="checkbox"]),
					:deep(textarea) {
						opacity: 1; //Do not fade when disabled as its holder will already be faded
					}
				}

				.tierList {
					row-gap: 0.5em;
					column-gap: 2em;
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					align-items: center;
					justify-content: center;
					overflow: visible;
				}
				.requirement {
					gap: 0.5em;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
			}
			&.premium {
				border-color: var(--color-premium-extralight);
				& > :deep(.header) {
					color: var(--color-text);
				}
				.paramitem {
					background-color: var(--color-light-fadest);
				}
				:deep(.placeholderselector) {
					.header {
						color: var(--color-text);
					}
				}
			}
		}
	}
	.slotSelector {
		position: relative;
		background-color: var(--color-light-fader);
		padding: 0.5em 2.5em;
		border-radius: var(--border-radius);
		gap: 0.5em;
		display: flex;
		justify-content: center;
		flex-direction: row;
		flex-wrap: wrap;
	}

	.installer .alertIcon {
		height: 1em;
		margin-right: 0.5em;
	}

	// &.notPremium {
	// 	.holder {
	// 		.item {
	// 			.slotHolder.premium {
	// 				.content {
	// 					.layout {
	// 						// background-color: var(--color-premium-fadest);
	// 						.form {
	// 							opacity: .5;
	// 							* {
	// 								pointer-events: none;
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}
	// }
}
</style>
