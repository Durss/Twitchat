<template>
	<div class="overlaysrafflewheel">
		<InfiniteList class="list" ref="list"
		v-if="listEnabled"
		:style="listStyles"
		:data="itemList"
		:width="'100%'"
		:height="listHeight"
		:itemSize="itemSize"
		:debug="false"
		:scrollOffset="scrollOffset"
		:overscanCount="0"
		v-slot="{ item }">
			<div class="item">{{ item.label }}</div>
		</InfiniteList>
	</div>
</template>

<script lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import InfiniteList from 'vue3-infinite-list';

@Options({
	props:{},
	components:{
		InfiniteList,
	}
})
export default class OverlaysRaffleWheel extends Vue {

	public itemList:WheelItem[] = [];
	public itemSize:number = 50;
	public scrollOffset:number = 0;
	public listHeight:number = 100;
	public listEnabled:boolean = false;
	public listDisplayed:boolean = false;

	private rafID:number = 0;
	private animStep:number = 0;
	private resizeHandler!:()=>void;
	private startWheelHandler!:(e:TwitchatEvent)=>void;
	private resizeDebounce!:number;
	private prevBiggestItem!:HTMLDivElement;
	private frameIndex:number = 0;
	private selectedItemIndex:number = 0;
	private itemsCount:number = 15;
	private listData:WheelItem[] = [];
	private winnerData!:string;

	public get listStyles():{[key:string]:string|number} {
		return {
			opacity:this.listDisplayed? 1 : 0,
		}
	}

	public async mounted():Promise<void> {
		this.resizeHandler = async ()=> {
			if(this.listHeight != document.body.clientHeight) {
				this.listEnabled = false;
				this.listDisplayed = false;
				clearTimeout(this.resizeDebounce);
				if(this.listData.length > 0) {
					//Only populate on resize
					this.resizeDebounce = setTimeout(()=>this.populate(), 50);
				}
			}
		}
		this.resizeHandler();
		window.addEventListener("resize", this.resizeHandler);

		this.startWheelHandler = (e:TwitchatEvent)=>this.onStartWheel(e);
		PublicAPI.instance.addEventListener(TwitchatEvent.START_WHEEL, this.startWheelHandler)
	}

	public beforeUnmount():void {
		this.rafID = 0;
		window.removeEventListener("resize", this.resizeHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.START_WHEEL, this.startWheelHandler)
	}

	/**
	 * Populates the list
	 */
	private async populate():Promise<void> {
		this.listHeight = document.body.clientHeight;
		this.itemSize = this.listHeight / this.itemsCount;
		this.animStep = 0;
		this.frameIndex = 0;
		this.scrollOffset = 0;
		this.selectedItemIndex = 0;
		this.listEnabled = true;
		this.rafID ++;
		this.listDisplayed = false;

		let list = this.listData;
		Utils.shuffle(list);
		//Duplicate items as many times as necessary to have enough
		//of them for the complete animation
		const baseList = list.slice();
		list = list.concat(baseList);
		do {
			list = list.concat(baseList);
		}while(list.length < 200);
		this.itemList = list;

		const offset = 150;
		const sublist = list.slice(offset);
		this.selectedItemIndex = sublist.findIndex(v=>v.data == this.winnerData) + offset - 1;
		this.selectedItemIndex -= Math.floor(this.itemsCount /2)

		gsap.killTweensOf(this);

		//Need to wait a little for the component to be mounted.
		//The put a setTimeout() on the mount method so we can't
		//just wait a frame with $nextTick().
		setTimeout(async ()=> {
			this.renderFrame(this.rafID);
		}, 100)
	}

