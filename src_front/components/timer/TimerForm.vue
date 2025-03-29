<template>
	<div class="timerform sidePanel">
		<div class="head">
			<ClearButton @click="close()" />
			<h1><Icon name="timer" class="icon" />{{ $t("timers.panel.title") }}</h1>
			<div class="description">{{ $t("timers.panel.description") }}</div>
		</div>

		<div class="content">
			<ParamsTimer panelContext />
		</div>
	</div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import ParamsTimer from '../params/contents/ParamsTimer.vue';

@Component({
	components:{
		ClearButton,
		ParamsTimer,
	},
	emits:["close"]
})
class TimerForm extends AbstractSidePanel {


	public async mounted():Promise<void> {
		super.open();
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
