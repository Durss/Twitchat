<template>
	<div class="chattipandtrickad">
		<div v-if="tipIndex===0" class="entry">
			<img src="@/assets/icons/obs_purple.svg" alt="elgato" class="icon">
			<h1 class="row">Create your own sub alerts</h1>
			<div class="row">With <strong>Twitchat</strong> you can create your own sub/follow/reward/poll/... alerts by controling your OBS sources and filters.</div>
			<div class="row">Add texts, images, videos, sounds, ... on your OBS scene and let Twitchat control them when a specific event happens. Text sources can be updated by Twitchat with dynamic values like the subscriber's name.</div>
			<Button title="Try it now" @click.stop="openParam('triggers')" />
		</div>
		
		<div v-if="tipIndex===1" class="entry">
			<img src="@/assets/icons/elgato_purple.svg" alt="elgato" class="icon">
			<h1 class="row">Stream Deck™ plugin</h1>
			<div class="row"><strong>Twitchat</strong> can be controlled from your Stream Deck™.</div>
			<div class="row">You can pause the chat, scroll it, mark message as read, open poll/prediction/bingo/raffle state and much more with the push of a button.</div>
			<Button title="Try it now" @click.stop="openParam('streamdeck')" />
		</div>
		
		<div v-if="tipIndex===2" class="entry">
			<img src="@/assets/icons/raid_purple.svg" alt="raid" class="icon">
			<h1 class="row">Stop your stream on raid</h1>
			<div class="row"><strong>Twitchat</strong> can automatically stop your OBS stream after you raided someone.</div>
			<Button title="Try it now" @click.stop="openParamItem('features.stopStreamOnRaid')" />
		</div>
		
		<div v-if="tipIndex===3" class="entry">
			<img src="@/assets/icons/bingo_purple.svg" alt="bingo" class="icon">
			<h1 class="row">Create a bingo</h1>
			<div class="row">You can create a bingo in which your viewers will have to be the first to guess a number or a global emote.</div>
			<Button title="Try it now" @click.stop="openModal('bingo')" />
		</div>
		
		<div v-if="tipIndex===4" class="entry">
			<img src="@/assets/icons/ticket_purple.svg" alt="raffle" class="icon">
			<h1 class="row">Create a raffle</h1>
			<div class="row">You can create a raffle in which your viewers can enter by sending a command on chat.</div>
			<div class="row">You can then randomly pick one of them.</div>
			<div class="row">There's also an option to randomly pick one of your current subscribers/subgifters.</div>
			<Button title="Try it now" @click.stop="openModal('raffle')" />
		</div>
		
		<div v-if="tipIndex===5" class="entry">
			<img src="@/assets/icons/obs_purple.svg" alt="obs" class="icon">
			<h1 class="row">Control OBS from chat</h1>
			<div class="row"><strong>Twitchat</strong> can change your current scene and mute/unmute your microphone from a chat command.</div>
			<div class="row">If you forget to switch scene or unmute yourself, a mod can be there and do it for you as a backup.</div>
			<Button title="Try it now" @click.stop="openParam('obs')" />
		</div>
		
		<div v-if="tipIndex===6" class="entry">
			<img src="@/assets/icons/api_purple.svg" alt="api" class="icon">
			<h1 class="row">Twitchat API</h1>
			<div class="row">Did you know Twitchat exposes an API?</div>
			<div class="row">If you're a developer, you can control and get events from Twitchat.</div>
			<Button :icon="$image('icons/github_white.svg')"
				title="Read documentation"
				href="https://github.com/Durss/Twitchat/blob/main/PUBLIC_API.md"
				target="_blank"
				type="link"
			/>
		</div>
		
		<div v-if="tipIndex===7" class="entry">
			<img src="@/assets/icons/music_purple.svg" alt="music" class="icon">
			<h1 class="row">Control music</h1>
			<div class="row"><strong>Twitchat</strong> provides a <strong>Spotify</strong> and <strong>Deezer</strong> integrations.</div>
			<div class="row">This allows you to display the track currently playing on your stream as well as give your viewers control over the playback.</div>
			<div class="row">You can create your own song request system.</div>
			<Button title="Try it now" @click.stop="openParam('overlays')" />
		</div>
		
		<div v-if="tipIndex===8" class="entry">
			<img src="@/assets/icons/overlay_purple.svg" alt="overlay" class="icon">
			<h1 class="row">Twitchat overlays</h1>
			<div class="row"><strong>Twitchat</strong> provides a some <strong>overlays</strong> for your stream.</div>
			<div class="row">It can display your <strong>currently playing music</strong> or a <strong>animated wheel</strong> to pick a raffle's winner.</div>
			<Button title="Try it now" @click.stop="openParam('overlays')" />
		</div>
		
		<div v-if="tipIndex===9" class="entry">
			<img src="@/assets/icons/countdown_purple.svg" alt="timer" class="icon">
			<h1 class="row">Timer and Countdown</h1>
			<div class="row">You can start a timer or a coutdown with dedicated commands <span class="cmd">/timerStart</span> and <span class="cmd">/countdown</span>.</div>
			<Button :icon="$image('icons/timer.svg')" title="Try timer" @click.stop="startTimer()" />
			<Button :icon="$image('icons/countdown.svg')" title="Try 2min countdown" @click.stop="startCountdown()" />
		</div>
		
		<div v-if="tipIndex===10" class="entry">
			<img src="@/assets/icons/obs_purple.svg" alt="obs dock" class="icon">
			<h1 class="row">OBS Dock</h1>
			<div class="row">Did you know you can add Twitchat as an <strong>OBS Dock</strong>?</div>
			<div class="row">On OBS, open <strong>Docks</strong> => <strong>Custom Browser Docks</strong></div>
			<img class="row" src="@/assets/img/obs_dock.png" alt="obs dock screen">
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import type { ParamsContenType } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	},
	emits:["showModal", "openParam", "openParamItem"]
})
export default class ChatTipAndTrickAd extends Vue {

	public tipIndex = 10;
	private maxIndex = 10;

	public beforeMount():void {
		this.tipIndex = Math.floor(Math.random()*(this.maxIndex+1));
	}

	public openModal(modal:string):void { this.$emit("showModal", modal); }
	public openParam(modal:ParamsContenType):void { this.$emit("openParam", modal); }
	public openParamItem(paramPath:string):void { this.$emit("openParamItem", paramPath); }
	public startTimer():void { store.dispatch("startTimer"); }
	public startCountdown():void { store.dispatch("startCountdown", 2 * 60 * 1000); }

}
</script>

<style scoped lang="less">
.chattipandtrickad{
	.entry {
		.icon {
			height: 4em;
			width: 4em;
			margin-bottom: .5em;
		}
		.row:not(:last-child) {
			margin-bottom: .5em;
		}

		.cmd {
			background-color: fade(@mainColor_normal, 15%);
			border-radius: .5em;
			padding: 0 .5em;
			font-family: 'Courier New', Courier, monospace;
		}
		
		.button {
			display: block;
			margin: auto;
			&:not(:first-of-type) {
				margin-top: .5em;
			}
		}
	}
}
</style>