	private renderFrame(id:number):void {
		if(id != this.rafID) return;
		requestAnimationFrame(()=>this.renderFrame(id));

		const items = this.$el.querySelectorAll(".vue3-infinite-list");
		// const list = this.$refs.list as Vue;
		// const sublistHolder = (list.$el as HTMLDivElement).getElementsByTagName("div")[0] as HTMLDivElement;
		// let offsetY = sublistHolder.getBoundingClientRect().top;
		// sublistHolder.style.perspectiveOrigin = "center "+(-offsetY + this.listHeight/2)+"px";
		const h = this.listHeight;
		let biggestItem!:HTMLDivElement;
		let biggestItemScale = 0;
		for (let i = 0; i < items.length; i++) {
			const item = items[i] as HTMLDivElement;
			const rect = item.getBoundingClientRect();
			const cy = rect.top + rect.height/2;
			const ratio = ((h/2 - cy) / (h/2));
			// const angle = ratio * 45;
			// const pz = -Math.abs(ratio) * 200;
			const py = -ratio * 50;
			const scale = Math.round(((Math.abs(Math.cos(ratio))) * .75 + .25)*2000)/2000;
			item.style.opacity = ((1-Math.abs(ratio))*.2 + .8).toString();
			if(this.animStep == 0 && this.frameIndex > 2) {
				//Open animation
				let delay = Math.pow(Math.abs(ratio) * 10, 2.8)/1000 + Math.random()*.1;
				let tween = gsap.from(item, {duration:1, x:"-100%", delay, ease:"quad.inOut"});
				if(i == items.length-1){
					tween.eventCallback("onComplete", ()=>{
						this.animStep = 2;

						gsap.to(this, {scrollOffset: this.selectedItemIndex*this.itemSize, duration:10, ease:"sine.inOut"});
					});
					this.animStep = 1;
				}
			}else if(this.animStep > 1 || this.frameIndex <= 2){
				//Scroll animation
				item.style.transform = "scale("+scale+") translateY("+py+"px)"; //translateZ("+pz+"px) rotateX("+angle+"deg)
			}
			if(scale > biggestItemScale) {
				biggestItem = item;
				biggestItemScale = scale;
			}
		}
		this.frameIndex ++;
		//Show the list after some frame, once it had time to render to avoid glitches
		this.listDisplayed = this.frameIndex > 3;

		if(this.prevBiggestItem
		&& this.prevBiggestItem != biggestItem
		&& this.prevBiggestItem.classList.contains("selected")) {
			this.prevBiggestItem.classList.remove("selected");
		}
		if(biggestItem) {
			biggestItem.classList.add("selected");
			this.prevBiggestItem = biggestItem;
		}
	}

	public onStartWheel(e:TwitchatEvent):void {
		const data = (e.data as unknown) as {items:WheelItem[], winner:string}
		this.winnerData = data.winner;
		this.listData = data.items;
		this.populate();
	}
}

export interface WheelItem {
	label:string;
	data:unknown;
}
</script>

<style scoped lang="less">
.overlaysrafflewheel{
	height: 100%;
	@borderWidth: 3px;
	.list {
		height: 100%;
		max-width: 700px;
		overflow: hidden !important;
		:deep(.vue3-infinite-list) {
			transform-origin: left center;
			.item {
				border-top-right-radius: 2em;
				border-bottom-right-radius: 2em;
				@numberOfItems: 15;
				font-size: ~"calc(100vh / (@{numberOfItems}*2))";
				display: flex;
				justify-content: center;
				align-items: center;
				color: @mainColor_dark;
				height: 100%;
				background-color: @mainColor_light;
				transition: all .2s;
				will-change: transform;//Avoid text jittering
				border: @borderWidth solid @mainColor_dark;
				border-left: none;
				margin-right: 15%;
			}
			&.selected {
				z-index: 1;
				width: 100%;
				&>.item {
					margin-right: 0;
					background-color: @mainColor_highlight_extralight;
					@scaleAdd: 50%;
					height: calc(100% + @scaleAdd);
					transform: translateY(calc(-@scaleAdd/4 - @borderWidth));
				}
			}
		}
		// &>:deep(div) {
			// perspective: 800px;
			// perspective-origin: center top;
		// }
	}
}
</style>