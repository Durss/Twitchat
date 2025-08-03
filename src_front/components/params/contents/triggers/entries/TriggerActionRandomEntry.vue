<template>
	<div class="triggeractionrandomentry triggerActionForm">

		<div class="info" v-if="action.mode != 'trigger'">{{ $t("triggers.actions.common.dynamic_placeholder_info") }}</div>
		<div class="info" v-else-if="action.mode == 'trigger'">{{ $t("triggers.actions.random.trigger_info") }}</div>

		<TabMenu v-model="action.mode"
		:values="['number', 'list', 'trigger', 'value', 'counter']"
		:icons="['dice', 'list', 'broadcast', 'placeholder', 'count']"
		:labels="[$t('triggers.actions.random.number'), $t('triggers.actions.random.list'), $t('triggers.actions.random.trigger'), $t('triggers.actions.random.value'), $t('triggers.actions.random.counter')]" />

		<template v-if="action.mode == 'number'">
			<ParamItem :paramData="param_max" v-model="action.max" />
			<ParamItem :paramData="param_min" v-model="action.min" />
			<ParamItem :paramData="param_float" v-model="action.float" />
		</template>

		<div class="card-item" v-if="action.mode == 'list'">
			<label for="randomEntry_input">{{ $t("triggers.actions.random.list_label") }}</label>
			<div class="itemForm" v-if="action.list.length < 10000">
				<textarea rows="2" v-model="itemValue" ref="listinput" id="randomEntry_input"
					:placeholder="$t('triggers.actions.random.list_entry_placeholder')"
					@keyup.enter.ctrl="addListItem()"></textarea>
				<TTButton icon="add" class="addBt" primary @click="addListItem()" :disabled="!itemValue" />
			</div>

			<PlaceholderSelector :placeholders="placeholderList" v-model="itemValue" :target="$refs['listinput']" />

			<div class="listItem list">
				<div v-for="item, index in action.list" :key="'entry_'+index" class="entry"
				@click="indexToEditState[index] = true">

					<button class="action button"
					v-tooltip="$t('global.delete')"
					@click.capture.stop="deleteListItem(index)">
						<Icon name="trash" theme="light" />
					</button>

					<div class="content">
						<span class="label" v-if="!indexToEditState[index]">
							<ChatMessageChunksParser v-if="buildIndex >= index" :chunks="itemChunks[index]" :channel="$store.auth.twitch.user.id" platform="twitch" />
						</span>

						<textarea v-if="indexToEditState[index]"
							maxlength="500"
							rows="4" v-autofocus
							@focusout="indexToEditState[index] = false; onChangeListItem(index)"
							v-model="action.list[index]">{{ item }}</textarea>
					</div>
				</div>
			</div>
		</div>

		<template v-if="action.mode == 'trigger'">
			<ParamItem :paramData="param_skipDisabled" v-model="action.skipDisabled" />

			<ParamItem :paramData="param_disableAfterExec" v-model="action.disableAfterExec" />

			<div class="card-item triggerList" medium primary :open="openTriggerList">
				<div class="title" @click="openTriggerList = !openTriggerList">
					<span :class="openTriggerList? 'arrow open' : 'arrow'">►</span>
					<span>{{ $t("triggers.actions.random.trigger_select") }}</span>
				</div>
				<SimpleTriggerList class="list" @select="onSelectTrigger" v-if="openTriggerList" />
			</div>

			<div class="listItem trigger" v-if="action.triggers.length > 0">
				<div v-for="(item, index) in action.triggers" :key="item" class="entry">
					<button class="action button"
						v-tooltip="$t('global.delete')"
						@click.capture.stop="deleteTriggerItem(index)">
						<Icon name="trash" alt="delete" theme="light" />
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

		<template v-if="action.mode == 'value'">
			<template v-if="(param_value.listValues || []).length > 0">
				<ParamItem :paramData="param_value" v-model="action.valueSource" />
			</template>
			<div class="card-item secondary info warning" v-else>
				<p>{{ $t("triggers.actions.random.value_no_values") }}</p>
				<TTButton secondary light small @click="createValue()">{{ $t("values.addBt") }}</TTButton>
			</div>

			<ParamItem v-if="valueIdToValue[param_value.value]?.perUser !== true"
				:paramData="param_valueSplitter"
				:error="(action.valueSplitter || '').trim().length == 0"
				v-model="action.valueSplitter" noBackground />
		</template>

		<template v-if="action.mode == 'counter'">
			<template v-if="(param_counter.listValues || []).length > 0">
				<ParamItem :paramData="param_counter" v-model="action.counterSource" />
			</template>
			<div class="card-item secondary info warning" v-else>
				<p>{{ $t("triggers.actions.random.counter_no_values") }}</p>
				<TTButton secondary light small @click="createCounter()">{{ $t("counters.addBt") }}</TTButton>
			</div>
		</template>

		<div v-if="(action.mode=='value' && (param_value.listValues || []).length > 0) || (action.mode=='counter' && (param_counter.listValues || []).length > 0)" class="card-item listItem">
			<p>{{ $t("triggers.actions.random.placeholder_tuto") }}</p>
			<template v-if="action.mode=='counter' || valueIdToValue[param_value.value]?.perUser === true">
				<ParamItem :paramData="param_placeholderUserId"
					:error="(action.valueCounterPlaceholders!.userId || '').trim().length == 0"
					v-model="action.valueCounterPlaceholders!.userId" noBackground />
				<ParamItem :paramData="param_placeholderUserName"
					:error="(action.valueCounterPlaceholders!.userName || '').trim().length == 0"
					v-model="action.valueCounterPlaceholders!.userName" noBackground />
			</template>

			<ParamItem :paramData="param_placeholderValue"
				:error="(action.valueCounterPlaceholders!.value || '').trim().length == 0"
				v-model="action.valueCounterPlaceholders!.value" noBackground />
		</div>

		<ParamItem v-if="action.mode == 'list' || action.mode == 'number'" :paramData="param_placeholder" v-model="action.placeholder" :error="action.placeholder && action.placeholder.length === 0" />

		<ParamItem v-if="action.mode == 'list' || action.mode == 'trigger' || action.mode == 'value' || action.mode == 'counter'" :paramData="param_removePickedEntry" v-model="action.removePickedEntry" />

		<i18n-t scope="global" class="card-item primary" tag="div"
		keypath="triggers.actions.common.custom_placeholder_example"
		v-if="param_placeholder.value.length > 0 && action.mode != 'trigger' && action.mode != 'value' && action.mode != 'counter'">
			<template #PLACEHOLDER>
				<mark v-click2Select>{{"{"}}{{param_placeholder.value.toUpperCase()}}{{"}"}}</mark>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import TabMenu from '@/components/TabMenu.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ChatMessageChunksParser from '@/components/messages/components/ChatMessageChunksParser.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import PlaceholderSelector from '@/components/params/PlaceholderSelector.vue';
