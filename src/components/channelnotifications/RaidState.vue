<template>
	<div class="raidstate">
		<img v-if="user" :src="user.profile_image_url" alt="avatar" class="avatar">
		<div>
			<img src="@/assets/icons/raid.svg" alt="raid" class="icon">Raiding <strong>{{$store.state.raiding.target_display_name}}</strong> with <strong>{{$store.state.raiding.viewer_count}}</strong> viewers<span class="timer">({{timeLeft}}s)</span>
		</div>

		<!-- <Button class="startBt" type="button" :icon="$image('icons/cross_white.svg')" bounce title="Start now" data-tooltip="not possible" /> -->
		<div class="alert">Twitch provides no API to start the raid before the timer ends sorry you'll have to wait {{timeLeft}}s :(</div>
		<Button class="cancelBt" type="button" :icon="$image('icons/cross_white.svg')" bounce highlight title="Cancel" @click="cancelRaid()" />

	</div>
</template>

<script lang="ts">
import IRCClient from '@/utils/IRCClient';
import TwitchUtils from '@/utils/TwitchUtils';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import { storeStream } from '@/store/stream/storeStream';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class RaidState extends Vue {

	public timeLeft = "";
	public user:TwitchDataTypes.UserInfo|null = null;

	private timerDuration = 90000;
	private timerStart = 0;
	private timerInterval!:number;
	private sStream = storeStream();

	public async mounted():Promise<void> {
		this.timerStart = Date.now();
		this.timerInterval = window.setInterval(()=> {
			this.updateTimer();
		}, 250);
		
		if(this.sStream.raiding?.target_login) {
			this.user = (await TwitchUtils.loadUserInfo(undefined, [this.sStream.raiding?.target_login as string]))[0];
		}
	}

	public beforeUnmount():void {
		clearInterval(this.timerInterval);
	}

	public updateTimer():void {
		const seconds = this.timerDuration - (Date.now() - this.timerStart);
		if(seconds <= 0) {
			this.sStream.setRaiding(undefined);
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
		font-family: "Azeret";
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