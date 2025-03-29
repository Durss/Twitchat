<template>
	<div :class="classes" v-if="showTimer">
		<Icon name="ad" />
		
		<div class="timer" ref="label" v-tooltip="isAdRunning? $t('global.tooltips.commercial') : $t('global.tooltips.commercial_soon')">{{timeLeftFormated}}s</div>
		
		<Button v-if="!isAdRunning && snoozeLeft > 0 && !error"
		light primary small
		icon="timeout"
		ref="snoozeBt"
		class="snoozeBt"
		@click.capture="snooze()"
		v-tooltip="$t('global.tooltips.commercial_snooze')"
		:loading="snoozing">Snooze {{ snoozeLeft }}/{{ snoozeMax }}</Button>

		<div v-if="error" class="card-item alert error" @click="error = false" aria-label="click to close">ERROR :(</div>
	</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import { gsap } from 'gsap/gsap-core';

@Component({
	components:{
		Icon,
		Button: TTButton,
	}
})
class CommercialTimer extends Vue {

	public showTimer:boolean = false;
	public error:boolean = false;
	public canSnooze:boolean = false;
	public snoozing:boolean = false;
	public isAdComing:boolean = true;
	public isAdRunning:boolean = true;
	public timeLeft:number = 0;
	public timeLeftFormated:string = "";
	public snoozeLeft:number = 3;
	public snoozeMax:number = 3;
	
	private interval:number = -1;

	public get classes():string[] {
		const res = ["commercialtimer"];
		if(this.isAdRunning) res.push("secondary");
		return res;
	}

	public mounted():void {
		this.refreshTimer();
		this.interval = window.setInterval(()=> this.refreshTimer(), 1000);
		this.canSnooze = TwitchUtils.hasScopes([TwitchScopes.ADS_SNOOZE]);
	}

	public beforeUnmount():void {
		clearInterval(this.interval);
	}

	public refreshTimer():void {
		const maxSchedule		= 10 * 60000;
		const channelId			= this.$store.auth.twitch.user.id;
		const infos				= this.$store.stream.getCommercialInfo(channelId);
		this.snoozeLeft			= infos.remainingSnooze;
		this.snoozeMax			= Math.max(3, infos.remainingSnooze);//Not 100% sure we get 3 snooze max so we get the max of both values
		//Check if an ad is rolling
		this.isAdComing			= false;
		this.isAdRunning		= false;
		let startDate:number	= 0;
		if(infos.prevAdStart_at + infos.currentAdDuration_ms >= Date.now()){
			this.isAdRunning	= true;
			startDate			= infos.prevAdStart_at + infos.currentAdDuration_ms;
		}else
		if(Date.now() > infos.nextAdStart_at && Date.now() < infos.nextAdStart_at + infos.currentAdDuration_ms) {
			this.isAdRunning	= true;
			startDate			= infos.nextAdStart_at + infos.currentAdDuration_ms;
		}else
		//Check if an ad is coming in less than "maxSchedule"" minutes
		if(infos.nextAdStart_at > 0 && infos.nextAdStart_at - Date.now() < maxSchedule) {
			this.isAdComing		= true;
			startDate			= infos.nextAdStart_at;
		}
		this.timeLeft			= Math.max(0, Math.round((startDate - Date.now())/1000));
		this.timeLeftFormated	= Utils.formatDuration(this.timeLeft * 1000);

		const prevShow = this.showTimer;
		this.showTimer = (this.isAdRunning || this.isAdComing) && this.timeLeft > 0;
		if(!prevShow && this.showTimer) {
			this.$nextTick().then(()=> {
				this.openAnimation();
			})
		}
	}

	public openAnimation():void {
		// const snooze = (this.$refs.snoozeBt as Vue).$el as HTMLDivElement | undefined;
		// if(snooze) {
		// 	gsap.from(snooze, {duration:.25, width:0, padding:0, clearProps:"all", delay: 1.5, ease:"sine.inOut"});
		// }
		const label = this.$refs.label as HTMLDivElement;
		gsap.from(label, {duration:.5, width:0, padding:0, clearProps:"all", delay: .5, ease:"sine.inOut"});
		gsap.from(this.$el, {duration:.5, width:0, height:0, padding:0, ease:"sine.inOut"});
		gsap.from(this.$el, {duration:.5, gap:0, clearProps:"all", ease:"sine.inOut"});
	}

	public async snooze():Promise<void> {
		if(!this.canSnooze) {
			TwitchUtils.requestScopes([TwitchScopes.ADS_SNOOZE]);
		}else{
			this.snoozing = true;
			const res = await TwitchUtils.snoozeNextAd();
			this.error = res == null;
			this.snoozing = false;
		}
	}

}
export default toNative(CommercialTimer);
</script>

<style scoped lang="less">
.commercialtimer{
	gap: .5em;
	display: flex;
	flex-direction: row;
	align-items: center;
	font-size: .8em;
	height: 2em;
	color: var(--color-light);
	background-color: var(--color-primary);
	// padding: .25em .5em;
	padding: 0 .5em;
	border-radius: var(--border-radius);
	overflow: hidden;
	
	&.secondary {
		background-color: var(--color-secondary);
		text-shadow: 1px 1px 0 rgba(0, 0, 0, .5);
	}

	&:has(.button, .error) {
		padding-right: 0;
	}

	.icon {
		height: 1em;
	}
	.timer {
		font-family: Azeret;
		overflow: hidden;
		cursor: default;
	}
	.snoozeBt {
		max-width:0;
		padding: 0;
		height: 100%;
		flex-wrap: nowrap;
		transition: all .25s;
		:deep(.label) {
			white-space: nowrap;
			text-overflow: clip;
		}
	}

	&:hover {
		.snoozeBt {
			max-width: 300px;
			padding: .3em 1em;
		}
	}

	.error {
		font-weight: bold;
		cursor: pointer;
	}
}
</style>