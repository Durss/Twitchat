<template>
	<div :class="classes">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<CloseButton @click="close()" />
			
			<div class="head">
				<Icon name="firstTime" class="icon" :theme="currentItem.i === 'premium'? 'light' : undefined" />
				<span class="title">{{$t("changelog.major_title")}}</span>
				<div class="version">{{ $t('changelog.version', {VERSION:appVersion}) }}</div>
			</div>


			<div class="content">

				<div v-if="showReadAlert" class="forceRead">
					<img src="@/assets/img/barracuda.png" class="barracuda">
					<h2>{{ $t("changelog.forceRead.title") }}</h2>
					<p v-if="readAtSpeedOfLight" class="description">{{ $t("changelog.forceRead.readAtSpeedOfLight") }}</p>
					<p class="description">{{ $t("changelog.forceRead.description") }}</p>
					<Button big @click="showReadAlert=false">{{ $t("changelog.forceRead.sorryBt") }}</Button>
					<Button small alert @click="close(true)">{{ $t("changelog.forceRead.fuBt") }}</Button>
				</div>

				<div v-else-if="showFu" class="fu" ref="fu">🤬</div>

				<Carousel v-else class="carousel" :items-to-show="1" v-model="currentSlide" :wrap-around="true" @slide-end="onSlideEnd">
					<template #addons>
						<Navigation />
						<Pagination />
					</template>
					
					<Slide v-for="(item, index) in items" :key="index" class="item">
						<div class="inner" v-if="item.i != 'donate'">
							<Icon v-if="item.i" :name="item.i" class="icon" :theme="item.i === 'premium'? 'light' : undefined" />
							<span class="title" v-html="item.l"></span>
							<span class="description" v-html="item.d"></span>
							<img v-if="item.g" class="demo" :src="item.g" lazy>
							<video v-if="item.v" class="demo" lazy :src="item.v" autoplay loop controls></video>
							
							<div v-if="item.i=='heat'" class="card-item moreInfo">
								<Icon name="info" />
								<i18n-t scope="global" keypath="changelog.heat_details" tag="span">
									<template #LINK>
										<a :href="$config.HEAT_EXTENSION" target="_blank">{{ $t("changelog.heat_details_link") }}</a>
									</template>
								</i18n-t>
							</div>
							
							<template v-if="item.i=='premium'">
								<Button premium icon="premium" @click="$store('params').openParamsPage(contentPremium)">{{ $t("premium.become_premiumBt") }}</Button>
								<Button secondary icon="sub" @click="showPremiumFeatures = true" v-if="!showPremiumFeatures">{{ $t("premium.features_title") }}</Button>
								<SponsorTable class="premiumTable" v-if="showPremiumFeatures" />
							</template>
						</div>
						<div v-else class="inner donate">
							<div class="emoji">🥺</div>
							<div class="description" v-html="item.d"></div>
							<Button icon="coin" href="https://twitchat.fr/sponsor" target="_blank" type="link">{{ $t("about.sponsor") }}</Button>
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
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import { Carousel, Navigation, Pagination, Slide } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import ThemeSelector from '../ThemeSelector.vue';
import ToggleBlock from '../ToggleBlock.vue';
import OverlayCounter from '../overlays/OverlayCounter.vue';
import SponsorTable from '../premium/SponsorTable.vue';

@Component({
	components:{
		Slide,
		Button,
		Carousel,
		ToggleBlock,
		CloseButton,
		SponsorTable,
		ThemeSelector,
		OverlayCounter,
		Pagination,
		Navigation,
	},
	emits:["close"]
})
export default class Changelog extends Vue {

	public showFu:boolean = false;
	public showReadAlert:boolean = false;
	public showPremiumFeatures:boolean = false;
	public readAtSpeedOfLight:boolean = false;
	public currentSlide:number = 0;
	
