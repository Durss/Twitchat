<template>
	<div class="raidstate">
		<img v-if="user && user.avatarPath" :src="user.avatarPath" alt="avatar" class="avatar">
		<div>
			<i18n-t scope="global" tag="span" keypath="raid.raiding">
				<template #USER><strong>{{raidInfo.user.displayName}}</strong></template>
				<template #VIEWERS><strong>{{raidInfo.viewerCount}}</strong></template>
				<template #TIMER><span class="timer">{{timeLeft}}s</span></template>
			</i18n-t>
		</div>

		<div class="alert" v-t="{path:'raid.cant_force', args:{TIMER:timeLeft}}"></div>
		<Button class="cancelBt" type="button"
			:icon="$image('icons/cross_white.svg')"
			bounce highlight
			:title="$t('global.cancel')"
			@click="cancelRaid()" />

	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class RaidState extends Vue {

	public timeLeft = "";
	public user:TwitchatDataTypes.TwitchatUser|null = null;

	private timerDuration = 90000;
	private timerStart = 0;
	private timerInterval!:number;

	public get raidInfo() { return this.$store("stream").currentRaid!; }

	public async mounted():Promise<void> {
		this.timerStart = Date.now();
		this.timerInterval = window.setInterval(()=> {
			this.updateTimer();
		}, 250);
		
		const raid = this.$store("stream").currentRaid;
		if(raid) {
			this.user = raid.user;
		}
	}

	public beforeUnmount():void {
		clearInterval(this.timerInterval);
	}

	public updateTimer():void {
		const seconds = this.timerDuration - (Date.now() - this.timerStart);
		if(seconds <= 0) {
			this.$store("stream").setRaiding(undefined);
			return;
		}
		this.timeLeft = Utils.formatDuration(seconds);
	}

	public cancelRaid():void {
		TwitchUtils.raidCancel();
	}

}
</script>

<style scoped lang="less">
.raidstate{
	color: @mainColor_light;
	text-align: center;

	.avatar {
		width: 3em;
		border-radius: 50%;
		margin: auto;
		margin-bottom: .25em;
		border: 2px solid @mainColor_light;
	}
	
	.icon {
		height: 25px;
		vertical-align: middle;
		margin-right: .5em;
	}

	.timer {
		font-size: .8em;
		font-family: var(--font-azeret);
	}

	.cancelBt {
		margin-top: 10px;
	}

	.startBt {
		margin-top: 10px;
		pointer-events: none;
	}

	.alert {
		margin-top: 10px;
		font-size: .7em;
		padding: .55em;
		background-color: fade(@mainColor_alert, 50%);
		border-radius: .5em;
	}
}
</style>