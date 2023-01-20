<template>
	<div class="changelog">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder">
			
			<img src="@/assets/icons/update_purple.svg" alt="emergency" class="icon">
			
			<button class="closeBt" @click="close()"><img src="@/assets/icons/cross.svg"></button>

			<div class="head">
				<span class="title">{{$t("changelog.major_title")}}</span>
			</div>

			<div class="version">{{ $t('changelog.version', {VERSION:appVersion}) }}</div>

			<div class="content">
				<Carousel :items-to-show="1" :wrap-around="true">
					<template #addons>
						<Navigation />
						<Pagination />
					</template>
					
					<Slide v-for="(item, index) in items" :key="index" class="item">
						<div class="inner">
							<span class="title" v-html="item.l"></span>
							<span class="description" v-html="item.d"></span>
							<img v-if="item.g" class="demo" :src="item.g">
							<AppLangSelector v-if="item.i=='translate'" class="langSelector" />
						</div>
					</Slide>
				</Carousel>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';
import AppLangSelector from '../AppLangSelector.vue';
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'
import 'vue3-carousel/dist/carousel.css'

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
		AppLangSelector,
		Carousel,
		Slide,
		Pagination,
		Navigation,
	}
})
export default class Changelog extends Vue {

	public get appVersion():string { return import.meta.env.PACKAGE_VERSION; }

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
		const allowedTypes = Object.values(TwitchatDataTypes.ParamsCategories) as TwitchatDataTypes.ParamsContentStringType[];
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
		})
	}

	public close():void {
		gsap.to(this.$refs.dimmer as HTMLDivElement, {duration:.25, opacity:0});
		gsap.to(this.$refs.holder as HTMLDivElement, {scaleX:0, ease:"elastic.out", duration:1});
		gsap.to(this.$refs.holder as HTMLDivElement, {scaleY:0, ease:"elastic.out", duration:1, delay:.1, onComplete:()=>{
			this.$emit('close');
		}});
	}

}
</script>

<style scoped lang="less">
.changelog{
	.modal();
	z-index: 2;
	
	.holder {
		line-height: 1.2em;
		width: 600px;
		max-width: 600px;
		margin-left: calc((100vw - 600px)/2);
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
			margin-top: .25em;
		}

		.closeBt {
			position: absolute;
			top: 1em;
			right: 1em;
			height: 2em;
			img {
				height: 100%;
			}
		}
	}


	.content {
		.item {
			align-self: flex-start;
			.inner {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 1em;
				padding: 1em 3em;
				color:@mainColor_light;
				border-radius: @border_radius;
				background-color: @mainColor_normal;
				width: calc(100% - 5px);

				.title {
					color: @mainColor_light;
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
					max-height: 400px;
					transition: max-height .5s;
					&:hover {
						max-height: 550px;
					}
				}
			}
		}
		
		:deep(.carousel__next),
		:deep(.carousel__prev) {
			height: 100%;
			svg {
				fill: @mainColor_light;
				stroke-width: 3px;
				stroke-linejoin: round;
				stroke: @mainColor_normal;
				paint-order: stroke;
				filter: drop-shadow(0 2px 0px fade(@mainColor_dark, 50%));
			}
		}
		:deep(.carousel__pagination) {
			margin-top: 1em;
		}
	}
	
	.langSelector {
		:deep(label){
			color:@mainColor_light;
		}
	}
}
</style>