<template>
	<div class="changelog modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<CloseButton @click="close()" />
			
			<img src="@/assets/icons/update.svg" alt="emergency" class="icon">

			<div class="head">
				<span class="title">{{$t("changelog.major_title")}}</span>
			</div>

			<div class="version">{{ $t('changelog.version', {VERSION:appVersion}) }}</div>

			<div class="content">
				<Carousel class="carousel" :items-to-show="1" :wrap-around="true">
					<template #addons>
						<Navigation />
						<Pagination />
					</template>
					
					<Slide v-for="(item, index) in items" :key="index" class="item">
						<div class="inner">
							<img :src="$image('icons/'+item.i+'.svg')" class="icon">
							<span class="title" v-html="item.l"></span>
							<span class="description" v-html="item.d"></span>
							<img v-if="item.g" class="demo" :src="item.g">
							<video v-if="item.v" class="demo" :src="item.v" autoplay loop controls></video>
							
							<AppLangSelector v-if="item.i=='translate'" />

							<div v-if="item.i=='count'">
								<div class="tryBt">{{ $t('changelog.tryBt') }}</div>
								<div class="counterActions">
									<Button title="10" icon="minus" @click="counterExample.value -=10; progressExample.value -= 10" white />
									<Button title="10" icon="add" @click="counterExample.value +=10; progressExample.value += 10" white />
								</div>
								<OverlayCounter class="counterExample" embed :staticCounterData="counterExample" />
								<OverlayCounter class="counterExample" embed :staticCounterData="progressExample" />
							</div>
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
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import { Carousel, Navigation, Pagination, Slide } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';
import AppLangSelector from '../AppLangSelector.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import OverlayCounter from '../overlays/OverlayCounter.vue';

@Component({
	components:{
		Slide,
		Button,
		Carousel,
		CloseButton,
		ToggleBlock,
		OverlayCounter,
		AppLangSelector,
		Pagination,
		Navigation,
	},
	emits:["close"]
})
export default class Changelog extends Vue {

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }
	
	public counterExample:TwitchatDataTypes.CounterData = {
		id:Utils.getUUID(),
		placeholderKey:"",
		loop:false,
		perUser:false,
		value:50,
		name:"My awesome counter",
		min:false,
		max:false,
	}
	public progressExample:TwitchatDataTypes.CounterData = {
		id:Utils.getUUID(),
		placeholderKey:"",
		loop:false,
		perUser:false,
		value:50,
		name:"My awesome counter",
		min:0,
		max:75,
	}

	public get items():TwitchatDataTypes.ChangelogEntry[] {
		return this.$tm("changelog.highlights") as TwitchatDataTypes.ChangelogEntry[];
	}

	public mounted(): void {
		//Make sure changelog entries are valid.
		//Checks for all the button actions to make sure their values
		//are correct
		const changelogs:TwitchatDataTypes.ChangelogEntry[][] = [
						this.$tm("changelog.highlights") as TwitchatDataTypes.ChangelogEntry[],
					];
		const allowedTypes = Object.values(TwitchatDataTypes.ParameterPages) as TwitchatDataTypes.ParameterPagesStringType[];
		const sParams = this.$store("params");
		let allowedParams:string[] = [];
		allowedParams = allowedParams.concat(Object.keys(this.$store("params").features));
		allowedParams = allowedParams.concat(Object.keys(this.$store("params").appearance));
		changelogs.forEach(v=> {
			if(!Array.isArray(v))return;
			v.forEach(v=>{
				if(v.a && v.a.page && !allowedTypes.includes(v.a.page)) {
					this.$store("main").alert("Invalid parameter page \""+v.a.page+"\" for changelog entry \""+v.l+"\"");
				}
				if(v.a && v.a.param) {
					const chunks:string[] = v.a.param.split(".");
					//@ts-ignore
					if(!sParams[chunks[0]]?.[chunks[1]]) {
						this.$store("main").alert("Invalid parameter value \""+v.a.param+"\" for changelog entry \""+v.l+"\"");
					}
				}
			})
		});

		watch(()=>this.progressExample.value, ()=>{
			//Clamp progress counter value
			let v = this.progressExample.value;
			v = Math.max(this.progressExample.min as number, v);
			v = Math.min(this.progressExample.max as number, v);
			this.progressExample.value = v;
		});
		
		gsap.from(this.$refs.dimmer as HTMLDivElement, {duration:.25, opacity:0});
		gsap.from(this.$refs.holder as HTMLDivElement, {y:"-150px", ease:"back.out", opacity:0, duration:.5});
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

}
</script>

<style scoped lang="less">
.changelog{
	z-index: 2;
	
	.holder {
		width: 600px;
		max-width: min(600px, var(--vw));
		// height: unset;

		& > .icon {
			height: 3em;
			margin-top: 1em;
		}
		.head {
			.title {
				padding-left: 0;
			}
		}
		.version {
			text-align: center;
			font-style: italic;
			font-size: .8em;
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
				color:var(--color-light);
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
					line-height: 1.25em;
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
				}

				.counterActions {
					display: flex;
					flex-direction: row;
					justify-content: center;
					gap: .5em;
					margin-bottom: 1em;
				}

				.counterExample {
					font-size: .75em;
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
				background-color: var(--color-light);
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