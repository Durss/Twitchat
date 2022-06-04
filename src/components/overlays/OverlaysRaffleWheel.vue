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
import { JsonObject } from "type-fest";

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

	private itemsCount:number = 15;
	private rafID:number = 0;
	private animStep:number = 0;
	private resizeHandler!:()=>void;
	private startWheelHandler!:(e:TwitchatEvent)=>void;
	private wheelPresenceHandler!:(e:TwitchatEvent)=>void;
	private resizeDebounce!:number;
	private prevBiggestItem!:HTMLDivElement;
	private frameIndex:number = 0;
	private selectedItemIndex:number = 0;
	private listData:WheelItem[] = [];
	private winnerData!:WheelItem;
	private domObserver!:MutationObserver;

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
		this.wheelPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_PRESENCE); }

		PublicAPI.instance.addEventListener(TwitchatEvent.WHEEL_OVERLAY_START, this.startWheelHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE, this.wheelPresenceHandler);
		
		//The infinite list component doesn't reuse items, it creates new ones
		//everytime whe scroll.
		//Because of that, an item can be added and displayed at its normal
		//place and size for a frame before the renderFrame() takes care of
		//it which makes items glitching at the bottom of the screen when
		//scrolling fast.
		//This observer detects when an item is created and scales it to 0
		//to make sure it's not visible before the renderFrame() sets its
		//expected scale and position properly
		this.domObserver = new MutationObserver((list)=>{
			for (let i = 0; i < list.length; i++) {
				const item = list[i];
				for (let j = 0; j < item.addedNodes.length; j++) {
					const el = item.addedNodes[j] as HTMLDivElement;
					//Only scale list items
					if(el.classList.contains("vue3-infinite-list")
					&& this.animStep >= 1) {
						el.style.transform = "scale(0)";
					}
				}
			}
		});
		// Start observing the target node for configured mutations
		this.domObserver.observe(this.$el, { childList:true, subtree: true });

		//Populate with fake data
		//*
		let list:WheelItem[] = [];
		for (let i = 0; i < 550000; i++) {
			let id = i.toString();
			list.push({id, label:"wwwwwwwwwwwwwwwwwwwwwwwww"+i, data:{id}});
		}
		this.winnerData = Utils.pickRand(list);
		this.listData = list;
		this.populate();
		//*/
	}

	public beforeUnmount():void {
		this.rafID = 0;
		this.domObserver.disconnect();
		window.removeEventListener("resize", this.resizeHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.WHEEL_OVERLAY_START, this.startWheelHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE, this.wheelPresenceHandler);
	}

	/**
	 * Populates the list
	 */
	private async populate():Promise<void> {
		this.rafID ++;
		this.listHeight = document.body.clientHeight;
		this.itemSize = this.listHeight / this.itemsCount * 1.2;
		this.animStep = 0;
		this.frameIndex = 0;
		this.scrollOffset = 0;
		this.selectedItemIndex = 0;
		this.listEnabled = true;//builds the list component
		this.listDisplayed = false;
		const minSize = 200;

		let list = this.listData;
		const baseList = list.slice();
		const expectedSize = minSize + this.itemsCount;
		if(list.length < minSize) {
			Utils.shuffle(list);
			//Duplicate items as many times as necessary to have enough
			//of them for the complete animation
			let failSafe = 0;
			while(list.length < expectedSize){
				const len = Math.min(baseList.length, expectedSize-list.length);
				list = list.concat(baseList.slice(0, len));
				if(++failSafe == 1000000) {
					console.log("FAIL SAFE 1");
					break;
				}
			}
		}else{
			//Only keep necessary items count
			//This could be done with way less steps but it wouldn't hold
			//high volume of data. This is made to handle 100 thousands of items
			const tmpList = [];
			const indexPicked:{[key:string]:boolean} = {};
			let failSafe = 0;
			while(tmpList.length < expectedSize) {
				let index = Math.floor(Math.random() * list.length);
				if(indexPicked[index] !== true) {
					indexPicked[index] = true;
					tmpList.push( list[index] );
				}
				if(++failSafe == 1000000) {
					console.log("FAIL SAFE 2");
					break;
				}
			}
			list = tmpList;
		}

		//Push winner item at the end
		list.push(this.winnerData);
		const winnerIndex = list.length;

		//Add items to end so the animation doesn't break
		let addedCount = 0;
		let failSafe = 0;
		while(addedCount < this.itemsCount) {
			const item:WheelItem = Utils.pickRand(list);
			if(item.id != this.winnerData.id || baseList.length < this.itemsCount/2) {
				list.push(item);
				addedCount ++;
			}
			// console.log(item);
			if(++failSafe == 1000000) {
				console.log("FAIL SAFE 3");
				break;
			}
		}

		this.itemList = list;
		this.selectedItemIndex = winnerIndex - Math.floor(this.itemsCount /2);

		gsap.killTweensOf(this);

		//Need to wait a little for the component to be mounted.
		//The vue3-infinite-list component has a setTimeout() on
		//its mount method so we can't just wait a render frame
		//with $nextTick(). Also it sometimes takes forever to
		//fully mount...
		await Utils.promisedTimeout(100);
		const endScroll = (this.selectedItemIndex - minSize) * this.itemSize;
		this.listDisplayed = true;
		this.scrollOffset = endScroll;
		this.renderFrame(this.rafID);
	}

	private renderFrame(id:number):void {
		if(id != this.rafID) return;
		requestAnimationFrame(()=>this.renderFrame(id));

		const items = this.$el.querySelectorAll(".vue3-infinite-list");
		// if(items.length < this.itemsCount) {
		// 	console.log("Wait a little !", items.length, this.itemsCount);
		// 	this.scrollOffset +=10;
		// 	return;
		// }
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
			const ratio = ((h/2 - cy) / (h/2));//0 on center, 1 on edges
			const centerRatio = 1-Math.abs(ratio);
			const angle = -ratio * 15;
			// const pz = -Math.abs(ratio) * 200;
			const px = -Math.pow(Math.abs(angle),2.2);
			// const scale = Math.round(((Math.abs(Math.cos(ratio))) * .2 + .8)*2000)/2000;
			// item.style.opacity = ((1-Math.abs(ratio))*.2 + .8).toString();
			if(this.animStep == 0 && this.frameIndex > 2) {
				//Open animation
				let delay = Math.pow(Math.abs(ratio) * 10, 2.8)/1000;// + Math.random()*.5;
				gsap.from(item, {duration:.5, x:"-100%", delay, ease:"quad.inOut"});
				let tween = gsap.from(item, {duration:1.5, rotation:(angle*4)+"deg", delay:delay+.2, ease:"elastic.out(1.5,.4)"});
				if(i == items.length-1){
					tween.eventCallback("onComplete", ()=>{
						this.animStep = 2;
						const endOffset = this.selectedItemIndex*this.itemSize;
						const duration = (endOffset - this.scrollOffset)*.001;
						//Scroll down after last item has appeared
						gsap.to(this, {scrollOffset: endOffset, duration, ease:"sine.inOut", onComplete:()=>{
							const data = {winner:this.winnerData as unknown} as JsonObject
							//Tell twitchat animation completed
							PublicAPI.instance.broadcast(TwitchatEvent.RAFFLE_COMPLETE, data);
						}});
					});
					this.animStep = 1;
				}
			}else if(this.animStep > 1 || this.frameIndex <= 2){
				//Scroll animation
				item.style.transform = "rotateZ("+angle+"deg) translateX("+px+"px)";//scale("+scale+") rotateX("+angle+"deg) translateZ("+pz+"px)";
			}
			if(centerRatio > biggestItemScale) {
				biggestItem = item;
				biggestItemScale = centerRatio;
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
		const data = (e.data as unknown) as WheelData;
		this.winnerData = data.winner;
		this.listData = data.items;
		this.populate();
	}
}

export interface WheelItem {
	id:string;
	label:string;
	data:unknown;
}

export interface WheelData {
	items:WheelItem[];
	winner:WheelItem;
}
</script>

<style scoped lang="less">
.overlaysrafflewheel{
	height: 100%;
	@borderWidth: 3px;
	@numberOfItems: 15;
	.list {
		// background-color: white;
		// border-top-right-radius: 50%;
		// border-bottom-right-radius: 50%;
		height: 100%;
		max-width: 700px;
		overflow: hidden !important;
		:deep(.vue3-infinite-list) {
			transform-origin: left center;
			.item {
				border-top-right-radius: 2em;
				border-bottom-right-radius: 2em;
				font-size: ~"calc(100vh / (@{numberOfItems}*2))";
				display: flex;
				justify-content: center;
				align-items: center;
				color: @mainColor_dark;
				height: 100%;
				background-color: @mainColor_light;
				transition: all .5s;
				will-change: transform;//Avoid text jittering
				// border: @borderWidth solid @mainColor_dark;
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
		// 	perspective: 800px;
		// 	perspective-origin: center top;
		// }
	}
}
</style>