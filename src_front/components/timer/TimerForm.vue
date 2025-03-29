<template>
	<div class="timerform sidePanel">
		<div class="head">
			<ClearButton @click="close()" />
			<h1><Icon name="timer" class="icon" />{{ $t("timer.title") }}</h1>
			<div class="description">{{ $t("timer.description") }}</div>
		</div>
		
		<div class="content">
			<TabMenu v-model="mode"
			:values="['timer', 'countdown']"
			:icons="['timer', 'countdown']"
			:labels="[$t('timer.timerBt'), $t('timer.countdownBt')]" />

			<form @submit.prevent="createTimer()" class="form" v-if="mode=='timer'">
				<i18n-t scope="global" class="info" tag="div" keypath="timer.timer_head">
					<template #CMD><mark>/timerStop</mark></template>
				</i18n-t>
				<img class="demo" src="@/assets/img/param_examples/stop_timer.gif">
				
				<TTButton type="submit" 
				:aria-label="$t('raffle.chat.startBt_aria')"
				icon="ticket">{{ $t('global.start') }}</TTButton>
			</form>

			<form @submit.prevent="createCountdown()" class="form" v-if="mode=='countdown'">
				<i18n-t scope="global" class="info" tag="div" keypath="timer.countdown_head">
					<template #CMD><mark>/countdownStop</mark></template>
				</i18n-t>
				
				<img class="demo" src="@/assets/img/param_examples/stop_countdown.gif">
				
				<ParamItem class="item" :paramData="param_duration" :autofocus="true" />

				<TTButton type="submit" 
				:aria-label="$t('raffle.chat.startBt_aria')"
				icon="ticket">{{ $t('global.start') }}</TTButton>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import TabMenu from '../TabMenu.vue';
import ParamItem from '../params/ParamItem.vue';

@Component({
	components:{
		TTButton,
		TabMenu,
		ParamItem,
		ClearButton,
	},
	emits:["close"]
})
class TimerForm extends AbstractSidePanel {

	public mode:"timer"|"countdown" = "timer";
	
	public param_duration:TwitchatDataTypes.ParameterData<number>	= {value:60, type:"number"};

	public async mounted():Promise<void> {
		this.param_duration.labelKey = "timer.duration_param";
		super.open();
	}

	public createTimer():void {
		this.$store.timer.timerStart();
	}

	public createCountdown():void {
		let duration = this.param_duration.value;
		this.$store.timer.countdownStart(duration * 1000);
	}
}
export default toNative(TimerForm);
</script>

<style scoped lang="less">
.timerform{
	.demo {
		width:auto;
		align-self: center;
		justify-self: center;
	}
}
</style>