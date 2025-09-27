<template>
	<div :class="classes">
		<div class="header">{{ $t("overlay.credits.head") }}</div>

		<a href="https://www.youtube.com/watch?v=0S9SgAi8IOI" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ $t("overlay.title_install") }}</div>
			</div>
			<OverlayInstaller class="installer" type="credits" @obsSourceCreated="getOverlayPresence(true)">
				<Icon name="alert" class="alertIcon" />{{ $t("overlay.credits.manual_install_instructions") }}
			</OverlayInstaller>
		</section>

		<section class="card-item expand">
			<div class="header">
				<div class="title"><Icon name="credits" /> {{ $t("overlay.credits.slot_list") }}</div>
			</div>

			<div class="slots">
				<draggable
				:animation="250"
				group="description"
				ghostClass="ghost"
				item-key="id"
				handle=".slotHolder>.header"
				v-model="$store.endingCredits.overlayData.slots">
					<template #item="{element, index}:{element:TwitchatDataTypes.EndingCreditsSlotParams, index:number}">
						<ToggleBlock class="slotHolder"
						medium
						editableTitle
						v-model:title="element.label"
						:open="false"
						:titleMaxLengh="100"
						:key="'item_'+element.id"
						:titleDefault="$t(getDefinitionFromSlot(element.slotType).label)"
						:premium="getDefinitionFromSlot(element.slotType).premium">
							<template #left_actions>
								<div class="icons">
									<Icon name="dragZone" />
									<Icon :name="getDefinitionFromSlot(element.slotType).icon" />
									<ToggleButton v-model="element.enabled" @click.native.stop />
									<Icon name="premium" v-tooltip="$t('premium.premium_only_tt')" v-if="getDefinitionFromSlot(element.slotType).premium" />
								</div>
							</template>

							<template #right_actions>
								<div class="rightActions">
									<!-- <TTButton v-if="getDefinitionFromSlot(element.slotType).premium === true && !isPremium"
									icon="premium" premium
									v-tooltip="$t('premium.become_premiumBt')"
									@click.prevent="openPremium()" /> -->
									<TTButton class="scrollBt" icon="scroll" v-if="element.enabled && overlayExists" secondary @click.stop="scrollTo(element.id)" v-tooltip="$t('overlay.credits.scroll_tt')" />
									<TTButton class="deleteBt" icon="trash" @click.stop="deleteSlot(element)" alert />
								</div>
							</template>

							<div class="content">
								<div class="card-item premium limitations" v-if="slotTypes.find(v => v.id == element.slotType)?.premium && !isPremium">
									<p><Icon name="alert"/> {{ $t("overlay.credits.premium_category") }}</p>
									<TTButton icon="premium" @click="openPremium()" light premium small>{{$t('premium.become_premiumBt')}}</TTButton>
								</div>
								<div class="card-item layout">
									<!-- <PremiumLockLayer v-if="slotTypes.find(v => v.id == element.slotType)?.premium" /> -->
									<div class="form">
										<Icon name="layout" />
										<label>{{ $t("overlay.credits.param_layout") }}</label>
										<div class="layoutBtns">
											<TTButton icon="layout_left"		:premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'left'"		:selected="element.layout == 'left'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
											<TTButton icon="layout_center"		:premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'center'"	:selected="element.layout == 'center'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
											<TTButton icon="layout_right"		:premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'right'"	:selected="element.layout == 'right'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
											<TTButton icon="layout_colLeft" 	:premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'colLeft'"	:selected="element.layout == 'colLeft'" />
											<TTButton icon="layout_col" 		:premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'col'"		:selected="element.layout == 'col'" />
											<TTButton icon="layout_colRight" 	:premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'colRight'"	:selected="element.layout == 'colRight'" />
											<TTButton icon="layout_2cols"		:premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = '2cols'"	:selected="element.layout == '2cols'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
											<TTButton icon="layout_3cols"		:premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = '3cols'"	:selected="element.layout == '3cols'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
										</div>
									</div>
								</div>

								<template v-if="element.slotType == 'cheers'">
									<ParamItem :paramData="param_normalCheers[element.id]" v-model="element.showNormalCheers"	:noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_pinnedCheers[element.id]" v-model="element.showPinnedCheers"	:noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								</template>

								<template v-if="element.slotType == 'rewards'">
									<ParamItem :paramData="param_showRewardUsers[element.id]"	v-model="element.showRewardUsers"	:noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_filterRewards[element.id]"		v-model="element.filterRewards"		:noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								</template>

								<template v-if="element.slotType == 'subs'">
									<div class="card-item tierList" v-newflag="{date:$config.NEW_FLAGS_DATE_V13_4, id:'endingcredits_slot_sub_tiers'}">
										<ParamItem :paramData="param_showSubsPrime[element.id]"	v-model="element.showSubsPrime" noBackground v-if="param_showAllActiveSubs[element.id].value != true && param_showAllActiveSubgifters[element.id].value != true" />
										<ParamItem :paramData="param_showSubsT1[element.id]"	v-model="element.showSubsT1" noBackground />
										<ParamItem :paramData="param_showSubsT2[element.id]"	v-model="element.showSubsT2" noBackground />
										<ParamItem :paramData="param_showSubsT3[element.id]"	v-model="element.showSubsT3" noBackground />
									</div>
									<ParamItem :paramData="param_showAllActiveSubs[element.id]"			v-model="element.showAllSubs" v-newflag="{date:$config.NEW_FLAGS_DATE_V13_4, id:'endingcredits_slot_sub_tiers'}" />
									<ParamItem :paramData="param_showAllActiveSubgifters[element.id]"	v-model="element.showAllSubgifters" v-newflag="{date:$config.NEW_FLAGS_DATE_V13_4, id:'endingcredits_slot_sub_tiers'}" />
									<template v-if="param_showAllActiveSubs[element.id].value !== true && param_showAllActiveSubgifters[element.id].value !== true">
										<ParamItem :paramData="param_showSubs[element.id]"				v-model="element.showSubs" />
										<ParamItem :paramData="param_showResubs[element.id]"			v-model="element.showResubs" />
										<ParamItem :paramData="param_showSubgifts[element.id]"			v-model="element.showSubgifts" />
										<ParamItem :paramData="param_showSubMonths[element.id]"			v-model="element.showSubMonths" />
										<ParamItem :paramData="param_showSubsTiktok[element.id]"		v-model="element.showSubsTiktok" v-newflag="{date:$config.NEW_FLAGS_DATE_V15, id:'endingcredits_slot_tiktokSub'}" />
										<ParamItem :paramData="param_showSubsYoutube[element.id]"		v-model="element.showSubsYoutube" v-newflag="{date:$config.NEW_FLAGS_DATE_V13, id:'endingcredits_slot_ytSub'}" />
										<ParamItem :paramData="param_showSubgiftsYoutube[element.id]"	v-model="element.showSubgiftsYoutube" v-newflag="{date:$config.NEW_FLAGS_DATE_V13, id:'endingcredits_slot_ytSubgift'}" />
										<ParamItem :paramData="param_showBadges[element.id]"			v-model="element.showBadges" />
									</template>
									<ParamItem :paramData="param_sortByName[element.id]"			v-model="element.sortByNames" />
									<ParamItem :paramData="param_sortBySubTypes[element.id]"		v-model="element.sortBySubTypes" />
								</template>

								<template v-if="element.slotType == 'chatters'">
									<ParamItem :paramData="param_showMods[element.id]"		v-model="element.showMods" />
									<ParamItem :paramData="param_showVIPs[element.id]"		v-model="element.showVIPs" />
									<ParamItem :paramData="param_showSubs[element.id]"		v-model="element.showSubs" />
									<ParamItem :paramData="param_showChatters[element.id]"	v-model="element.showChatters" />
									<ParamItem :paramData="param_showBadges[element.id]"	v-model="element.showBadges" />
									<ParamItem :paramData="param_sortByRoles[element.id]"	v-model="element.sortByRoles" />
									<ParamItem :paramData="param_sortByAmounts[element.id]"	v-model="element.sortByAmounts" />
									<ParamItem :paramData="param_sortByName[element.id]"	v-model="element.sortByNames" />
								</template>

								<template v-if="element.slotType == 'hypetrains'">
									<ParamItem :paramData="param_showConductors[element.id]" v-model="element.showTrainConductors"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								</template>

								<template v-if="element.slotType == 'tips'">
									<ParamItem :paramData="param_showTipsKofi[element.id]"				v-model="element.showTipsKofi" noPremiumLock />
									<ParamItem :paramData="param_showSubsKofi[element.id]"				v-model="element.showSubsKofi" noPremiumLock v-newflag="{date:$config.NEW_FLAGS_DATE_V13_6, id:'endingcredits_slot_kofiSub'}" />
									<ParamItem :paramData="param_showTipsTipeee[element.id]"			v-model="element.showTipsTipeee" noPremiumLock />
									<ParamItem :paramData="param_showTipsStreamlabs[element.id]"		v-model="element.showTipsStreamlabs" noPremiumLock />
									<ParamItem :paramData="param_showTipsPatreon[element.id]"			v-model="element.showTipsPatreon" noPremiumLock />
									<ParamItem :paramData="param_showTipsStreamelements[element.id]"	v-model="element.showTipsStreamelements" noPremiumLock />
									<ParamItem :paramData="param_sortByName[element.id]"				v-model="element.sortByNames" noPremiumLock />
									<ParamItem :paramData="param_sortByAmounts[element.id]"				v-model="element.sortByAmounts" noPremiumLock />
								</template>
								
								<template v-if="element.slotType == 'merch'">
									<ParamItem :paramData="param_showMerchKofi[element.id]"				v-model="element.showMerchKofi" noPremiumLock />
									<ParamItem :paramData="param_showMerchStreamlabs[element.id]"		v-model="element.showMerchStreamlabs" noPremiumLock />
								</template>
								
								<template v-if="element.slotType == 'patreonMembers'">
									<ParamItem :paramData="param_anonLastNames[element.id]"				v-model="element.anonLastNames" noPremiumLock />
									<ParamItem :paramData="param_patreonTiers[element.id]"				v-model="element.patreonTiers" noPremiumLock />
									<ParamItem :paramData="param_sortByName[element.id]"				v-model="element.sortByNames" noPremiumLock />
									<ParamItem :paramData="param_sortByAmounts[element.id]"				v-model="element.sortByAmounts" noPremiumLock />
									<ParamItem :paramData="param_sortByTotalAmount[element.id]"			v-model="element.sortByTotalAmounts" noPremiumLock />
									<ParamItem :paramData="param_showTotalAmount[element.id]"			v-model="element.showTotalAmounts" noPremiumLock>
										<ParamItem :paramData="param_currency[element.id]"				v-model="element.currency" :childLevel="1" noBackground noPremiumLock />
									</ParamItem>
								</template>

								<template v-if="element.slotType == 'powerups'">
									<ParamItem :paramData="param_showPuSkin[element.id]"				v-model="element.showPuSkin" />
									<ParamItem :paramData="param_showPuEmote[element.id]"				v-model="element.showPuEmote" />
									<ParamItem :paramData="param_showPuCeleb[element.id]"				v-model="element.showPuCeleb" disabled v-tooltip="$t('overlay.credits.param_pu_celeb_tt')" />
								</template>

								<template v-if="element.slotType == 'ytSuperSticker'
								|| element.slotType == 'ytSuperchat'
								|| element.slotType == 'tiktokGifts'
								|| element.slotType == 'tiktokShares'
								|| element.slotType == 'tiktokLikes'">
									<ParamItem :paramData="param_sortByAmounts[element.id]"	v-model="element.sortByAmounts" />
									<ParamItem :paramData="param_sortByName[element.id]"	v-model="element.sortByNames" />
								</template>

								<ParamItem v-if="param_uniqueUsers[element.id]"
									v-model="element.uniqueUsers"
									:paramData="param_uniqueUsers[element.id]"
									:noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium">
										<ParamItem v-if="element.slotType == 'powerups'" :childLevel="1" :paramData="param_sortByAmounts[element.id]" v-model="element.sortByAmounts" noBackground />
								</ParamItem>

								<ParamItem v-if="getDefinitionFromSlot(element.slotType).hasAmount && (element.slotType != 'subs' || param_showAllActiveSubs[element.id].value !== true)"
									class="amounts" :paramData="param_showAmounts[element.id]"
									v-model="element.showAmounts"
									:noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />

								<ParamItem v-if="element.slotType != 'text'"
									class="maxItems"
									:paramData="param_maxItems[element.id]"
									v-model="element.maxEntries"
									:noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />

								<ParamItem v-else
									class="maxItems"
									:paramData="param_text[element.id]"
									v-model="element.text"
									:noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />

								<!-- <ParamItem class="customHTML" :paramData="param_customHTML[index]" v-model="element.customHTML" premium>
									<ParamItem class="customHTML" :paramData="param_htmlTemplate[index]" v-model="element.htmlTemplate" premium />
								</ParamItem> -->
							</div>
						</ToggleBlock>
					</template>
				</draggable>
			</div>

			<TTButton class="center" icon="add" v-if="!showSlotOptions" @click="showSlotOptions = true">{{ $t("overlay.credits.add_slotBt") }}</TTButton>

			<div class="slotSelector" v-else>
				<ClearButton @click="showSlotOptions = false" />
				<TTButton class="slotBt"
					v-for="slot in slotTypes"
					v-newflag="slot.newFlag? {date:slot.newFlag, id:'endingcredits_slot_'+slot.id+'_1'} : null"
					:icon="slot.icon"
					:premium="slot.premium"
					@click="addSlot(slot)">{{ $t(slot.label) }}</TTButton>
			</div>

			<div class="center" v-if="overlayExists">
				<TTButton :loading="sendingSummaryData" @click="testCredits()" icon="test" secondary>{{ $t('overlay.credits.testBt') }}</TTButton>
			</div>

			<Icon class="center loader card-item" name="loader" v-else-if="checkingOverlayPresence" />
			<div class="center card-item alert" v-else-if="!overlayExists">{{ $t("overlay.overlay_not_configured") }}</div>
		</section>


		<section class="card-item expand parameters">
			<div class="header">
				<div class="title"><Icon name="params" /> {{ $t("overlay.title_settings") }}</div>
			</div>
			<ParamItem :paramData="param_scale" v-model="$store.endingCredits.overlayData.scale" />
			<ParamItem :paramData="param_padding" v-model="$store.endingCredits.overlayData.padding" />
			<ParamItem :paramData="param_paddingTitle" v-model="$store.endingCredits.overlayData.paddingTitle" />
			<ParamItem :paramData="param_fadeSize" v-model="$store.endingCredits.overlayData.fadeSize" />
			<ParamItem :paramData="param_stickyTitle" v-model="$store.endingCredits.overlayData.stickyTitle" />
			<ParamItem :paramData="param_fontTitle" v-model="$store.endingCredits.overlayData.fontTitle" class="fontStyle">
				<template #composite>
					<ParamItem :paramData="param_titleColor" v-model="$store.endingCredits.overlayData.colorTitle" noBackground class="colorPicker" />
				</template>
			</ParamItem>
			<ParamItem :paramData="param_fontEntry" v-model="$store.endingCredits.overlayData.fontEntry" class="fontStyle">
				<template #composite>
					<ParamItem :paramData="param_entryColor" v-model="$store.endingCredits.overlayData.colorEntry" noBackground class="colorPicker" />
				</template>
			</ParamItem>
			<ParamItem :paramData="param_textShadow" v-model="$store.endingCredits.overlayData.textShadow" />
			<ParamItem :paramData="param_ignoreBots" v-model="$store.endingCredits.overlayData.ignoreBots">
				<ParamItem :paramData="param_ignoreCustomBots" v-model="$store.endingCredits.overlayData.ignoreCustomBots" noBackground class="child" />
			</ParamItem>
			<ParamItem :paramData="param_hideEmptySlots" v-model="$store.endingCredits.overlayData.hideEmptySlots" />
			<ParamItem :paramData="param_powerUpEmotes" v-model="$store.endingCredits.overlayData.powerUpEmotes" />
			<ParamItem :paramData="param_showIcons" v-model="$store.endingCredits.overlayData.showIcons" />
			<ParamItem :paramData="param_startDelay" v-model="$store.endingCredits.overlayData.startDelay" />
			<ParamItem :paramData="param_loop" v-model="$store.endingCredits.overlayData.loop" />
			<ParamItem :paramData="param_timing" v-model="$store.endingCredits.overlayData.timing">
				<ParamItem class="child" noBackground :paramData="param_duration" v-model="$store.endingCredits.overlayData.duration" v-if="param_timing.value == 'duration'" noPremiumLock />
				<ParamItem class="child" noBackground :paramData="param_speed" v-model="$store.endingCredits.overlayData.speed" v-if="param_timing.value == 'speed'" noPremiumLock />
			</ParamItem>
		</section>
		<!-- <ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
			<div>{{ $t("overlay.credits.css") }}</div>
			<ul class="cssStructure">
				<li>.todo { ... }</li>
			</ul>
		</ToggleBlock> -->
	</div>
