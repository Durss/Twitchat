<template>
	<div class="home">
		<div class="logo">
			<img src="@/assets/logo.svg" alt="Twitchat">
			<p class="small">Made with 💘 by <a href="https://www.durss.ninja" target="_blank">Durss</a></p>
		</div>
		
		<div class="description">
			<p><b>Twitchat</b> is a full featured open source chat alternative for streamers</p>
		</div>
		
		<Button title="Log in with Twitch"
			white
			:to="{name:'login'}"
			class="loginBt"
			:icon="$image('icons/twitch.svg')"
		/>

		<div class="ctas">
			<Button :icon="$image('icons/elgato.svg')"
				title="Stream Deck™ plugin"
				href="https://apps.elgato.com/plugins/fr.twitchat"
				target="_blank"
				type="link"
				class="elgatoBt"
			/>
	
			<Button :icon="$image('icons/discord.svg')"
				title="Join Discord"
				:href="discordURL"
				target="_blank"
				type="link"
				class="discordBt"
			/>
	
			<Button :icon="$image('icons/coin.svg')"
				title="Feed me 🥰"
				:to="{name:'sponsor'}"
				class="sponsorBt"
			/>
		</div>

		<!-- <div class="featuresHeader">Checkout some of the features</div> -->
		<Splitter class="splitter" title="Checkout some features"></Splitter>

		<section>
			<div class="content">
				<div class="screen">
					<!-- <img src="@/assets/img/homepage/emergency.gif" alt="emergency"> -->
					<video src="@/assets/img/homepage/emergency.mp4" alt="emergency" autoplay loop onclick="this.paused? this.play() : this.pause()"></video>
				</div>
				<img src="@/assets/icons/emergency.svg" alt="emergency" class="icon">
				<div class="infos">
					<h2>Emergency button</h2>
					<div class="description">Protect yourself from doxxing, hate raids and follow bot raids with the simple click of a configurable button</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<video src="@/assets/img/homepage/alert.mp4" alt="alert" autoplay loop onclick="this.paused? this.play() : this.pause()"></video>
				</div>
				<img src="@/assets/icons/alert.svg" alt="emergency" class="icon">
				<div class="infos">
					<h2>Alert command</h2>
					<div class="description">Let your moderator get your attention with a configurable alert command</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/spoiler.png" alt="spoiler">
				</div>
				<img src="@/assets/icons/show.svg" alt="emergency" class="icon">
				<div class="infos">
					<h2>Spoiler command</h2>
					<div class="description">Messages starting with <mark>||</mark> will be shown as spoilers.
					<br>Your mods will be able to set another users' message as spoiler by responding to it with the <mark>!spoiler</mark> command
					</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/streamdeck.png" alt="stream deck">
				</div>
				<img src="@/assets/icons/elgato.svg" alt="hand" class="icon">
				<div class="infos">
					<h2>Stream Deck™</h2>
					<div class="description">You can pause the chat, scroll it, mark messages as read, open poll/prediction/bingo/raffle state and much more with the push of a button</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/greet.png" alt="greet">
				</div>
				<img src="@/assets/icons/hand.svg" alt="hand" class="icon">
				<div class="infos">
					<h2>Greet your viewers</h2>
					<div class="description"><strong>Twitchat remembers the first message</strong> of every viewer so you don't forget to greet them</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/readMark.gif" alt="read mark">
				</div>
				<img src="@/assets/icons/checkmark_white.svg" alt="checkmark" class="icon">
				<div class="infos">
					<h2>Read mark</h2>
					<div class="description">Click any message so you remember where you stopped reading at</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/conversation.gif" alt="conversation">
				</div>
				<img src="@/assets/icons/conversation.svg" alt="conversation" class="icon">
				<div class="infos">
					<h2>Conversations</h2>
					<div class="description">Follow conversation between viewers with the simple click of a button</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/search.png" alt="search">
				</div>
				<img src="@/assets/icons/search.svg" alt="search" class="icon">
				<div class="infos">
					<h2>Search messages</h2>
					<div class="description">Quickly search for messages containing any word with the <mark>/search</mark> command</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/minibadges.png" alt="minified badges">
				</div>
				<img src="@/assets/icons/prime.svg" alt="badge" class="icon">
				<div class="infos">
					<h2>Minified badges</h2>
					<div class="description">Free some space by replacing twitch badges by their minifed version</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/raffle.gif" alt="raffle">
				</div>
				<img src="@/assets/icons/ticket.svg" alt="raffle" class="icon">
				<div class="infos">
					<h2>Create a Raffle</h2>
					<div class="description">Twitchat allows you to <strong>start a raffle</strong> and pick one or multiple random winners</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/bingo.gif" alt="bingo">
				</div>
				<img src="@/assets/icons/bingo.svg" alt="bingo" class="icon">
				<div class="infos">
					<h2>Create a Bingo</h2>
					<div class="description">Twitchat allows you to <strong>start a bingo</strong>.
					<br>Your viewers will have to guess a number or a twitch emote</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/bingo.gif" alt="bingo">
				</div>
				<img src="@/assets/icons/overlay.svg" alt="alerts" class="icon">
				<div class="infos">
					<h2>Create your own alerts</h2>
					<div class="description">Twitchat provides a <strong>Trigger</strong> system to control OBS and send messages on chat based on many events like a sub, cheers, a poll result, channel points rewards, ...</div>
				</div>
			</div>
		</section>

		<section>
			<div class="content">
				<div class="screen">
					<img src="@/assets/img/homepage/musicPlayer.png" alt="music">
				</div>
				<img src="@/assets/icons/music.svg" alt="alerts" class="icon">
				<div class="infos">
					<h2>Spotify & Deezer</h2>
					<div class="description">Connect Twitchat with Spotify or Deezer to display the current track on your stream or allow your viewers to add tracks to the queue</div>
				</div>
			</div>
		</section>

		<div class="more">
			<img src="@/assets/icons/params.svg" alt="bingo" class="icon">
			<div class="infos">
				<h2>Twitchat also allows to</h2>
				<div class="description">
					<ul>
						<li>Receive whispers on chat and respond to them</li>
						<li>See users not following you</li>
						<li>Display your viewers' pronouns</li>
						<li>Display BTTV, FFZ and 7TV emotes</li>
						<li>Hide messages sent from your bots</li>
						<li>See who's live amongst your followings to raid them</li>
						<li>Send a shoutout with a simple click</li>
						<li>Automatically see last stream info of a raider</li>
						<li>Control your OBS</li>
						<li>Know when users enter/leave your chat</li>
						<li>And much more...</li>
					</ul>
				</div>
			</div>
		</div>

		<div class="footer">
			<p>Sources on <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			<p class="note">Twitchat is NOT affiliated with <a href="https://twitch.tv" target="_blank">Twitch</a> by any means</p>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Config from '@/utils/Config';
