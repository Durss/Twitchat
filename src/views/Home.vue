<template>
	<div class="home">
		<div class="gradient"></div>
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
					v-if="!hasAuthToken"
				/>
				<Button title="Open Twitchat"
					white
					big
					ref="loginBt"
					class="loginBt"
					:icon="$image('icons/twitch.svg')"
					@click="redirectToChat()"
					v-if="hasAuthToken"
				/>
		
				<div class="ctas" ref="ctas">
					<Button :icon="$image('icons/elgato.svg')"
						title="Stream Deck™ plugin"
						href="https://apps.elgato.com/plugins/fr.twitchat"
						target="_blank"
						type="link"
						class="elgatoBt"
						ref="streamDeckBt"
					/>
			
					<Button :icon="$image('icons/discord.svg')"
						title="Join Discord"
						:href="discordURL"
						target="_blank"
						type="link"
						class="discordBt"
						ref="discordBt"
					/>
			
					<Button :icon="$image('icons/coin.svg')"
						title="Feed me 🥰"
						:to="{name:'sponsor'}"
						class="sponsorBt"
						ref="sponsorBt"
					/>
				</div>
			</div>
	
			<div class="splitter" ref="featuresTitle" @click="onSelectAnchor(anchors[0])">Features<br><img src="@/assets/img/homepage/scrollDown.svg" alt="scroll down"></div>
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
						<video loading="lazy" src="@/assets/img/homepage/triggers.mp4" alt="triggers" autoplay loop @click="toggleVideo($event as PointerEvent)"></video>
					</div>
					<img src="@/assets/icons/notification.svg" alt="alerts" class="icon">
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
				<div class="content">
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
		</div>

		<div class="footer">
			<p>Sources on <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			<p class="note">Twitchat is NOT affiliated with <a href="https://twitch.tv" target="_blank">Twitch</a> by any means</p>
		</div>

		<div class="floatingLetters">
			<img v-for="i of 40"
			ref="letter"
			:src="$image('img/homepage/letters/'+getLetter()+'.svg')">
		</div>
		
		<AnchorsMenu :items="anchors" @select="onSelectAnchor" />
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import router from '@/router';
import Store from '@/store/Store';
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
import type {AnchorData} from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Splitter from '../components/Splitter.vue';
import AnchorsMenu from '../components/AnchorsMenu.vue';

@Options({
	props:{},
	components:{
		Button,
		Splitter,
		AnchorsMenu,
	}
})
export default class Home extends Vue {

	public anchors:AnchorData[] = [];

	private index = 0;
	private disposed = false;

	public get hasAuthToken():boolean { return Store.get(Store.TWITCH_AUTH_TOKEN) != null; }
	public get nextIndex():number { return this.index ++; }
	public get discordURL():string { return Config.instance.DISCORD_URL; }
	public getLetter():string { return Utils.pickRand("twitchat".split("")); }

