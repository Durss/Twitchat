<template>
	<div class="triggeractionlist">
		<div class="card-item secondary description">
			<img src="@/assets/icons/info.svg" class="icon">
			<i18n-t scope="global" tag="span" v-if="triggerDescriptionLabel" :keypath="triggerDescriptionLabel">
				<template #SUB_ITEM_NAME>
					<mark>{{ subTypeLabel }}</mark>
				</template>
				<template #INFO v-if="$te(triggerDescriptionLabel+'_info')">
					<i18n-t tag="i" class="details" scope="global"
					v-if="$te(triggerDescriptionLabel+'_info')"
					:keypath="triggerDescriptionLabel+'_info'">
						<template #CMD v-if="$te(triggerDescriptionLabel+'_info_cmd')">
							<mark>{{ $t(triggerDescriptionLabel+'_info_cmd') }}</mark>
						</template>
					</i18n-t>
				</template>
				<template #CMD v-if="$te(triggerDescriptionLabel+'_cmd')">
					<mark v-html="$t(triggerDescriptionLabel+'_cmd')"></mark>
				</template>
			</i18n-t>
		</div>

		<div class="card-item params">
			<ParamItem noBackground :paramData="param_name" v-model="triggerData.name" />

			<TriggerActionChatCommandParams
				v-if="isChatCmd"
				:triggerData="triggerData"
			/>

			<TriggerActionScheduleParams
				v-if="isSchedule"
				:triggerData="triggerData"
			/>

			<TriggerActionSlashCommandParams
				v-if="isSlashCommand"
				:triggerData="triggerData"
			/>

			<TriggerActionCommandArgumentParams
				v-if="isAnyChatMessageCommand"
				:triggerData="triggerData"
			/>

			<TriggerActionHeatParams
				v-if="isHeatTrigger"
				:obsSources="obsSources"
				:triggerData="triggerData"
			/>

			<TriggerGoXLRParams
				v-if="isGoXLRButtonTrigger"
				:obsSources="obsSources"
				:triggerData="triggerData"
			/>
			
			<div class="queue">
				<div class="info" v-tooltip="$t('triggers.trigger_queue_info')">
					<Icon name="list" class="icon" />
					<span>{{ $t("triggers.trigger_queue") }}</span>
				</div>
				<ParamItem noBackground class="selector" :paramData="param_queue" v-model="triggerData.queue" />
			</div>
		</div>

		<TriggerConditionList class="card-item conditions" :triggerData="triggerData" />
		
		<div :class="listClasses">
			<div v-if="hasCondition" class="conditionSelector">
				<Button icon="cross" alert @click="matchingCondition = false" :selected="matchingCondition == false" />
				<img src="@/assets/icons/condition.svg" class="conditionLink" />
				<Button icon="checkmark" @click="matchingCondition = true" :selected="matchingCondition == true" />
			</div>
			<svg class="conditionJoint" v-if="hasCondition" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
				width="104.8px" height="24.4px" viewBox="0 0 104.8 24.4" style="enable-background:new 0 0 104.8 24.4;" xml:space="preserve">
				<polygon class="false" style="fill:#B71F1F;" points="0,24.4 0,0 2,0 2,22.4 52.4,22.4 52.4,24.4 "/>
				<polygon class="true" style="fill:#008667;" points="52.4,24.4 52.4,22.4 102.8,22.4 102.8,0 104.8,0 104.8,24.4 "/>
			</svg>

			<div class="dash long"></div>

			<button class="addBt" @click="addActionAt(0)">
				<img src="@/assets/icons/add.svg" class="icon">
			</button>

			<draggable 
			v-model="filteredActionList" 
			group="actions" 
			item-key="id"
			ghost-class="ghost"
			direction="vertical"
			handle=".header"
			:animation="250"
			:dragoverBubble="true">
				<template #item="{element, index}:{element:TriggerActionTypes, index:number}">
					<div class="listItem">
						<div class="dash"></div>
						<TriggerActionEntry
							class="action"
							:action="element"
							:index="index"
							:obsSources="obsSources"
							:obsInputs="obsInputs"
							:rewards="rewards"
							:triggerData="triggerData"
							@delete="deleteAction(element.id)"
							@duplicate="duplicateAction(element, index)"
						/>
						<div class="dash"></div>
						<button class="addBt" @click="addActionAfter(element.id)">
							<img src="@/assets/icons/add.svg" class="icon">
						</button>
					</div>
				</template>
			</draggable>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import TabMenu from '@/components/TabMenu.vue';