import { Options, Vue } from 'vue-class-component';
import Splitter from '../components/Splitter.vue';

@Options({
	props:{},
	components:{
		Button,
		Splitter,
	}
})
export default class Home extends Vue {

	private index = 0;

	public get nextIndex():number { return this.index ++; }
	public get discordURL():string { return Config.instance.DISCORD_URL; }

	// public get loginPath():string { return router.resolve({name:'login'}).href; }

	public mounted():void {
	}
}
</script>

<style scoped lang="less">
.home{
	text-align: center;
	color: @mainColor_light;
	min-height: 100%;
	// background-image: url("../assets/img/homepage.jpg");
	background: linear-gradient(180deg, darken(@mainColor_normal, 40%) 0%, @mainColor_dark 100%);
	background-size: 100% 100vh;
	background-repeat: no-repeat;
	background-position: top center;
	margin: auto;
	padding: 2em 5px;

	.logo {
		width: 80vw;
		max-width: 400px;
		margin: auto;
		img {
			filter: drop-shadow(0 10px 20px fade(#000000, 50%));
		}
		.small {
			margin-top: 1em;
			font-size: .8em;
			opacity: .7;
			font-style: italic;
		}
	}

	&>.description {
		margin: 2em auto;
		font-style: italic;
		opacity: .8;
		font-size: 2em;
		width: 90%;
		max-width: 800px;
	}

	.loginBt {
		margin: 0;
		border-radius: 50px;
		font-weight: bold;
		padding:15px;
		:deep(.label){
			font-size: 20px;
		}
	}

	.ctas {
		margin-top: calc(1em - .25em);
		margin-bottom: 1em;
		.button:not(:first-child) {
			margin-left: .25em;
			margin-top: .25em;
		}
	}

	.splitter {
		font-size: 2em;
		margin: 5vw auto;
		:deep(.line) {
			background-color: @mainColor_light;
		}
	}

	section {
		padding: 10vw 0;
		min-width: 100%;
		&:not(:first-of-type) {
			margin-top: 10vw;
		}

		&:nth-child(odd) {
			.content {
				flex-direction: row-reverse;

				.screen {
					img, video {
						transform: rotateY(-20deg) translate(-50%, -50%) scale(1);
						transform-origin: right center;
					}
				}
	
				// .infos {
					// padding-left: 0;
					// padding-right: calc(30vw + 1em);
				// }
			}
		}

		&:hover {
			.content {
				.screen {
					// width: 35vw;
					img, video{
						transform: rotateY(0) translate(-50%, -50%) translateX(0);
					}

					&::after {
						width: 100%;
						margin-bottom: -1em;
					}
				}
			}
		}

		.content {
			display: flex;
			flex-direction: row;
			max-width: 70vw;
			margin: auto;
			color: @mainColor_light;
			align-items: center;
			position: relative;
	
			.screen {
				width: 42%;
				max-width: 42%;
				perspective: 1000px;
				position: relative;

				img, video {
					width: 100%;
					max-width: 500px;
					border-radius: .5em;
					border: 2px solid white;
					transform: rotateY(20deg) translate(-50%, -50%) scale(.9);
					transform-origin: left center;
					// max-width: 500px;
					transition: all .5s;
					position: absolute;
				}
			}
	
			.infos {
				width: 42%;
				max-width: 42%;
				flex-grow: 1;
				text-align: center;
				font-size: 3vw;
				// padding-left: calc(30vw + 1em);
				h2 {
					margin-bottom: .5em;
				}

				.description {
					font-size: .5em;
					
					mark {
						background-color: @mainColor_normal;
						border: 1px dashed @mainColor_normal_extralight;
						font-family: "Courier";
						font-size: .8em;
						border-radius: .5em;
						padding: 0 .25em;
					}
				}
			}

			.icon {
				width: 6%;
				flex-grow: 1;
				height: 5em;
				padding: 0 3%;
				display: block;
			}

			&.noPic {
				.infos {
					flex-grow: 2;
					width: auto;
					max-width: unset;
				}
			}
		}

		video {
			&:hover {
				cursor:  url("../assets/img/homepage/playPause.png"), default;
			}
		}
	}

	.more {
		.icon {
			height: 5em;
			margin-bottom: 1em;
		}
		.infos {
			h2 {
				font-size: 3vw;
			}

			ul {
				text-align: left;
				max-width: 500px;
				margin: auto;
				li {
					margin-bottom: .5em;
				}
			}
		}
	}

	.footer {
		margin-top: 5em;
		text-align: center;
		font-size: .8em;
		padding-bottom: 2em;

		.note {
			font-style: italic;
			margin-top: .5em;
			font-size: .9em;
			opacity: .8;
		}
	}
}
</style>