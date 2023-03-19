<template>
	<div class="triggeractionrandomentry">
		
		<div class="tabs">
			<Button :title="$t('triggers.actions.random.number')" bounce :selected="action.mode=='number'" @click="action.mode='number'" :icon="$image('icons/dice.svg')" />
			<Button :title="$t('triggers.actions.random.list')" bounce :selected="action.mode=='list'" @click="action.mode='list'" :icon="$image('icons/list.svg')" />
			<Button :title="$t('triggers.actions.random.trigger')" bounce :selected="action.mode=='trigger'" @click="action.mode='trigger'" :icon="$image('icons/broadcast.svg')" />
		</div>

		<div class="row item info" v-if="action.mode != 'trigger'">{{ $t("triggers.actions.common.dynamic_placeholder_info") }}</div>
		<div class="row item info" v-else-if="action.mode == 'trigger'">{{ $t("triggers.actions.common.dynamic_trigger") }}</div>

		<div class="item" v-if="action.mode == 'number'">
			<div class="row item name">
				<ParamItem :paramData="param_max" v-model="action.max" />
			</div>
			
			<div class="row item name">
				<ParamItem :paramData="param_min" v-model="action.min" />
			</div>
	
			<div class="row item name">
				<ParamItem :paramData="param_float" v-model="action.float" />
			</div>
		</div>

		<div class="item" v-if="action.mode == 'list'">
			<div class="row item">
				<label class="item" for="randomEntry_input">{{ $t("triggers.actions.random.list_label") }}</label>
				<div class="itemForm" v-if="action.list.length < 10000">
					<textarea rows="2" v-model="itemValue" id="randomEntry_input" :placeholder="$t('triggers.actions.random.list_entry_placeholder')"></textarea>
					<Button title="Add" :icon="$image('icons/add.svg')" @click="addItem()" />
				</div>
				
				<div class="listItem">
					<div v-for="item, index in action.list" class="entry"
					@click="indexToEditState[index] = true">
							
						<button class="action button"
						data-tooltip="Delete"
						@click.capture.stop="deleteItem(index)">
							<img src="@/assets/icons/trash.svg" alt="delete">
						</button>

						<div class="content">
							<span class="label" v-if="!indexToEditState[index]"
							v-html="getFormatedMessage(item)"></span>
	
							<textarea v-if="indexToEditState[index]"
							maxlength="500"
							rows="2" v-autofocus
							@focusout="indexToEditState[index] = false"
							v-model="action.list[index]">{{ item }}</textarea>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="item" v-if="action.mode == 'trigger'">
			<div class="row item">
				<vue-select class="row item list"
				v-if="triggerList?.length > 1 && action.triggers.length < 1000"
				v-model="selectedTrigger"
				:placeholder="$t('triggers.actions.trigger.select')"
				:options="triggerList"
				:appendToBody="true"
				:calculate-position="$placeDropdown"
				:reduce="reduceSelectData"
				@option:selected="onSelectTrigger"
				>
					<template v-slot:option="option">
						<img :src="getTriggerIcon(option.info.icon)" alt="icon" class="listIcon">
						{{ option.label }}
					</template>
				</vue-select>
				
				<div class="listItem">
					<div v-for="(item, index) in action.triggers" class="entry">
						<button class="action button"
							data-tooltip="Delete"
							@click.capture.stop="deleteTriggerItem(index)">
							<img src="@/assets/icons/trash.svg" alt="delete">
						</button>
						<div class="content">
							<img :src="getTriggerIconFromKey(item)" alt="icon" class="icon">
							<span class="label">{{ getTriggerLabel(item) }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	
		<div class="row item name" v-if="action.mode != 'trigger'">
			<ParamItem :paramData="param_placeholder" v-model="action.placeholder" :error="(param_placeholder.value as string).length === 0" />
		</div>

		<i18n-t scope="global" class="example item" tag="div"
		keypath="triggers.actions.common.custom_placeholder_example"
		v-if="(param_placeholder.value as string).length > 0 && action.mode != 'trigger'">
			<template #PLACEHOLDER>
				<mark v-click2Select>{{"{"}}{{(param_placeholder.value as string).toUpperCase()}}{{"}"}}</mark>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import { TriggerEvents, TriggerTypes, type TriggerActionRandomData, type TriggerData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
		ParamItem,
	},
})
export default class TriggerActionRandomEntry extends Vue {

	@Prop
	public action!:TriggerActionRandomData;

	public itemValue:string = "";
	public indexToEditState:{[key:string]:boolean} = {};
	public triggerList:TriggerDefinitionEntry[] = [];
	public selectedTrigger:TriggerDefinitionEntry|null = null;

	public param_min:TwitchatDataTypes.ParameterData = {type:"number",  labelKey:"triggers.actions.random.min_label", value:0, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"min_purple.svg"}
	public param_max:TwitchatDataTypes.ParameterData = {type:"number",  labelKey:"triggers.actions.random.max_label", value:10, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"max_purple.svg"}
	public param_float:TwitchatDataTypes.ParameterData = {type:"boolean",  labelKey:"triggers.actions.random.float_label", value:false, icon:"dice_purple.svg"}
	public param_placeholder:TwitchatDataTypes.ParameterData = {type:"string",  labelKey:"triggers.actions.countget.placeholder_label", value:"", maxLength:20, icon:"placeholder_purple.svg"}
	public param_listMode:TwitchatDataTypes.ParameterData = {type:"boolean",  labelKey:"triggers.actions.random.float_label", value:false, icon:"dice_purple.svg"}
	
