<template>
	<div class="home">
		<div class="aboveTheFold">
			<div class="logo" ref="logo">
				<img src="@/assets/logo.svg" alt="Twitchat">
				<p class="small">Made with 💘 by <a href="https://www.durss.ninja" target="_blank">Durss</a></p>
			</div>

			<div class="middle">
				<div class="description" ref="description">
					<p><b>Twitchat</b> is a full featured, free and open source chat alternative for streamers</p>
				</div>
				
				<Button title="Log in with Twitch"
					white
					big
					ref="loginBt"
					:to="{name:'login'}"
					class="loginBt"
					:icon="$image('icons/twitch.svg')"
				/>
		
				<div class="ctas" ref="ctas">
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
			</div>
	
			<div class="splitter" ref="featuresTitle">Features<br><img src="@/assets/img/homepage/scrollDown.svg" alt="scroll down"></div>
			<!-- <Splitter class="splitter" title="Checkout some features"></Splitter> -->
		</div>

		<div class="sectionsHolder">
			<section class="transition">
				<div class="content">
					<div class="screen">
						<!-- <img src="@/assets/img/homepage/emergency.gif" alt="emergency"> -->
						<video loading="lazy" src="@/assets/img/homepage/emergency.mp4" alt="emergency" autoplay loop @click="toggleVideo($event as PointerEvent)"></video>
					</div>
					<img src="@/assets/icons/emergency.svg" alt="emergency" class="icon">
					<div class="infos">
						<h2>Emergency button</h2>
						<div class="description">Protect yourself from doxxing, hate raids and follow bot raids with the simple click of a configurable button</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<video loading="lazy" src="@/assets/img/homepage/alert.mp4" alt="alert" autoplay loop @click="toggleVideo($event as PointerEvent)"></video>
					</div>
					<img src="@/assets/icons/alert.svg" alt="emergency" class="icon">
					<div class="infos">
						<h2>Alert command</h2>
						<div class="description">Let your moderator get your attention with a configurable alert command</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/spoiler.png" alt="spoiler">
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

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/streamdeck.png" alt="stream deck">
					</div>
					<img src="@/assets/icons/elgato.svg" alt="hand" class="icon">
					<div class="infos">
						<h2>Stream Deck™</h2>
						<div class="description">You can pause the chat, scroll it, mark messages as read, open poll/prediction/bingo/raffle state and much more with the push of a button</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/greet.png" alt="greet">
					</div>
					<img src="@/assets/icons/hand.svg" alt="hand" class="icon">
					<div class="infos">
						<h2>Greet your viewers</h2>
						<div class="description"><strong>Twitchat remembers the first message</strong> of every viewer so you don't forget to greet them</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/readMark.gif" alt="read mark">
					</div>
					<img src="@/assets/icons/checkmark_white.svg" alt="checkmark" class="icon">
					<div class="infos">
						<h2>Read mark</h2>
						<div class="description">Click any message so you remember where you stopped reading at</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/conversation.gif" alt="conversation">
					</div>
					<img src="@/assets/icons/conversation.svg" alt="conversation" class="icon">
					<div class="infos">
						<h2>Conversations</h2>
						<div class="description">Follow conversation between viewers with the simple click of a button</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/search.png" alt="search">
					</div>
					<img src="@/assets/icons/search.svg" alt="search" class="icon">
					<div class="infos">
						<h2>Search messages</h2>
						<div class="description">Quickly search for messages containing any word with the <mark>/search</mark> command</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/minibadges.png" alt="minified badges">
					</div>
					<img src="@/assets/icons/prime.svg" alt="badge" class="icon">
					<div class="infos">
						<h2>Minified badges</h2>
						<div class="description">Free some space by replacing twitch badges by their minifed version</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/raffle.gif" alt="raffle">
					</div>
					<img src="@/assets/icons/ticket.svg" alt="raffle" class="icon">
					<div class="infos">
						<h2>Create a Raffle</h2>
						<div class="description">Twitchat allows you to <strong>start a raffle</strong> and pick one or multiple random winners</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/bingo.gif" alt="bingo">
					</div>
					<img src="@/assets/icons/bingo.svg" alt="bingo" class="icon">
					<div class="infos">
						<h2>Create a Bingo</h2>
						<div class="description">Twitchat allows you to <strong>start a bingo</strong>.
						<br>Your viewers will have to guess a number or a twitch emote</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/bingo.gif" alt="bingo">
					</div>
					<img src="@/assets/icons/overlay.svg" alt="alerts" class="icon">
					<div class="infos">
						<h2>Create your own alerts</h2>
						<div class="description">Twitchat provides a <strong>Trigger</strong> system to control OBS and send messages on chat based on many events like a sub, cheers, a poll result, channel points rewards, ...</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>
	
			<section class="transition">
				<div class="content">
					<div class="screen">
						<img loading="lazy" src="@/assets/img/homepage/musicPlayer.png" alt="music">
					</div>
					<img src="@/assets/icons/music.svg" alt="alerts" class="icon">
					<div class="infos">
						<h2>Spotify & Deezer</h2>
						<div class="description">Connect Twitchat with Spotify or Deezer to display the current track on your stream or allow your viewers to add tracks to the queue</div>
					</div>
				</div>
			</section>

			<div class="splitter"></div>

			<div class="more transition">
				<img src="@/assets/icons/params.svg" alt="bingo" class="icon">
				<div class="infos">
					<h2>Twitchat also allows you to</h2>
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
import gsap from 'gsap';
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

	public mounted():void {
		const divs = this.$el.getElementsByClassName("transition");
		let options = {
			root: document.body,
			rootMargin: '0px',
			threshold: .5
		};

		let observer = new IntersectionObserver((entries, observer)=>this.showItem(entries, observer), options);

		for(let i = 0; i < divs.length; i++) {
			observer.observe(divs[i]);
		}

		const holder = this.$refs.atf as HTMLDivElement;
		const refs = ["logo","description","loginBt","ctas","featuresTitle"];
		for (let i = 0; i < refs.length; i++) {
			let el = this.$refs[refs[i]] as HTMLElement | Vue;
			if((el as Vue).$el) el = (el as Vue).$el;
			gsap.fromTo(el, {opacity:0, y:-20, scale:.85}, 
							{duration:.5, scale:1, opacity:1, y:0, clearProps:"all", ease: "back.out", delay:i*.05+.5});
		}

	}

	public toggleVideo(event:PointerEvent):void {
		const video = event.target as HTMLVideoElement;
		if(video.paused) video.play();
		else video.pause();
		video.classList.toggle("playing");
		(video.parentElement as HTMLDivElement).classList.remove("clickToPlay");
	}

	private showItem(entries: IntersectionObserverEntry[], observer: IntersectionObserver):void {
		for (let i = 0; i < entries.length; i++) {
			const e = entries[i];
			const target = e.target as HTMLElement;
			if(e.isIntersecting && !target.dataset["done"]) {
				target.dataset["done"] = "1";
				gsap.to(e.target, {duration:1, opacity:1, y:0});
				gsap.from(e.target.getElementsByClassName("icon")[0], {duration:1, scale:0, ease:"back.out(2)"});
				const video = e.target.getElementsByTagName("video")[0];
				if(video) {
					video.play().catch(()=>{
						(video.parentElement as HTMLDivElement).classList.add("clickToPlay");
					});
				}
			}
		}
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
	padding-bottom: 2em;

	.aboveTheFold {
		height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 4em 0;

		.logo {
			width: 80vw;
			max-width: 400px;
			margin: 0 auto;
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

		.middle {
			.description {
				margin: auto;
				margin-bottom: 2em;
				font-style: italic;
				opacity: .8;
				font-size: min(2em, 7vw);
				width: 90%;
				max-width: 800px;
			}
	
			.loginBt {
				margin-bottom: 1em;
				border-radius: 100px;
				font-weight: bold;
			}
	
			.ctas {
				// margin-top: calc(1em - .25em);
				// margin-bottom: 1em;
				.button:not(:first-child) {
					margin-left: .5em;
					margin-top: .5em;
				}
				.button {
					border-radius: 100px;
				}
			}
		}


		.splitter {
			font-size: 2em;
			// margin: 10vw auto;
			font-weight: bold;
			img {
				margin-top: .5em;
				width: 1em;
			}
		}
	}

	.transition {
		opacity: 0;
		transform: translateY(-100px);
	}

	.sectionsHolder {
		background: linear-gradient(90deg, fade(@mainColor_light, 100%) 2px, transparent 1px);
		background-position: 100% 0;
		background-repeat: no-repeat;
		background-size: calc(50% + 1px) 100%;
		.splitter {
			width: .5em;
			height: .5em;
			margin: auto;
			background-color: #fff;
			border-radius: 50%;
		}
	}

	section {
		padding: 10vw 0;
		min-width: 100%;
		margin-bottom: 5vw;
		&:not(:first-of-type) {
			margin-top: 5vw;
		}

		&:nth-of-type(odd) {
			.content {
				flex-direction: row-reverse;

				.screen {
					&.clickToPlay:before {
						transform: rotateY(-20deg) translate(-40%, -50%)
					}
					img, video {
						transform: rotateY(-20deg) translate(-50%, -50%) scale(1);
						transform-origin: right center;
					}
				}
			}
		}

		&:hover {
			.content {
				.screen {

					&.clickToPlay:before {
						transform: rotateY(0) translate(-50%, -50%)
					}

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

				&.clickToPlay:before {
					content: "";
					pointer-events: none;
					z-index: 1;
					background-image: url("../assets/img/homepage/clickToPlay.png");
					background-size: 100% 100%;
					width: 5em;
					height: 5em;
					min-width: 5em;
					min-height: 5em;
					position: absolute;
					top: 50%;
					left: 50%;
					transition: all .5s;
					transform: rotateY(20deg) translate(-70%, -50%)
				}

				&.clickToPlay {
					video {
						filter: brightness(30%);
					}
				}

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
						font-size: .8em;
						border-radius: .5em;
						padding: 0 .25em;
					}
				}
			}

			.icon {
				width: 6%;
				flex-grow: 1;
				height: 7em;
				padding: 1em 3%;
				display: block;
				background-color: @mainColor_dark;
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
			cursor:  url("../assets/img/homepage/play.png"), default;
			&.playing {
				cursor:  url("../assets/img/homepage/pause.png"), default;
			}
		}
	}

	.more {
		margin-top: 10vw;
		background-color: @mainColor_dark;
		.icon {
			height: 6em;
			padding-top: 1em;
			margin-bottom: 1em;
		}
		.infos {
			h2 {
				font-size: 3vw;
				margin-bottom: .5em;
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