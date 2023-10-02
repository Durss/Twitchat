<template>
	<ToggleBlock :open="open || true" class="overlayparamscredits" :title="$t('overlay.credits.title')" :icons="['credits']" premium>
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
				<ParamItem :paramData="param_fontTitle" v-model="data.fontTitle" />
				<ParamItem :paramData="param_fontEntry" v-model="data.fontEntry" />
				<ParamItem :paramData="param_textColor" v-model="data.textColor" />
				<ParamItem :paramData="param_scale" v-model="data.scale" />
				<ParamItem :paramData="param_textShadow" v-model="data.textShadow" />
				<ParamItem :paramData="param_startDelay" v-model="data.startDelay" />
				<ParamItem :paramData="param_timing" v-model="data.timing">
					<ParamItem noBackground :paramData="param_duration" v-model="data.duration" v-if="param_timing.value == 'duration'" />
					<ParamItem noBackground :paramData="param_speed" v-model="data.speed" v-if="param_timing.value == 'speed'" />
				</ParamItem>
			</div>

			<Splitter>{{ $t("overlay.credits.customize_content") }}</Splitter>

			<div class="item">
				<draggable
				:animation="250"
				group="description"
				ghostClass="ghost"
				item-key="id"
				v-model="data.slots"
				@change="sortList()">
					<template #item="{element, index}:{element:TwitchatDataTypes.EndingCreditsSlot, index:number}">
						<ToggleBlock :class="getItemClasses(element)" :key="'item_'+element.id" :open="false" :disabled="element.enabled === false">
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
									<ToggleButton v-model="element.enabled" premium @change="sortList()" />
									<button class="arrowBt"><Icon name="arrowRight" /></button>
								</div>
							</template>

							<div class="content">
								<div class="card-item layout">
									<label>{{ $t("overlay.credits.param_layout") }}</label>
									<div class="layoutBtns">
										<Button icon="layout_left" premium @click="element.layout = 'left'" :selected="element.layout == 'left'" />
										<Button icon="layout_center" premium @click="element.layout = 'center'" :selected="element.layout == 'center'" />
										<Button icon="layout_right" premium @click="element.layout = 'right'" :selected="element.layout == 'right'" />
										<Button icon="layout_colLeft" premium @click="element.layout = 'colLeft'" :selected="element.layout == 'colLeft'" />
										<Button icon="layout_col" premium @click="element.layout = 'col'" :selected="element.layout == 'col'" />
										<Button icon="layout_colRight" premium @click="element.layout = 'colRight'" :selected="element.layout == 'colRight'" />
										<Button icon="layout_2cols" premium @click="element.layout = '2cols'" :selected="element.layout == '2cols'" />
										<Button icon="layout_3cols" premium @click="element.layout = '3cols'" :selected="element.layout == '3cols'" />
									</div>
								</div>

								<ParamItem v-if="element.showAmounts != undefined" class="amounts" :paramData="param_showAmounts[index]" v-model="element.showAmounts" premium />
								<ParamItem class="maxItems" :paramData="param_maxItems[index]" v-model="element.maxEntries" premium />
								
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
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import type { JsonObject } from "type-fest";
import { watch } from 'vue';
import contenteditable from 'vue-contenteditable';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import Utils from '@/utils/Utils';

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
	public param_startDelay:TwitchatDataTypes.ParameterData<number> = {type:"slider", min:0, max:30, value:0, labelKey:"overlay.credits.param_startDelay", icon:"countdown"};
	public param_maxItems:TwitchatDataTypes.ParameterData<number>[] = [];
	public param_customHTML:TwitchatDataTypes.ParameterData<boolean>[] = [];
	public param_htmlTemplate:TwitchatDataTypes.ParameterData<string>[] = [];
	public param_showAmounts:TwitchatDataTypes.ParameterData<boolean>[] = [];
	public data:TwitchatDataTypes.EndingCreditsParams = {
		scale:2,
		fontTitle:"",
		fontEntry:"",
		textShadow:1,
		textColor:"#ffffff",
		timing:"speed",
		startDelay:0,
		duration:200,
		speed:2,
		slots:[],
	};

	private broadcastDebounce:number = -1;

	public get overlayUrl():string { return this.$overlayURL("credits"); }

	public getItemClasses(item:TwitchatDataTypes.EndingCreditsSlot):string[] {
		const res:string[] = ["dragItem"];
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
		}
		return hashmap[type];
	}

	public beforeMount():void {
		const json = DataStore.get(DataStore.ENDING_CREDITS_PARAMS);
		if(json) {
			this.data = JSON.parse(json);
		}
		Utils.listAvailableFonts().then(fonts => {
			this.param_fontEntry.options = fonts.concat();
			this.param_fontTitle.options = fonts.concat();
		});
		if(this.data.slots.length == 0) {
			this.data.slots.push(
				{id:"hypechats",	maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("hypechats")), showAmounts:true},
				{id:"subs",			maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("subs"))},
				{id:"subgifts",		maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("subgifts")), showAmounts:true},
				{id:"cheers",		maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("cheers")), showAmounts:true},
				{id:"raids",		maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("raids")), showAmounts:true},
				{id:"follows",		maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("follows"))},
				{id:"hypetrains",	maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("hypetrains"))},
				{id:"so_in",		maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("so_in"))},
				{id:"mods",			maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("mods"))},
				{id:"rewards",		maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("rewards"))},
				{id:"so_out",		maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("so_out"))},
				{id:"vips",			maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("vips"))},
				{id:"subsandgifts",	maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("subsandgifts"))},
				{id:"bans",			maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("bans"))},
				{id:"timeouts",		maxEntries:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("timeouts"))},
			);
		}

		for (let i = 0; i < this.data.slots.length; i++) {
			this.param_customHTML.push({type:"boolean", value:false, labelKey:"overlay.credits.param_customHTML"});
			this.param_htmlTemplate.push({type:"string", value:"", longText:true, maxLength:1000});
			this.param_maxItems.push({type:'number', min:1, max:1000, value:100, labelKey:'overlay.credits.param_maxItems'});
			if(this.data.slots[i].showAmounts != undefined) {
				this.param_showAmounts.push({type:"boolean", value:false, labelKey:"overlay.credits.param_showAmounts"});
			}
		}

		this.param_timing.listValues = [
			{value:"speed", labelKey:"overlay.credits.param_timing_speed"},
			{value:"duration", labelKey:"overlay.credits.param_timing_duration"},
		]

		this.sortList();

		watch(()=>this.data, ()=>{
			this.saveParams();
		}, {deep:true});
		if(!json) {
			this.saveParams();
		}
	}

	public sortList():void {
		// this.data.slots.sort((a,b)=> {
		// 	if(a.enabled && !b.enabled) return -1;
		// 	if(!a.enabled && b.enabled) return 1;
		// 	return 0;
		// })
	}

	public checkDefaultLabel(item:TwitchatDataTypes.EndingCreditsSlot):void {
		if(!item.label) {
			item.label = this.$t(this.getLabelFromType(item.id));
		}else{
			this.limitLabelSize(item);
		}
	}

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

	private saveParams():void {
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
			.dragItem {
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
							padding: .2em;
						}
					}
				}
				.content {
					gap: .25em;
					display: flex;
					flex-direction: column;

					.layout {
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
							}
						}
					}

				}
				&.disabled {
					border-style: dashed;
					opacity: .5;
					background-color: transparent;
				}

				&:not(.closed) {
					.arrowBt {
						transform: rotate(90deg);
					}
				}
			}
		}
	}
}
</style>