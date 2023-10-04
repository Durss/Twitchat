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

			<Splitter>{{ $t("overlay.credits.parameters") }}</Splitter>

			<div class="item globalParams">
				<ParamItem :paramData="param_textColor" v-model="data.textColor" />
				<ParamItem :paramData="param_scale" v-model="data.scale" />
				<ParamItem :paramData="param_fontTitle" v-model="data.fontTitle" v-if="fontsReady" />
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

			<Splitter>{{ $t("overlay.credits.customize_content") }}</Splitter>

			<div class="item">
				<draggable
				:animation="250"
				group="description"
				ghostClass="ghost"
				item-key="id"
				v-model="data.slots">
					<template #item="{element, index}:{element:TwitchatDataTypes.EndingCreditsSlot, index:number}">
						<ToggleBlock :class="getItemClasses(element)" :key="'item_'+element.id" :open="false">
							<template #left_actions>
								<div class="icons">
									<Icon name="dragZone" />
									<Icon :name="getIconFromType(element.id as TwitchatDataTypes.EndingCreditsSlotStringTypes)" />
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
									<Button v-if="element.premium === true && !isPremium"
									premium
									icon="premium"
									v-tooltip="$t('premium.become_premiumBt')"
									@click.prevent="openPremium()" />
									<ToggleButton v-else v-model="element.enabled" :premium="element.premium" />
									<button class="arrowBt"><Icon name="arrowRight" /></button>
								</div>
							</template>

							<div class="content">
								<div class="card-item layout">
									<!-- <PremiumLockLayer /> -->
									<div class="form">
										<label>{{ $t("overlay.credits.param_layout") }}</label>
										<div class="layoutBtns">
											<Button icon="layout_left" 		 :premium="element.premium" @click="element.layout = 'left'"		:selected="element.layout == 'left'" />
											<Button icon="layout_center" 	 :premium="element.premium" @click="element.layout = 'center'"		:selected="element.layout == 'center'" />
											<Button icon="layout_right" 	 :premium="element.premium" @click="element.layout = 'right'"		:selected="element.layout == 'right'" />
											<Button icon="layout_colLeft" 	 :premium="element.premium" @click="element.layout = 'colLeft'"		:selected="element.layout == 'colLeft'" />
											<Button icon="layout_col" 		 :premium="element.premium" @click="element.layout = 'col'"			:selected="element.layout == 'col'" />
											<Button icon="layout_colRight" 	 :premium="element.premium" @click="element.layout = 'colRight'"	:selected="element.layout == 'colRight'" />
											<Button icon="layout_2cols" 	 :premium="element.premium" @click="element.layout = '2cols'"		:selected="element.layout == '2cols'" />
											<Button icon="layout_3cols" 	 :premium="element.premium" @click="element.layout = '3cols'"		:selected="element.layout == '3cols'" />
										</div>
									</div>
								</div>

								<ParamItem v-if="element.showAmounts != undefined" class="amounts" :paramData="param_showAmounts[element.id]" v-model="element.showAmounts" premium noPremiumLock />
								<ParamItem class="maxItems" :paramData="param_maxItems[element.id]" v-model="element.maxEntries" premium noPremiumLock />
								
								<!-- <ParamItem class="customHTML" :paramData="param_customHTML[index]" v-model="element.customHTML" premium>
									<ParamItem class="customHTML" :paramData="param_htmlTemplate[index]" v-model="element.htmlTemplate" premium />
								</ParamItem> -->
							</div>
						</ToggleBlock>
					</template>
				</draggable>
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
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
import PremiumLockLayer from '@/components/PremiumLockLayer.vue';

