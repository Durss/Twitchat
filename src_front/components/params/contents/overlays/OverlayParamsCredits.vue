<template>
	<ToggleBlock :open="open" :class="classes" :title="$t('overlay.credits.title')" :icons="['credits']">
		<div class="holder">
			<div class="header">{{ $t("overlay.credits.head") }}</div>

			<OverlayInstaller class="installer" type="credits" />

			<ToggleBlock :title="$t('overlay.credits.parameters')" medium secondary :open="false" :icons="['params']">
				<div class="globalParams">
					<ParamItem :paramData="param_scale" v-model="data.scale" />
					<ParamItem :paramData="param_padding" v-model="data.padding" />
					<ParamItem :paramData="param_paddingTitle" v-model="data.paddingTitle" />
					<ParamItem :paramData="param_titleColor" v-model="data.colorTitle" />
					<ParamItem :paramData="param_fontTitle" v-model="data.fontTitle" v-if="fontsReady" />
					<ParamItem :paramData="param_entryColor" v-model="data.colorEntry" />
					<ParamItem :paramData="param_fontEntry" v-model="data.fontEntry" v-if="fontsReady" />
					<ParamItem :paramData="param_textShadow" v-model="data.textShadow" />
					<ParamItem :paramData="param_showIcons" v-model="data.showIcons" premium />
					<ParamItem :paramData="param_startDelay" v-model="data.startDelay" premium />
					<ParamItem :paramData="param_loop" v-model="data.loop" premium />
					<ParamItem :paramData="param_timing" v-model="data.timing" premium>
						<ParamItem noBackground :paramData="param_duration" v-model="data.duration" v-if="param_timing.value == 'duration'" premium noPremiumLock />
						<ParamItem noBackground :paramData="param_speed" v-model="data.speed" v-if="param_timing.value == 'speed'" premium noPremiumLock />
					</ParamItem>
				</div>
			</ToggleBlock>

			<div class="slots">
				<draggable
				:animation="250"
				group="description"
				ghostClass="ghost"
				item-key="id"
				handle=".slotHolder>.header"
				v-model="data.slots">
					<template #item="{element, index}:{element:TwitchatDataTypes.EndingCreditsSlotParams, index:number}">
						<ToggleBlock class="slotHolder" :key="'item_'+element.id" :open="false" medium :premium="getDefinitionFromSlot(element.slotType).premium">
							<template #left_actions>
								<div class="icons">
									<Icon name="dragZone" />
									<Icon :name="getDefinitionFromSlot(element.slotType).icon" />
									<Icon name="premium" v-tooltip="$t('premium.premium_only_tt')" v-if="getDefinitionFromSlot(element.slotType).premium" />
								</div>
							</template>
							
							<template #title>
								<div class="titleHolder">
									<div class="title">
										<span class="default" v-if="!element.label">{{ $t(getDefinitionFromSlot(element.slotType).label) }}</span>
										<contenteditable class="label" tag="div" :ref="'label_'+element.id"
										:contenteditable="true"
										v-model="element.label"
										:no-nl="true"
										:no-html="true"
										@click.stop
										@input="limitLabelSize(element)" />
									</div>
									<Icon name="edit" />
								</div>
							</template>

							<template #right_actions>
								<div class="rightActions">
									<!-- <Button v-if="getDefinitionFromSlot(element.slotType).premium === true && !isPremium"
									icon="premium" premium
									v-tooltip="$t('premium.become_premiumBt')"
									@click.prevent="openPremium()" /> -->
									<Button class="deleteBt" icon="trash" @click.stop="deleteSlot(element)" alert />
								</div>
							</template>

							<div class="content">
								<div class="card-item premium limitations" v-if="slotTypes.find(v => v.id == element.slotType)?.premium && !isPremium">
									<p><Icon name="alert"/> {{ $t("overlay.credits.premium_category") }}</p>
									<Button icon="premium" @click="openPremium()" light premium small>{{$t('premium.become_premiumBt')}}</Button>
								</div>
								<div class="card-item layout">
									<!-- <PremiumLockLayer v-if="slotTypes.find(v => v.id == element.slotType)?.premium" /> -->
									<div class="form">
										<Icon name="layout" />
										<label>{{ $t("overlay.credits.param_layout") }}</label>
										<div class="layoutBtns">
											<Button icon="layout_left" 		 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'left'"		:selected="element.layout == 'left'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
											<Button icon="layout_center" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'center'"		:selected="element.layout == 'center'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
											<Button icon="layout_right" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'right'"		:selected="element.layout == 'right'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
											<Button icon="layout_colLeft" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'colLeft'"		:selected="element.layout == 'colLeft'" />
											<Button icon="layout_col" 		 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'col'"			:selected="element.layout == 'col'" />
											<Button icon="layout_colRight" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'colRight'"	:selected="element.layout == 'colRight'" />
											<Button icon="layout_2cols" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = '2cols'"		:selected="element.layout == '2cols'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
											<Button icon="layout_3cols" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = '3cols'"		:selected="element.layout == '3cols'" v-if="!['text', 'polls', 'predictions'].includes(element.slotType)" />
										</div>
									</div>
								</div>

								<template v-if="element.slotType == 'rewards'">
									<ParamItem :paramData="param_showRewardUsers[element.id]" v-model="element.showRewardUsers"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_filterRewards[element.id]"	v-model="element.filterRewards"		premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								</template>

								<template v-if="element.slotType == 'subs'">
									<ParamItem :paramData="param_showSubgifts[element.id]"		v-model="element.showSubgifts" />
									<ParamItem :paramData="param_showResubs[element.id]"		v-model="element.showResubs" />
									<ParamItem :paramData="param_showSubs[element.id]"			v-model="element.showSubs" />
									<ParamItem :paramData="param_showBadges[element.id]"		v-model="element.showBadges"		premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_sortByName[element.id]"		v-model="element.sortByNames"		premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_sortBySubTypes[element.id]"	v-model="element.sortBySubTypes"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								</template>
									
								<template v-if="element.slotType == 'chatters'">
									<ParamItem :paramData="param_showMods[element.id]"		v-model="element.showMods"		premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_showVIPs[element.id]"		v-model="element.showVIPs"		premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_showSubs[element.id]"		v-model="element.showSubs"		premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_showChatters[element.id]"	v-model="element.showChatters"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_showBadges[element.id]"	v-model="element.showBadges"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_sortByRoles[element.id]"	v-model="element.sortByRoles"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_sortByAmounts[element.id]"	v-model="element.sortByAmounts"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem :paramData="param_sortByName[element.id]"	v-model="element.sortByNames"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								</template>
								<ParamItem :paramData="param_uniqueUsers[element.id]"		v-model="element.uniqueUsers"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" v-if="param_uniqueUsers[element.id]" />
								<ParamItem v-if="getDefinitionFromSlot(element.slotType).hasAmount" class="amounts" :paramData="param_showAmounts[element.id]" v-model="element.showAmounts" premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								<ParamItem class="maxItems" :paramData="param_maxItems[element.id]" v-model="element.maxEntries" v-if="element.slotType != 'text'" premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								<ParamItem class="maxItems" :paramData="param_text[element.id]" v-model="element.text" v-else premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								
								<!-- <ParamItem class="customHTML" :paramData="param_customHTML[index]" v-model="element.customHTML" premium>
									<ParamItem class="customHTML" :paramData="param_htmlTemplate[index]" v-model="element.htmlTemplate" premium />
								</ParamItem> -->
							</div>
						</ToggleBlock>
					</template>
				</draggable>
			</div>

			<Button class="center" icon="add" v-if="!showSlotOptions" @click="showSlotOptions = true">{{ $t("overlay.credits.add_slotBt") }}</Button>
			
			<div class="slotSelector" v-else>
				<CloseButton @click="showSlotOptions = false" />
				<Button class="slotBt"
				v-for="slot in slotTypes"
				:icon="slot.icon"
				:premium="slot.premium"
				@click="addSlot(slot)">{{ $t(slot.label) }}</Button>
			</div>

			<div class="center" v-if="overlayExists">
				<Button :loading="sendingSummaryData" @click="testCredits()" icon="test">{{ $t('overlay.credits.testBt') }}</Button>
			</div>

			<Icon class="center loader card-item" name="loader" v-else-if="checkingOverlayAtStart" />
			<div class="center card-item alert" v-else-if="!overlayExists">{{ $t("overlay.credits.no_overlay") }}</div>

			<!-- <ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div>{{ $t("overlay.credits.css") }}</div>
				<ul class="cssStructure">
					<li>.todo { ... }</li>
				</ul>
			</ToggleBlock> -->
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import CloseButton from '@/components/CloseButton.vue';
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
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import type { JsonObject } from "type-fest";
import { watch } from 'vue';
import contenteditable from 'vue-contenteditable';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import TTButton from '../../../TTButton.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';

