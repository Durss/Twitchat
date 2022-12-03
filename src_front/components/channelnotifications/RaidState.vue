<template>
	<div class="raidstate">
		<img v-if="user && user.avatarPath" :src="user.avatarPath" alt="avatar" class="avatar">
		<div>
			<img src="@/assets/icons/raid.svg" alt="raid" class="icon">Raiding <strong>{{raidInfo.user.displayName}}</strong> with <strong>{{raidInfo.viewerCount}}</strong> viewers<span class="timer">({{timeLeft}}s)</span>
		</div>

		<!-- <Button class="startBt" type="button" :icon="$image('icons/cross_white.svg')" bounce title="Start now" data-tooltip="not possible" /> -->
		<div class="alert">Twitch provides no API to start the raid before the timer ends sorry you'll have to wait {{timeLeft}}s :(</div>
		<Button class="cancelBt" type="button" :icon="$image('icons/cross_white.svg')" bounce highlight title="Cancel" @click="cancelRaid()" />

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
		margin-left: 10px;
		font-style: italic;
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