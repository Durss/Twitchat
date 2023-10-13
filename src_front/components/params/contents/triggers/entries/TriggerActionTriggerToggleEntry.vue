<template>
	<div class="triggeractiontriggertoggleentry triggerActionForm">
		
		<div class="card-item field col" v-if="!action.triggerId">
			<div class="item title" v-if="rewards.length > 0 && !action.triggerId">{{$t('triggers.actions.triggerToggle.select')}}</div>
	
			<SimpleTriggerList class="list" @select="onSelectTrigger" />
		</div>

		<template v-else>
			<ParamItem :paramData="param_action" v-model="action.action" />

			<div class="card-item field">
				<img src="@/assets/icons/broadcast.svg" class="icon">
				<div class="item title">{{$t('triggers.actions.trigger.selected')}}</div>
				<SimpleTriggerList :filteredItemId="action.triggerId" @click="action.triggerId = ''" />
				<button class="openTriggerBt" @click="openTrigger()"><Icon name="newTab" /></button>
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
import SimpleTriggerList from '../SimpleTriggerList.vue';

@Component({
	components:{
		ParamItem,
		TriggerList,
		SimpleTriggerList,
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

	public openTrigger():void {
		const trigger = this.$store("triggers").triggerList.find(v=>v.id == this.action.triggerId);
		if(trigger) this.$store("triggers").openTriggerEdition(trigger)
	}
}
</script>

<style scoped lang="less">
.triggeractiontriggertoggleentry{
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
		
		.list {
			flex-grow: 1;
			max-height: 300px;
			overflow-y: auto;
		}

		.openTriggerBt{
			height: 1em;
			transition: transform .2s;
			&:hover {
				transform: scale(1.2);
			}
		}
	}
}
</style>