@Component({
	components:{
		Icon,
		Button: TTButton,
		Splitter,
		draggable,
		ParamItem,
		CloseButton,
		ToggleBlock,
		ToggleButton,
		contenteditable,
		PremiumLockLayer,
		OverlayInstaller,
	}
})
export default class OverlayParamsCredits extends Vue {

	@Prop({default:false})
	public open!:boolean;
	
	public param_padding:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:100, min:0, max:1000, labelKey:"overlay.credits.param_padding", icon:"min"};
	public param_paddingTitle:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:100, min:0, max:1000, labelKey:"overlay.credits.param_paddingTitle", icon:"min"};
	public param_fontTitle:TwitchatDataTypes.ParameterData<string> = {type:"editablelist", value:"", labelKey:"overlay.credits.param_fontTitle", icon:"font"};
	public param_fontEntry:TwitchatDataTypes.ParameterData<string> = {type:"editablelist", value:"", labelKey:"overlay.credits.param_fontEntry", icon:"font"};
	public param_titleColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ffffff", labelKey:"overlay.credits.param_colorTitle", icon:"color"};
	public param_entryColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ffffff", labelKey:"overlay.credits.param_colorEntry", icon:"color"};
	public param_textShadow:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, min:0, max:100, labelKey:"overlay.credits.param_textShadow", icon:"shadow"};
	public param_timing:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"speed", labelKey:"overlay.credits.param_timing", icon:"timer"};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {type:"number", min:2, max:3600, value:60, labelKey:"overlay.credits.param_duration", icon:"timer"};
	public param_speed:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:1, max:1000, value:200, labelKey:"overlay.credits.param_speed", icon:"timer"};
	public param_scale:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:1, max:100, value:30, labelKey:"overlay.credits.param_scale", icon:"scale"};
	public param_showIcons:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_showIcons", icon:"show"};
	public param_loop:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_loop", icon:"loop"};
	public param_startDelay:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:0, max:30, value:0, labelKey:"overlay.credits.param_startDelay", icon:"countdown"};
	public param_maxItems:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_customHTML:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showAmounts:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_htmlTemplate:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_showBadges:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showResubs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubgifts:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showMods:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showVIPs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showChatters:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortBySubTypes:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortByRoles:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortByAmounts:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortByName:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_text:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_filterRewards:{[key:string]:TwitchatDataTypes.ParameterData<boolean, unknown, boolean>} = {};
	public param_showRewardUsers:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_uniqueUsers:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public slotTypes = TwitchatDataTypes.EndingCreditsSlotDefinitions;
	public overlayExists = false;
	public sendingSummaryData = false;
	public fontsReady:boolean = false;
	public showSlotOptions:boolean = false;
	public checkingOverlayAtStart:boolean = true;
	public data:TwitchatDataTypes.EndingCreditsParams = {
		scale:30,
		padding:100,
		paddingTitle:30,
		fontTitle:"Inter",
		fontEntry:"Inter",
		colorTitle:"#e04e00",
		colorEntry:"#039372",
		textShadow:50,
		timing:"speed",
		startDelay:0,
		duration:60,
		speed:200,
		loop:true,
		showIcons:true,
		slots:[],
	};

	private checkInterval!:number;
	private subcheckTimeout!:number;
	private overlayPresenceHandler!:()=>void;
	private broadcastDebounce:number = -1;

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
		const json = DataStore.get(DataStore.ENDING_CREDITS_PARAMS);
		if(json) {
			Utils.mergeRemoteObject(JSON.parse(json), (this.data as unknown) as JsonObject);
		}
		
		Utils.listAvailableFonts().then(fonts => {
			this.param_fontTitle.options = fonts.concat();
			this.param_fontEntry.options = fonts.concat();
			if(this.param_fontEntry.options.indexOf(this.data.fontEntry)) {
				this.param_fontEntry.options.push(this.data.fontEntry)
			}
			if(this.param_fontTitle.options.indexOf(this.data.fontTitle)) {
				this.param_fontTitle.options.push(this.data.fontTitle)
			}
			this.fontsReady = true;
		});
		
		if(this.data.slots.length == 0) {
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "follows")!, undefined, true);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "subs")!, undefined, true);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "cheers")!, undefined, true);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "raids")!, undefined, true);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "chatters")!, undefined, true);
		}else{

			for (let i = 0; i < this.data.slots.length; i++) {
				const slot = this.data.slots[i];
				const defaultSlot = TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == slot.slotType);
				if(!defaultSlot) {
					//Remove deleted slot
					this.data.slots.splice(i, 1);
					i--;
				}else{
					if(this.getDefinitionFromSlot(slot.slotType).premium) {
						//Disable showAmount props if user isn't premium
						if(slot.showAmounts != undefined) slot.showAmounts = false;
					}else{
						//Force amount value if missing
						if(slot.showAmounts == undefined && defaultSlot.hasAmount) slot.showAmounts = true;
					}
					//Max entries field is premium only, if not premium force it to 100
					if(!this.isPremium) slot.maxEntries = 100;
				}
			}
		
			for (let i = 0; i < this.data.slots.length; i++) {
				const slot = this.data.slots[i];
				this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == slot.slotType)!, slot);
			}
		}

		this.param_timing.listValues = [
			{value:"speed", labelKey:"overlay.credits.param_timing_speed"},
			{value:"duration", labelKey:"overlay.credits.param_timing_duration"},
		]

		watch(()=>this.data, ()=>this.saveParams(), {deep:true});
		
		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			this.checkingOverlayAtStart = false;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.CREDITS_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>{
			PublicAPI.instance.broadcast(TwitchatEvent.GET_CREDITS_OVERLAY_PRESENCE);
			clearTimeout(this.subcheckTimeout);
			//If after 1,5s the overlay didn't answer, assume it doesn't exist
			this.subcheckTimeout = setTimeout(()=>{
				this.overlayExists = false;
				this.checkingOverlayAtStart = false;
			}, 1500);
		}, 2000);

		this.saveParams();
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREDITS_OVERLAY_PRESENCE, this.overlayPresenceHandler);
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
			const index = this.data.slots.findIndex(v=>v.id == slot.id);
			this.data.slots.splice(index, 1);
			delete this.param_customHTML[slot.id];
			delete this.param_htmlTemplate[slot.id];
			delete this.param_maxItems[slot.id];
			delete this.param_showAmounts[slot.id];
			delete this.param_text[slot.id];
		}).catch(()=>{})
	}

	/**
	 * Reset to default label if label is empty
	 * @param item 
	 */
	public checkDefaultLabel(item:TwitchatDataTypes.EndingCreditsSlotParams):void {
		if(!item.label) {
			item.label = this.$t(this.getDefinitionFromSlot(item.slotType).defaultLabel);
		}else{
			this.limitLabelSize(item);
		}
	}

	/**
	 * Limit the size of the label.
	 * Can't use maxLength because it's a content-editable tag.
	 * @param item 
	 */
	public async limitLabelSize(item:TwitchatDataTypes.EndingCreditsSlotParams):Promise<void> {
		const sel = window.getSelection();
		if(sel && sel.rangeCount > 0) {
			//Save caret index
			var range = sel.getRangeAt(0);
			let caretIndex = range.startOffset;
			await this.$nextTick();
			//Limit label's size
			item.label = item.label.substring(0, 100);
			await this.$nextTick();
			//Reset caret to previous position
			if(range.startContainer.firstChild) range.setStart(range.startContainer.firstChild, Math.min(item.label.length, caretIndex-1));
		}else{
			item.label = item.label.substring(0, 100);
		}
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
			label:this.$t(slotDef.defaultLabel),
			layout:"col",
			maxEntries:100,
		};
		
		//Create parameters
		this.param_customHTML[id]	= {type:"boolean", value:false, labelKey:"overlay.credits.param_customHTML"};
		this.param_htmlTemplate[id]	= {type:"string", value:"", longText:true, maxLength:1000};
		this.param_maxItems[id]		= {type:'number', icon:"max", min:1, max:1000, value:100, labelKey:'overlay.credits.param_maxItems'};
		if(slotDef.hasAmount) {
			if(entry.showAmounts === undefined) {
				entry.showAmounts = this.isPremium || slotDef.premium;
			}else
			if(!this.isPremium || slotDef.premium) {
				entry.showAmounts = false;
			}
			this.param_showAmounts[id] = {type:"boolean", icon:"number", value:entry.showAmounts || true, labelKey:this.getDefinitionFromSlot(slotType).amountLabel};
		}

		if(slotDef.id == "rewards") {
			if(entry.filterRewards == undefined || !this.isPremium) {
				entry.showRewardUsers = false;
				entry.filterRewards = false;
				entry.rewardIds = [];
			}
			this.param_showRewardUsers[id]	= {type:'boolean', value:false, icon:"user", labelKey:'overlay.credits.param_showRewardUsers'};
			this.param_filterRewards[id]	= {type:'boolean', value:false, icon:"channelPoints", labelKey:'overlay.credits.param_filterRewards', twitch_scopes:[TwitchScopes.LIST_REWARDS]};
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
				entry.sortByRoles	= false;
				entry.sortByAmounts	= false;
				entry.showAmounts	= false;
			}
			this.param_showBadges[id]	= {type:'boolean', value:false, icon:"badge", labelKey:'overlay.credits.param_showBadges'};
			this.param_showMods[id]		= {type:"boolean", value:true, icon:"mod", labelKey:"overlay.credits.param_showMods"};
			this.param_showVIPs[id]		= {type:"boolean", value:true, icon:"vip", labelKey:"overlay.credits.param_showVIPs"};
			this.param_showSubs[id]		= {type:"boolean", value:true, icon:"sub", labelKey:"overlay.credits.param_showSubs"};
			this.param_showChatters[id]	= {type:"boolean", value:true, icon:"whispers", labelKey:"overlay.credits.param_showChatters"};
			this.param_sortByName[id]	= {type:"boolean", value:false, icon:"filters", labelKey:"overlay.credits.param_sortByNames"};
			this.param_sortByRoles[id]	= {type:"boolean", value:true, icon:"filters", labelKey:"overlay.credits.param_sortByRoles"};
			this.param_sortByAmounts[id]= {type:"boolean", value:false, icon:"filters", labelKey:"overlay.credits.param_sortByAmounts"};
		}else

		if(slotDef.id == "text") {
			const placeholderList	= TriggerEventPlaceholders(TriggerTypes.GLOBAL_PLACHOLDERS).concat();
			this.param_text[id]		= {type:"string", value:"", longText:true, maxLength:1000, placeholderList};
		}else

		if(slotDef.id == "subs") {
			if(entry.showSubs === undefined)		entry.showSubs = true;
			if(entry.showResubs === undefined)		entry.showResubs = true;
			if(entry.showSubgifts === undefined)	entry.showSubgifts = true;
			if(entry.showBadges == undefined || !this.isPremium) entry.showBadges = false;
			if(entry.sortByNames == undefined || !this.isPremium) entry.sortByNames = false;
			if(entry.sortBySubTypes == undefined || !this.isPremium) entry.sortBySubTypes = false;
			this.param_showSubs[id]			= {type:"boolean", value:true, icon:"sub", labelKey:"overlay.credits.param_showSubs"};
			this.param_showResubs[id]		= {type:"boolean", value:true, icon:"sub", labelKey:"overlay.credits.param_showResubs"};
			this.param_showSubgifts[id]		= {type:"boolean", value:true, icon:"gift", labelKey:"overlay.credits.param_showSubgifts"};
			this.param_showBadges[id]		= {type:'boolean', value:false, icon:"badge", labelKey:'overlay.credits.param_showSubBadges'};
			this.param_sortByName[id]		= {type:"boolean", value:false, icon:"filters", labelKey:"overlay.credits.param_sortByNames"};
			this.param_sortBySubTypes[id]	= {type:"boolean", value:false, icon:"filters", labelKey:"overlay.credits.param_sortBySubTypes"};
		}
		
		if(slotDef.canMerge) {
			if(entry.uniqueUsers === undefined || !this.isPremium) entry.uniqueUsers = false;
			this.param_uniqueUsers[id]	= {type:"boolean", value:false, icon:"merge", labelKey:"overlay.credits.param_uniqueUsers"};
		}
		if(!data) this.data.slots.push(entry);
		this.saveParams();
	}

	/**
	 * Send fake data
	 */
	public async testCredits():Promise<void> {
		this.sendingSummaryData = true;
		const summary = await this.$store.stream.getSummary(undefined, true, true);
		PublicAPI.instance.broadcast("SUMMARY_DATA", (summary as unknown) as JsonObject);
		this.sendingSummaryData = false;
	}

	/**
	 * Saves current parameters
	 */
	private async saveParams():Promise<void> {
		this.data.fontTitle = this.data.fontTitle ?? "Inter";
		this.data.fontEntry = this.data.fontEntry ?? "Inter";

		DataStore.set(DataStore.ENDING_CREDITS_PARAMS, this.data);

		clearTimeout(this.broadcastDebounce);

		//Parse "text" slots placholders
		const result = JSON.parse(JSON.stringify(this.data)) as TwitchatDataTypes.EndingCreditsParams;
		const channelId = this.$store.auth.twitch.user.id
		let fakeStartDate = this.$store.stream.currentStreamInfo[channelId]?.started_at;
		if(!fakeStartDate) fakeStartDate = Date.now() - (1 * 3600000 + 23 * 60000 + 45 * 1000);
		for (let i = 0; i < result.slots.length; i++) {
			const slot = result.slots[i];
			if(slot.slotType !== "text") continue;
			slot.text = (slot.text ||"").replace(/\{MY_STREAM_DURATION\}/gi, Utils.formatDuration(Date.now() - fakeStartDate));
			slot.text = slot.text.replace(/\{MY_STREAM_DURATION_MS\}/gi, (Date.now() - fakeStartDate).toString());
			if(slot.text) {
				slot.text = await Utils.parseGlobalPlaceholders(slot.text, false);
			}
		}
		PublicAPI.instance.broadcast(TwitchatEvent.ENDING_CREDITS_CONFIGS, (result as unknown) as JsonObject);
	}

}
</script>

<style scoped lang="less">
.overlayparamscredits{
	
	.slide-enter-from,
	.slide-leave-to {
		transition: transform 0.5s;
	}
	.holder {
		display: flex;
		flex-direction: column;
		gap: .5em;

		.globalParams {
			gap: .25em;
			display: flex;
			flex-direction: column;
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
					.maxItems {
						width: 4.5em;
						:deep(input) {
							text-align: center;
						}
					}
					.deleteBt {
						margin: -.5em 0;
						align-self: stretch;
						border-radius: 0;
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
						:deep(input), :deep(textarea) {
							opacity: 1;//Do not fade when disabled as its holder will already be faded
						}
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