	public async mounted():Promise<void> {
		const divs = this.$el.getElementsByClassName("transition");
		let options = {
			root: document.body,
			rootMargin: '0px',
			threshold: .35
		};

		let observer = new IntersectionObserver((entries, observer)=>this.showItem(entries, observer), options);

		let anchors:AnchorData[] = [];
		for(let i = 0; i < divs.length; i++) {
			const div = divs[i] as HTMLDivElement
			observer.observe(div);
			const icon = div.querySelector(".content>.icon") as HTMLImageElement;
			if(icon) {
				gsap.set(icon, {scale:0});
			}
			const label = div.querySelector("h2")?.innerText ?? "";
			anchors.push({div, label, icon:icon.src, selected:false});
		}
		this.anchors = anchors;

		const refs = ["loginBt","logo","description","streamDeckBt", "discordBt", "sponsorBt","featuresTitle"];
		await this.$nextTick();
		for (let i = 0; i < refs.length; i++) {
			let el = this.$refs[refs[i]] as HTMLElement | Vue;
			if((el as Vue).$el) el = (el as Vue).$el;
			const delay = i*.1+.5;
			gsap.fromTo(el, {opacity:0, y:-20, scale:.85}, 
							{duration:.5, scale:1, opacity:1, y:0, clearProps:"all", ease: "back.out", delay});
		}

		this.moveLetters();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public toggleVideo(event:PointerEvent):void {
		const video = event.target as HTMLVideoElement;
		if(video.paused) video.play();
		else video.pause();
		video.classList.toggle("playing");
		(video.parentElement as HTMLDivElement).classList.remove("clickToPlay");
	}

	public redirectToChat():void {
		let url = document.location.origin;
		url += router.resolve({name:"chat"}).href;
		window.location.href = url;
	}

	public onSelectAnchor(data:AnchorData):void {
		const offsetY = (window.innerHeight - data.div.getBoundingClientRect().height) / 2;
		const scrollable = (this.$el as HTMLDivElement).parentNode;
		gsap.to(scrollable, {duration: 1, scrollTo: {y:data.div, offsetY}, ease:"sine.inOut"});
	}

	private showItem(entries: IntersectionObserverEntry[], observer: IntersectionObserver):void {
		for (let i = 0; i < entries.length; i++) {
			const e = entries[i];
			const target = e.target as HTMLElement;
			if(e.isIntersecting) {
				if(!target.dataset["done"]) {
					target.dataset["done"] = "1";
					
					gsap.to(target.getElementsByClassName("infos")[0], {duration:1, opacity:1, y:0, ease:"back.out(2)"});
					gsap.to(target.getElementsByClassName("icon")[0], {duration:1, scale:1, ease:"back.out(3)"});
					const screen = target.getElementsByClassName("screen")[0];
	
					if(screen) {
						gsap.to(screen, {duration:1.5, opacity:1, y:0, ease:"back.out(2)"});
					}
	
					const video = target.getElementsByTagName("video")[0];
					if(video) {
						video.play().catch(()=>{
							(video.parentElement as HTMLDivElement).classList.add("clickToPlay");
						});
					}
				}
			}
		}
	}

	private moveLetters():void {
		if(this.disposed) return
		requestAnimationFrame(()=> this.moveLetters());

		const center = window.innerHeight / 2;
		let closestPosToCenter = 99999999;
		let closestToCenter:AnchorData|null = null;
		for (let i = 0; i < this.anchors.length; i++) {
			const a = this.anchors[i];
			const bounds = a.div.getBoundingClientRect();
			const py = bounds.top + bounds.height * .5;
			const dist = Math.abs(py - center);
			if(dist < closestPosToCenter && dist < center) {
				closestPosToCenter = dist;
				closestToCenter = a;
			}
			a.selected = false;
		}
		if(closestToCenter) closestToCenter.selected = true;

		const letters = this.$refs.letter as HTMLImageElement[];
		for (let i = 0; i < letters.length; i++) {
			const l = letters[i];
			const pageH = this.$el.offsetHeight;
			let py = parseFloat(l.style.top);
			if(isNaN(py)) {
				py = -Math.random()*pageH;
				l.style.left = (Math.random()*document.body.offsetWidth)+"px";
				l.style.opacity = (Math.random()*.1 + .025).toString();
				l.style.transform = "scale("+(Math.random()*3 + .5)+") rotate("+(Math.random()*360)+"deg)";
			}
			if(py < - pageH - 200) py = 200;
			l.style.top = (py - i*.1)+"px";
			let r = parseFloat(l.style.transform.replace(/.*rotate\(([0-9.]+)deg\).*/gi, "$1"));
			if(i %2 == 0) r += .01 * i;
			else  r -= .01 * i;
			l.style.transform = l.style.transform.replace(/[0-9.]+deg/gi, r+"deg")
		}
	}
}
</script>

<style scoped lang="less">
.home{
	text-align: center;
	color: @mainColor_light;
	min-height: 100%;
	background-image: url("../assets/img/homepage/grain.png");
	margin: auto;
	padding-bottom: 2em;
	position: relative;
	overflow: hidden;

	.gradient {
		background: linear-gradient(180deg, fade(darken(@mainColor_normal, 10%), 50%) 0%, fade(@mainColor_normal, 0%) 100%);
		background-size: 100% 100vh;
		background-repeat: no-repeat;
		background-position: top center;
		width: 100%;
		height: 100vh;
		position: absolute;
		top:0;
		left:0;
	}

	.aboveTheFold {
		height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 4em 0;
		position: relative;
		z-index: 1;

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
			display: block;
			margin: 0 auto;
			font-weight: bold;
			cursor: pointer;
			position: relative;
			padding-bottom: 1em;
			img {
				margin-top: .5em;
				width: 1em;
				transform: translate(-50%);
				position: absolute;
				transition: all .5s ease-in-out;
			}
			&:hover {
				img {
					margin-top: .75em;
				}
			}
		}
	}

