<template>
	<div class="home">
		<div class="home-gradient-bg"></div>

		<div class="aboveTheFold">
			<div class="lang">
				<select v-model="$i18n.locale">
					<option :value="lang" v-for="lang in enabledLocales" :key="lang">{{ $t('global.lang_label', 1, {locale:lang})}}</option>
				</select>
			</div>

			<div class="logo" ref="logo">
				<img src="@/assets/logo.svg" alt="Twitchat">
				<p class="small"><span>{{ $t("home.info") }}</span> <a href="https://www.durss.ninja" target="_blank">Durss</a></p>
				<ThemeSelector class="themeSelector" />
			</div>

			<div class="middle">
				<div class="description" ref="description">
					<p>{{ $t("home.head") }}</p>
				</div>

				<Button class="loginBt"
					light
					big
					ref="loginBt"
					@click="showLogin = true"
					icon="twitch"
				>{{ $t('home.loginBt') }}</Button>

				<div class="ctas" ref="ctas">
					<Button icon="discord"
						big
						:href="discordURL"
						target="_blank"
						type="link"
						class="discordBt"
						ref="discordBt"
						v-tooltip="{content:$t('home.discordBt'), placement:'bottom'}"
					></Button>

					<Button icon="elgato"
						big
						href="https://apps.elgato.com/plugins/fr.twitchat"
						target="_blank"
						type="link"
						class="elgatoBt"
						ref="streamDeckBt"
						v-tooltip="{content:$t('home.streamdeckBt'), placement:'bottom'}"
					></Button>

					<Button icon="youtube"
						big
						:href="youtubeURL"
						target="_blank"
						type="link"
						class="youtubeBt"
						ref="youtubeBt"
						v-tooltip="{content:$t('home.youtubeBt'), placement:'bottom'}"
					></Button>

					<!-- <Button
						big light
						:to="{name:'sponsor'}"
						class="sponsorBt"
						ref="sponsorBt"
						v-tooltip="{content:$t('home.sponsorBt'), placement:'bottom'}"
					>💝</Button> -->
				</div>
			</div>

			<div class="splitter" ref="featuresTitle" @click="onSelectAnchor(anchors[0]!)">
				<div>{{ $t("home.features.title") }}</div>
				<Icon name="arrowDown" alt="scroll down" class="icon" />
			</div>
		</div>

		<div class="sectionsHolder">
			<section :class="(s.image || s.video)? 'transition' : 'more transition'" v-for="s in sections" :key="s.icon">

				<div class="content" v-if="s.image || s.video">
					<div class="screen">
						<video v-if="s.video" loading="lazy" :src="$asset('img/homepage/'+s.video)" alt="emergency"
						autoplay loop
						@click="toggleVideo($event as PointerEvent)"
						@pause="onVideoStop($event)"
						@play="onVideoStart($event)"></video>
						<img v-if="s.image" loading="lazy" :src="$asset('img/homepage/'+s.image)" :alt="s.title">
					</div>
					<Icon :name="s.icon" :alt="s.icon" class="icon" />
					<div class="infos">
						<h2>{{s.title}}</h2>
						<div class="description" v-html="s.description"></div>
					</div>
				</div>

				<div class="content" v-else>
					<Icon :name="s.icon" :alt="s.icon" class="icon" />
					<div class="infos">
						<h2>{{s.title}}</h2>
						<div class="description">
							<ul>
								<li v-for="item in s.items" :key="item">{{item}}</li>
							</ul>
						</div>
					</div>
				</div>
				<div class="splitter"></div>
			</section>

		</div>

		<div class="footer">
			<p><span>{{ $t("home.footer.title") }}</span> <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			<p><a :href="$router.resolve({name:'privacypolicy'}).href" target="_blank">{{ $t("global.privacy") }}</a></p>
			<p><a :href="$router.resolve({name:'termsofuse'}).href" target="_blank">{{ $t("global.terms") }}</a></p>
			<p class="note" v-html="$t('home.footer.disclaimer')"></p>
		</div>

		<div class="floatingLetters">
			<img v-for="i of 20"
			ref="letter"
			:key="i"
			:src="$asset('img/homepage/letters/'+getLetter()+'.svg')">
		</div>

		<AnchorsMenu class="anchors" :items="anchors" @select="onSelectAnchor" openAnimaton :openDelay="1" />

		<Login v-show="showLogin" :show="showLogin" @close="showLogin = false" />
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ThemeSelector from '@/components/ThemeSelector.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import CountryFlag from 'vue-country-flag-next';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import AnchorsMenu from '../components/AnchorsMenu.vue';
import Splitter from '../components/Splitter.vue';
import Login from './Login.vue';
import { watch, type ComponentPublicInstance } from 'vue';
import StoreProxy from '@/store/StoreProxy';