@Component({
	components:{
		Icon,
		Button,
		Splitter,
		draggable,
		ParamItem,
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
	public param_textColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ffffff", labelKey:"overlay.credits.param_textColor", icon:"color"};
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
	public fontsReady:boolean = false;
	public data:TwitchatDataTypes.EndingCreditsParams = {
		scale:2,
		fontTitle:"Inter",
		fontEntry:"Inter",
		textShadow:100,
		textColor:"#ffffff",
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

	public getItemClasses(item:TwitchatDataTypes.EndingCreditsSlot):string[] {
		const res:string[] = ["slotHolder"];
		if(item.premium) res.push("premium");
		if(!item.enabled) res.push("disabled");
		return res;
	}

	public getIconFromType(type:TwitchatDataTypes.EndingCreditsSlotStringTypes):string {
		const hashmap:{[key in TwitchatDataTypes.EndingCreditsSlotStringTypes]:string} = {
			cheers:"bits",
			follows:"follow",
			hypechats:"hypeChat",
			hypetrains:"train",
			mods:"mod",
			raids:"raid",
			rewards:"channelPoints",
			so_in:"shoutout",
			so_out:"shoutout",
			subgifts:"gift",
			subs:"sub",
			subsandgifts:"sub",
			vips:"vip",
			bans:"ban",
			timeouts:"timeout",
			chatters:"user",
			polls:"poll",
			predictions:"prediction"
		}
		return hashmap[type];
	}

	public getLabelFromType(type:TwitchatDataTypes.EndingCreditsSlotStringTypes):string {
		const hashmap:{[key in TwitchatDataTypes.EndingCreditsSlotStringTypes]:string} = {
			cheers:"overlay.credits.items.cheers",
			follows:"overlay.credits.items.follows",
			hypechats:"overlay.credits.items.hypechats",
			hypetrains:"overlay.credits.items.hypetrains",
			mods:"overlay.credits.items.mods",
			raids:"overlay.credits.items.raids",
			rewards:"overlay.credits.items.rewards",
			so_in:"overlay.credits.items.so_in",
			so_out:"overlay.credits.items.so_out",
			subgifts:"overlay.credits.items.subgifts",
			subs:"overlay.credits.items.subs",
			subsandgifts:"overlay.credits.items.subsandgifts",
			vips:"overlay.credits.items.vips",
			bans:"overlay.credits.items.bans",
			timeouts:"overlay.credits.items.timeouts",
			chatters:"overlay.credits.items.chatters",
			polls:"overlay.credits.items.polls",
			predictions:"overlay.credits.items.predictions",
		}
		return hashmap[type];
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
		
		const defaultSlots:TwitchatDataTypes.EndingCreditsSlot[] = [
			{id:"hypechats",	maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("hypechats")), showAmounts:true},
			{id:"subs",			maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("subs"))},
			{id:"subgifts",		maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("subgifts")), showAmounts:true},
			{id:"cheers",		maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("cheers")), showAmounts:true},
			{id:"follows",		maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("follows"))},
			{id:"mods",			maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("mods"))},
			{id:"so_out",		maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("so_out")), showAmounts:true},
			{id:"bans",			maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("bans")), showAmounts:true},
			{id:"timeouts",		maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("timeouts")), showAmounts:true},
			{id:"raids",		maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("raids")), showAmounts:true, premium:true},
			{id:"hypetrains",	maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("hypetrains")), premium:true},
			{id:"so_in",		maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("so_in")), showAmounts:true, premium:true},
			{id:"chatters",		maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("chatters")), showAmounts:true, premium:true},
			{id:"rewards",		maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("rewards")), showAmounts:true, premium:true},
			{id:"vips",			maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("vips")), premium:true},
			{id:"subsandgifts",	maxEntries:50, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("subsandgifts")), premium:true},
			{id:"polls",		maxEntries:10, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("polls")), premium:true},
			{id:"predictions",	maxEntries:10, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("predictions")), premium:true},
		];
		if(this.data.slots.length == 0) {
			this.data.slots = defaultSlots;
		}else{
			//Add new slots missing from the user's list
			for (let i = 0; i < defaultSlots.length; i++) {
				const slot = defaultSlots[i];
				if(this.data.slots.findIndex(v=>v.id === slot.id) == -1) {
					this.data.slots.push(defaultSlots[i]);
				}
			}

			//Remove deleted slots and force premium stuff
			for (let i = 0; i < this.data.slots.length; i++) {
				const slot = this.data.slots[i];
				const defaultSlot = defaultSlots.find(v=>v.id === slot.id);
				if(!defaultSlot) {
					//Remove deleted slot
					this.data.slots.splice(i, 1);
					i--;
				}else{
					//Force proper premium states
					slot.premium = defaultSlot.premium;
					//Disable premium slots if not user isn't premium
					if(slot.premium && !this.isPremium) {
						slot.enabled = false;
						if(slot.showAmounts !=undefined) slot.showAmounts = false;
					}else{
						if(slot.showAmounts == undefined && defaultSlot.showAmounts) {
							slot.showAmounts = defaultSlot.showAmounts;
						}
					}
					//Max entries field is premium only, if not premium force it to 10
					if(!this.isPremium) {
						slot.maxEntries = 10;
					}
				}
			}
		}

		for (let i = 0; i < this.data.slots.length; i++) {
			const key = this.data.slots[i].id;
			this.param_customHTML[key] = {type:"boolean", value:false, labelKey:"overlay.credits.param_customHTML"};
			this.param_htmlTemplate[key] = {type:"string", value:"", longText:true, maxLength:1000};
			this.param_maxItems[key] = {type:'number', min:1, max:1000, value:100, labelKey:'overlay.credits.param_maxItems'};
			if(this.data.slots[i].showAmounts != undefined) {
				this.param_showAmounts[key] = {type:"boolean", value:false, labelKey:"overlay.credits.param_showAmounts"};
			}
		}

		this.param_timing.listValues = [
			{value:"speed", labelKey:"overlay.credits.param_timing_speed"},
			{value:"duration", labelKey:"overlay.credits.param_timing_duration"},
		]

		watch(()=>this.data, ()=>this.saveParams(), {deep:true});

		this.saveParams();
	}

	public openPremium():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Reset to default label if label is empty
	 * @param item 
	 */
	public checkDefaultLabel(item:TwitchatDataTypes.EndingCreditsSlot):void {
		if(!item.label) {
			item.label = this.$t(this.getLabelFromType(item.id));
		}else{
			this.limitLabelSize(item);
		}
	}

	/**
	 * Limit the size of the label.
	 * Can't use maxLength because it's a content-editable tag.
	 * @param item 
	 */
	public async limitLabelSize(item:TwitchatDataTypes.EndingCreditsSlot):Promise<void> {
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

			&.globalParams {
				gap: .5em;
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
				:deep(.header) {
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
						.icon {
							// padding: .2em;
						}
					}
				}
				.content {
					gap: .25em;
					display: flex;
					flex-direction: column;

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
				&.disabled {
					border-style: dashed;
					opacity: .75;
					background-color: transparent;
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
					&.disabled {
						.paramitem, .layout {
							background-color: var(--color-premium-fadest);
						}
					}
				}
			}
		}
	}

	// &.notPremium {
	// 	.holder {
	// 		.item {
	// 			.slotHolder {
	// 				.content {
	// 					.layout {
	// 						background-color: var(--color-premium-fadest);
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