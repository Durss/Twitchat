<template>
	<div class="triggeractiontriggertoggleentry triggerActionForm">
		
		<div class="card-item field col" v-if="!action.triggerId">
			<div class="item title" v-if="rewards.length > 0 && !action.triggerId">{{$t('triggers.actions.triggerToggle.select')}}</div>
	
			<SimpleTriggerList class="list" @select="onSelectTrigger" />
		</div>

		<template v-else>
			<div class="card-item field">
				<Icon name="broadcast"/>
				<div class="item title">{{$t('triggers.actions.triggerToggle.selected')}}</div>
				<SimpleTriggerList :filteredItemId="action.triggerId" @click="action.triggerId = ''" primary />
				<button class="openTriggerBt" @click="openTrigger()"><Icon name="newtab" /></button>
			</div>
			
			<ParamItem :paramData="param_action" v-model="action.action" />
		</template>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionTriggerToggleData, TriggerActionTriggerToggleDataAction, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
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
class TriggerActionTriggerToggleEntry extends Vue {
	
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

	public onSelectTrigger(triggerID:string):void {
		this.action.triggerId = triggerID;
	}

	public openTrigger():void {
		const trigger = this.$store.triggers.triggerList.find(v=>v.id == this.action.triggerId);
		if(trigger) this.$store.triggers.openTriggerEdition(trigger)
	}
}
export default toNative(TriggerActionTriggerToggleEntry);
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
			color: var(--color-text);
			&:hover {
				transform: scale(1.2);
			}
		}
	}
}
</style>