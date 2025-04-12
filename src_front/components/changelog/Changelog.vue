<template>
	<div :class="classes">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<template v-if="showReadAlert">
				<img src="@/assets/img/mrbean.png" class="mrbean" :class="showMrBean? 'show': ''">
				<Teleport to="body">
					<TTButton style="position:absolute; z-index: 9;" ref="noCareFloating" big alert @click="close(true)">{{ $t("changelog.forceRead.fuBt") }}</TTButton>
				</Teleport>
			</template>
			<ClearButton @click="close()" v-if="!showReadAlert && !showFu" />
			<ClearButton icon="back" class="backBt" @click="currentSlide = 0" v-if="currentSlide != 0 && !showReadAlert && !showFu" />

			<div class="content" ref="scrollable">
				<div v-if="showReadAlert" class="forceRead">
					<div class="image">
						<div class="smirk" ref="smirk">😏</div>
						<img src="@/assets/img/barracuda.png" class="barracuda" width="315" height="255">
					</div>
					<h2>{{ $t("changelog.forceRead.title") }}</h2>
					<p v-if="readAtSpeedOfLight" class="description">{{ $t("changelog.forceRead.readAtSpeedOfLight") }}</p>
					<p class="description">{{ $t("changelog.forceRead.description") }}</p>
					<TTButton primary big @click="cancelClose()">{{ $t("changelog.forceRead.sorryBt") }}</TTButton>
					<!-- <TTButton class="noCareBt" big alert @click="close(true)">{{ $t("changelog.forceRead.fuBt") }}</TTButton> -->
					<TTButton class="noCareBt" icon="timer" secondary @click="reminder()">{{ $t("changelog.forceRead.reminderBt") }}</TTButton>
				</div>

				<div v-else-if="showFu" class="fu" ref="fu">🤬</div>

				<Carousel v-else class="carousel" :items-to-show="1" v-model="currentSlide" :wrap-around="true" @slide-start="onSlideStart">
					<template #addons>
						<Navigation />
						<Pagination />
					</template>

					<Slide v-for="(item, index) in items" :key="index" :class="currentSlide == index? 'item current' : 'item'">
						<div v-if="item.i == 'toc'" class="inner">
							<div class="head">
								<Icon name="firstTime" class="icon" :theme="currentItem.i === 'premium'? 'light' : undefined" />
								<span class="title">{{$t("changelog.title")}}</span>
								<div class="version">{{ $t('changelog.version', {VERSION:appVersion.split('.').filter(v=>v != '0').join('.')}) }}</div>
							</div>
							<ul class="toc">
								<li v-for="(item, index) in items.filter(v=>v.l)">
									<TTButton :icon="item.i" :premium="item.p" @click="currentSlide = index + 1">{{ item.l }}</TTButton>
								</li>
								<li>
									<TTButton secondary @click="currentSlide = items.length - 1">🫶 🥺 🫶</TTButton>
								</li>
							</ul>
						</div>
						<div v-else-if="buildIndex >= index" class="inner">
							<div class="emoji" v-if="item.i == 'donate'">🥺</div>
							<Icon v-else-if="item.i" :name="item.i" class="icon" />

							<p class="title" v-html="item.l"></p>

							<div class="description" v-html="item.html"></div>

							<TTButton type="link"
								v-if="item.i == 'streamsocket'"
								target="_blank"
								href="https://dashboard.twitch.tv/extensions/1lpj3883m4u6exlgdwzuk627bvpabj"
								icon="streamsocket">{{ $t("changelog.streamsocket_plugin") }}</TTButton>

							<TTButton v-if="item.a"
								icon="test"
								:light="item.p === true"
								:premium="item.p === true"
								@click="$store.params.openParamsPage(item.a.param as TwitchatDataTypes.ParameterPagesStringType, item.a.subparam)">{{ item.a.l }}</TTButton>

							<div class="demo" v-if="(item.v || item.g) && currentSlide == index">
								<img v-if="item.g" :src="item.g" lazy>
								<div v-if="item.v" class="placeholder"><Icon name="play" /></div>
								<video @click="$event => ($event.target as HTMLVideoElement).play()" v-if="item.v" lazy :src="item.v" autoplay loop></video>
							</div>

							<div v-if="item.i=='heat'" class="card-item moreInfo">
								<Icon name="info" />
								<i18n-t scope="global" keypath="changelog.heat_details" tag="span">
									<template #LINK>
										<a :href="$config.HEAT_EXTENSION" target="_blank">{{ $t("changelog.heat_details_link") }}</a>
									</template>
								</i18n-t>
							</div>

							<TTButton type="link" class="elgato"
								v-if="item.i == 'elgato'"
								big
								target="_blank"
								href="https://marketplace.elgato.com/product/twitchat-820f1bb5-465d-408b-aabf-2d46a05a10d9"
								icon="elgato">{{ $t("changelog.streamdeck_plugin") }}</TTButton>

							<!-- <ChangelogLabels v-if="item.i=='label' && currentSlide == index" /> -->
							<!-- <Changelog3rdPartyAnim v-if="item.i=='offline' && currentSlide == index" /> -->

							<template v-if="item.p === true || item.i == 'donate'">
								<TTButton secondary icon="coin" @click="$store.params.openParamsPage(contentDonate)" v-if="item.i == 'donate'">{{ $t("params.categories.donate") }}</TTButton>
								<TTButton premium icon="premium" @click="$store.params.openParamsPage(contentPremium)" v-if="!isPremium">{{ $t("premium.become_premiumBt") }}</TTButton>
								<TTButton primary icon="sub" @click="showPremiumFeatures = true" v-if="!showPremiumFeatures && !isPremium">{{ $t("premium.features_title") }}</TTButton>
								<SponsorTable class="premiumTable" v-if="showPremiumFeatures" expand />
							</template>

							<template v-if="item.y">
								<a :href="item.y" target="_blank" class="youtubeBt">
									<Icon name="youtube" theme="light" />
									<span>{{ $t('overlay.youtube_demo_tt') }}</span>
									<Icon name="newtab" theme="light" />
								</a>
							</template>
						</div>
					</Slide>
				</Carousel>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import { Carousel, Navigation, Pagination, Slide } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';
