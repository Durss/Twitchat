<template>
	<div class="triggeractionrandomentry triggerActionForm">
		
		<TabMenu v-model="action.mode"
		:values="['number', 'list', 'trigger']"
		:icons="['dice', 'list', 'broadcast']"
		:labels="[$t('triggers.actions.random.number'), $t('triggers.actions.random.list'), $t('triggers.actions.random.trigger')]" />

		<div class="info" v-if="action.mode != 'trigger'">{{ $t("triggers.actions.common.dynamic_placeholder_info") }}</div>
		<div class="info" v-else-if="action.mode == 'trigger'">{{ $t("triggers.actions.random.trigger_info") }}</div>

		<template v-if="action.mode == 'number'">
			<ParamItem :paramData="param_max" v-model="action.max" />
			<ParamItem :paramData="param_min" v-model="action.min" />
			<ParamItem :paramData="param_float" v-model="action.float" />
		</template>

		<div class="card-item" v-if="action.mode == 'list'">
			<label for="randomEntry_input">{{ $t("triggers.actions.random.list_label") }}</label>
			<div class="itemForm" v-if="action.list.length < 10000">
				<textarea rows="2" v-model="itemValue" id="randomEntry_input" :placeholder="$t('triggers.actions.random.list_entry_placeholder')"></textarea>
				<Button icon="add" class="addBt" @click="addItem()" :disabled="!itemValue" />
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
							<ChatMessageChunksParser :chunks="getChunksFromItem(item)" v-if="buildIndex >= index" :channel="$store('auth').twitch.user.id" platform="twitch" />
						</span>

						<textarea v-if="indexToEditState[index]"
							maxlength="500"
							rows="4" v-autofocus
							@focusout="indexToEditState[index] = false"
							v-model="action.list[index]">{{ item }}</textarea>
					</div>
				</div>
			</div>
		</div>

		<template v-if="action.mode == 'trigger'">
			<ParamItem :paramData="param_skipDisabled" v-model="action.skipDisabled" />

			<ParamItem :paramData="param_disableAfterExec" v-model="action.disableAfterExec" />

			<div class="card-item triggerList" medium primary
			:open="openTriggerList">
				<div class="title" @click="openTriggerList = !openTriggerList">
					<span :class="openTriggerList? 'arrow open' : 'arrow'">►</span>
					<span>{{ $t("triggers.actions.random.trigger_select") }}</span>
				</div>
				<SimpleTriggerList class="list" @select="onSelectTrigger" v-if="openTriggerList" />
			</div>
			
			<div class="listItem trigger" v-if="action.triggers.length > 0">
				<div v-for="(item, index) in action.triggers" :key="item" class="entry">
					<button class="action button"
						v-tooltip="'Delete'"
						@click.capture.stop="deleteTriggerItem(index)">
						<img src="@/assets/icons/trash.svg" alt="delete">
					</button>

					<!-- <div class="content">
						<img v-if="getTriggerInfo(item).iconURL" :src="getTriggerInfo(item).iconURL" class="icon"
						:style="getTriggerInfo(item).iconBgColor? {backgroundColor:getTriggerInfo(item).iconBgColor} : {}">
						<Icon v-else :name="getTriggerInfo(item).icon" class="icon" />
						<span class="label">{{ getTriggerInfo(item).label }}</span>
					</div> -->
					<SimpleTriggerList class="item" :filteredItemId="item" />
				</div>
			</div>
		</template>
	
		<ParamItem v-if="action.mode != 'trigger'" :paramData="param_placeholder" v-model="action.placeholder" :error="(param_placeholder.value).length === 0" />

		<i18n-t scope="global" class="card-item primary info" tag="div"
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
import TabMenu from '@/components/TabMenu.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ChatMessageChunksParser from '@/components/messages/components/ChatMessageChunksParser.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionRandomData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Prop } from 'vue-facing-decorator';
import SimpleTriggerList from '../SimpleTriggerList.vue';
import TriggerList from '../TriggerList.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry.vue';