</template>

<script lang="ts">
import ClearButton from '@/components/ClearButton.vue';
import Icon from '@/components/Icon.vue';
import PremiumLockLayer from '@/components/PremiumLockLayer.vue';
import Splitter from '@/components/Splitter.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { TriggerEventPlaceholders, TriggerTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TriggerUtils from '@/utils/TriggerUtils';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import type { JsonObject } from "type-fest";
import { watch } from 'vue';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import TTButton from '../../../TTButton.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import type { IPatreonTier } from '@/store/patreon/storePatreon';
import StoreProxy from '@/store/StoreProxy';

@Component({
	components:{
		Icon,
		TTButton,
		Splitter,
		draggable,
		ParamItem,
		ClearButton,
		ToggleBlock,
		ToggleButton,
		PremiumLockLayer,
		OverlayInstaller,
	}
})
class OverlayParamsCredits extends Vue {

	public param_fadeSize:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:50, min:0, max:400, labelKey:"overlay.credits.param_fadeSize", icon:"fade"};
	public param_padding:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:100, min:0, max:1000, labelKey:"overlay.credits.param_padding", icon:"margin"};
	public param_paddingTitle:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:100, min:0, max:1000, labelKey:"overlay.credits.param_paddingTitle", icon:"margin"};
	public param_stickyTitle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"overlay.credits.param_stickyTitle", icon:"pin"};
	public param_fontTitle:TwitchatDataTypes.ParameterData<string> = {type:"font", value:"", labelKey:"overlay.credits.param_fontTitle", icon:"font"};
	public param_fontEntry:TwitchatDataTypes.ParameterData<string> = {type:"font", value:"", labelKey:"overlay.credits.param_fontEntry", icon:"font"};
	public param_titleColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#cccccc"};
	public param_entryColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ffffff"};
	public param_textShadow:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, min:0, max:100, labelKey:"overlay.credits.param_textShadow", icon:"shadow"};
	public param_timing:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"speed", labelKey:"overlay.credits.param_timing", icon:"timer", premiumOnly:true};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {type:"number", min:2, max:3600, value:60, labelKey:"overlay.credits.param_duration", icon:"timer"};
	public param_speed:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:1, max:1000, value:200, labelKey:"overlay.credits.param_speed", icon:"timer", premiumOnly:true};
	public param_scale:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:1, max:100, value:30, labelKey:"overlay.credits.param_scale", icon:"scale"};
	public param_showIcons:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_showIcons", icon:"show", premiumOnly:true};
	public param_loop:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_loop", icon:"loop", premiumOnly:true};
	public param_startDelay:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:0, max:30, value:0, labelKey:"overlay.credits.param_startDelay", icon:"countdown", premiumOnly:true};
	public param_ignoreBots:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_ignoreBots", icon:"bot"};
	public param_hideEmptySlots:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_hideEmptySlots", icon:"hide"};
	public param_ignoreCustomBots:TwitchatDataTypes.ParameterData<string[]> = {type:"editablelist", value:[], max:50, maxLength:25, labelKey:"overlay.credits.param_ignoreCustomBots", icon:"user"};
	public param_powerUpEmotes:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"overlay.credits.param_powerUpEmotes", icon:"watchStreak", premiumOnly:true};
	public param_maxItems:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_customHTML:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showAmounts:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubMonths:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_htmlTemplate:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_showBadges:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showResubs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubgifts:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showAllActiveSubs:{[key:string]:TwitchatDataTypes.ParameterData<boolean, undefined, boolean>} = {};
	public param_showSubsPrime:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubsT1:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubsT2:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubsT3:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showAllActiveSubgifters:{[key:string]:TwitchatDataTypes.ParameterData<boolean, undefined, boolean>} = {};
	public param_showSubsYoutube:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubsTiktok:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubgiftsYoutube:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubsKofi:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showMods:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showVIPs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showChatters:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortBySubTypes:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortByRoles:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortByAmounts:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortByTotalAmount:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortByName:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_text:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_filterRewards:{[key:string]:TwitchatDataTypes.ParameterData<boolean, unknown, boolean>} = {};
	public param_showRewardUsers:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_uniqueUsers:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_normalCheers:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_pinnedCheers:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showConductors:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showMerchKofi:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showMerchStreamlabs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showTipsKofi:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showTipsTipeee:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showTipsPatreon:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showTipsStreamlabs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showTipsStreamelements:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showPuSkin:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showPuEmote:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showPuCeleb:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_anonLastNames:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showTotalAmount:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_currency:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_patreonTiers:{[key:string]:TwitchatDataTypes.ParameterData<boolean, unknown, boolean, unknown, IPatreonTier>} = {};
	public slotTypes = TwitchatDataTypes.EndingCreditsSlotDefinitions;
	public overlayExists = false;
	public sendingSummaryData = false;
	public showSlotOptions:boolean = false;
	public checkingOverlayPresence:boolean = true;

	private checkInterval:number = -1;
	private subcheckTimeout:number = -1;
	private overlayPresenceHandler!:()=>void;

	public get isPremium():boolean { return this.$store.auth.isPremium; }

	public get classes():string[] {
		const res:string[] = ["overlayparamscredits", "overlayParamsSection"];
		if(!this.isPremium) res.push("notPremium");
		return res;
	}

	public getDefinitionFromSlot(id:TwitchatDataTypes.EndingCreditsSlotStringTypes):TwitchatDataTypes.EndingCreditsSlotDefinition {
		return TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == id)!;
	}

	public beforeMount():void {
		if(this.$store.endingCredits.overlayData.slots.length == 0) {
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "follows")!, undefined, true);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "subs")!, undefined, true);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "cheers")!, undefined, true);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "raids")!, undefined, true);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "chatters")!, undefined, true);
		}else{

			for (let i = 0; i < this.$store.endingCredits.overlayData.slots.length; i++) {
				const slot = this.$store.endingCredits.overlayData.slots[i];
				const defaultSlot = TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == slot.slotType);
				if(!defaultSlot) {
					//Remove deleted slot
					this.$store.endingCredits.overlayData.slots.splice(i, 1);
					i--;
				}else{
					if(this.getDefinitionFromSlot(slot.slotType).premium) {
						//Disable showAmount props if user isn't premium
						if(!this.isPremium && slot.showAmounts != undefined) slot.showAmounts = false;
					}else{
						//Force amount value if missing
						if(slot.showAmounts == undefined && defaultSlot.hasAmount) slot.showAmounts = true;
					}
					//Max entries field is premium only, if not premium force it to 100
					if(!this.isPremium) slot.maxEntries = 100;
					if(slot.enabled === undefined) slot.enabled = true;
				}
			}

			for (let i = 0; i < this.$store.endingCredits.overlayData.slots.length; i++) {
				const slot = this.$store.endingCredits.overlayData.slots[i];
				this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == slot.slotType)!, slot);
			}
		}

		this.param_timing.listValues = [
			{value:"speed", labelKey:"overlay.credits.param_timing_speed"},
			{value:"duration", labelKey:"overlay.credits.param_timing_duration"},
		];

		if(!this.isPremium) {
			this.$store.endingCredits.overlayData.showIcons = true;
			this.$store.endingCredits.overlayData.loop = true;
			this.$store.endingCredits.overlayData.powerUpEmotes = false;
			this.$store.endingCredits.overlayData.timing = "speed";
			this.$store.endingCredits.overlayData.startDelay = 0;
			this.$store.endingCredits.overlayData.duration = 60;
			this.$store.endingCredits.overlayData.speed = 200;
		}else{
			if(this.$store.endingCredits.overlayData.powerUpEmotes === undefined) this.$store.endingCredits.overlayData.powerUpEmotes = true;
		}

		watch(()=>this.$store.endingCredits.overlayData, ()=>this.saveParams(), {deep:true});

		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			this.checkingOverlayPresence = false;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.CREDITS_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.getOverlayPresence(true);
		this.checkInterval = window.setInterval(()=> this.getOverlayPresence(), 2000);

		this.saveParams();
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREDITS_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	/**
	 * Checks if overlay exists
	 */
	public getOverlayPresence(showLoader:boolean = false):void {
		if(showLoader) this.checkingOverlayPresence = true;
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CREDITS_OVERLAY_PRESENCE);
		clearTimeout(this.subcheckTimeout);
		//If after 1,5s the overlay didn't answer, assume it doesn't exist
		this.subcheckTimeout = window.setTimeout(()=>{
			this.overlayExists = false;
			this.checkingOverlayPresence = false;
		}, 1500);
	}

	/**
	 * Opens the premium section
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Deletes a slot
	 */
	public deleteSlot(slot:TwitchatDataTypes.EndingCreditsSlotParams):void {
		this.$confirm( this.$t("overlay.credits.delete_confirm_title") ).then(()=> {
			const index = this.$store.endingCredits.overlayData.slots.findIndex(v=>v.id == slot.id);
			this.$store.endingCredits.overlayData.slots.splice(index, 1);
			delete this.param_customHTML[slot.id];
			delete this.param_htmlTemplate[slot.id];
			delete this.param_maxItems[slot.id];
			delete this.param_showAmounts[slot.id];
			delete this.param_text[slot.id];
		}).catch(()=>{})
	}

	/**
	 * Adds a new category to the list
	 */
	public async addSlot(slotDef:TwitchatDataTypes.EndingCreditsSlotDefinition, data?:TwitchatDataTypes.EndingCreditsSlotParams, isDefautlSlot:boolean = false):Promise<void> {
		let id = data?.id || Utils.getUUID();
		let slotType = slotDef.id;
		let rewards:TwitchDataTypes.Reward[] = [];
		const entry:TwitchatDataTypes.EndingCreditsSlotParams = data || {
			id,
			slotType,
			enabled:true,
			label:this.$t(slotDef.defaultLabel),
			layout:"col",
			maxEntries:100,
		};

		//Create parameters
		this.param_customHTML[id]	= {type:"boolean", value:false, labelKey:"overlay.credits.param_customHTML"};
		this.param_htmlTemplate[id]	= {type:"string", value:"", longText:true, maxLength:1000};
		this.param_maxItems[id]		= {type:'number', icon:"max", min:1, max:1000, value:100, labelKey:'overlay.credits.param_maxItems', premiumOnly:true};
		if(slotDef.hasAmount) {
			if(entry.showAmounts === undefined) {
				entry.showAmounts = this.isPremium || !slotDef.premium;
			}else
			if(!this.isPremium && slotDef.premium) {
				entry.showAmounts = false;
			}
			let icon = "number";
			if(slotDef.id == "patreonMembers") icon = "date";
			this.param_showAmounts[id] = {type:"boolean", icon, value:entry.showAmounts || true, labelKey:this.getDefinitionFromSlot(slotType).amountLabel, premiumOnly:true};
		}

		if(slotDef.id == "rewards") {
			if(entry.filterRewards == undefined || !this.isPremium) {
				entry.showRewardUsers = false;
				entry.filterRewards = false;
				entry.rewardIds = [];
			}
			this.param_showRewardUsers[id]	= {type:'boolean', value:entry.showRewardUsers!, icon:"user", labelKey:'overlay.credits.param_showRewardUsers', premiumOnly:true};
			this.param_filterRewards[id]	= {type:'boolean', value:entry.filterRewards, icon:"channelPoints", labelKey:'overlay.credits.param_filterRewards', premiumOnly:true, twitch_scopes:[TwitchScopes.LIST_REWARDS]};
			if(rewards.length == 0 && TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
				rewards = (await TwitchUtils.getRewards()).sort((a,b)=>a.cost-b.cost);
			}
			let children:TwitchatDataTypes.ParameterData<boolean, unknown, unknown, TwitchDataTypes.Reward>[] = [];
			for (let j = 0; j < rewards.length; j++) {
				const r = rewards[j];
				children.push({type:'boolean', value:entry.rewardIds!.includes(r.id), iconURL:r.image?.url_1x, label:r.title, storage:r, editCallback:(data)=> {
					if(data.value === true && !entry.rewardIds!.includes(data.storage!.id)) {
						entry.rewardIds!.push(data.storage!.id);
					}
					if(data.value === false && entry.rewardIds!.includes(data.storage!.id)) {
						entry.rewardIds!.splice(entry.rewardIds!.indexOf(data.storage!.id), 1);
						entry.rewardIds = entry.rewardIds!.filter(v=>v !== data.storage!.id);
					}
				}});
			}
			this.param_filterRewards[id].children = children;
		}else

		if(slotDef.id == "cheers") {
			entry.showNormalCheers = true;
			entry.showPinnedCheers = true;
			this.param_normalCheers[id]	= {type:'boolean', value:entry.showNormalCheers, icon:"bits", labelKey:'overlay.credits.param_normalCheers', premiumOnly:true};
			this.param_pinnedCheers[id]	= {type:"boolean", value:entry.showPinnedCheers, icon:"pin", labelKey:"overlay.credits.param_pinnedCheers", premiumOnly:true};
		}else

		if(slotDef.id == "chatters") {
			if(entry.showMods === undefined) {
				entry.layout	= "3cols";
				if(isDefautlSlot) {
					entry.label		= this.$t("overlay.credits.moderators_label");
				}
			}
			if(entry.showMods === undefined || !this.isPremium) {
				entry.showMods		= true;
				entry.showVIPs		= false;
				entry.showSubs		= false;
				entry.showChatters	= false;
				entry.showBadges	= false;
				entry.sortByNames	= true;
				entry.sortByRoles	= false;
				entry.sortByAmounts	= false;
			}
			this.param_showMods[id]		= {type:"boolean", value:entry.showMods, icon:"mod", labelKey:"overlay.credits.param_showMods", premiumOnly:true};
			this.param_showVIPs[id]		= {type:"boolean", value:entry.showVIPs!, icon:"vip", labelKey:"overlay.credits.param_showVIPs", premiumOnly:true};
			this.param_showSubs[id]		= {type:"boolean", value:entry.showSubs!, icon:"sub", labelKey:"overlay.credits.param_showSubs", premiumOnly:true};
			this.param_showChatters[id]	= {type:"boolean", value:entry.showChatters!, icon:"whispers", labelKey:"overlay.credits.param_showChatters", premiumOnly:true};
			this.param_showBadges[id]	= {type:'boolean', value:entry.showBadges!, icon:"badge", labelKey:'overlay.credits.param_showBadges', premiumOnly:true};
			this.param_sortByName[id]	= {type:"boolean", value:entry.sortByNames!, icon:"filters", labelKey:"overlay.credits.param_sortByNames", premiumOnly:true};
			this.param_sortByRoles[id]	= {type:"boolean", value:entry.sortByRoles!, icon:"filters", labelKey:"overlay.credits.param_sortByRoles", premiumOnly:true};
			this.param_sortByAmounts[id]= {type:"boolean", value:entry.sortByAmounts!, icon:"filters", labelKey:"overlay.credits.param_sortByAmount", premiumOnly:true};
		}else

		if(slotDef.id == "text") {
			const placeholderList	= TriggerEventPlaceholders(TriggerTypes.GLOBAL_PLACEHOLDERS).concat();
			this.param_text[id]		= {type:"string", value:"", longText:true, maxLength:1000, labelKey:"overlay.credits.param_freeText", placeholderList};
		}else

		if(slotDef.id == "hypetrains") {
			entry.showTrainConductors = true;
			this.param_showConductors[id]	= {type:'boolean', value:entry.showTrainConductors, icon:"user", labelKey:'overlay.credits.param_showConductors'};
		}else

		if(slotDef.id == "subs") {
			if(entry.showSubsPrime === undefined)	entry.showSubsPrime = true;
			if(entry.showSubsT1 === undefined)		entry.showSubsT1 = true;
			if(entry.showSubsT2 === undefined)		entry.showSubsT2 = true;
			if(entry.showSubsT3 === undefined)		entry.showSubsT3 = true;
			if(entry.showSubs === undefined)		entry.showSubs = true;
			if(entry.showResubs === undefined)		entry.showResubs = true;
			if(entry.showSubgifts === undefined)	entry.showSubgifts = true;
			if(entry.showSubMonths === undefined)	entry.showSubMonths = false;
			if(entry.showBadges == undefined || !this.isPremium) entry.showBadges = false;
			if(entry.sortByNames == undefined || !this.isPremium) entry.sortByNames = false;
			if(entry.sortBySubTypes == undefined || !this.isPremium) entry.sortBySubTypes = false;
			if(entry.showSubsYoutube == undefined || !this.isPremium) entry.showSubsYoutube = false;
			if(entry.showSubgiftsYoutube == undefined || !this.isPremium) entry.showSubgiftsYoutube = false;
			this.param_showSubs[id]				= {type:"boolean", value:entry.showSubs, icon:"sub", labelKey:"overlay.credits.param_showSubs"};
			this.param_showResubs[id]			= {type:"boolean", value:entry.showResubs, icon:"sub", labelKey:"overlay.credits.param_showResubs"};
			this.param_showSubgifts[id]			= {type:"boolean", value:entry.showSubgifts, icon:"gift", labelKey:"overlay.credits.param_showSubgifts"};
			this.param_showSubsYoutube[id]		= {type:'boolean', value:entry.showSubsYoutube, icon:"youtube", labelKey:'overlay.credits.param_showSubsYoutube', premiumOnly:true};
			this.param_showSubsTiktok[id]		= {type:'boolean', value:entry.showSubsTiktok===true, icon:"tiktok", labelKey:'overlay.credits.param_showSubsTiktok', premiumOnly:true};
			this.param_showSubgiftsYoutube[id]	= {type:'boolean', value:entry.showSubgiftsYoutube, icon:"youtube", labelKey:'overlay.credits.param_showSubgiftsYoutube', premiumOnly:true};
			this.param_showSubsPrime[id]		= {type:'boolean', value:entry.showSubsPrime===true, labelKey:'overlay.credits.param_showSubsPrime'};
			this.param_showAllActiveSubs[id]	= {type:'boolean', value:entry.showAllSubs===true, icon:"date", labelKey:'overlay.credits.param_showAllActiveSubs'};
			this.param_showSubsT1[id]			= {type:'boolean', value:entry.showSubsT1===true, labelKey:'overlay.credits.param_showSubsT1'};
			this.param_showSubsT2[id]			= {type:'boolean', value:entry.showSubsT2===true, labelKey:'overlay.credits.param_showSubsT2'};
			this.param_showSubsT3[id]			= {type:'boolean', value:entry.showSubsT3===true, labelKey:'overlay.credits.param_showSubsT3'};
			this.param_showAllActiveSubgifters[id]		= {type:'boolean', value:entry.showAllSubgifters===true, icon:"date", labelKey:'overlay.credits.param_showAllActiveSubgifters'};
			this.param_showBadges[id]			= {type:'boolean', value:entry.showBadges, icon:"badge", labelKey:'overlay.credits.param_showSubBadges', premiumOnly:true};
			this.param_sortByName[id]			= {type:"boolean", value:entry.sortByNames, icon:"filters", labelKey:"overlay.credits.param_sortByNames", premiumOnly:true};
			this.param_sortBySubTypes[id]		= {type:"boolean", value:entry.sortBySubTypes, icon:"filters", labelKey:"overlay.credits.param_sortBySubTypes", premiumOnly:true};
			this.param_showSubMonths[id]		= {type:"boolean", value:entry.showSubMonths, icon:"number", labelKey:"overlay.credits.param_showSubMonths"};
		}else

		if(slotDef.id == "tips") {
			if(entry.sortByNames == undefined) 				entry.sortByNames = false;
			if(entry.sortByAmounts == undefined) 			entry.sortByAmounts = false;
			if(entry.showTipsKofi === undefined)			entry.showTipsKofi = true;
			if(entry.showSubsKofi === undefined)			entry.showTipsKofi = entry.showSubsYoutube ?? true;//I made a mistake in the past, setting this v-model's entry to "showSubsYoutube".
			if(entry.showTipsTipeee === undefined)			entry.showTipsTipeee = true;
			if(entry.showTipsPatreon === undefined)			entry.showTipsPatreon = true;
			if(entry.showTipsStreamlabs === undefined)		entry.showTipsStreamlabs = true;
			if(entry.showTipsStreamelements === undefined)	entry.showTipsStreamelements = true;
			this.param_sortByName[id]				= {type:"boolean", value:entry.sortByNames, icon:"filters", labelKey:"overlay.credits.param_sortByNames", premiumOnly:true};
			this.param_showTipsKofi[id]				= {type:'boolean', value:entry.showTipsKofi, icon:"kofi", labelKey:'overlay.credits.param_tip_kofi', premiumOnly:true};
			this.param_showTipsTipeee[id]			= {type:'boolean', value:entry.showTipsTipeee, icon:"tipeee", labelKey:'overlay.credits.param_tip_tipeee', premiumOnly:true};
			this.param_showTipsPatreon[id]			= {type:'boolean', value:entry.showTipsPatreon, icon:"patreon", labelKey:'overlay.credits.param_tip_patreon', premiumOnly:true};
			this.param_showTipsStreamlabs[id]		= {type:'boolean', value:entry.showTipsStreamlabs, icon:"streamlabs", labelKey:'overlay.credits.param_tip_streamlabs', premiumOnly:true};
			this.param_showTipsStreamelements[id]	= {type:'boolean', value:entry.showTipsStreamelements, icon:"streamelements", labelKey:'overlay.credits.param_tip_streamelements', premiumOnly:true};
			this.param_sortByAmounts[id]			= {type:"boolean", value:entry.sortByAmounts, icon:"filters", labelKey:"overlay.credits.param_sortByTipAmount", premiumOnly:true};
			this.param_showSubsKofi[id]				= {type:'boolean', value:entry.showSubsKofi===true, icon:"kofi", labelKey:'overlay.credits.param_showSubsKofi', premiumOnly:true};
		}else

		if(slotDef.id == "merch") {
			if(entry.showMerchKofi === undefined)			entry.showMerchKofi = true;
			if(entry.showMerchStreamlabs === undefined)		entry.showMerchStreamlabs = true;
			this.param_showMerchKofi[id]			= {type:'boolean', value:entry.showMerchKofi, icon:"kofi", labelKey:'overlay.credits.param_merch_kofi', premiumOnly:true};
			this.param_showMerchStreamlabs[id]		= {type:'boolean', value:entry.showMerchStreamlabs, icon:"streamlabs", labelKey:'overlay.credits.param_merch_streamlabs', premiumOnly:true};
		}else

		if(slotDef.id == "powerups") {
			if(entry.showPuSkin === undefined)	entry.showPuSkin = true;
			if(entry.showPuEmote === undefined)	entry.showPuEmote = true;
			if(entry.showPuCeleb === undefined)	entry.showPuCeleb = true;
			if(entry.sortByAmounts == undefined)entry.sortByAmounts = true;
			this.param_showPuSkin[id]			= {type:'boolean', value:entry.showPuSkin, icon:"whispers", labelKey:'overlay.credits.param_showPuSkin'};
			this.param_showPuEmote[id]			= {type:'boolean', value:entry.showPuEmote, icon:"emote", labelKey:'overlay.credits.param_showPuEmote'};
			this.param_showPuCeleb[id]			= {type:'boolean', value:entry.showPuCeleb, icon:"watchStreak", labelKey:'overlay.credits.param_showPuCeleb'};
			this.param_sortByAmounts[id]		= {type:"boolean", value:entry.sortByAmounts, icon:"filters", labelKey:"overlay.credits.param_sortByPuCount", premiumOnly:true};
		}else

		if(slotDef.id == "patreonMembers") {
			if(entry.currency == undefined)				entry.currency = "€";
			if(entry.sortByNames == undefined)			entry.sortByNames = true;
			if(entry.sortByAmounts == undefined)		entry.sortByAmounts = true;
			if(entry.anonLastNames == undefined)		entry.anonLastNames = true;
			if(entry.showTotalAmounts == undefined)		entry.showTotalAmounts = false;
			if(entry.sortByTotalAmounts == undefined)	entry.sortByTotalAmounts = false;
			if(entry.patreonTiers == undefined)	entry.patreonTiers = StoreProxy.patreon.tierList.map(v=>v.id) || [];
			
			this.param_anonLastNames[id]		= {type:"boolean", value:entry.anonLastNames, icon:"anon", labelKey:"overlay.credits.param_anonLastNames", premiumOnly:true};
			this.param_sortByName[id]			= {type:"boolean", value:entry.sortByNames, icon:"filters", labelKey:"overlay.credits.param_sortByNames", premiumOnly:true};
			this.param_sortByAmounts[id]		= {type:"boolean", value:entry.sortByAmounts, icon:"filters", labelKey:"overlay.credits.param_sortByDuration", premiumOnly:true};
			this.param_sortByTotalAmount[id]	= {type:"boolean", value:entry.sortByTotalAmounts, icon:"filters", labelKey:"overlay.credits.param_sortByTotalAmount", premiumOnly:true};
			this.param_showTotalAmount[id]		= {type:"boolean", value:entry.showTotalAmounts, icon:"coin", labelKey:"overlay.credits.param_showTotalAmount", premiumOnly:true};
			this.param_patreonTiers[id]			= {type:"boolean", value:true, noInput:true, icon:"patreon", labelKey:"overlay.credits.param_patreonTiers", premiumOnly:true};
			this.param_currency[id]				= {type:"string", value:entry.currency, maxLength:5, labelKey:"overlay.credits.param_currency", premiumOnly:true};

			this.param_filterRewards[id]	= {type:'boolean', value:true, icon:"channelPoints", labelKey:'overlay.credits.param_filterRewards', premiumOnly:true, twitch_scopes:[TwitchScopes.LIST_REWARDS]};
			if(rewards.length == 0 && TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
				rewards = (await TwitchUtils.getRewards()).sort((a,b)=>a.cost-b.cost);
			}
			let children:TwitchatDataTypes.ParameterData<boolean, unknown, unknown, IPatreonTier>[] = [];
			const tierList = StoreProxy.patreon.tierList;
			for (let j = 0; j < tierList.length; j++) {
				const tier = tierList[j];
				//Skip "free" tier
				if(tier.attributes.amount_cents == 0) continue;
				children.push({
					type:'boolean',
					value:entry.patreonTiers!.includes(tier.id),
					label:tier.attributes.title,// + " - cost:" + tier.attributes.amount_cents/100,
					storage:tier,
					editCallback:(data)=> {
						if(data.value === true && !entry.patreonTiers!.includes(data.storage!.id)) {
							entry.patreonTiers!.push(data.storage!.id);
						}
						if(data.value === false && entry.patreonTiers!.includes(data.storage!.id)) {
							entry.patreonTiers!.splice(entry.patreonTiers!.indexOf(data.storage!.id), 1);
							entry.patreonTiers = entry.patreonTiers!.filter(v=>v !== data.storage!.id);
						}
					}
				});
			}
			this.param_patreonTiers[id].children = children;
		}else

		if(slotDef.id == "ytSuperSticker"
		|| slotDef.id == "ytSuperchat"
		|| slotDef.id == "tiktokGifts"
		|| slotDef.id == "tiktokLikes"
		|| slotDef.id == "tiktokShares") {
			if(entry.sortByNames == undefined || !this.isPremium)	entry.sortByNames = false;
			if(entry.sortByAmounts == undefined || !this.isPremium)	entry.sortByAmounts = false;
			this.param_sortByName[id]	= {type:"boolean", value:entry.sortByNames, icon:"filters", labelKey:"overlay.credits.param_sortByNames", premiumOnly:true};
			const labelKey = {
				"tiktokGifts": "param_sortByGiftAmount", 
				"tiktokLikes": "param_sortByLikeCount", 
				"tiktokShares": "param_sortByShareCount", 
				"ytSuperSticker": "param_sortByTipAmount", 
				"ytSuperchat": "param_sortByTipAmouns"
			}[slotDef.id];
			this.param_sortByAmounts[id]= {type:"boolean", value:entry.sortByAmounts, icon:"filters", labelKey:"overlay.credits."+labelKey, premiumOnly:true};
		}

		if(slotDef.canMerge) {
			if(entry.uniqueUsers === undefined || !this.isPremium) entry.uniqueUsers = false;
			this.param_uniqueUsers[id]	= {type:"boolean", value:false, icon:"merge", labelKey:"overlay.credits.param_uniqueUsers", premiumOnly:true};
		}
		if(!data) this.$store.endingCredits.overlayData.slots.push(entry);
		this.saveParams();
	}

	/**
	 * Send fake data
	 */
	public async testCredits():Promise<void> {
		this.sendingSummaryData = true;
		const summary = await this.$store.stream.getSummary(undefined, true, true);
		PublicAPI.instance.broadcast(TwitchatEvent.SUMMARY_DATA, (summary as unknown) as JsonObject);
		this.sendingSummaryData = false;
	}

	/**
	 * Scrolls to
	 */
	public async scrollTo(id:string):Promise<void> {
		PublicAPI.instance.broadcast(TwitchatEvent.ENDING_CREDITS_CONTROL, {scrollTo:id});
	}

	/**
	 * Saves current parameters
	 */
	private async saveParams():Promise<void> {
		this.$store.endingCredits.saveParams();
	}

}
export default toNative(OverlayParamsCredits);
</script>

