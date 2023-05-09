<template>
	<div class="triggeractionlist">
		<div class="card-item primary description">
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
			
			<div class="queue">
				<div class="info" v-tooltip="$t('triggers.trigger_queue_info')">
					<Icon name="list" class="icon" />
					<span>{{ $t("triggers.trigger_queue") }}</span>
				</div>
				<ParamItem noBackground class="selector" :paramData="param_queue" v-model="triggerData.queue" />
			</div>
		</div>

		<div class="card-item conditions">
			<TriggerConditionList :triggerData="triggerData" />
		</div>

		<div class="list">
			<button class="addBt" @click="addActionAt(0)">
				<img src="@/assets/icons/add.svg">
			</button>

			<draggable 
			v-model="triggerData.actions" 
			group="actions" 
			item-key="id"
			ghost-class="ghost"
			direction="vertical"
			handle=".action>.header>.actionList>.orderBt"
			:animation="250"
			:dragoverBubble="true">
				<template #item="{element, index}">
					<div class="listItem">
						<div class="dash"></div>
						<TriggerActionEntry
							class="action"
							:action="element"
							:index="index"
							:totalItems="triggerData.actions.length"
							:obsSources="obsSources"
							:obsInputs="obsInputs"
							:rewards="rewards"
							:triggerData="triggerData"
							@delete="deleteAction(index)"
							@duplicate="duplicateAction(element, index)"
						/>
						<div class="dash"></div>
						<button class="addBt" @click="addActionAt(index+1)">
							<img src="@/assets/icons/add.svg">
						</button>
					</div>
				</template>
			</draggable>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { TriggerTypesDefinitionList, TriggerTypes, type TriggerActionEmptyData, type TriggerActionTypes, type TriggerData, type TriggerTypeDefinition, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { OBSInputItem, OBSSourceItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import ParamItem from '../../ParamItem.vue';
import TriggerActionChatCommandParams from './TriggerActionChatCommandParams.vue';
import TriggerActionEntry from './TriggerActionEntry.vue';
import TriggerActionScheduleParams from './TriggerActionScheduleParams.vue';
import TriggerActionSlashCommandParams from './TriggerActionSlashCommandParams.vue';
import TriggerConditionList from './TriggerConditionList.vue';
import TriggerActionCommandArgumentParams from './TriggerActionCommandArgumentParams.vue';

@Component({
	components:{
		Button,
		draggable,
		ParamItem,
		TriggerActionEntry,
		TriggerConditionList,
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
	
	public param_name:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"date", placeholder:"...", labelKey:"triggers.trigger_name" };
	public param_queue:TwitchatDataTypes.ParameterData<string[]> = {value:[], type:"editablelist", max:1, placeholderKey:"triggers.trigger_queue_input_placeholder"}

	/**
	 * Get a trigger's description
	 */
	public get triggerDescriptionLabel():string|undefined {
		const item = TriggerTypesDefinitionList().find(v => v.value == this.triggerData.type) as TriggerTypeDefinition|null;
		return item?.descriptionKey;
	}

	public get isChatCmd():boolean { return this.triggerData.type === TriggerTypes.CHAT_COMMAND; }
	public get isSchedule():boolean { return this.triggerData.type === TriggerTypes.SCHEDULE; }
	public get isSlashCommand():boolean { return this.triggerData.type === TriggerTypes.SLASH_COMMAND; }
	public get isAnyChatMessageCommand():boolean { return this.triggerData.type === TriggerTypes.ANY_MESSAGE; }

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

			case TriggerTypes.COUNTER_ADD:
			case TriggerTypes.COUNTER_DEL:
			case TriggerTypes.COUNTER_LOOPED:
			case TriggerTypes.COUNTER_MAXED:
			case TriggerTypes.COUNTER_MINED:
				return this.$store("counters").counterList.find(v=>v.id == this.triggerData.counterId)?.name ?? "COUNTER NOT FOUND";
		}
		return "...";
	}

	public beforeMount():void {
		this.param_queue.options = this.$store("triggers").queues;
		if(this.triggerData.actions.length === 0) {
			this.addActionAt(this.triggerData.actions.length-1);
		}
	}

	/**
	 * Called when deleting an action item
	 */
	public deleteAction(index:number):void {
		this.$confirm(this.$t("triggers.delete_action_confirm")).then(async ()=> {
			// if(this.actionList.length == 1) this.canSave = false;
			this.triggerData.actions.splice(index, 1);
			// await this.$nextTick();
			// this.canSave = true;
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
	 * Adds an action at the specified index
	 * @param index 
	 */
	public addActionAt(index:number):void {
		const action:TriggerActionEmptyData = {
			delay:0,
			id:Utils.getUUID(),
			type:null,
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
		.listItem {
			.dash {
				width: 2px;
				background-color: var(--color-primary);
				height: 5px;
				margin: auto;
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
			img {
				padding: .25em;
				height: 100%;
				width: 100%;
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
		}
	}

	&>.params, &>.conditions, &>.description {
		box-shadow: 0px 1px 1px rgba(0,0,0,0.25);

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
			opacity: .8;
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
	}
}
</style>