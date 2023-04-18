<template>
	<div class="triggeractionrandomentry">
		
		<div class="tabs">
			<Button :title="$t('triggers.actions.random.number')" bounce :selected="action.mode=='number'" @click="action.mode='number'" icon="dice" />
			<Button :title="$t('triggers.actions.random.list')" bounce :selected="action.mode=='list'" @click="action.mode='list'" icon="list" />
			<Button :title="$t('triggers.actions.random.trigger')" bounce :selected="action.mode=='trigger'" @click="action.mode='trigger'" icon="broadcast" />
		</div>

		<div class="row item info" v-if="action.mode != 'trigger'">{{ $t("triggers.actions.common.dynamic_placeholder_info") }}</div>
		<div class="row item info" v-else-if="action.mode == 'trigger'">{{ $t("triggers.actions.random.trigger_info") }}</div>

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
					<Button title="Add" icon="add" @click="addItem()" />
				</div>
				
				<div class="listItem">
					<div v-for="item, index in action.list" class="entry"
					@click="indexToEditState[index] = true">
							
						<button class="action button"
						v-tooltip="'Delete'"
						@click.capture.stop="deleteItem(index)">
							<img src="@/assets/icons/trash.svg" alt="delete">
						</button>

						<div class="content">
							<span class="label" v-if="!indexToEditState[index]">
								<ChatMessageChunksParser :chunks="getChunksFromItem(item)" />
							</span>
	
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
			<ToggleBlock class="row"
			small
			:open="openTriggerList"
			:title="$t('triggers.actions.random.trigger_select')">
				<TriggerList class="triggerList"
					noEdit
					:rewards="rewards"
					@select="onSelectTrigger($event)" />
			</ToggleBlock>

			<div class="row listItem trigger" v-if="action.triggers.length > 0">
				<div v-for="(item, index) in action.triggers" :key="item" class="entry">
					<button class="action button"
						v-tooltip="'Delete'"
						@click.capture.stop="deleteTriggerItem(index)">
						<img src="@/assets/icons/trash.svg" alt="delete">
					</button>

					<div class="content">
						<img v-if="getTriggerInfo(item).iconURL" :src="getTriggerInfo(item).iconURL" class="icon"
						:style="getTriggerInfo(item).iconBgColor? {backgroundColor:getTriggerInfo(item).iconBgColor, objectFit: 'contain'} : {}">
						<img v-else :src="$image('icons/'+getTriggerInfo(item).icon+'_purple.svg')" class="icon">
						<span class="label">{{ getTriggerInfo(item).label }}</span>
					</div>
				</div>
			</div>
		</div>
	
		<div class="row item name" v-if="action.mode != 'trigger'">
			<ParamItem :paramData="param_placeholder" v-model="action.placeholder" :error="(param_placeholder.value).length === 0" />
		</div>

		<i18n-t scope="global" class="example item" tag="div"
		keypath="triggers.actions.common.custom_placeholder_example"
		v-if="param_placeholder.value.length > 0 && action.mode != 'trigger'">
			<template #PLACEHOLDER>
				<mark v-click2Select>{{"{"}}{{param_placeholder.value.toUpperCase()}}{{"}"}}</mark>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TriggerActionRandomData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerList from '../TriggerList.vue';
import ChatMessageChunksParser from '@/components/messages/components/ChatMessageChunksParser.vue';

@Component({
	components:{
		Button,
		ParamItem,
		TriggerList,
		ToggleBlock,
		ChatMessageChunksParser,
	},
})
export default class TriggerActionRandomEntry extends Vue {

	@Prop
	public action!:TriggerActionRandomData;
	@Prop
	public rewards!:TwitchDataTypes.Reward[];

	public itemValue:string = "";
	public openTriggerList:boolean = false;
	public indexToEditState:{[key:string]:boolean} = {};

	public param_min:TwitchatDataTypes.ParameterData<number> = {type:"number",  labelKey:"triggers.actions.random.min_label", value:0, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"min_purple.svg"};
	public param_max:TwitchatDataTypes.ParameterData<number> = {type:"number",  labelKey:"triggers.actions.random.max_label", value:10, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"max_purple.svg"};
	public param_float:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean",  labelKey:"triggers.actions.random.float_label", value:false, icon:"dice_purple.svg"};
	public param_placeholder:TwitchatDataTypes.ParameterData<string> = {type:"string",  labelKey:"triggers.actions.countget.placeholder_label", value:"", maxLength:20, icon:"placeholder_purple.svg", allowedCharsRegex:"A-z0-9-_"};
	public param_listMode:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean",  labelKey:"triggers.actions.random.float_label", value:false, icon:"dice_purple.svg"};

	public getTriggerInfo(triggerId:string):{label:string, icon:string, iconURL?:string, iconBgColor?:string} {
		const t = this.$store("triggers").triggerList.find(v=>v.id === triggerId);
		if(!t) return {label:"TRIGGER NOT FOUND", icon:"alert"};
		return Utils.getTriggerDisplayInfo(t);
	}
	
	public beforeMount():void {
		if(this.action.mode == undefined) this.action.mode = "number";
		if(this.action.max == undefined) this.action.max = this.param_max.value;
		if(this.action.min == undefined) this.action.min = this.param_min.value;
		if(!this.action.triggers) this.action.triggers = [];
		if(!this.action.list) this.action.list = [];

		//Remove deleted triggers
		const triggers = this.$store("triggers").triggerList;
		this.action.triggers = this.action.triggers.filter(v=> triggers.findIndex(w => v === w.id) > -1);
		this.openTriggerList = this.action.triggers.length == 0;
	}

	public getChunksFromItem(src:string):TwitchDataTypes.ParseMessageChunk[] {
		return TwitchUtils.parseMessageToChunks(src, undefined, true);
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

	public onSelectTrigger(v:TriggerData):void {
		this.action.triggers.unshift(v.id);
	}

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
		gap: .25em;
		max-height: 300px;
		overflow-y: auto;
		margin-top: .5em;
		.entry {
			display: flex;
			flex-direction: row;
			.action {
				width: 1.5em;
				min-width: 1.5em;
				background-color: var(--mainColor_alert);
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
				border-top-right-radius: .5em;
				border-bottom-right-radius: .5em;
				background-color: var(--mainColor_light);
				font-size: .9em;
				display: flex;
				align-items: center;
				.icon {
					align-self: stretch;
					width: 1.75em;
					padding: .25em;
					margin-left: .5em;
					object-fit: fill;
					margin-right: .5em;
				}
				.label {
					padding: .5em;
					word-break: break-all;
					white-space: pre-wrap;
					text-align: left;
					align-self: flex-start;
				}
				textarea{
					font-size: 1em;
					min-width: calc(100% - 2em);
					resize: vertical;
				}
			}
		}
	}

	.triggerList {
		max-height: 300px;
		overflow-y: auto;
	}
}
</style>