import TTButton, {TTButton as TTButtonClass} from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import ThemeSelector from '../ThemeSelector.vue';
import ToggleBlock from '../ToggleBlock.vue';
import OverlayCounter from '../overlays/OverlayCounter.vue';
import SponsorTable from '../premium/SponsorTable.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import MessageItem from '../messages/MessageItem.vue';
import { defineAsyncComponent, markRaw } from 'vue';
const ChangelogLabels = defineAsyncComponent({loader: () => import('@/components/changelog/ChangelogLabels.vue')})
const Changelog3rdPartyAnim = defineAsyncComponent({loader: () => import('@/components/changelog/Changelog3rdPartyAnim.vue')})

@Component({
	components:{
		Slide,
		TTButton,
		Carousel,
		MessageItem,
		ToggleBlock,
		ClearButton,
		SponsorTable,
		ThemeSelector,
		OverlayCounter,
		ChangelogLabels,
		Changelog3rdPartyAnim,
		Pagination,
		Navigation,
	},
	emits:["close"]
})
class Changelog extends Vue {

	public showFu:boolean = false;
	public showCode:boolean = false;
	public showMrBean:boolean = false;
	public showReadAlert:boolean = false;
	public showPremiumFeatures:boolean = false;
	public readAtSpeedOfLight:boolean = false;
	public currentSlide:number = 0;
	public buildIndex:number = 0;
	public items:(TwitchatDataTypes.ChangelogEntry & {html:string})[] = []