@Component({
	components:{
		Login,
		Button: TTButton,
		Splitter,
		CountryFlag,
		AnchorsMenu,
		ThemeSelector,
	}
})
class Home extends Vue {

	public showLogin = false;
	public anchors:TwitchatDataTypes.AnchorData[] = [];

	private index = 0;
	private prevTs = 0;
	private disposed = false;
	private letterParams:{x:number, y:number, s:number, r:number, o:number}[] = [];

	public get nextIndex():number { return this.index ++; }
	public get discordURL():string { return Config.instance.DISCORD_URL; }
	public get youtubeURL():string { return Config.instance.YOUTUBE_URL; }

	public get enabledLocales():string[] {
		return this.$i18n.availableLocales.filter(v=> {
			let root:any = StoreProxy.i18n.getLocaleMessage(v);
			if(!root.global) return false;
			return root.global.lang_enabled;
		})
	}
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
		if(this.$route.name == "login" || this.$route.name == "oauth") {
			this.showLogin = true;
		}

		this.updateAnchors(true);

		//Opening transition ATF elements
		const refs = ["loginBt", "logo", "description", "discordBt", "streamDeckBt", "youtubeBt", "featuresTitle"];
		await this.$nextTick();
		for (let i = 0; i < refs.length; i++) {
			let el = this.$refs[refs[i]!] as HTMLElement | ComponentPublicInstance;
			if ((el as ComponentPublicInstance).$el) el = (el as ComponentPublicInstance).$el as HTMLElement;
			const delay = i*.1+.5;
			gsap.fromTo(el, {opacity:0, y:-20, scale:.85},
							{duration:.5, scale:1, opacity:1, y:0, clearProps:"all", ease: "back.out", delay});
		}

		this.prevTs = Date.now() - 60/1000;
		this.moveLetters(Date.now());
		watch(()=>this.$i18n.locale, ()=>this.updateAnchors());
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	private updateAnchors(isInit:boolean = false):void {
		const divs = this.$el.getElementsByClassName("transition");
		let anchors:TwitchatDataTypes.AnchorData[] = [];
		let observer!:IntersectionObserver;
		if(isInit) {
			let options = {
				root: document.body,
				rootMargin: '0px',
				threshold: .35
			};
			observer = new IntersectionObserver((entries, observer)=>this.showItem(entries), options);
		}
		for(let i = 0; i < divs.length; i++) {
			const div = divs[i] as HTMLDivElement;
			if(isInit) {
				observer.observe(div);
				const icon = div.querySelector(".content>.icon") as HTMLImageElement;
				if(icon) {
					gsap.set(icon, {scale:0});
				}
			}
			anchors.push({div, label: this.sections[i]!.title, icon:this.sections[i]!.icon, selected:false});
		}
		this.anchors = anchors;
	}

	public toggleVideo(event:PointerEvent):void {
		const video = event.target as HTMLVideoElement;
		if(video.paused) video.play().catch(()=>{});
		else video.pause();
	}

	public onVideoStart(event:Event):void {
		const video = event.target as HTMLVideoElement;
		video.classList.add("playing");
		(video.parentElement as HTMLDivElement).classList.remove("clickToPlay");
	}

	public onVideoStop(event:Event):void {
		const video = event.target as HTMLVideoElement;
		video.classList.remove("playing");
		(video.parentElement as HTMLDivElement).classList.add("clickToPlay");
	}

	public redirectToChat():void {
		let url = document.location.origin;
		url += this.$router.resolve({name:"chat"}).href;
		window.location.href = url;
	}

