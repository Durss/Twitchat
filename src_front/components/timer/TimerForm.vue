<template>
	<div class="timerform">
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title" v-t="'timer.title'"></span>
				<Button :aria-label="$t('stream.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="close" bounce/>
			</div>
			
			<div class="content">
				<div class="tabs">
					<Button :title="$t('timer.timerBt')" bounce :selected="mode=='timer'" @click="mode='timer'" :icon="$image('icons/timer.svg')" />
					<Button :title="$t('timer.countdownBt')" bounce :selected="mode=='countdown'" @click="mode='countdown'" :icon="$image('icons/countdown.svg')" />
				</div>

				<form @submit.prevent="createTimer()" class="form" v-if="mode=='timer'">
					<i18n-t scope="global" class="info" tag="div" keypath="timer.timer_head">
						<template #CMD><mark>/timerStop</mark></template>
					</i18n-t>
					<img class="row demo" src="@/assets/img/param_examples/stop_timer.gif">
					<div class="row">
						<Button type="submit" 
						:aria-label="$t('raffle.chat.startBt_aria')"
						:title="$t('global.start')"
						:icon="$image('icons/ticket.svg')" />
					</div>
				</form>

				<form @submit.prevent="createCountdown()" class="form" v-if="mode=='countdown'">
					<i18n-t scope="global" class="info" tag="div" keypath="timer.timer_head">
						<template #CMD><mark>/countdownStop</mark></template>
					</i18n-t>
					<img class="row demo" src="@/assets/img/param_examples/stop_countdown.gif">
					<div class="row">
						<ParamItem class="item" :paramData="param_duration" :autofocus="true" />
					</div>
					<div class="row">
						<Button type="submit" 
						:aria-label="$t('raffle.chat.startBt_aria')"
						:title="$t('global.start')"
						:icon="$image('icons/ticket.svg')" />
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem
	}
})
export default class TimerForm extends Vue {

	public mode:"timer"|"countdown" = "timer";
	
	public param_duration:TwitchatDataTypes.ParameterData	= {label:"", value:60, type:"text"};

	public async mounted():Promise<void> {
		this.param_duration.label = this.$t("timer.duration_param");
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public createTimer():void {
		this.$store("timer").timerStart();
	}

	public createCountdown():void {
		let duration = this.param_duration.value as number;
		this.$store("timer").countdownStart(duration * 1000);
	}
}
</script>

<style scoped lang="less">
.timerform{
	.modal();
	
	.holder > .content > .form {
		display: flex;
		flex-direction: column;
		gap: .5em;
		&>.row {
			display: flex;
			flex-direction: column;
			background-color: fade(@mainColor_normal_extralight, 30%);
			padding: .5em;
			border-radius: .5em;
			:deep(input) {
				flex-basis: 100px;
			}
			
			&.demo {
				width:auto;
				align-self: center;
				justify-self: center;
			}
		}
		mark {
			font-weight: bold;
			padding: .25em .5em;
			border-radius: .5em;
			font-size: .8em;
			background: fade(@mainColor_normal, 15%);
		}
	}

}
</style>