	private openedAt = 0;
	private closing:boolean = false;
	private slideCountRead = markRaw(new Map<number, boolean>());
	private slideIndexToDuration = markRaw(new Map<number, number>());
	private durationsUpdateTO = -1;
	private keyUpHandler!:(e:KeyboardEvent)=>void;

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }
	public get isPremium():boolean { return this.$store.auth.isPremium; }

	public get classes():string[] {
		const res:string[] = ["changelog", "modal"];
		if(this.showCode) res.push("showCode");
		if(this.currentItem.p === true && !this.showReadAlert && !this.showFu) res.push("premium");
		return res;
	}

	/**
	 * Get currently displayed item data
	 */
	public get currentItem():TwitchatDataTypes.ChangelogEntry { return this.items[this.currentSlide]; }
	public get contentDonate():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.DONATE }
	public get contentPremium():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.PREMIUM }
	public get hasEmoteScope():boolean { return TwitchUtils.hasScopes([TwitchScopes.READ_EMOTES]); }
	public get hasUnbanRequestScope():boolean { return TwitchUtils.hasScopes([TwitchScopes.UNBAN_REQUESTS]); }

	public beforeMount(): void {
		let list = (this.$tm("changelog.highlights") as TwitchatDataTypes.ChangelogEntry[])
				.map( v=> ({
					...v,
					html: ""
				}));
		list.forEach(v=> {
			v.html = this.parseCommonPlaceholders(v.d|| '')
		})
		list.unshift({
			l:"",
			i:"toc",
			html:"",
		})
		this.items = list;
	}

	public mounted(): void {
		this.openedAt = Date.now();

		gsap.set(this.$el as HTMLDivElement, {opacity:0});
		//Leave the view a bit of time to render to avoid lag during transition
		window.setTimeout(()=> {
			gsap.set(this.$el as HTMLDivElement, {opacity:1});
			gsap.from(this.$refs.dimmer as HTMLDivElement, {duration:.25, opacity:0});
			gsap.from(this.$refs.holder as HTMLDivElement, {marginTop:"150px", ease:"back.out", opacity:0, duration:1, clearProps:"all"});
		}, 250);

		this.keyUpHandler = (e:KeyboardEvent) => this.onKeyUp(e);
		document.addEventListener("keyup", this.keyUpHandler);
		this.skinPagination();

		//Stagger items build to avoid lag on open
		let interval = window.setInterval(()=> {
			this.buildIndex += 5;
			if(this.buildIndex >= this.items.length) {
				clearInterval(interval);
			}
		}, 200);

		this.durationsUpdateTO = window.setInterval(() => {
			const duration = this.slideIndexToDuration.get(this.currentSlide) || 0;
			this.slideIndexToDuration.set(this.currentSlide, duration + 250);
			let totalRead = 0;
			let totalDuration = 0;
			for (let i = 0; i < this.items.length; i++) {
				totalRead += this.slideCountRead.get(i) === true? 1 : 0;
				totalDuration += this.slideIndexToDuration.get(i) || 0;
			}
			const pType = this.$store.auth.premiumType;
			if((pType == "patreon" || pType == "") && totalDuration > 40_000 && totalRead > 5) {
				this.showCode = true;
			}
		}, 250);
	}

	public beforeUnmount():void {
		window.clearInterval(this.durationsUpdateTO);
		document.removeEventListener("keyup", this.keyUpHandler);
	}

	public async cancelClose():Promise<void> {
		this.showMrBean = false;
		this.showReadAlert = false;
		this.skinPagination();
	}

	public async close(forceClose:boolean = false, fuMode:boolean = true):Promise<void> {
		if(this.closing) return;

		//If most of the slides haven't been swiped or too quickly, yell at the user
		let minSlidesToRead = Math.floor(this.items.length * .8 - 2); //-1 to ignore TOC and Donate slides
		const didntReadAll = [...this.slideCountRead].length < minSlidesToRead; //don't care about last slide
		this.readAtSpeedOfLight = Date.now() - this.openedAt < minSlidesToRead * 2000 && !didntReadAll;
		if(!forceClose && (didntReadAll || this.readAtSpeedOfLight)) {
			this.showReadAlert = true;
			return;
		}

		this.closing = true;

		if(forceClose) {
			this.showFu = fuMode;
			this.showReadAlert = !fuMode;
			if(fuMode) {
				await this.$nextTick();
				gsap.to(this.$refs.fu as HTMLDivElement, {duration:.5, opacity:0, fontSize:0, ease:"back.in"});
				await Utils.promisedTimeout(500);
			}
			this.$store.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.UPDATE_REMINDER);
		}

		gsap.to(this.$refs.dimmer as HTMLDivElement, {duration:.25, opacity:0});
		gsap.to(this.$refs.holder as HTMLDivElement, {y:"-150px", ease:"back.in", opacity:0, duration:.5, onComplete:()=>{
			this.$emit('close');
		}});

		if(!forceClose && DataStore.get(DataStore.UPDATE_INDEX) != (this.$store.main.latestUpdateIndex as number).toString()) {
			DataStore.set(DataStore.UPDATE_INDEX, this.$store.main.latestUpdateIndex);
		}
	}

	/**
	 * Called when sliding to a new card
	 * @param currentSlideIndex
	 * @param prevSlideIndex
	 * @param slidesCount
	 */
	public onSlideStart(data:{currentSlideIndex:number, prevSlideIndex:number, slidesCount:number, slidingToIndex:number}):void {
		this.slideCountRead.set(data.slidingToIndex, true);
		this.showPremiumFeatures = false;
		(this.$refs.scrollable as HTMLDivElement).scrollTo(0,0);
	}

	/**
	 * Parses common placeholders like {HEAT} or {SHADERTASTIC}
	 * @param str
	 */
	public parseCommonPlaceholders(str:string):string {
		const message = "Congrats for reading! Use command <input readonly value='/_hYUZ8S5_' />";
		str = str.replace(/\{HEAT\}/gi, `<a href="${this.$config.HEAT_EXTENSION}" target="_blank">Heat</a>`);
		str = str.replace(/\{SHADERTASTIC\}/gi, `<a href="https://shadertastic.com" target="_blank">Shadertastic</a>`);
		str = str.replace(/\{_LI\}/gi, `<li class="_code_">${message}</li>`);
		str = str.replace(/\{_.*?\}/gi, `<span class="_code_">${message}</span>`);
		return str;
	}

	/**
	 * Schedule a reminder
	 */
	public reminder():void {
		this.$store.params.updatesReminderEnabled = true;
		this.close(true, false);
	}

	/**
	 * Scroll carousel with keyboard
	 * @param e
	 */
	private onKeyUp(e:KeyboardEvent):void {
		if(e.key == "ArrowLeft") {
			this.currentSlide --;
		}
		if(e.key == "ArrowRight") {
			this.currentSlide ++;
		}
		if(this.currentSlide == this.items.length) this.currentSlide = 0;
		if(this.currentSlide < 0) this.currentSlide = this.items.length -1;
	}

	/**
	 * Apply css to pagination items
	 */
	private skinPagination():void {
		//Define premium class to necessary page items.
		//Dirty way of doing it but <Pagination> component doesn't seem
		//to expose anything to do that in a cleaner way
		this.$nextTick().then(()=> {
			const list = document.getElementsByClassName("carousel__pagination-item");
			for (let i = 0; i < list.length; i++) {
				if(this.items[i].p === true) {
					list[i].classList.add("premium");
				}
				if(this.items[i].i === "donate") {
					list[i].classList.add("rainbow");
				}
			}
		})
	}

}
export default toNative(Changelog);
</script>

