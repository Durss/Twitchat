<template>
	<ToggleBlock :open="open || true" :class="classes" :title="$t('overlay.credits.title')" :icons="['credits']">
		<div class="holder">
			<div class="item">
				<div class="info">{{ $t("overlay.credits.head") }}</div>
				<input class="premium" type="text" v-model="overlayUrl" v-click2Select>
				<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
					<div>{{ $t("overlay.credits.css") }}</div>
					<ul class="cssStructure">
						<li>.todo { ... }</li>
					</ul>
				</ToggleBlock>
			</div>

			<ToggleBlock class="item" :title="$t('overlay.credits.parameters')" medium primary :open="false">
				<div class="globalParams">
					<ParamItem :paramData="param_scale" v-model="data.scale" />
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
						<ToggleBlock :class="getItemClasses(element)" :key="'item_'+element.id" :open="false">
							<template #left_actions>
								<div class="icons">
									<Icon name="dragZone" />
									<Icon :name="getDefinitionFromSlot(element.slotType).icon" />
								</div>
							</template>
							
							<template #title>
								<contenteditable class="label" tag="div" :ref="'label_'+element.id"
								:contenteditable="true"
								v-model="element.label"
								:no-nl="true"
								:no-html="true"
								@click.stop
								@returned="checkDefaultLabel(element)"
								@input="limitLabelSize(element)"
								@blur="checkDefaultLabel(element)" />
							</template>

							<template #right_actions>
								<div class="rightActions">
									<Button v-if="getDefinitionFromSlot(element.slotType).premium === true && !isPremium"
									premium
									icon="premium"
									v-tooltip="$t('premium.become_premiumBt')"
									@click.prevent="openPremium()" />
									<button class="deleteBt" transparent @click.stop="deleteSlot(element)"><Icon name="cross" /></button>
									<button class="arrowBt"><Icon name="arrowRight" /></button>
								</div>
							</template>

							<div class="content">
								<div class="card-item premium limitations" v-if="slotTypes.find(v => v.id == element.slotType)?.premium">
									<Icon name="alert"/> {{ $t("overlay.credits.premium_category") }}
								</div>
								<div class="card-item layout">
									<!-- <PremiumLockLayer v-if="slotTypes.find(v => v.id == element.slotType)?.premium" /> -->
									<div class="form">
										<label>{{ $t("overlay.credits.param_layout") }}</label>
										<div class="layoutBtns">
											<Button icon="layout_left" 		 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'left'"		:selected="element.layout == 'left'" v-if="element.slotType != 'text'" />
											<Button icon="layout_center" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'center'"		:selected="element.layout == 'center'" v-if="element.slotType != 'text'" />
											<Button icon="layout_right" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'right'"		:selected="element.layout == 'right'" v-if="element.slotType != 'text'" />
											<Button icon="layout_colLeft" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'colLeft'"		:selected="element.layout == 'colLeft'" />
											<Button icon="layout_col" 		 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'col'"			:selected="element.layout == 'col'" />
											<Button icon="layout_colRight" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = 'colRight'"	:selected="element.layout == 'colRight'" />
											<Button icon="layout_2cols" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = '2cols'"		:selected="element.layout == '2cols'" v-if="element.slotType != 'text'" />
											<Button icon="layout_3cols" 	 :premium="getDefinitionFromSlot(element.slotType).premium" @click="element.layout = '3cols'"		:selected="element.layout == '3cols'" v-if="element.slotType != 'text'" />
										</div>
									</div>
								</div>

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

				<Button class="addBt" transparent icon="add" v-if="!showSlotOptions" @click="showSlotOptions = true">{{ $t("overlay.credits.add_slotBt") }}</Button>
				
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
	
	public param_fontTitle:TwitchatDataTypes.ParameterData<string> = {type:"editablelist", value:"", labelKey:"overlay.credits.param_fontTitle", icon:"font"};
	public param_fontEntry:TwitchatDataTypes.ParameterData<string> = {type:"editablelist", value:"", labelKey:"overlay.credits.param_fontEntry", icon:"font"};
	public param_titleColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ffffff", labelKey:"overlay.credits.param_colorTitle", icon:"color"};
	public param_entryColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ffffff", labelKey:"overlay.credits.param_colorEntry", icon:"color"};
	public param_textShadow:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, min:0, max:100, labelKey:"overlay.credits.param_textShadow", icon:"shadow"};
	public param_timing:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"speed", labelKey:"overlay.credits.param_timing", icon:"timer"};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {type:"number", min:2, max:3600, value:60, labelKey:"overlay.credits.param_duration", icon:"timer"};
	public param_speed:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:1, max:30, value:2, labelKey:"overlay.credits.param_speed", icon:"timer"};
	public param_scale:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:1, max:5, value:3, labelKey:"overlay.credits.param_scale", icon:"scale"};
	public param_showIcons:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_showIcons", icon:"show"};
	public param_loop:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"overlay.credits.param_loop", icon:"loop"};
	public param_startDelay:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:0, max:30, value:0, labelKey:"overlay.credits.param_startDelay", icon:"countdown"};
	public param_maxItems:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_customHTML:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_showAmounts:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_htmlTemplate:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_text:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public slotTypes = TwitchatDataTypes.EndingCreditsSlotDefinitions;
	public fontsReady:boolean = false;
	public showSlotOptions:boolean = false;
	public data:TwitchatDataTypes.EndingCreditsParams = {
		scale:2,
		fontTitle:"Inter",
		fontEntry:"Inter",
		colorTitle:"#ffffff",
		colorEntry:"#ffffff",
		textShadow:100,
		timing:"speed",
		startDelay:0,
		duration:200,
		speed:2,
		loop:true,
		showIcons:true,
		slots:[],
	};

	private broadcastDebounce:number = -1;

	public get overlayUrl():string { return this.$overlayURL("credits"); }
	public get isPremium():boolean { return this.$store("auth").isPremium; }

	public get classes():string[] {
		const res:string[] = ["overlayparamscredits"];
		if(!this.isPremium) res.push("notPremium");
		return res;
	}

	public getItemClasses(item:TwitchatDataTypes.EndingCreditsSlotParams):string[] {
		const res:string[] = ["slotHolder"];
		if(this.getDefinitionFromSlot(item.slotType).premium) res.push("premium");
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

		this.saveParams();
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
		this.param_customHTML[id] = {type:"boolean", value:false, labelKey:"overlay.credits.param_customHTML"};
		this.param_htmlTemplate[id] = {type:"string", value:"", longText:true, maxLength:1000};
		this.param_maxItems[id] = {type:'number', min:1, max:1000, value:100, labelKey:'overlay.credits.param_maxItems'};
		if(slotDef.hasAmount) {
			entry.showAmounts = this.isPremium;
			this.param_showAmounts[id] = {type:"boolean", value:false, labelKey:this.getDefinitionFromSlot(slotType).amountLabel};
		}
		if(slotDef.id == "text") {
			const placeholderList = TriggerEventPlaceholders(TriggerTypes.GLOBAL_PLACHOLDERS).concat();
			this.param_text[id] = {type:"string", value:"", longText:true, maxLength:1000, placeholderList};
		}
		if(!data) this.data.slots.push(entry);
		this.saveParams();
	}

	/**
	 * Saves current parameters
	 */
	private saveParams():void {
		this.data.fontTitle = this.data.fontTitle ?? "Inter";
		this.data.fontEntry = this.data.fontEntry ?? "Inter";

		DataStore.set(DataStore.ENDING_CREDITS_PARAMS, this.data);

		clearTimeout(this.broadcastDebounce);
		this.broadcastDebounce = setTimeout(() => {
			PublicAPI.instance.broadcast(TwitchatEvent.ENDING_CREDITS_CONFIGS, (this.data as unknown) as JsonObject);
		}, 100);
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
				border: 1px solid var(--color-text);
				border-radius: var(--border-radius);
				&>:deep(.header) {
					cursor: move;
					justify-content: space-between;
					background-color: var(--color-text-fadest);
					transition: background-color .2s;
					border-bottom: 1px solid var(--color-text-fade);
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
				.label {
					cursor: text;
					min-width: 2em;
					font-weight: bold;
					// flex-grow: 1;
					padding: .25em .5em;
					border-radius: var(--border-radius);
					&:hover, &:active, &:focus {
						.bevel();
						background-color: var(--color-text-inverse-fader);
						// border: 1px double var(--color-light);
						// border-style: groove;
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
					.arrowBt {
						color: var(--color-text);
						transition: transform .25s;
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

				&:not(.closed) {
					.arrowBt {
						transform: rotate(90deg);
					}
				}
				&.premium {
					border-color: var(--color-premium-extralight);
					:deep(.header) {
						background-color: var(--color-premium-fadest);
					}
					.paramitem {
						background-color: var(--color-light-fadest);
					}
				}
			}

			&.slots {
				.addBt {
					box-shadow: none;
					border: 1px solid var(--color-text);
					display: flex;
					margin: auto;
					margin-top: .5em;
					color: var(--color-text);
					background-color: var(--color-light-fader);
				}

				.slotSelector {
					color: var(--color-text);
					border: 1px solid var(--color-text);
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