@Component({
	components:{
		Button,
		TabMenu,
		ParamItem,
		TriggerList,
		ToggleBlock,
		SimpleTriggerList,
		ChatMessageChunksParser,
	},
})
export default class TriggerActionRandomEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionRandomData;
	
	@Prop
	public rewards!:TwitchDataTypes.Reward[];
	
	@Prop
	declare triggerData:TriggerData;

	public itemValue:string = "";
	public buildIndex:number = 0;
	public disposed:boolean = false;
	public openTriggerList:boolean = false;
	public indexToEditState:{[key:string]:boolean} = {};

	public param_min:TwitchatDataTypes.ParameterData<number> = {type:"number",  labelKey:"triggers.actions.random.min_label", value:0, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"min"};
	public param_max:TwitchatDataTypes.ParameterData<number> = {type:"number",  labelKey:"triggers.actions.random.max_label", value:10, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"max"};
	public param_float:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean",  labelKey:"triggers.actions.random.float_label", value:false, icon:"dice"};
	public param_placeholder:TwitchatDataTypes.ParameterData<string> = {type:"string",  labelKey:"triggers.actions.random.placeholder_label", value:"", maxLength:20, icon:"placeholder", allowedCharsRegex:"A-z0-9-_"};
	public param_skipDisabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean",  labelKey:"triggers.actions.random.trigger_skipDisabled", value:true, icon:"skip"};
	public param_disableAfterExec:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean",  labelKey:"triggers.actions.random.trigger_disableAfterExec", value:false, icon:"disable"};

	public getTriggerInfo(triggerId:string):{label:string, icon:string, iconURL?:string, iconBgColor?:string} {
		const t = this.$store("triggers").triggerList.find(v=>v.id === triggerId);
		if(!t) return {label:"TRIGGER NOT FOUND", icon:"alert"};
		return Utils.getTriggerDisplayInfo(t);
	}
	
	public beforeMount():void {
		if(this.action.mode == undefined) this.action.mode = "number";
		if(this.action.max == undefined) this.action.max = this.param_max.value;
		if(this.action.min == undefined) this.action.min = this.param_min.value;
		if(this.action.skipDisabled == undefined) this.action.skipDisabled = this.param_skipDisabled.value;
		if(this.action.disableAfterExec == undefined) this.action.disableAfterExec = this.param_disableAfterExec.value;
		if(!this.action.triggers) this.action.triggers = [];
		if(!this.action.list) this.action.list = [];
		this.buildIndex = 0;

		//Remove deleted triggers
		const triggers = this.$store("triggers").triggerList;
		this.action.triggers = this.action.triggers.filter(v=> triggers.findIndex(w => v === w.id) > -1);
		this.openTriggerList = this.action.triggers.length == 0;
		
		watch(()=>this.action.mode, ()=> {
			this.onSwitchMode();
		});
		this.onSwitchMode();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public onSwitchMode():void {
		this.buildIndex = 5;
		setTimeout(()=> {
			this.buildNextListBatch();
		}, 250);
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

	public onSelectTrigger(id:string):void {
		this.action.triggers.unshift(id);
	}

	public buildNextListBatch():void {
		if(this.disposed) return;
		if(this.action.mode != "list") return;
		if(this.buildIndex >= this.action.list.length) return;
		
		this.buildIndex += 10;
		console.log(this.buildIndex);
		
		setTimeout(()=> {
			this.buildNextListBatch();
		}, 30)
	}

}

</script>

<style scoped lang="less">
.triggeractionrandomentry{

	.itemForm {
		display: flex;
		margin-top: .5em;
		textarea {
			flex-grow: 1;
			font-size: 1em;
			min-height: 3em;
			resize: vertical;
		}
		.addBt {
			border-radius: var(--border-radius);
			border-top-left-radius: 0;
			border-bottom-left-radius: 0;
		}
	}

	.listItem {
		display: flex;
		flex-direction: column;
		gap: .25em;
		max-height: 300px;
		overflow-y: auto;
		margin-top: .25em;
		.entry {
			flex-shrink: 0;
			display: flex;
			flex-direction: row;
			overflow: hidden;
			color: var(--color-text);
			border-radius: var(--border-radius);
			.action {
				width: 1.5em;
				min-width: 1.5em;
				background-color: var(--color-alert);
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
				background-color: var(--color-primary);
				font-size: .9em;
				display: flex;
				align-items: center;
				padding-left: .25em;
				.icon {
					align-self: stretch;
					width: 1.75em;
					padding: .25em;
					object-fit: contain;
				}
				.label {
					padding: .5em .25em;
					word-break: break-all;
					white-space: pre-line;
					text-align: left;
					align-self: flex-start;
				}
				textarea{
					font-size: 1em;
					min-width: calc(100% - 2em);
					resize: vertical;
				}
				:deep(.copyBt) {
					height: 1em;
				}
			}
		}

		&.trigger {
			.item {
				width: 100%;
				pointer-events: none;
				background-color: var(--color-primary);
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
				padding-left: .5em;
			}
		}
	}

	.triggerList {
		flex-grow: 1;
		width: 100%;
		.title {
			cursor: pointer;
			.arrow {
				display: inline-block;
				margin-right: .5em;
				transition: transform .2s;
				&.open{
					transform: rotate(90deg);
				}
			}
		}
		.list {
			margin-top: .5em;
		}
	}
}
</style>