	public onSelectAnchor(data:TwitchatDataTypes.AnchorData):void {
		const offsetY = (window.innerHeight - data.div.getBoundingClientRect().height) / 2;
		const scrollable = (this.$el as HTMLDivElement).parentElement;
		gsap.to(scrollable, {duration: 1, scrollTo: {y:data.div, offsetY}, ease:"sine.inOut"});
	}

	private showItem(entries: IntersectionObserverEntry[]):void {
		for (const e of entries) {
			const target = e.target as HTMLElement;
			if(e.isIntersecting) {
				if(!target.dataset["done"]) {
					target.dataset["done"] = "1";

					gsap.to(target.getElementsByClassName("infos")[0]!, {duration:1, opacity:1, y:0, ease:"back.out(2)"});
					gsap.to(target.getElementsByClassName("icon")[0]!, {duration:1, scale:1, ease:"back.out(3)"});
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
		for (const a of this.anchors) {
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
		let i = 0
		for (const l of letters) {
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
			const param = this.letterParams[i]!;
			if(param.y < - pageH - 200) param.y = 200;
			param.y = param.y - i*.1;
			if(i %2 == 0) param.r += .01 * i * timeScale;
			else  param.r -= .01 * i * timeScale;
			gsap.set(l, {y:param.y, x:param.x, rotate:param.r+"deg", scale:param.s, opacity:param.o})
			i++;
		}
	}
}
export default toNative(Home);
</script>

<style lang="less">
body.light {
	.home {
		@bg:#eee;
		background-color: @bg;
		background-image: url("../assets/img/homepage/grain_dark.png");

		.sectionsHolder {
			.splitter {
				border: .5em solid @bg;
			}
		}

		section:not(.more) {
			.content {
				.icon {
					background-color: @bg;
				}
			}
		}

		section.more {
			background-color: @bg;
		}
	}
}


@media only screen and (max-width: 900px) {
body.light {
	.home {
		.sectionsHolder {
			section:not(.more), section:not(.more):nth-of-type(odd) {
				.content {
					background-color: #eee;
				}
			}
		}
	}
}
}
</style>
<style scoped lang="less">
.home{
	text-align: center;
	min-height: 100%;
	background-image: url("../assets/img/homepage/grain.png");
	margin: auto;
	padding-bottom: 2em;
	position: relative;
	overflow: hidden;
	color: var(--color-text);
	@bg:#18181b;
	background-color: @bg;

	.aboveTheFold {
		height: max(640px, 100vh);
		display: flex;
		flex-direction: column;
		// justify-content: space-between;
		padding: 4em 0;
		position: relative;
		z-index: 1;

		.themeSelector {
			margin: .5em;
			display: inline-block;
		}

		.lang {
			position: absolute;
			top: 10px;
			right: 10px;
			font-size: .8em;
			select{
				background: none;
				border: none;
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
			flex-grow: 1;
			.description {
				margin: 2em auto;
				font-style: italic;
				font-size: min(2em, 7vw);
				width: 90%;
				max-width: min(80vw, 800px);
				line-height: 1.25em;
			}

			.loginBt {
				margin-bottom: 1em;
				border-radius: 100px;
				font-weight: bold;
			}

			.ctas {
				// background-color: var(--color-primary);
				// padding: 2em 1em;
				display: flex;
				flex-direction: row;
				gap: .5em;
				justify-content: center;
				align-items: center;

				.elgatoBt {
					:deep(.background) {
						background-color: #1c40ff !important;
					}
					&:hover {
						:deep(.background) {
							background-color: lighten(#1c40ff, 10%) !important;
						}
					}
				}
				.discordBt {
					:deep(.background) {
						background-color: #5865f2 !important;
					}
					&:hover {
						:deep(.background) {
							background-color: lighten(#5865f2, 10%) !important;
						}
					}
				}
				.youtubeBt {
					:deep(.icon) {
						height: auto !important;
					}
					:deep(.background) {
						background-color: #ff0000 !important;
					}
					&:hover {
						:deep(.background) {
							background-color: lighten(#ff0000, 10%) !important;
						}
					}
				}

				.button {
					border-radius: 50%;
					padding: 6px;
					width: 2em;
					height: 2em;
					:deep(.icon) {
						width: 100%;
						height: 100%;
						max-width: 100%;
						max-height: 100%;
					}
					:deep(.label) {
						font-size: 1.2em;
					}
					&:hover {
						transition: transform .25s;
						transform: scale(1.1);
					}
				}
				.sponsorBt {
					padding: 0;
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
			.icon {
				margin-top: .5em;
				width: 1em;
				transform: translate(-50%);
				position: absolute;
				transition: all .5s ease-in-out;
			}
			&:hover {
				.icon {
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
		background: linear-gradient(90deg, var(--color-text) 2px, transparent 1px);
		background-position: 100% 0;
		background-repeat: no-repeat;
		background-size: calc(50% + 1px) 100%;
		.splitter {
			width: 2em;
			height: 2em;
			margin: auto;
			margin-top: 15vw;
			background-color: var(--color-text);
			border-radius: 50%;
			border: .5em solid @bg;
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
					img, video {
						transform: rotateY(-5deg) translate(-50%, -50%) scale(.9);
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
					transform: rotateY(0) translate(-50%, -50%)
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
					transform: rotateY(5deg) translate(-50%, -50%) scale(.9);
					transform-origin: center center;
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
				z-index: 1;
				// padding-left: calc(30vw + 1em);
				h2 {
					margin-bottom: .5em;
					font-size: 2em;
				}

				.description {
					font-size: 1.25em;
					line-height: 1.25em;

					:deep(mark) {
						background-color: var(--color-secondary);
						border-radius: .5em;
						padding: 2px 10px;
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
				background-color: @bg;
			}
		}

		video {
			cursor: pointer;
			&.playing {
				cursor: url("../assets/img/homepage/pause.png") 25 25, default;
			}
		}
	}

	.sectionsHolder {
		//draw middle line
		background: linear-gradient(90deg, var(--color-text) 2px, transparent 1px);
		background-position: 100% 0;
		background-repeat: no-repeat;
		background-size: calc(50% + 1px) 100%;
		.splitter {
			width: 2em;
			height: 2em;
			margin: auto;
			margin-top: 15vw;
			background-color: var(--color-text);
			border-radius: 50%;
			border: .5em solid @bg;
		}
	}

	section.more {
		margin-top: 10vw;
		background-image: url("../assets/img/homepage/grain.png");
		background-color: @bg;
		.icon {
			height: 6em;
			padding-top: 1em;
			margin-bottom: 1em;
		}
		.infos {
			h2 {
				font-size: 2em;
				margin-bottom: .5em;
			}

			ul {
				font-size: 1.25em;
				text-align: left;
				max-width: 500px;
				margin: auto;
				list-style-position: inside;
				li {
					margin-bottom: .5em;
					line-height: 1.25em;
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
		line-height: 1.5em;

		.note {
			font-style: italic;
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
		padding-left: 2em;

		.aboveTheFold {
			.middle {
				.description {
					width: 80vw;
					font-size: 1.3em;
				}
				.ctas {
					margin: auto;
					width: 80vw;
				}
			}
		}
		.sectionsHolder {
			width: 80vw;
			margin: auto;
			section:not(.more), section:not(.more):nth-of-type(odd) {
				font-size: .8em;
				.content {
					flex-direction: column-reverse;
					background-color: var(--color-dark);
					background-image: url("../assets/img/homepage/grain.png");
					width: 80vw;
					padding-bottom: 1em;
				}
				.infos {
					width: 100% !important;
					max-width: 100% !important;
					margin-bottom: 1em;
				}
				.icon {
					order: 3;
					width: 6em !important;
					height: 6em !important;
					padding: 1em 0;
				}
				.screen {
					width: 80% !important;
					max-width: 80% !important;
					img, video {
						position: relative !important;
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
			max-width: 80vw !important;
			margin-left:auto;
			margin-right:auto;
			font-size: .8em;
			.icon {
				order: 3;
				width: 6em;
				height: 6em;
				padding: 1em 0;
			}
			.infos {
				max-width: 70vw !important;
				margin: auto;
				display: block;
				ul {
					width: fit-content;
				}
			}
		}

		.anchors {
			font-size: .8em;
		}
	}
}
</style>
