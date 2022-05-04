<template>
	<div class="raidstate">
		<div>
			<img src="@/assets/icons/raid.svg" alt="raid" class="icon">
			Raiding <strong>{{$store.state.raiding.target_display_name}}</strong> with <strong>{{$store.state.raiding.viewer_count}}</strong> viewers
			<span class="timer">({{timeLeft}}s)</span>
		</div>

		<!-- <Button class="startBt" type="button" :icon="require('@/assets/icons/cross_white.svg')" bounce title="Start now" data-tooltip="not possible" /> -->
		<div class="alert">Twitch provides no API to start the raid before the timer ends sorry :(</div>
		<Button class="cancelBt" type="button" :icon="require('@/assets/icons/cross_white.svg')" bounce highlight title="Cancel" @click="cancelRaid()" />

	</div>
</template>

<script lang="ts">
import store from '@/store';
import IRCClient from '@/utils/IRCClient';
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

	public timeLeft:string = "";

	private timerDuration:number = 90000;
	private timerStart:number = 0;
	private timerInterval!:number;

	public mounted():void {
		this.timerStart = Date.now();
		this.timerInterval = setInterval(()=> {
			this.updateTimer();
		}, 250);
	}

	public unmounted():void {
		clearInterval(this.timerInterval);
	}

	public updateTimer():void {
		const seconds = this.timerDuration - (Date.now() - this.timerStart);
		if(seconds <= 0) {
			store.dispatch("setRaiding", "");
			return;
		}
		this.timeLeft = Utils.formatDuration(seconds);
	}

	public cancelRaid():void {
		IRCClient.instance.sendMessage("/unraid");
	}

}
</script>

<style scoped lang="less">
.raidstate{
	color: @mainColor_light;
	text-align: center;
	
	.icon {
		height: 25px;
		vertical-align: middle;
	}

	.timer {
		margin-left: 10px;
		font-style: italic;
		font-size: .8em;
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