	public reduceSelectData(option:TriggerDefinitionEntry){ return option.triggerKey; }
	
	/**
	 * Gets a trigger's icon
	 */
	public getTriggerIcon(value:string):string {
		if(!value) return "";
		if(value.indexOf("/") > -1) {
			return value as string;
		}
		return this.$image("icons/"+value+"_purple.svg");
	}
	
	/**
	 * Gets a trigger's icon
	 */
	public getTriggerIconFromKey(key:string):string {
		const trigger = this.triggerList.find(v => v.triggerKey == key);
		if(!trigger) return this.$image("icons/cross_alert.svg");
		return this.getTriggerIcon(trigger.info.icon);
	}
	
	/**
	 * Gets a trigger's icon
	 */
	public getTriggerLabel(key:string):string {
		const trigger = this.triggerList.find(v => v.triggerKey == key);
		if(trigger) {
			return trigger.label ?? "";
		}else{
			return "trigger not found";
		}
	}

	public beforeMount():void {
		if(this.action.mode == undefined) this.action.mode = "number";
		if(this.action.max == undefined) this.action.max = this.param_max.value as number;
		if(this.action.min == undefined) this.action.min = this.param_min.value as number;
		if(!this.action.triggers) this.action.triggers = [];
		if(!this.action.list) this.action.list = [];
		
		this.populateTriggersList();
	}

	public getFormatedMessage(src:string):string {
		return TwitchUtils.parseEmotes(src, undefined, false, true);
	}

	public addItem():void {
		this.action.list.unshift(this.itemValue);
		this.itemValue = "";
	}

	public deleteItem(index:number):void {
		this.action.list.splice(index, 1);
	}

	public deleteTriggerItem(index:number):void {
		this.action.triggers.splice(index, 1);
	}

	public onSelectTrigger(v:TriggerDefinitionEntry):void {
		this.action.triggers.unshift(v.triggerKey);
		this.selectedTrigger = null;
	}

	/**
	 * Loads all existing triggers
	 */
	private async populateTriggersList():Promise<void> {
		const triggers:{[key:string]:TriggerData} = this.$store("triggers").triggers;
		const list:TriggerDefinitionEntry[] = [];
		for (const key in triggers) {
			const mainKey = key.split("_")[0];
			const info:TriggerEventTypes|undefined = TriggerEvents().find(v=> v.value === mainKey);
			if(!info) continue;
			if(info.isCategory) {
				const subKey = key.split("_")[1];
				if(!subKey) continue;
				if(mainKey == TriggerTypes.CHAT_COMMAND) {
					list.push({
						triggerKey:key,
						label:subKey,
						trigger:triggers[key],
						info,
					});
				}
			}else{
				list.push({
					triggerKey:key,
					label:this.$t(info.labelKey),
					trigger:triggers[key],
					info,
				});
			}
		}
		
		list.sort((a, b)=> {
			const ka = a.triggerKey.split("_")[0];
			const kb = b.triggerKey.split("_")[0];
			if(ka > kb) return 1;
			if(ka < kb) return -1;
			if(a.triggerKey > b.triggerKey) return 1;
			if(a.triggerKey < b.triggerKey) return -1;
			return 0;
		})
		this.triggerList = list;
	}

}

interface TriggerDefinitionEntry {
	triggerKey:string;
	label?:string;
	labelKey?:string;
	trigger:TriggerData;
	info:TriggerEventTypes;
}
</script>

<style scoped lang="less">
.triggeractionrandomentry{
	.triggerActionForm();
	
	.name:deep(input), .itemSelector {
		// flex-grow: 1;
		flex-basis: 200px;
	}

	.example {
		font-size: .9em;
		// text-align: center;
		margin: 1em 0 .5em 0;
	}
	.tabs {
		.tabMenu();
		margin-bottom: .5em;
	}

	.itemForm {
		display: flex;
		margin-top: .5em;
		textarea {
			flex-grow: 1;
			font-size: 1em;
			min-height: 3em;
			resize: vertical;
		}
	}

	.listItem {
		display: flex;
		flex-direction: column;
		gap: .5em;
		max-height: 300px;
		overflow-y: auto;
		margin-top: .5em;
		.entry {
			display: flex;
			flex-direction: row;
			.action {
				width: 1.5em;
				min-width: 1.5em;
				background-color: @mainColor_alert;
				padding: .25em;
				right: 0;
				border-top-left-radius: .5em;
				border-bottom-left-radius: .5em;
				img {
					width: 100%;
					height: 1em;
					max-height: 1em;
				}
			}
			.content {
				flex-grow: 1;
				padding: .5em;
				border-top-right-radius: .5em;
				border-bottom-right-radius: .5em;
				background-color: @mainColor_light;
				font-size: .9em;
				.icon {
					max-height: 1em;
					margin-right: .5em;
				}
				.label {
					word-break: break-all;
				}
				textarea{
					font-size: 1em;
					min-width: calc(100% - 2em);
					resize: vertical;
				}
			}
		}
	}
}
</style>