	private openedAt = 0;
	private closing:boolean = false;
	private slideCountRead = new Map();
	private keyUpHandler!:(e:KeyboardEvent)=>void;
	
	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }
	
	public get classes():string[] {
		const res:string[] = ["changelog", "modal"];
		if(this.currentItem.i === "premium") res.push("premium");
		return res;
	}

	/**
	 * Get currently displayed item data
	 */
	public get currentItem():TwitchatDataTypes.ChangelogEntry { return this.items[this.currentSlide]; }

	/**
	 * Get carousel items
	 */
	public get items():TwitchatDataTypes.ChangelogEntry[] {
		return this.$tm("changelog.highlights") as TwitchatDataTypes.ChangelogEntry[];
	}

	public get contentPremium():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.PREMIUM }

	public mounted(): void {
		this.openedAt = Date.now();
		
		gsap.set(this.$el as HTMLDivElement, {opacity:0});
		//Leave the view a bit of time to render to avoid lag during transition
		setTimeout(()=> {
			gsap.set(this.$el as HTMLDivElement, {opacity:1});
			gsap.from(this.$refs.dimmer as HTMLDivElement, {duration:.25, opacity:0});
			gsap.from(this.$refs.holder as HTMLDivElement, {marginTop:"150px", ease:"back.out", opacity:0, duration:1, clearProps:"all"});
		}, 250);

		this.keyUpHandler = (e:KeyboardEvent) => this.onKeyUp(e);
		document.addEventListener("keyup", this.keyUpHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("keyup", this.keyUpHandler);
	}

	public async close(forceClose:boolean = false):Promise<void> {
		if(this.closing) return;

		//If not all slides have been read or spent less than 30s on it
		const didntReadAll = [...this.slideCountRead].length < this.items.length - 1; //don't care about last slide
		this.readAtSpeedOfLight = Date.now() - this.openedAt < 30 * 1000 && !didntReadAll;
		if(!forceClose && (didntReadAll || this.readAtSpeedOfLight)) {
			this.showReadAlert = true;
			return;
		}

		this.closing = true;
		
		if(forceClose) {
			this.showFu = true;
			this.showReadAlert = false;
			await this.$nextTick();
			gsap.to(this.$refs.fu as HTMLDivElement, {duration:.5, opacity:0, fontSize:0, ease:"back.in"});
			await Utils.promisedTimeout(500);

			this.$store("chat").sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.UPDATE_REMINDER);
		}

		gsap.to(this.$refs.dimmer as HTMLDivElement, {duration:.25, opacity:0});
		gsap.to(this.$refs.holder as HTMLDivElement, {y:"-150px", ease:"back.in", opacity:0, duration:.5, onComplete:()=>{
			this.$emit('close');
		}});

		if(DataStore.get(DataStore.UPDATE_INDEX) != (this.$store("main").latestUpdateIndex as number).toString()) {
			DataStore.set(DataStore.UPDATE_INDEX, this.$store("main").latestUpdateIndex);
		}
	}

	/**
	 * Called when sliding to a new card
	 * @param currentSlideIndex 
	 * @param prevSlideIndex 
	 * @param slidesCount 
	 */
	public onSlideEnd(data:{currentSlideIndex:number, prevSlideIndex:number, slidesCount:number}):void {
		this.slideCountRead.set(data.currentSlideIndex, true);
		this.showPremiumFeatures = false;
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

}
</script>

<style scoped lang="less">
.changelog{
	z-index: 2;

	&.premium {
		.holder {
			color: var(--color-light);
			background-color: var(--color-premium-dark);
			
			*::-webkit-scrollbar-thumb {
				background: transparent;
				background-color: var(--color-premium-light);
			}
		}
	}
	
	.holder {
		width: 600px;
		max-width: ~"min(600px, var(--vw))";
		// height: unset;
		transition: background-color .2s, color .2s;
		margin-top: calc(0px - var(--chat-form-height) / 2) !important;
		max-height: calc(var(--vh) - var(--chat-form-height));

		.head {
			display: flex;
			flex-direction: column;
			align-items: center;
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
	}


	.content {
		.item {
			align-self: flex-start;
			overflow-y: auto;
			.inner {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 1em;
				padding: 1em 3em;
				border-radius: var(--border-radius);
				width: calc(100% - 5px);

				.icon {
					height: 2em;
				}

				.title {
					font-weight: bold;
					font-size: 2.5em;
					line-height: 1.25em;
					text-align: center;
				}
				.description {
					text-align: justify;
					font-size: 1em;
					line-height: 1.5em;
				}

				.demo {
					max-width: calc(100% - 2em);
					max-height: 400px;
					transition: all .5s;
					&:hover {
						max-height: 550px;
						max-width: 100%;
					}
				}

				&.donate {
					.emoji {
						font-size: 7em;
					}
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

				.premiumTable {
					color: var(--color-text);
					background-color: var(--grayout);
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
		:deep(.carousel__pagination-button) {
			&:after {
				background-color: var(--color-text);
			}
		}
		:deep(.carousel__pagination-button--active) {
			&:after {
				background-color: var(--color-secondary);
				transform: scaleY(2);
			}
		}
		:deep(.carousel__pagination-item:nth-last-child(2)) {
			button:after {
				background-color: var(--color-premium);
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
		img {
			align-self: center;
		}

		h2 {
			font-size: 2.5em;
			padding: .5em;
			color: var(--color-light);
			background-color: var(--color-dark);
			margin-top: -1em;
			white-space: pre-line;
			text-align: center;
		}
		
		.description {
			font-size: 1.3em;
			line-height: 1.3em;
			white-space: pre-line;
			text-align: justify;
		}
	}

	.fu {
		display: block;
		text-align: center;
		font-size: 5em;
		padding: .25em;
	}
}
</style>