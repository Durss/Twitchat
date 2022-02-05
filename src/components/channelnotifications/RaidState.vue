<template>
	<div class="raidstate">
		<div>
			<img src="@/assets/icons/raid.svg" alt="raid" class="icon">
			Raiding <strong>{{$store.state.raiding}}</strong>
			<span class="timer">({{timeLeft}}s)</span>
		</div>

		<Button @click="cancelRaid()" class="cancelBt" type="button" :icon="require('@/assets/icons/cross_white.svg')" bounce highlight title="Cancel" />

	</div>
</template>

<script lang="ts">
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
	private timerInterval:any;

	public mounted():void {
		this.timerStart = Date.now();
		this.timerInterval = setInterval(()=> {
			this.updateTimer();
		}, 250);
	}

	public updateTimer():void {
		const seconds = this.timerDuration - (Date.now() - this.timerStart);
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
	padding: 10px;
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;
	background-color: darken(@mainColor_normal, 20%);
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
}
</style>