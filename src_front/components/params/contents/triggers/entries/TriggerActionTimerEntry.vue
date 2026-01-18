<template>
	<div class="triggeractiontimerentry triggerActionForm">
		<div v-if="timerList.length === 0">
			<p>{{ $t("triggers.actions.timer.no_timer") }}</p>
			<TTButton>{{ $t("triggers.actions.timer.createTimer_bt") }}</TTButton>
		</div>
		<template v-else>
			<ParamItem :paramData="param_timer" v-model="action.timerData.timerId" @change="updateActions" />
			<template v-if="timer">
				<ParamItem :paramData="param_action" v-model="action.timerData.action" v-if="action.timerData.timerId" />
				<ParamItem :paramData="param_duration" v-model="action.timerData.duration" v-if="showDurationField" />
			</template>
		</template>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import TTButton from '@/components/TTButton.vue';
import { TriggerActionTimerData_ACTION, type ITriggerPlaceholder, type TriggerActionTimerData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class TriggerActionTimerEntry extends AbstractTriggerActionEntry {

	@Prop()
	declare action:TriggerActionTimerData;

	@Prop()
	declare triggerData:TriggerData;

	public param_timer:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"start", labelKey:"triggers.actions.timer.param_timer" };
	public param_action:TwitchatDataTypes.ParameterData<typeof TriggerActionTimerData_ACTION[number]> = { type:"list", value:"start", labelKey:"triggers.actions.timer.param_action" };
	public param_duration:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", labelKey:"triggers.actions.timer.param_duration" };

	public timerList:TwitchatDataTypes.TimerData[] = [];

	public get timer(){
		return this.timerList.find(t=>t.id == this.action.timerData.timerId);
	}

	public get showDurationField():boolean {
		const allowed:typeof TriggerActionTimerData_ACTION[number][] = ["set", "add", "remove"]
		return allowed.includes(this.action.timerData.action);
	}

	public beforeMount():void {
		this.timerList = this.$store.timers.timerList.filter(t => !t.isDefault);
		if(!this.action.timerData){
			this.action.timerData = {
				action:"start",
				timerId:this.$store.timers.timerList[0]!.id,
			}
		}

		this.param_timer.listValues = this.timerList.map(t => {
			return {
				value:t.id,
				label:t.title,
			}
		});

		this.updateActions();
	}

	public updateActions():void {
		const timer = this.$store.timers.timerList.find(t=>t.id == this.action.timerData.timerId);
		if(!timer)return;
		this.param_timer.icon = timer.type == "timer" ? "timer" : "countdown";
		this.param_action.listValues = TriggerActionTimerData_ACTION.filter(a=>{
			if(timer.type == "timer" && a === "set") return false;
			return true;
		}).map(a => {
			return {
				value:a,
				label:this.$t(`triggers.actions.timer.param_action_${a}`),
			}
		})
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<string>[]):void {
		this.param_duration.placeholderList = list.filter(p=>p.numberParsable);
	}

}
export default toNative(TriggerActionTimerEntry);
</script>

<style scoped lang="less">
.triggeractiontimerentry{

}
</style>
