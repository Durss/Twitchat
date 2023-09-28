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

			<div class="card-item item">
				<ParamItem noBackground :paramData="param_timing" />
				<ParamItem noBackground :paramData="param_duration" v-if="param_timing.value == 'duration'" />
				<ParamItem noBackground :paramData="param_speed" v-if="param_timing.value == 'speed'" />
			</div>

			<Splitter @click="randomize">{{ $t("overlay.credits.customize_content") }}</Splitter>

			<div class="item">
				<draggable
				:animation="250"
				group="description"
				ghostClass="ghost"
				item-key="id"
				v-model="items"
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
								<contenteditable class="label" tag="span"
								:contenteditable="true"
								v-model="element.label"
								:no-nl="true"
								:no-html="true"
								@blur="checkLabel(element)" />
							</template>

							<template #right_actions>
								<div class="rightActions">
									<ToggleButton v-model="element.enabled" premium @change="sortList()" />
									<button class="arrowBt"><Icon name="arrowRight" /></button>
								</div>
							</template>

							<div class="content">
								<div class="layout">
									<label>{{ $t("overlay.credits.param_layout") }}</label>
									<div class="layoutBtns">
										<Button icon="layout_col" premium @click="element.layout = 'col'" :selected="element.layout == 'col'" />
										<Button icon="layout_row" premium @click="element.layout = 'row'" :selected="element.layout == 'row'" />
										<Button icon="layout_2cols" premium @click="element.layout = '2cols'" :selected="element.layout == '2cols'" />
										<Button icon="layout_3cols" premium @click="element.layout = '3cols'" :selected="element.layout == '3cols'" />
									</div>
								</div>
								<ParamItem class="maxItems" :paramData="param_maxItems[index]" v-model="element.max" noBackground premium />
								
								<ParamItem class="customHTML" :paramData="param_customHTML[index]" v-model="element.customHTML" noBackground premium>
									<ParamItem class="customHTML" :paramData="param_htmlTemplate[index]" v-model="element.htmlTemplate" noBackground premium />
								</ParamItem>
							</div>
						</ToggleBlock>
					</template>
				</draggable>
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Splitter from '@/components/Splitter.vue';
import type {TwitchatDataTypes} from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import draggable from 'vuedraggable';
import Icon from '@/components/Icon.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import contenteditable from 'vue-contenteditable';

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
	
	public items:TwitchatDataTypes.EndingCreditsSlot[] = [];
	public param_timing:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"speed", labelKey:"overlay.credits.param_timing", icon:"timer"};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {type:"number", min:2, max:3600, value:60, labelKey:"overlay.credits.param_duration", icon:"timer"};
	public param_speed:TwitchatDataTypes.ParameterData<number> = {type:"number", min:1, max:5000, value:200, labelKey:"overlay.credits.param_speed", icon:"timer"};
	public param_maxItems:TwitchatDataTypes.ParameterData<number>[] = [];
	public param_customHTML:TwitchatDataTypes.ParameterData<boolean>[] = [];
	public param_htmlTemplate:TwitchatDataTypes.ParameterData<string>[] = [];

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
		this.items = [
			{id:"hypechats",	max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("hypechats"))},
			{id:"subs",			max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("subs"))},
			{id:"subgifts",		max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("subgifts"))},
			{id:"cheers",		max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("cheers"))},
			{id:"raids",		max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("raids"))},
			{id:"follows",		max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("follows"))},
			{id:"hypetrains",	max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("hypetrains"))},
			{id:"so_in",		max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:true, label:this.$t(this.getLabelFromType("so_in"))},
			{id:"mods",			max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("mods"))},
			{id:"rewards",		max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("rewards"))},
			{id:"so_out",		max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("so_out"))},
			{id:"vips",			max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("vips"))},
			{id:"subsandgifts",	max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("subsandgifts"))},
			{id:"bans",			max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("bans"))},
			{id:"timeouts",		max:100, layout:"col", customHTML:false, htmlTemplate:"", enabled:false, label:this.$t(this.getLabelFromType("timeouts"))},
		];

		for (let i = 0; i < this.items.length; i++) {
			this.param_customHTML.push({type:"boolean", value:false, labelKey:"overlay.credits.param_customHTML"});
			this.param_htmlTemplate.push({type:"string", value:"", longText:true, maxLength:1000});
			this.param_maxItems.push({type:'number', min:1, max:1000, value:100, labelKey:'overlay.credits.param_maxItems'});
		}

		this.param_timing.listValues = [
			{value:"speed", labelKey:"overlay.credits.param_timing_speed"},
			{value:"duration", labelKey:"overlay.credits.param_timing_duration"},
		]

		this.sortList();
	}

	public sortList():void {
		this.items = this.items.sort((a,b)=> {
			if(a.enabled && !b.enabled) return -1;
			if(!a.enabled && b.enabled) return 1;
			return 0;
		})
	}

	public checkLabel(item:TwitchatDataTypes.EndingCreditsSlot):void {
		if(!item.label) {
			item.label = this.$t(this.getLabelFromType(item.id));
		}
	}

	public randomize():void {
		for (let i = this.items.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.items[i], this.items[j]] = [this.items[j], this.items[i]];
		}
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

			&.center {
				margin: auto;
			}

			:deep(.icon) {
				height: 1em;
				vertical-align: middle;
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
						transition: transform .25s;
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