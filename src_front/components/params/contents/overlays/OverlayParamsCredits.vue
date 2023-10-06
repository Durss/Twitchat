<template>
	<ToggleBlock :open="open || true" :class="classes" :title="$t('overlay.credits.title')" :icons="['credits']">
		<div class="holder">
			<div class="item">
				<div class="info">{{ $t("overlay.credits.head") }}</div>
				<input class="primary" type="text" v-model="overlayUrl" v-click2Select>
				<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
					<div>{{ $t("overlay.credits.css") }}</div>
					<ul class="cssStructure">
						<li>.todo { ... }</li>
					</ul>
				</ToggleBlock>
			</div>

			<ToggleBlock class="item" :title="$t('overlay.credits.parameters')" medium secondary :open="false" :icons="['params']">
				<div class="globalParams">
					<ParamItem :paramData="param_scale" v-model="data.scale" />
					<ParamItem :paramData="param_padding" v-model="data.padding" />
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

			<div class="item slots">
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
								</div>
							</template>
							
							<template #title>
								<div class="title">
									<span class="default" v-if="element.slotType === 'text' && !element.label">{{ $t("overlay.credits.categories.text") }}</span>
									<contenteditable class="label" tag="div" :ref="'label_'+element.id"
									:contenteditable="true"
									v-model="element.label"
									:no-nl="true"
									:no-html="true"
									@click.stop
									@returned="checkDefaultLabel(element)"
									@input="limitLabelSize(element)"
									@blur="checkDefaultLabel(element)" />
								</div>
							</template>

							<template #right_actions>
								<div class="rightActions">
									<Button v-if="getDefinitionFromSlot(element.slotType).premium === true && !isPremium"
									icon="premium" premium
									v-tooltip="$t('premium.become_premiumBt')"
									@click.prevent="openPremium()" />

									<button class="deleteBt" transparent @click.stop="deleteSlot(element)"><Icon name="cross" /></button>
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

								<template v-if="element.slotType == 'chatters'">
									<ParamItem class="badges" :paramData="param_showMods[element.id]"		v-model="element.showMods"		premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem class="badges" :paramData="param_showVIPs[element.id]"		v-model="element.showVIPs"		premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem class="badges" :paramData="param_showSubs[element.id]"		v-model="element.showSubs"		premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem class="badges" :paramData="param_showChatters[element.id]"	v-model="element.showChatters"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem class="badges" :paramData="param_showBadges[element.id]"		v-model="element.showBadges"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem class="badges" :paramData="param_sortByRoles[element.id]"	v-model="element.sortByRoles"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
									<ParamItem class="badges" :paramData="param_sortByAmounts[element.id]"	v-model="element.sortByAmounts"	premium :noPremiumLock="slotTypes.find(v => v.id == element.slotType)?.premium" />
								</template>
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

				<Button class="addBt" icon="add" v-if="!showSlotOptions" @click="showSlotOptions = true">{{ $t("overlay.credits.add_slotBt") }}</Button>
				
				<div class="slotSelector" v-else>
					<CloseButton @click="showSlotOptions = false" />
					<!-- <Button icon="cross" @click="showSlotOptions = false" alert :aria-label="$t('global.cancel')" /> -->
					<Button class="slotBt"
					v-for="slot in slotTypes"
					:icon="slot.icon"
					:premium="slot.premium"
					@click="addSlot(slot)">{{ $t(slot.label) }}</Button>
				</div>
			</div>

			<div class="item center" v-if="overlayExists">
				<Button :loading="sendingSummaryData" @click="testCredits()" icon="test">{{ $t('overlay.credits.testBt') }}</Button>
			</div>

			<div class="item center card-item alert" v-if="!overlayExists">{{ $t("overlay.credits.no_overlay") }}</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import PremiumLockLayer from '@/components/PremiumLockLayer.vue';
import Splitter from '@/components/Splitter.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import type { JsonObject } from "type-fest";
import { watch } from 'vue';
import contenteditable from 'vue-contenteditable';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import Config from '@/utils/Config';
import CloseButton from '@/components/CloseButton.vue';
import { TriggerEventPlaceholders, TriggerTypes } from '@/types/TriggerActionDataTypes';