<style scoped lang="less">
.overlayparamscredits{

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
				:deep(.inputHolder ){
					height: 30px;
				}
			}
		}
	}

	section.expand {
		width: 100%;
	}

	.slots {
		.slotHolder {
			position: relative;
			margin: .25em 0;
			// border: 1px solid var(--color-text);
			border-radius: var(--border-radius);
			&>:deep(.header) {
				cursor: move;
				justify-content: space-between;
				background-color: var(--color-text-fadest);
				transition: background-color .2s;
				&:hover {
					background-color: var(--color-text-fader);
				}
			}
			.icons {
				gap: .5em;
				display: flex;
				flex-direction: row;
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
					.label, .default {
						cursor: text;
						min-width: 2em;
						font-weight: bold;
						// flex-grow: 1;
						padding: .25em .5em;
						border-radius: var(--border-radius);

						&.label {
							&:hover, &:active, &:focus {
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
						opacity: .8;
						font-style: italic;
						top:0;
						left:50%;
						transform: translateX(-50%);
						padding-right: 2em;
					}
				}
				&>.icon {
					margin-left: -1.5em;
				}
			}
			.rightActions {
				gap: .25em;
				display: flex;
				flex-direction: row;
				align-items: center;
					flex-shrink: 0;
				.maxItems {
					width: 4.5em;
					:deep(input) {
						text-align: center;
					}
				}
				.deleteBt, .scrollBt {
					margin: -.5em 0;
					align-self: stretch;
					border-radius: 0;
					flex-shrink: 0;
				}
			}
			.content {
				gap: .25em;
				display: flex;
				flex-direction: column;
				position: relative;

				.limitations{
					text-align: center;
					.icon {
						height: 1em;
					}
					.button {
						margin-top: .5em;
					}
				}
				.layout {
					width: 100%;
					position: relative;
					.form {
						gap: .5em;
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
							background: linear-gradient(170deg, var(--background-color-fadest) 0%, transparent 100%);
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
							gap: .5em;
							display: flex;
							flex-direction: row;
							flex-wrap: wrap;
							justify-content: flex-end;
							.button {
								width: 2em;
								opacity: 1;//Do not fade when disabled as its holder will already be faded
							}
						}
					}
				}

				.paramitem {
					:deep(input):not([type="checkbox"]), :deep(textarea) {
						opacity: 1;//Do not fade when disabled as its holder will already be faded
					}
				}

				.tierList {
					row-gap: .5em;
					column-gap: 2em;
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					align-items: center;
					justify-content: center;
					overflow: visible;
				}
			}
			&.premium {
				border-color: var(--color-premium-extralight);
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
		padding: .5em 2.5em;
		border-radius: var(--border-radius);
		gap: .5em;
		display: flex;
		justify-content: center;
		flex-direction: row;
		flex-wrap: wrap;
	}

	.installer .alertIcon {
		height: 1em;
		margin-right: .5em;
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
