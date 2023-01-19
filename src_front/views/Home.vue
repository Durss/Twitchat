<template>
	<div class="home">
		<div class="gradient"></div>

		<div class="aboveTheFold">
			<div class="lang">
				<select v-model="$i18n.locale">
					<option value="fr">Français</option>
					<option value="en">English</option>
				</select>
			</div>

			<div class="logo" ref="logo">
				<img src="@/assets/logo.svg" alt="Twitchat">
				<p class="small"><span>{{ $t("home.info") }}</span> <a href="https://www.durss.ninja" target="_blank">Durss</a></p>
			</div>

			<div class="middle">
				<div class="description" ref="description">
					<p>{{ $t("home.head") }}</p>
				</div>
				
				<Button :title="$t('home.loginBt')"
					white
					big
					ref="loginBt"
					:to="{name:'login'}"
					class="loginBt"
					:icon="$image('icons/twitch.svg')"
					v-if="!hasAuthToken"
				/>
				<Button :title="$t('home.openBt')"
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
						:title="$t('home.streamdeckBt')"
						href="https://apps.elgato.com/plugins/fr.twitchat"
						target="_blank"
						type="link"
						class="elgatoBt"
						ref="streamDeckBt"
					/>
			
					<Button :icon="$image('icons/discord.svg')"
						:title="$t('home.discordBt')"
						:href="discordURL"
						target="_blank"
						type="link"
						class="discordBt"
						ref="discordBt"
					/>
			
					<Button :icon="$image('icons/coin.svg')"
						:title="$t('home.sponsorBt')"
						:to="{name:'sponsor'}"
						class="sponsorBt"
						ref="sponsorBt"
					/>
				</div>
			</div>
	
			<div class="splitter" ref="featuresTitle" @click="onSelectAnchor(anchors[0])">
				<div>{{ $t("home.features.title") }}</div>
				<img src="@/assets/img/homepage/scrollDown.svg" alt="scroll down">
			</div>
		</div>

		<div class="sectionsHolder">
			<section :class="(s.image || s.video)? 'transition' : 'more transition'" v-for="s in sections">

				<div class="content" v-if="s.image || s.video">
					<div class="screen">
						<video v-if="s.video" loading="lazy" :src="$image('img/homepage/'+s.video)" alt="emergency" autoplay loop @click="toggleVideo($event as PointerEvent)"></video>
						<img v-if="s.image" loading="lazy" :src="$image('img/homepage/'+s.image)" :alt="s.title">
					</div>
					<img :src="$image('icons/'+s.icon+'.svg')" :alt="s.icon" class="icon">
					<div class="infos">
						<h2>{{s.title}}</h2>
						<div class="description" v-html="s.description"></div>
					</div>
				</div>
				
				<div class="content" v-else>
					<img :src="$image('icons/'+s.icon+'.svg')" :alt="s.icon" class="icon">
					<div class="infos">
						<h2>{{s.title}}</h2>
						<div class="description">
							<ul>
								<li v-for="item in s.items">{{item}}</li>
							</ul>
						</div>
					</div>
				</div>
				<div class="splitter"></div>
			</section>

		</div>

		<div class="footer">
			<p><span>{{ $t("home.footer.title") }}</span> <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			<p class="note" v-html="$t('home.footer.disclaimer')"></p>
		</div>

		<div class="floatingLetters">
			<img v-for="i of 20"
			ref="letter"
			:src="$image('img/homepage/letters/'+getLetter()+'.svg')">
		</div>
		
		<AnchorsMenu :items="anchors" @select="onSelectAnchor" openAnimaton :openDelay="1" />
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import DataStore from '@/store/DataStore';
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
import type {TwitchatDataTypes} from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Splitter from '../components/Splitter.vue';
import AnchorsMenu from '../components/AnchorsMenu.vue';
import CountryFlag from 'vue3-country-flag-icon';
import 'vue3-country-flag-icon/dist/CountryFlag.css';

@Options({
	props:{},
	components:{
		Button,
		Splitter,
		CountryFlag,
		AnchorsMenu,
	}
})
export default class Home extends Vue {

	public anchors:TwitchatDataTypes.AnchorData[] = [];

