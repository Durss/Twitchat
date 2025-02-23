<template>
	<div class="timerform sidePanel">
		<div class="head">
			<ClearButton @click="close()" />
			<h1><Icon name="timer" class="icon" />{{ $t("timers.default.title") }}</h1>
			<div class="description">{{ $t("timers.default.description") }}</div>
		</div>

		<div class="content">
			<TabMenu v-model="mode"
			:values="['timer', 'countdown']"
			:icons="['timer', 'countdown']"
			:labels="[$t('timers.default.timerBt'), $t('timers.default.countdownBt')]" />

			<form @submit.prevent="createTimer()" class="form" v-if="mode=='timer'">
				<i18n-t scope="global" class="info" tag="div" keypath="timers.default.timer_head">
					<template #CMD><mark>/timerStop</mark></template>
				</i18n-t>
				<img class="demo" src="@/assets/img/param_examples/stop_timer.gif">

				<TTButton type="submit"
				:aria-label="$t('raffle.chat.startBt_aria')"
				icon="ticket">{{ $t('global.start') }}</TTButton>
			</form>

			<form @submit.prevent="createCountdown()" class="form" v-if="mode=='countdown'">
				<i18n-t scope="global" class="info" tag="div" keypath="timers.default.countdown_head">
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

	public param_duration:TwitchatDataTypes.ParameterData<number>	= {value:60, type:"number", labelKey:"timers.default.duration_param"};

	public async mounted():Promise<void> {
		super.open();
	}

	public createTimer():void {
		const entry = this.$store.timers.timerList.find(t => t.type === "timer" && t.isDefault)!;
		this.$store.timers.timerStart(entry.id);
	}

	public createCountdown():void {
		const entry = this.$store.timers.timerList.find(t => t.type === "countdown" && t.isDefault)!;
		entry.duration_ms = this.param_duration.value * 1000;
		this.$store.timers.timerStart(entry.id);
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
