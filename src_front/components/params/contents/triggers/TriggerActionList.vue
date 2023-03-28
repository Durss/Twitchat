<template>
	<div class="triggeractionlist">
		<div class="description">
			<img src="@/assets/icons/info_purple.svg" class="icon">
			<i18n-t scope="global" tag="span" v-if="triggerDescriptionLabel" :keypath="triggerDescriptionLabel">
				<template #SUB_ITEM_NAME>
					<mark>{{ subTypeLabel }}</mark>
				</template>
				<template #INFO v-if="$te(triggerDescriptionLabel+'_info')">
					<br>
					<i18n-t tag="i" scope="global"
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

		<div class="params">
			<ParamItem :paramData="param_name" v-model="triggerData.name" />
			
			<div class="queue">
				<div class="info" :data-tooltip="$t('triggers.trigger_queue_info')">
					<img src="@/assets/icons/list_purple.svg" class="icon">
					<span>{{ $t("triggers.trigger_queue") }}</span>
				</div>
				<ParamItem class="selector" :paramData="param_queue" v-model="triggerData.queue" />
			</div>

			<TriggerActionChatCommandParams
				v-if="isChatCmd"
				:triggerData="triggerData"
			/>

			<TriggerActionScheduleParams
				v-if="isSchedule"
				:triggerData="triggerData"
			/>
		</div>

		<div class="list">
			<draggable 
			v-model="triggerData.actions" 
			group="actions" 
			item-key="id"
			ghost-class="ghost"
			direction="vertical"
			handle=".action>.header>.orderBt"
			:animation="250"
			:dragoverBubble="true">
				<template #item="{element, index}">
					<TriggerActionEntry class="action"
						:action="element"
						:index="index"
						:totalItems="triggerData.actions.length"
						:obsSources="obsSources"
						:triggerData="triggerData"
						@delete="deleteAction(index)"
						@duplicate="duplicateAction(element, index)"
					/>
				</template>
			</draggable>
	
			<div class="bottomCTAS">
				<Button class="addBt"
					:icon="$image('icons/add.svg')"
					:title="$t('triggers.add_actionBt')"
					@click="addAction()"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { TriggerEvents, TriggerTypes, type TriggerActionEmptyData, type TriggerActionTypes, type TriggerData, type TriggerEventTypes, type TriggerTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { OBSSourceItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import ParamItem from '../../ParamItem.vue';
import TriggerActionChatCommandParams from './TriggerActionChatCommandParams.vue';
import TriggerActionEntry from './TriggerActionEntry.vue';
import TriggerActionScheduleParams from './TriggerActionScheduleParams.vue';

@Component({
	components:{
		Button,
		draggable,
		ParamItem,
		TriggerActionEntry,
		TriggerActionScheduleParams,
		TriggerActionChatCommandParams,
	},
	emits:[],
})
export default class TriggerActionList extends Vue {

	@Prop
	public triggerData!:TriggerData;
	@Prop
	public obsSources!:OBSSourceItem[];
	@Prop
	public rewards!:TwitchDataTypes.Reward[];
	
	public param_name:TwitchatDataTypes.ParameterData = { type:"string", value:"", icon:"date_purple.svg", placeholder:"...", labelKey:"triggers.trigger_name" };
	public param_queue:TwitchatDataTypes.ParameterData = {value:[], type:"editablelist", max:1, placeholderKey:"triggers.trigger_queue_input_placeholder"}

	/**
	 * Get a trigger's description
	 */
	public get triggerDescriptionLabel():string|undefined {
		const item = TriggerEvents().find(v => v.value == this.triggerData.type) as TriggerEventTypes|null;
		return item?.descriptionKey;
	}

	public get isChatCmd():boolean { return this.triggerData.type === TriggerTypes.CHAT_COMMAND; }
	public get isSchedule():boolean { return this.triggerData.type === TriggerTypes.SCHEDULE; }

	/**
	 * Get a trigger's sub type's label (reward name, counter name, ...)
	 */
	public get subTypeLabel():string|undefined {
		switch(this.triggerData.type) {
			case TriggerTypes.CHAT_COMMAND:
				return this.triggerData.chatCommand || "...";

			case TriggerTypes.REWARD_REDEEM:
				return this.rewards.find(v=>v.id == this.triggerData.rewardId)?.title ?? "REWARD NOT FOUND";

			case TriggerTypes.OBS_SCENE:
				return this.triggerData.obsScene || "...";

			case TriggerTypes.OBS_SOURCE_ON:
			case TriggerTypes.OBS_SOURCE_OFF:
				return this.triggerData.obsSource || "...";

			case TriggerTypes.COUNTER_ADD:
			case TriggerTypes.COUNTER_DEL:
			case TriggerTypes.COUNTER_LOOPED:
			case TriggerTypes.COUNTER_MAXED:
			case TriggerTypes.COUNTER_MINED:
				return this.$store("counters").data.find(v=>v.id == this.triggerData.counterID)?.name ?? "COUNTER NOT FOUND";
		}
		return "...";
	}

	public beforeMount():void {
		this.param_queue.options = this.$store("triggers").queues;
		if(this.triggerData.actions.length === 0) {
			this.addAction();
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

	public addAction():void {
		const action:TriggerActionEmptyData = {
			delay:0,
			id:Utils.getUUID(),
			type:null,
		}
		this.triggerData.actions.push(action)
	}

}
</script>

<style scoped lang="less">
.triggeractionlist{
	display: flex;
	flex-direction: column;
	gap: 1em;

	.list {
		.action ~ .action {
			padding-top: .5em;
			margin-top: 0;
			&::before{
				content: "";
				display: block;
				width: .5em;
				height: .25em;
				background-color: @mainColor_normal;
				border-top-left-radius: 100% 200%;
				border-top-right-radius: 100% 200%;
				margin: auto;
			}
		}
		.action {
			background: linear-gradient(90deg, @mainColor_normal 2px, transparent 1px);
			background-position: 100% 0;
			background-repeat: no-repeat;
			background-size: calc(50% + 1px) 1em;
			&:first-of-type {
				background: none;
			}
	
			&::after{
				content: "";
				display: block;
				width: .5em;
				height: .25em;
				background-color: @mainColor_normal;
				border-bottom-left-radius: 100% 200%;
				border-bottom-right-radius: 100% 200%;
				margin: auto;
			}
		}
	
		.bottomCTAS {
			// display: flex;
			// flex-direction: row;
			background: linear-gradient(90deg, @mainColor_normal 2px, transparent 1px);
			background-position: 100% 0;
			background-repeat: no-repeat;
			background-size: calc(50% + 1px) 1em;
			padding-top: .5em;
			.addBt {
				display: block;
				margin: auto;
			}
			&::before{
				content: "";
				display: block;
				width: .5em;
				height: .25em;
				background-color: @mainColor_normal;
				border-top-left-radius: 100% 200%;
				border-top-right-radius: 100% 200%;
				margin: auto;
			}
		}
	}

	.params, .description {
		background-color: @mainColor_light;
		padding: .5em;
		font-size: .9em;
		border-radius: .5em;
		box-shadow: 0px 1px 1px rgba(0,0,0,0.25);

		&.params {
			display: flex;
			flex-direction: column;
			gap: .5em;
		}

		.icon {
			width: 1em;
			height: 1em;
			object-fit: contain;
			margin-right: 0.5em;
			vertical-align: top;
		}

		.text {
			text-align: center;
			margin-bottom: 1em;
			:deep(mark) {
				line-height: 1.5em;
				border: 1px dashed @mainColor_normal;
				background-color: fade(@mainColor_normal, 15%);
				padding: .1em .5em;
				border-radius: .5em;
				span {
					//This is used to hide the channel point reward's costs
					display: none;
				}
			}
		}
		.queue {
			display: flex;
			flex-grow: 1;
			width: 100%;
			.info {
				flex-grow: 1;
				align-self: center;
			}
			.selector {
				flex-basis: 300px;
			}
		}
	}
}
</style>