	private index = 0;
	private disposed = false;
	private prevTs = 0;
	private letterParams:{x:number, y:number, s:number, r:number, o:number}[] = [];

	public get hasAuthToken():boolean { return DataStore.get(DataStore.TWITCH_AUTH_TOKEN) != null; }
	public get nextIndex():number { return this.index ++; }
	public get discordURL():string { return Config.instance.DISCORD_URL; }
	public getLetter():string { return Utils.pickRand("twitchat".split("")); }

	public get sections():{
		icon:string,
		video?:string,
		image?:string,
		title:string,
		description:string,
		items?:string[],
	}[] {
		return this.$tm("home.features.list") as {
			icon:string,
			video?:string,
			image?:string,
			title:string,
			description:string,
			items?:string[],
		}[];
	}

	public async mounted():Promise<void> {
		const divs = this.$el.getElementsByClassName("transition");
		let options = {
			root: document.body,
			rootMargin: '0px',
			threshold: .35
		};

		let observer = new IntersectionObserver((entries, observer)=>this.showItem(entries, observer), options);

		//Opening transition of left anchors
		let anchors:TwitchatDataTypes.AnchorData[] = [];
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

		//Opening transition ATF elements
		const refs = ["loginBt","logo","description","streamDeckBt", "discordBt", "sponsorBt","featuresTitle"];
		await this.$nextTick();
		for (let i = 0; i < refs.length; i++) {
			let el = this.$refs[refs[i]] as HTMLElement | Vue;
			if((el as Vue).$el) el = (el as Vue).$el;
			const delay = i*.1+.5;
			gsap.fromTo(el, {opacity:0, y:-20, scale:.85}, 
							{duration:.5, scale:1, opacity:1, y:0, clearProps:"all", ease: "back.out", delay});
		}

		this.prevTs = Date.now() - 60/1000;
		this.moveLetters(Date.now());
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
		url += this.$router.resolve({name:"chat"}).href;
		window.location.href = url;
	}

	public onSelectAnchor(data:TwitchatDataTypes.AnchorData):void {
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

	private moveLetters(ts:number):void {
		if(this.disposed) return
		requestAnimationFrame((ts:number)=> this.moveLetters(ts));

		const timeScale = (60/1000) * (ts - this.prevTs);
		this.prevTs = ts;
		if(timeScale <= 0) return;

		//Select anchors at the left depending on the current scroll
		const center = window.innerHeight / 2;
		let closestPosToCenter = 99999999;
		let closestToCenter:TwitchatDataTypes.AnchorData|null = null;
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

		//Make letters move up
		const letters = this.$refs.letter as HTMLImageElement[];
		for (let i = 0; i < letters.length; i++) {
			const l = letters[i];
			const pageH = this.$el.offsetHeight;
			if(this.letterParams.length <= i) {
				this.letterParams.push({
					y:-Math.random()*pageH,
					x:Math.random()*document.body.offsetWidth,
					s:Math.random()*3 + .5,
					o:Math.random()*.1 + .025,
					r:Math.random()*360,
				})
				l.style.left = (Math.random()*document.body.offsetWidth)+"px";
			}
			const param = this.letterParams[i];
			if(param.y < - pageH - 200) param.y = 200;
			param.y = param.y - i*.1;
			if(i %2 == 0) param.r += .01 * i * timeScale;
			else  param.r -= .01 * i * timeScale;
			gsap.set(l, {y:param.y, x:param.x, rotate:param.r+"deg", scale:param.s, opacity:param.o})
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

		.lang {
			position: absolute;
			top: 1em;
			top: 1em;
			right: 1em;
			font-size: .8em;
			select{
				color: @mainColor_light;
				background: none;
				border: none;
				option {
					color: @mainColor_normal;
				}
			}
		}

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
			margin-top: 15vw;
			background-color: #fff;
			border-radius: 50%;
			border: .5em solid @mainColor_dark;
		}
	}

	section:not(.more) {
		padding: 10vw 0 0 0;
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
					line-height: 1.25em;
					
					:deep(mark) {
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
		}

		video {
			cursor:  url("../assets/img/homepage/pause.png"), default;
			&.playing {
				cursor:  url("../assets/img/homepage/play.png"), default;
			}
		}
	}

	section.more {
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
		.splitter {
			display: none;
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