<style scoped lang="less">
.changelog{
	z-index: 2;

	&.premium {
		&>.holder {
			color: var(--color-light);
			background-color: var(--color-premium-dark);

			*::-webkit-scrollbar-thumb {
				background: transparent;
				background-color: var(--color-premium-light);
			}

			:deep(a) {
				color: var(--color-secondary-extralight);
			}
		}
	}

	&>.holder {
		width: 600px;
		max-width: ~"min(600px, var(--vw))";
		// height: unset;
		transition: background-color .2s, color .2s;
		margin-top: calc(0px - var(--chat-form-height) / 2) !important;
		max-height: calc(var(--vh) - var(--chat-form-height));
		padding-top: 2.5em;
		overflow: hidden;

		.backBt {
			left: 0;
			right: auto;
			position: absolute;
		}

		.head {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			.icon {
				height: 3em;
				max-height: 3em;
				width: unset;
				max-width: unset;
				margin-bottom: .5em;
			}
			.title {
				padding-left: 0;
			}
		}
		.version {
			text-align: center;
			font-style: italic;
			font-size: .8em;
			opacity: .5;
		}
		.mrbean {
			position: absolute;
			bottom: 0;
			left: 0;
			z-index: 1;
			transition: all 2s;
			transform: translate(0, 100%);
			&.show {
				transform: translate(0, 0);
			}
		}
	}

	.content {
		height: 100%;
		.item {
			align-self: flex-start;
			overflow-y: auto;

			&:not(.current) {
				overflow: hidden;
				max-height: 70vh;
				.inner {
					// height: 100%;
					max-height: 100vh;
				}
			}
			.inner {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 1em;
				padding: 0 3em 1em 3em;
				border-radius: var(--border-radius);
				width: calc(100% - 5px);
				min-height: 100%;

				&>.icon {
					height: 2em;
				}

				.title {
					font-weight: bold;
					font-size: 2.5em;
					line-height: 1.25em;
					text-align: center;
				}
				.description {
					text-align: left;
					font-size: 1em;
					line-height: 1.5em;
					white-space: pre-line;
				}

				.messagePreview {
					width: 100%;
					text-align: left;
					pointer-events: none;
				}

				.demo {
					max-width: calc(100% - 2em);
					// max-height: 400px;
					transition: all .5s;
					overflow: hidden;
					border-radius: var(--border-radius);
					position:relative;
					&:hover {
						max-height: 550px;
						max-width: 100%;
					}

					video, img {
						z-index: 1;
						width: 100%;
						position: relative;
					}
					video {
						cursor: pointer;
					}

					.placeholder {
						position: absolute;
						z-index: 0;
						width: 100%;
						height: 100%;
						display: flex;
						align-items: center;
						justify-content: center;
						background-color: var(--grayout);
						.icon {
							height: 4em;
						}
					}
				}

				.emoji {
					font-size: 7em;
				}

				.moreInfo {
					text-align: left;
					font-style: italic;
					line-height: 1.2em;
					.icon {
						height: 1em;
						margin-right: .25em;
					}
				}

				.messageList {
					gap: .5em;
					display: flex;
					flex-direction: column;
					text-align: left;
				}

				.premiumTable {
					color: var(--color-text);
					background-color: var(--grayout);
				}

				.videos {
					gap: .5em;
					display: flex;
					flex-direction: row;
					.demoLink {
						display: inline;
						margin: auto;
						overflow: visible;
					}
				}
				:deep(ul) {
					margin-left: 1em;
					list-style: disc;
					li {
						text-align: left;
					}
					&:not(li > ul) {
						margin-bottom: 1em;
					}

					&:not(.toc) {
						li {
							text-align: left;
							tab-size: 20px;
							white-space: pre;
						}
					}
				}

				.toc {
					list-style: none;
					display: flex;
					flex-direction: column;
					margin-top: 1em;
					margin-left: 0;
					li {
						margin-bottom: .5em;
						button {
							width:100%;
						}
					}
				}
			}
		}

		:deep(.carousel__next),
		:deep(.carousel__prev) {
			height: 100%;
			position: fixed;
			svg {
				transform: scale(2);
				stroke-width: 3px;
				fill: var(--color-dark);
				stroke-linejoin: round;
				stroke: var(--color-light);
				paint-order: stroke;
				filter: drop-shadow(0 2px 0px rgba(0,0,0,.5));
				transition: transform .25s;
			}
			&.carousel__next {
				right: 6px;
				&:hover>svg {
					transform: scale(2.1) translate(3px);
				}
			}
			&.carousel__prev {
				left: 6px;
				&:hover>svg {
					transform: scale(2.1) translate(-3px);
				}
			}
		}
		:deep(.carousel__pagination) {
			position: sticky;
			transform: unset;
			bottom: 0;
		}
		:deep(.carousel__pagination-button) {
			border-radius: 4px;
			background-color: var(--color-text);
				transition: height .25s, margin-top .25s;
		}
		:deep(.carousel__pagination-button--active) {
			border-radius: 2px;
			height: .75em !important;
			margin-top: -.5em !important;
			transform-origin: bottom center;
		}
		:deep(.carousel__pagination-item.premium) {
			button {
				background-color: var(--color-premium);
			}
		}
		:deep(.carousel__pagination-item.rainbow) {
			button {
				// background: linear-gradient(90deg in hsl longer hue, red 0 50%) 0/800%;
				// animation: rainbowAnimation 20s linear infinite;
				// @keyframes rainbowAnimation {
				// 	to {background-position: 400%}
				// }
				animation: grow 2s infinite alternate;
				@keyframes grow {
					0%,20% {
						height: .5em;
						margin-top: -.25em;
					}
					10%,30%,100% {
						height: var(--vc-pgn-height);
						margin-top: 0;
					}
				}
			}
		}
	}

	.forceRead {
		gap: 1em;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 1em;
		position: relative;
		overflow: hidden;
		.image {
			position: relative;
			img {
				align-self: center;
			}
			.smirk {
				top: 50px;
				left: 70px;
				opacity: 0;
				font-size: 8em;
				position: absolute;
				transition: opacity .5s;
			}
		}

		h2 {
			font-size: 2.5em;
			padding: .5em;
			color: var(--color-light);
			background-color: var(--color-dark);
			margin-top: -.5em;
			white-space: pre-line;
			text-align: center;
		}

		.description {
			font-size: 1.2em;
			line-height: 1.2em;
			white-space: pre-line;
			text-align: left;
		}
	}

	.fu {
		display: block;
		text-align: center;
		font-size: 5em;
		padding: .25em;
	}

	.youtubeBt {
		padding: .5em;
		gap: .5em;
		display: flex;
		flex-direction: row;
		color: var(--color-light);
		text-decoration: none;
		background-color: #cc0000;
		border-radius: var(--border-radius);
		margin: 0 auto;
		align-items: center;
		transition: background-color .25s;
		.icon {
			height: 1em;
			min-height: 20px;
			width: auto;
		}
		&:hover {
			background-color: #ee0000;
		}
	}

	.elgato {
		:deep(.background) {
			background-color: #1c40ff !important;
		}
		&:hover {
			:deep(.background) {
				background-color: lighten(#1c40ff, 10%) !important;
			}
		}
	}

}
@media only screen and (max-width: 600px) {
	.changelog {
		font-size: .9em;
	}
}
</style>

<style lang="less">
.changelog{
	._code_ {
		visibility: hidden;
		width: 0;
		height: 0;
		overflow: hidden;
		margin: 0;
		input {
			background: none;
			width: 100Px;
			border: none;
			padding: 0;
			border-radius: 0;
			margin: 0;
			font-size: .9em;
			outline: none;
			color: var(--color-text);
			font-weight: 300;
		}
	}
	&.showCode {
		._code_ {
			visibility: visible;
			width: unset;
			height: unset;
			overflow: visible;
			margin: unset;
		}
	}
}
</style>