import type { TriggerActionRandomData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TriggerUtils from '@/utils/TriggerUtils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import SimpleTriggerList from '../SimpleTriggerList.vue';
import TriggerList from '../TriggerList.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		Icon,
		TabMenu,
		TTButton,
		ParamItem,
		TriggerList,
		ToggleBlock,
		SimpleTriggerList,
		PlaceholderSelector,
		ChatMessageChunksParser,
	},
})
class TriggerActionRandomEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionRandomData;

	@Prop
	public rewards!:TwitchDataTypes.Reward[];

	@Prop
	declare triggerData:TriggerData;

	public itemValue:string = "";
	public itemChunks:TwitchatDataTypes.ParseMessageChunk[][] = [];
	public buildIndex:number = 0;
	public disposed:boolean = false;
	public openTriggerList:boolean = false;
	public indexToEditState:{[key:string]:boolean} = {};
	public valueIdToValue:{[key:string]:TwitchatDataTypes.ValueData} = {};

	public param_min:TwitchatDataTypes.ParameterData<number> = {type:"number", labelKey:"triggers.actions.random.min_label", value:0, min:Number.MIN_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"min"};
	public param_max:TwitchatDataTypes.ParameterData<number> = {type:"number", labelKey:"triggers.actions.random.max_label", value:10, min:Number.MIN_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"max"};
	public param_float:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"triggers.actions.random.float_label", value:false, icon:"dice"};
	public param_placeholder:TwitchatDataTypes.ParameterData<string> = {type:"placeholder", labelKey:"triggers.actions.random.placeholder_label", value:"", maxLength:20, icon:"placeholder", allowedCharsRegex:"A-z0-9-_"};
	public param_skipDisabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"triggers.actions.random.trigger_skipDisabled", value:true, icon:"skip"};
	public param_disableAfterExec:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"triggers.actions.random.trigger_disableAfterExec", value:false, icon:"disable"};
	public param_value:TwitchatDataTypes.ParameterData<string> = {type:"list", labelKey:"triggers.actions.random.value_id", value:"", icon:"placeholder"};
	public param_counter:TwitchatDataTypes.ParameterData<string> = {type:"list", labelKey:"triggers.actions.random.counter_id", value:"", icon:"placeholder"};
	public param_valueSplitter:TwitchatDataTypes.ParameterData<string> = {type:"string", labelKey:"triggers.actions.random.value_splitter", value:",", icon:"split", maxLength:5};
	public param_placeholderUserId:TwitchatDataTypes.ParameterData<string> = {type:"string", labelKey:"triggers.actions.random.placeholder_user_id", value:"", icon:"label"};
	public param_placeholderUserName:TwitchatDataTypes.ParameterData<string> = {type:"string", labelKey:"triggers.actions.random.placeholder_user_name", value:"", icon:"user"};
	public param_placeholderValue:TwitchatDataTypes.ParameterData<string> = {type:"string", labelKey:"triggers.actions.random.placeholder_value", value:"", icon:"number"};
	public param_removePickedEntry:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"triggers.actions.random.param_removePickedEntry", value:false, icon:"trash"};

	public getTriggerInfo(triggerId:string):{label:string, icon:string, iconURL?:string, iconBgColor?:string} {
		const t = this.$store.triggers.triggerList.find(v=>v.id === triggerId);
		if(!t) return {label:"TRIGGER NOT FOUND", icon:"alert"};
		return TriggerUtils.getTriggerDisplayInfo(t);
	}

	public beforeMount():void {
		if(this.action.mode == undefined) this.action.mode = "number";
		if(this.action.max == undefined) this.action.max = this.param_max.value;
		if(this.action.min == undefined) this.action.min = this.param_min.value;
		if(this.action.skipDisabled == undefined) this.action.skipDisabled = this.param_skipDisabled.value;
		if(this.action.disableAfterExec == undefined) this.action.disableAfterExec = this.param_disableAfterExec.value;
		if(!this.action.triggers) this.action.triggers = [];
		if(!this.action.list) this.action.list = [];
		if(!this.action.valueSplitter) this.action.valueSplitter = ",";
		this.buildIndex = 0;

		this.valueIdToValue = {};

		this.param_value.listValues = this.$store.values.valueList
		// .filter(v=>v.perUser === true)
		.map(v=>{
			return {
				value:v.id,
				label:v.name,

			}
		});
		this.$store.values.valueList.forEach(v=>{
			this.valueIdToValue[v.id] = v;
		})

		this.param_counter.listValues = this.$store.counters.counterList.filter(v=>v.perUser === true).map(v=>{
			return {
				value:v.id,
				label:v.name,
			}
		});

		//Remove deleted triggers
		const triggers = this.$store.triggers.triggerList;
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
		if((this.action.mode == "value" || this.action.mode == "counter")) {
			if(!this.action.valueCounterPlaceholders) {
				this.action.valueCounterPlaceholders = {
					userId:"EXTRACTED_USER_ID",
					userName:"EXTRACTED_USERNAME",
					value:"EXTRACTED_VALUE",
				}
			}
		}else{
			delete this.action.valueCounterPlaceholders;
		}
		this.buildNextListBatch();
	}

	public getChunksFromItem(src:string):TwitchatDataTypes.ParseMessageChunk[] {
		return TwitchUtils.parseMessageToChunks(src, undefined, true);
	}

	public addListItem():void {
		this.buildIndex ++;
		this.action.list.unshift(this.itemValue);
		this.itemChunks.unshift(TwitchUtils.parseMessageToChunks(this.itemValue, undefined, true));
		this.itemValue = "";
		(this.$refs.listinput as HTMLInputElement).focus();
	}

	public deleteListItem(index:number):void {
		this.action.list.splice(index, 1);
		this.itemChunks.splice(index, 1);
	}

	public deleteTriggerItem(index:number):void {
		this.action.triggers.splice(index, 1);
	}

	public onSelectTrigger(id:string):void {
		this.action.triggers.unshift(id);
	}

	/**
	 * Build custom list entries by batch to avoid potential
	 * huge lag on display if there are many entries
	 */
	public buildNextListBatch():void {
		if(this.disposed) return;
		if(this.action.mode != "list") return;
		if(this.buildIndex >= this.action.list.length) return;

		for (let i = this.buildIndex; i < Math.min(this.buildIndex+10, this.action.list.length); i++) {
			const item = this.action.list[i];
			this.itemChunks.push(TwitchUtils.parseMessageToChunks(item, undefined, true));
		}
		this.buildIndex += 10;

		window.setTimeout(()=> {
			this.buildNextListBatch();
		}, 30);
	}

	/**
	 * Redirect to Values
	 */
	public createValue():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.VALUES);
	}

	/**
	 * Redirect to Counters
	 */
	public createCounter():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.COUNTERS);
	}

	public onChangeListItem(index:number):void {
		this.itemChunks[index] = TwitchUtils.parseMessageToChunks(this.action.list[index], undefined, true);
	}

}

export default toNative(TriggerActionRandomEntry);
</script>

<style scoped lang="less">
.triggeractionrandomentry{

	.itemForm {
		display: flex;
		margin-top: .5em;
		&>* {
			border-radius: 0;
		}
		&>*:first-child {
			border-top-left-radius: var(--border-radius);
			border-bottom-left-radius: var(--border-radius);
		}
		&>*:last-child {
			border-top-right-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
		}
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
		margin-top: 1em;
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
				.icon {
					height: 1.2em;
					margin: auto;
					vertical-align: text-top;
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
					min-width: calc(100%);
					resize: vertical;
				}
				:deep(.copyBt) {
					height: 1em;
				}
			}
		}

		&.list {
			.entry {
				.content {
					.bevel();
					background-color: var(--background-color-fader);
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
				color: var(--color-light);
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
	.warning {
		display: flex;
		flex-direction: column;
	}
}
</style>