	.transition {
		.content {
			.screen, .infos {
				opacity: 0;
				transform: translateY(-100px);
			}
		}
	}

	.sectionsHolder {
		//draw middle line
		background: linear-gradient(90deg, fade(@mainColor_light, 100%) 2px, transparent 1px);
		background-position: 100% 0;
		background-repeat: no-repeat;
		background-size: calc(50% + 1px) calc(100% - 500px);//500px => more or less the .more{} holder's size. Avoids seeing the line behind the text on display transition
		.splitter {
			width: 2em;
			height: 2em;
			margin: auto;
			background-color: #fff;
			border-radius: 50%;
			border: .5em solid @mainColor_dark;
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
				z-index: 1;

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
				font-size: min(2em, 3vw);
				z-index: 1;
				// padding-left: calc(30vw + 1em);
				h2 {
					margin-bottom: .5em;
				}

				.description {
					font-size: .6em;
					
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
				background-image: url("../assets/img/homepage/grain.png");
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
		background-image: url("../assets/img/homepage/grain.png");
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

	.floatingLetters {
		z-index: 0;
		position: absolute;
		img {
			position: absolute;
			height: 2em;
		}
	}
}

@media only screen and (max-width: 900px) {
	.home {

		.aboveTheFold {
			.middle {
				.description {
					width: calc(100% - 2.5em);
				}
				.ctas {
					margin: auto;
					width: calc(100% - 4em);
				}
			}
		}
		.sectionsHolder {
			width: calc(100% - 4em);
			margin: auto;
			section, section:nth-of-type(odd) {
				.content {
					flex-direction: column-reverse;
					background-image: url("../assets/img/homepage/grain.png");
					background-color: @mainColor_dark;
					max-width: calc(100% - 1em);
					padding-bottom: 1em;
				}
				.infos {
					font-size: max(1.8em, 5vw);
					width: 100%;
					max-width: 100%;
					margin-bottom: 1em;
				}
				.icon {
					order: 3;
					width: 6em;
					height: 6em;
					padding: 1em 0;
				}
				.screen {
					width: 80%;
					max-width: 80%;
					img, video {
						position: relative;
						left: 0;
						right: 0;
						transform: unset !important;
					}
					&.clickToPlay:before {
						transform: translate(-50%, -50%) !important;
					}
				}
			}
		}
		.more {
			max-width: calc(100% - 1em);
			margin-left:auto;
			margin-right:auto;
			.icon {
				order: 3;
				width: 6em;
				height: 6em;
				padding: 1em 0;
			}
			.infos {
				font-size: max(1.75em, 5vw);

				h2 {
					font-size: 1em;
				}
				ul {
					font-size: .5em;
					max-width: 80%;
					margin-left: 3em;
					width: fit-content;
				}
			}
		}
	}
}
</style>