@Component({
	components:{
		Icon,
		Button,
		Splitter,
		draggable,
		ParamItem,
		CloseButton,
		ToggleBlock,
		ToggleButton,
		contenteditable,
		PremiumLockLayer,
	}
})
export default class OverlayParamsCredits extends Vue {

	@Prop({default:false})
	public open!:boolean;
	
	public param_padding:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:100, min:0, max:1000, labelKey:"overlay.credits.param_padding", icon:"min"};
	public param_fontTitle:TwitchatDataTypes.ParameterData<string> = {type:"editablelist", value:"", labelKey:"overlay.credits.param_fontTitle", icon:"font"};
	public param_fontEntry:TwitchatDataTypes.ParameterData<string> = {type:"editablelist", value:"", labelKey:"overlay.credits.param_fontEntry", icon:"font"};
	public param_titleColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ffffff", labelKey:"overlay.credits.param_colorTitle", icon:"color"};
	public param_entryColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ffffff", labelKey:"overlay.credits.param_colorEntry", icon:"color"};
	public param_textShadow:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, min:0, max:100, labelKey:"overlay.credits.param_textShadow", icon:"shadow"};
	public param_timing:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"speed", labelKey:"overlay.credits.param_timing", icon:"timer"};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {type:"number", min:2, max:3600, value:60, labelKey:"overlay.credits.param_duration", icon:"timer"};
	public param_speed:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:1, max:300, value:2, labelKey:"overlay.credits.param_speed", icon:"timer"};
	public param_scale:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:1, max:5, value:3, labelKey:"overlay.credits.param_scale", icon:"scale"};
	public param_showIcons:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_showIcons", icon:"show"};
	public param_loop:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_loop", icon:"loop"};
	public param_startDelay:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:0, max:30, value:0, labelKey:"overlay.credits.param_startDelay", icon:"countdown"};
	public param_maxItems:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_customHTML:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showAmounts:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_htmlTemplate:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_showBadges:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showSubs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showMods:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showVIPs:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showChatters:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortByRoles:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_sortByAmounts:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_text:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public slotTypes = TwitchatDataTypes.EndingCreditsSlotDefinitions;
	public overlayExists = false;
	public sendingSummaryData = false;
	public fontsReady:boolean = false;
	public showSlotOptions:boolean = false;
	public data:TwitchatDataTypes.EndingCreditsParams = {
		scale:2,
		padding:100,
		fontTitle:"Inter",
		fontEntry:"Inter",
		colorTitle:"#ffffff",
		colorEntry:"#ffffff",
		textShadow:50,
		timing:"speed",
		startDelay:0,
		duration:60,
		speed:2,
		loop:true,
		showIcons:true,
		slots:[],
	};

	private checkInterval!:number;
	private subcheckTimeout!:number;
	private overlayPresenceHandler!:()=>void;
	private broadcastDebounce:number = -1;

	public get overlayUrl():string { return this.$overlayURL("credits"); }
	public get isPremium():boolean { return this.$store("auth").isPremium; }

	public get classes():string[] {
		const res:string[] = ["overlayparamscredits"];
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
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "follows")!);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "subs")!);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "subgifts")!);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "cheers")!);
			this.addSlot(TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == "raids")!);
		}else{

			for (let i = 0; i < this.data.slots.length; i++) {
				const slot = this.data.slots[i];
				const defaultSlot = TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id == slot.slotType);
				if(!defaultSlot) {
					console.log("remove it ", slot.slotType);
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
					//Max entries field is premium only, if not premium force it to 10
					if(!this.isPremium) slot.maxEntries = Config.instance.MAX_ENDING_CREDIT_ENTRIES;
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
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
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
	public addSlot(slotDef:TwitchatDataTypes.EndingCreditsSlotDefinition, data?:TwitchatDataTypes.EndingCreditsSlotParams):void {
		let id = data?.id || Utils.getUUID();
		let slotType = slotDef.id;
		const entry:TwitchatDataTypes.EndingCreditsSlotParams = data || {
			id,
			slotType,
			label:this.$t(slotDef.defaultLabel),
			layout:"col",
			maxEntries:this.isPremium? 100 : Config.instance.MAX_ENDING_CREDIT_ENTRIES,
		};
		
		//Create parameters
		this.param_customHTML[id]	= {type:"boolean", value:false, labelKey:"overlay.credits.param_customHTML"};
		this.param_htmlTemplate[id]	= {type:"string", value:"", longText:true, maxLength:1000};
		this.param_maxItems[id]		= {type:'number', icon:"max", min:1, max:1000, value:100, labelKey:'overlay.credits.param_maxItems'};
		if(slotDef.hasAmount) {
			entry.showAmounts = this.isPremium || slotDef.premium;
			this.param_showAmounts[id] = {type:"boolean", icon:"number", value:entry.showAmounts, labelKey:this.getDefinitionFromSlot(slotType).amountLabel};
		}
		if(slotDef.id == "chatters") {
			entry.showMods = true;
			entry.showVIPs = false;
			entry.showSubs = false;
			entry.showChatters = false;
			entry.showBadges = false;
			entry.sortByRoles = false;
			entry.sortByAmounts = false;
			entry.showAmounts = false;
			entry.layout = "3cols";
			this.param_showBadges[id]	= {type:'boolean', value:false, icon:"badge", labelKey:'overlay.credits.param_showBadges'};
			this.param_showMods[id]		= {type:"boolean", value:true, icon:"mod", labelKey:"overlay.credits.param_showMods"};
			this.param_showVIPs[id]		= {type:"boolean", value:true, icon:"vip", labelKey:"overlay.credits.param_showVIPs"};
			this.param_showSubs[id]		= {type:"boolean", value:true, icon:"sub", labelKey:"overlay.credits.param_showSubs"};
			this.param_showChatters[id]	= {type:"boolean", value:true, icon:"whispers", labelKey:"overlay.credits.param_showChatters"};
			this.param_sortByRoles[id]	= {type:"boolean", value:true, icon:"filters", labelKey:"overlay.credits.param_sortByRoles"};
			this.param_sortByAmounts[id]= {type:"boolean", value:false, icon:"filters", labelKey:"overlay.credits.param_sortByAmounts"};
		}
		if(slotDef.id == "text") {
			const placeholderList = TriggerEventPlaceholders(TriggerTypes.GLOBAL_PLACHOLDERS).concat();
			this.param_text[id] = {type:"string", value:"", longText:true, maxLength:1000, placeholderList};
		}
		if(!data) this.data.slots.push(entry);
		this.saveParams();
	}

	/**
	 * Send fake data
	 */
	public async testCredits():Promise<void> {
		this.sendingSummaryData = true;
		const summary = await this.$store("stream").getSummary(undefined, true, true);
		console.log(summary);
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
		const fakeDuration = Math.random() * 6 * 3600000 + 10*60000;
		for (let i = 0; i < result.slots.length; i++) {
			const slot = result.slots[i];
			if(slot.slotType !== "text") continue;
			slot.text = (slot.text ||"").replace(/\{MY_STREAM_DURATION\}/gi, Utils.formatDuration(fakeDuration));
			slot.text = slot.text.replace(/\{MY_STREAM_DURATION_MS\}/gi, fakeDuration.toString());
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
		.item {

			.info {
				margin-bottom: .5em;
			}

			input {
				width: 100%;
				margin-bottom: .5em;
			}

			.globalParams {
				gap: .25em;
				display: flex;
				flex-direction: column;
				:deep(.icon) {
					height: 1em;
					vertical-align: middle;
				}
			}

			ul {
				margin-top: .5em;
			}
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
					// border-bottom: 1px solid var(--color-text-fade);
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
					}
					.default {
						position: absolute;
						text-wrap: nowrap;
						top:0;
						left:50%;
						transform: translateX(-50%);
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
						// color: red;
						margin-right: .5em;
						color: var(--color-text);
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

			&.slots {
				.addBt {
					box-shadow: none;
					// border: 1px solid var(--color-text);
					display: flex;
					margin: auto;
					margin-top: .5em;
					color: var(--color-text);
				}

				.slotSelector {
					color: var(--color-text);
					// border: 1px solid var(--color-text);
					background-color: var(--color-light-fader);
					margin-top: .5em;
					padding: .5em 2.5em;
					border-radius: var(--border-radius);
					gap: .5em;
					display: flex;
					justify-content: center;
					flex-direction: row;
					flex-wrap: wrap;
					position: relative;
				}
			}

			&.center {
				margin: auto;
			}
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