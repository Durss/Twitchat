<template>
	<div class="changelog modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<CloseButton @click="close()" />
			
			<div class="head">
				<Icon name="firstTime" class="icon" />
				<span class="title">{{$t("changelog.major_title")}}</span>
				<div class="version">{{ $t('changelog.version', {VERSION:appVersion}) }}</div>
			</div>


			<div class="content">
				<Carousel class="carousel" :items-to-show="1" :wrap-around="true" @slide-end="onSlideEnd">
					<template #addons>
						<Navigation />
						<Pagination />
					</template>
					
					<Slide v-for="(item, index) in items" :key="index" class="item">
						<div class="inner" v-if="item.i != 'donate'">
							<Icon :name="item.i" class="icon" />
							<span class="title" v-html="item.l"></span>
							<span class="description" v-html="item.d"></span>
							<img v-if="item.g" class="demo" :src="item.g">
							<video v-if="item.v" class="demo" :src="item.v" autoplay loop controls></video>
							
							<div v-if="item.i=='theme'">
								<div class="tryBt">{{ $t('changelog.tryBt') }}</div>
								<ThemeSelector />
							</div>
							
							<div v-if="item.i=='elgato'">
								<Button href="https://apps.elgato.com/plugins/fr.twitchat"
								target="_blank"
								icon="elgato"
								type="link">{{ $t("changelog.get_streamdeck") }}</Button>
							</div>

							<div v-if="item.i=='count'">
								<div class="tryBt">{{ $t('changelog.tryBt') }}</div>
								<div class="counterActions">
									<Button icon="add" @click="addUserCounter()" :disabled="userExample.leaderboard!.length >= 7"></Button>
									<Button icon="trash" @click="delUserCounter()" :disabled="userExample.leaderboard!.length < 2"></Button>
									<Button icon="dice" @click="randomUserCounter()"></Button>
								</div>
								<OverlayCounter class="counterExample" embed :staticCounterData="userExample" />
							</div>
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
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import { Carousel, Navigation, Pagination, Slide } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import ThemeSelector from '../ThemeSelector.vue';
import ToggleBlock from '../ToggleBlock.vue';
import OverlayCounter from '../overlays/OverlayCounter.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import DataStore from '@/store/DataStore';

@Component({
	components:{
		Slide,
		Button,
		Carousel,
		CloseButton,
		ToggleBlock,
		OverlayCounter,
		ThemeSelector,
		Pagination,
		Navigation,
	},
	emits:["close"]
})
export default class Changelog extends Vue {

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }

	private isFirstCounterDisplay = true;
	
	public userExample:TwitchatDataTypes.CounterData = {
		id:Utils.getUUID(),
		placeholderKey:"",
		loop:false,
		perUser:true,
		value:50,
		name:"My awesome counter",
		min:false,
		max:false,
		users:{},
		leaderboard:[],
	}

	public get items():TwitchatDataTypes.ChangelogEntry[] {
		return this.$tm("changelog.highlights") as TwitchatDataTypes.ChangelogEntry[];
	}

	public mounted(): void {
		TwitchUtils.getFakeUsers().then(res => {
			this.userExample.leaderboard = [];
			for (let i = 0; i < 3; i++) {
				let points = Math.round(Math.random()*10);
				this.userExample.users![res[i].id] = points;
				this.userExample.leaderboard.push({
					avatar:res[i].avatarPath || "",
					login:res[i].displayName,
					points,
				});
			}
			this.userExample.leaderboard!.sort((a,b)=> {
				return b.points - a.points;
			});
		});
		
		gsap.set(this.$el as HTMLDivElement, {opacity:0});
		//Leave the view a bit of time to render to avoid lag during transition
		setTimeout(()=> {
			gsap.set(this.$el as HTMLDivElement, {opacity:1});
			gsap.from(this.$refs.dimmer as HTMLDivElement, {duration:.25, opacity:0});
			gsap.from(this.$refs.holder as HTMLDivElement, {marginTop:"150px", ease:"back.out", opacity:0, duration:1, clearProps:"all"});
		}, 250);
	}

	public close():void {
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
		if(data.currentSlideIndex && this.isFirstCounterDisplay) {
			this.isFirstCounterDisplay = false;
			setTimeout(()=> {
				this.addUserCounter();
			}, 1500);
			setTimeout(()=> {
				this.addUserCounter();
			}, 2000);
		}
	}

	/**
	 * Add a user to the counter
	 */
	public addUserCounter():void {
		TwitchUtils.getFakeUsers().then(res => {
			// console.log(res);
			for (let i = 0; i < res.length; i++) {
				const user = res[i];
				//User already in the list, ignore it
				if(this.userExample.leaderboard!.findIndex(v=>v.login == user.displayName) > -1) continue;
				
				let points = Math.round(Math.random()*10);
				this.userExample.users![res[i].id] = points;
				this.userExample.leaderboard!.push({
					avatar:res[i].avatarPath || "",
					login:res[i].displayName,
					points,
				});
				break;
			}
			this.userExample.leaderboard!.sort((a,b)=> {
				return b.points - a.points;
			});
		});
	}

	/**
	 * Delete a random user from the counter
	 */
	public delUserCounter():void {
		this.userExample.leaderboard?.splice( Math.floor(Math.random() * this.userExample.leaderboard.length), 1 )
	}

	/**
	 * Add a random value to a random user counter
	 */
	public randomUserCounter():void {
		let add = Math.round((Math.random()-Math.random()) * 5);
		Utils.pickRand(this.userExample.leaderboard!).points += add || 1;
		this.userExample.leaderboard!.sort((a,b)=> {
			return b.points - a.points;
		});
	}

}
</script>

<style scoped lang="less">
.changelog{
	z-index: 2;
	
	.holder {
		width: 600px;
		max-width: ~"min(600px, var(--vw))";
		// height: unset;

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
				color:var(--color-text);
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

				.tryBt {
					margin-bottom: .5em;
					font-weight: bold;
				}

				.counterActions {
					display: flex;
					flex-direction: row;
					justify-content: center;
					gap: .5em;
					margin-bottom: 1em;
					.button {
						width: 2em;
					}
				}

				.counterExample {
					font-size: .75em;
					color: var(--color-dark);
				}

				&.donate {
					.emoji {
						font-size: 7em;
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
	}
}
</style>