import { TriggerTypes, TriggerTypesDefinitionList, type TriggerActionEmptyData, type TriggerActionTypes, type TriggerData, type TriggerTypeDefinition, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { OBSInputItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import ParamItem from '../../ParamItem.vue';
import TriggerActionChatCommandParams from './TriggerActionChatCommandParams.vue';
import TriggerActionCommandArgumentParams from './TriggerActionCommandArgumentParams.vue';
import TriggerActionEntry from './TriggerActionEntry.vue';
import TriggerActionHeatParams from './TriggerActionHeatParams.vue';
import TriggerActionScheduleParams from './TriggerActionScheduleParams.vue';
import TriggerActionSlashCommandParams from './TriggerActionSlashCommandParams.vue';
import TriggerConditionList from './TriggerConditionList.vue';
import TriggerGoXLRParams from './TriggerGoXLRParams.vue';

@Component({
	components:{
		Button,
		TabMenu,
		draggable,
		ParamItem,
		TriggerActionEntry,
		TriggerGoXLRParams,
		TriggerConditionList,
		TriggerActionHeatParams,
		TriggerActionScheduleParams,
		TriggerActionChatCommandParams,
		TriggerActionSlashCommandParams,
		TriggerActionCommandArgumentParams,
	},
	emits:[],
})
export default class TriggerActionList extends Vue {

	@Prop
	public triggerData!:TriggerData;
	@Prop
	public obsSources!:OBSSourceItem[];
	@Prop
	public obsInputs!:OBSInputItem[];
	@Prop
	public rewards!:TwitchDataTypes.Reward[];
	
	public matchingCondition:boolean = true;
	public param_name:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"date", placeholder:"...", labelKey:"triggers.trigger_name" };
	public param_queue:TwitchatDataTypes.ParameterData<string[]> = {value:[], type:"editablelist", max:1, placeholderKey:"triggers.trigger_queue_input_placeholder"}

	/**
	 * Get a trigger's description
	 */
	public get triggerDescriptionLabel():string|undefined {
		const item = TriggerTypesDefinitionList().find(v => v.value == this.triggerData.type) as TriggerTypeDefinition|null;
		return item?.descriptionKey;
	}

	/**
	 * Get a trigger's description
	 */
	public get filteredActionList():TriggerActionTypes[] {
		let res = this.triggerData.actions;
		if(this.hasCondition) {
			return res.filter(t=> {
				return t.condition == this.matchingCondition || (t.condition !== false && this.matchingCondition);
			})
		}
		return res;
	}

	/**
	 * Get filtered actions depending on condition result if any
	 */
	public set filteredActionList(value:TriggerActionTypes[]) {
		if(this.hasCondition) {
			
			//Remove all sorted actions from the original trigger data
			for (let i = 0; i < this.triggerData.actions.length; i++) {
				const item = this.triggerData.actions[i];
				if(value.findIndex(v=> v.id == item.id) == -1) continue;
				this.triggerData.actions.splice(i, 1);
				i--;
			}
			//Push sorted actions
			this.triggerData.actions = this.triggerData.actions.concat(value);
		}else{
			this.triggerData.actions = value;
		}
	}

	public get isChatCmd():boolean { return this.triggerData.type === TriggerTypes.CHAT_COMMAND; }
	public get isSchedule():boolean { return this.triggerData.type === TriggerTypes.SCHEDULE; }
	public get isSlashCommand():boolean { return this.triggerData.type === TriggerTypes.SLASH_COMMAND; }
	public get isAnyChatMessageCommand():boolean { return this.triggerData.type === TriggerTypes.ANY_MESSAGE; }
	public get isHeatTrigger():boolean { return this.triggerData.type === TriggerTypes.HEAT_CLICK; }
	public get hasCondition():boolean { return this.triggerData.conditions != undefined && this.triggerData.conditions.conditions.length > 0; }
	public get isGoXLRButtonTrigger():boolean {
		const list:TriggerTypesValue[] = [
			TriggerTypes.GOXLR_BUTTON_PRESSED,
			TriggerTypes.GOXLR_BUTTON_RELEASED,
		]
		return list.indexOf(this.triggerData.type) > -1;
	}
	public get listClasses():string[] {
		const res = ["list"];
		if(this.hasCondition && !this.matchingCondition) res.push("alert");
		return res;
	}

	/**
	 * Get a trigger's sub type's label (reward name, counter name, ...)
	 */
	public get subTypeLabel():string|undefined {
		switch(this.triggerData.type) {
			case TriggerTypes.SLASH_COMMAND:
			case TriggerTypes.CHAT_COMMAND:
				return this.triggerData.chatCommand || "...";

			case TriggerTypes.REWARD_REDEEM:
				return this.rewards.find(v=>v.id == this.triggerData.rewardId)?.title ?? "REWARD NOT FOUND";

			case TriggerTypes.OBS_SCENE:
				return this.triggerData.obsScene || "...";

			case TriggerTypes.OBS_SOURCE_ON:
			case TriggerTypes.OBS_SOURCE_OFF:
				return this.triggerData.obsSource || "...";

			case TriggerTypes.OBS_PLAYBACK_STARTED:
			case TriggerTypes.OBS_PLAYBACK_ENDED:
			case TriggerTypes.OBS_PLAYBACK_PAUSED:
			case TriggerTypes.OBS_PLAYBACK_RESTARTED:
			case TriggerTypes.OBS_PLAYBACK_NEXT:
			case TriggerTypes.OBS_PLAYBACK_PREVIOUS:
			case TriggerTypes.OBS_INPUT_MUTE:
			case TriggerTypes.OBS_INPUT_UNMUTE:
				return this.triggerData.obsInput || "...";

			case TriggerTypes.OBS_FILTER_ON:
			case TriggerTypes.OBS_FILTER_OFF:
				return this.triggerData.obsFilter + " ("+this.triggerData.obsSource+")" || "...";

			case TriggerTypes.COUNTER_EDIT:
			case TriggerTypes.COUNTER_ADD:
			case TriggerTypes.COUNTER_DEL:
			case TriggerTypes.COUNTER_LOOPED:
			case TriggerTypes.COUNTER_MAXED:
			case TriggerTypes.COUNTER_MINED:
				return this.$store("counters").counterList.find(v=>v.id == this.triggerData.counterId)?.name ?? "COUNTER NOT FOUND";

			case TriggerTypes.VALUE_UPDATE:
				return this.$store("values").valueList.find(v=>v.id == this.triggerData.valueId)?.name ?? "VALUE NOT FOUND";
		}
		return "...";
	}

	public beforeMount():void {
		this.param_queue.options = this.$store("triggers").queues;
		if(this.triggerData.actions.length === 0) {
			this.addActionAt(0);
		}
	}

	/**
	 * Called when deleting an action item
	 */
	public deleteAction(actionId:string):void {
		this.$confirm(this.$t("triggers.delete_action_confirm")).then(async ()=> {
			let index = this.triggerData.actions.findIndex(v=>v.id == actionId);
			this.triggerData.actions.splice(index, 1);
		}).catch(()=> {});
	}

	/**
	 * Called when duplicating an action item
	 */
	public duplicateAction(action:TriggerActionTypes, index:number):void {
		const clone:TriggerActionTypes = JSON.parse(JSON.stringify(action));
		clone.id = Utils.getUUID(),
		this.triggerData.actions.splice(index, 0, clone);
	}

	/**
	 * Adds an action after the specified trigger ID
	 * @param id 
	 */
	public addActionAfter(id:string):void {
		let index = this.triggerData.actions.findIndex(v=>v.id == id);
		if(index == -1) return;
		this.addActionAt(index + 1);
	}

	/**
	 * Adds an action at the top of the list
	 * @param id 
	 */
	public addActionAt(index:number):void {
		const action:TriggerActionEmptyData = {
			delay:0,
			id:Utils.getUUID(),
			type:null,
		}
		if(this.hasCondition) {
			action.condition = this.matchingCondition;
		}
		this.triggerData.actions.splice(index, 0, action);
	}

}
</script>

<style scoped lang="less">
.triggeractionlist{
	display: flex;
	flex-direction: column;
	gap: 1em;

	.list {
		.conditionSelector {
			display: flex;
			flex-direction: row;
			align-items: flex-end;
			margin: auto;
			width: fit-content;
			.button {
				margin-bottom: 3px;
				&:not(.selected) {
					opacity: .5;
				}
			}
			.icon {
				width: 75px;
			}
		}
		.conditionJoint {
			display: block;
			margin: auto;
			width: 105px;
			.true {
				fill-opacity:1;
			}
			.false {
				fill-opacity:.25;
			}
		}
		.tabmenu {
			width: fit-content;
			border: 2px solid var(--color-primary);
			margin: auto;
		}
		.dash {
			width: 2px;
			background-color: var(--color-primary);
			height: 10px;
			margin: auto;
			&.long {
				height:15px;
			}
		}
	
		.addBt {
			display: block;
			margin: auto;
			border-radius: 50%;
			width: 1.25em;
			height: 1.25em;
			background-color: var(--color-primary);
			transition: background-color .25s;
			.icon {
				padding: .25em;
				height: 100%;
				width: 100%;
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
		}
		
		&.alert {
			.addBt {
				background-color: var(--color-alert);
				&:hover {
					background-color: var(--color-alert-light);
				}
			}

			.dash {
				background-color: var(--color-alert);
			}

			.conditionJoint {
				.true {
					fill-opacity:.25;
				}
				.false {
					fill-opacity:1;
				}
			}
		}
	}

	&>.params, &>.conditions, &>.description {
		box-shadow: 0px 1px 1px rgba(0,0,0,0.25);

		&>.head {
			text-align: center;
			margin-bottom: .5em;
		}

		.tabmenu {
			margin: auto;
			width: fit-content;
		}

		&.description {
			line-height: 1.3em;
		}

		&.params {
			display: flex;
			flex-direction: column;
			gap: .5em;
		}

		.icon {
			width: 1em;
			height: 1em;
			object-fit: fill;
			margin-right: 0.5em;
			vertical-align: top;
		}

		.details {
			display: block;
			font-size: .9em;
			opacity: .9;
			line-height: 1.2em;
		}

		.queue {
			display: flex;
			flex-grow: 1;
			align-items: center;
			width: 100%;
			.info {
				flex-grow: 1;
				cursor: pointer;
			}
			.selector {
				flex-basis: 300px;
			}
		}

		&.conditions {
			border: 2px solid var(--color-primary);
			margin-bottom: -1em;
		}
	}
}
</style>