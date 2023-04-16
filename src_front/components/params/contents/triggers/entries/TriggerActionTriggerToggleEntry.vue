<template>
	<div class="triggeractiontriggertoggleentry">
		
		<div class="row item field col" v-if="!action.triggerId">
			<div class="item title" v-if="rewards.length > 0 && !action.triggerId">{{$t('triggers.actions.triggerToggle.select')}}</div>
	
			<TriggerList class="list"
			noEdit
			:rewards="rewards"
			@select="onSelectTrigger($event)" />
		</div>

		<template v-else>
			<div class="row item">
				<ParamItem class="item" :paramData="param_action" v-model="action.action" />
			</div>

			<div class="row item field">
				<img src="@/assets/icons/broadcast_purple.svg" class="icon">
				<div class="item title">{{$t('triggers.actions.trigger.selected')}}</div>
				<TriggerList
					noEdit
					:triggerId="action.triggerId"
					:rewards="rewards"
					@select="action.triggerId = ''" />
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionTriggerToggleData, TriggerActionTriggerToggleDataAction, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerList from '../TriggerList.vue';

@Component({
	components:{
		ParamItem,
		TriggerList,
	},
	emits:[],
})
export default class TriggerActionTriggerToggleEntry extends Vue {
	
	@Prop
	public action!:TriggerActionTriggerToggleData;
	@Prop
	public triggerData!:TriggerData;
	@Prop
	public rewards!:TwitchDataTypes.Reward[];

	public param_action:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", labelKey:"triggers.actions.triggerToggle.action" };

	public beforeMount():void {
		const values:TwitchatDataTypes.ParameterDataListValue<TriggerActionTriggerToggleDataAction>[] = [];
		values.push({value:"enable", labelKey:"triggers.actions.triggerToggle.action_enable"});
		values.push({value:"disable", labelKey:"triggers.actions.triggerToggle.action_disable"});
		values.push({value:"toggle", labelKey:"triggers.actions.triggerToggle.action_toggle"});
		this.param_action.listValues = values;
	}

	public onSelectTrigger(trigger:TriggerData):void {
		this.action.triggerId = trigger.id;
	}
}
</script>

<style scoped lang="less">
.triggeractiontriggertoggleentry{
	.triggerActionForm();

	.field {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: .5em;
		&.col {
			flex-direction: column;
		}

		.icon {
			height: 1em;
			margin-top: -5px;
		}

		.title {
			min-width: 150px;
		}
		
		.list {
			flex-grow: 1;
			max-height: 300px;
			overflow-y: auto;
			border: 1px solid var(--mainColor_normal);
			border-radius: .5em;
			background-color: var(--mainColor_normal_extralight);
			padding: .5em;
		}
	}
}
</style>