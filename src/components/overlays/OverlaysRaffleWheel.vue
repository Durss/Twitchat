<template>
	<div class="overlaysrafflewheel">
		<InfiniteList class="list"
		v-if="itemList.length > 0"
		:dataset="itemList"
		:itemSize="itemSize"
		:scrollOffset="scrollOffset"
		:style="listStyles"
		v-slot="{ item }">
			<div class="wheel-item">
				<span class="label">{{ item.label }}</span>
			</div>
		</InfiniteList>
	</div>
</template>

<script lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import InfiniteList from '../InfiniteList.vue';
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
	public listDisplayed:boolean = false;

	private itemsCount:number = 15;
	private rafID:number = 0;
	private animStep:number = 0;
	private frameIndex:number = 0;
	private selectedItemIndex:number = 0;
	private winnerData!:WheelItem;
	private resizeDebounce!:number;
	private prevBiggestItem!:HTMLDivElement;
	private resizeHandler!:()=>void;
	private startWheelHandler!:(e:TwitchatEvent)=>void;
	private wheelPresenceHandler!:(e:TwitchatEvent)=>void;

	public get listStyles():{[key:string]:string|number} {
		return {
			opacity:this.listDisplayed? 1 : 0,
		}
	}

	public async mounted():Promise<void> {
		this.resizeHandler = async ()=> {
			if(this.listHeight != document.body.clientHeight) {
				clearTimeout(this.resizeDebounce);
				if(this.itemList.length > 0) {
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
		
		//Populate with fake data
		/*
		let list:WheelItem[] = [];
		// for (let i = 0; i < 90000; i++) {
		// 	let id = i.toString();
		// 	list.push({id, label:i+"wwwwwwwwwwwwwwwwwwwwwwww", data:{id}});
		// }
		list.push({id:"1", label:"Jujulasurprise", data:{id:"1"}});
		list.push({id:"2", label:"elodieshare", data:{id:"2"}});
		list.push({id:"3", label:"AnneSo_Alia", data:{id:"3"}});
		list.push({id:"4", label:"filanie_couture", data:{id:"4"}});
		list.push({id:"5", label:"Virtalia", data:{id:"5"}});
		list.push({id:"6", label:"maounbuntu", data:{id:"6"}});
		list.push({id:"7", label:"Notablueta", data:{id:"7"}});
		list.push({id:"8", label:"Hootie_L", data:{id:"8"}});
		list.push({id:"9", label:"Durss", data:{id:"9"}});
		this.winnerData = {id:"8", label:"Hootie_L", data:{id:"8"}};
		this.itemList = list;
		// gsap.to(this, {scrollOffset:10000, duration:10});
		this.populate();
		//*/
	}

	public beforeUnmount():void {
		this.rafID ++;
		gsap.killTweensOf(this);
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
		const maxSize = 100;

		let list = this.itemList;
		const expectedSize = maxSize + this.itemsCount;
		let winnerIndex = 0;
		if(list.length > maxSize) {
			//Only keep necessary items count
			//This could be done with way less steps but it wouldn't handle
			//high volume of data. This is made to handle 100 thousands of items
			const tmpList = [];
			const indexPicked:{[key:string]:boolean} = {};
			let failSafe = 0;
			let count = tmpList.length;
			while(count < expectedSize) {
				let index = Math.floor(Math.random() * list.length);
				if(indexPicked[index] !== true && list[index].id != this.winnerData.id) {
					indexPicked[index] = true;
					tmpList.push( list[index] );
					count ++;
				}
				if(++failSafe == 1000000) {
					console.log("FAIL SAFE 2");
					break;
				}
			}
			list = tmpList;

			//Push winner item at the end
			list.push(this.winnerData);
			winnerIndex = list.length - 1;
		}else{
			//Search last index of winner
			Utils.shuffle(list);
			winnerIndex = list.findIndex(item=>{
				return item.id == this.winnerData.id;
			});
			while(winnerIndex < maxSize) {
				winnerIndex += list.length;
			}
		}

		this.itemList = list;
		this.selectedItemIndex = winnerIndex;

		gsap.killTweensOf(this);
		this.renderFrame(this.rafID);
	}

	private renderFrame(id:number):void {
		if(id != this.rafID) return;
		requestAnimationFrame(()=>this.renderFrame(id));

		const items = this.$el.querySelectorAll(".list-item");
		if(items.length == 0) return;

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
			if(this.animStep == 0 && this.frameIndex > 5) {
				//Open animation
				let delay = Math.pow(Math.abs(ratio) * 10, 2.8)/1000;// + Math.random()*.5;
				this.listDisplayed = true;
				gsap.from(item, {duration:.5, x:"-100%", delay, ease:"quad.inOut"});
				let tween = gsap.from(item, {duration:1.5, rotation:(angle*4)+"deg", delay:delay+.2, ease:"elastic.out(1.5,.4)"});
				if(i == 0){
					tween.eventCallback("onComplete", ()=>{
						this.animStep = 2;
						const endOffset = this.selectedItemIndex*this.itemSize - this.listHeight/2 + this.itemSize/2;
						const duration = Math.abs(endOffset - this.scrollOffset)*.001;
						//Scroll down after last item has appeared
						gsap.to(this, {scrollOffset: endOffset, duration, ease:"sine.inOut", onComplete:()=>{
							this.onAnimationComplete();
						}});
					});
				}
				if(i === items.length-1) {
					this.animStep = 1;
				}
			}else if(this.animStep > 1 || this.frameIndex <= 5){
				//Scroll animation
				item.style.transform = "rotateZ("+angle+"deg) translateX("+px+"px)";//scale("+scale+") rotateX("+angle+"deg) translateZ("+pz+"px)";
			}
			if(centerRatio > biggestItemScale) {
				biggestItem = item;
				biggestItemScale = centerRatio;
			}
		}
		this.frameIndex ++;

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

	public async onStartWheel(e:TwitchatEvent):Promise<void> {
		const data = (e.data as unknown) as WheelData;
		this.winnerData = data.winner;
		this.itemList = [];
		await this.$nextTick();//Let vue unmount the component
		this.itemList = data.items;
		this.listDisplayed = false;
		gsap.killTweensOf(this);
		this.populate();
	}

	private async onAnimationComplete():Promise<void> {
		this.rafID ++;
		await this.$nextTick();

		const items = [...(this.$el as HTMLDivElement).querySelectorAll(".list-item")];
		const selectedItem = (this.$el as HTMLDivElement).querySelector(".list-item.selected") as HTMLDivElement;

		gsap.set(selectedItem, {scale:"1", rotate:0, x:0, y:0});
		gsap.from(selectedItem, {scaleY:"2", scaleX:"1.25", rotate:0, x:0, duration:1, delay:.5, immediateRender:false, ease:"elastic.out"});

		items.sort((itemA, itemB) => {
			const rectA = itemA.getBoundingClientRect();
			const rectB = itemB.getBoundingClientRect();
			return rectA.top - rectB.top;
		});
		gsap.to(items, {left:"-110%", duration:.35, ease:"quad.in", stagger:.035, delay:3, onComplete:()=>{
			//Reset everything to free up memory
			this.itemList = [];
		}});

		//Tell twitchat animation completed
		const data = {winner:this.winnerData as unknown} as JsonObject;
		PublicAPI.instance.broadcast(TwitchatEvent.RAFFLE_COMPLETE, data);
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
		// overflow: hidden !important;
		:deep(.list-item) {
			transform-origin: left center;
			.wheel-item {
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
				.label {
					text-overflow: ellipsis;
					overflow: hidden;
					width: 100%;
					padding: 0 .5em;
					text-align: center;
				}
			}
			&.selected {
				z-index: 1;
				width: 100%;
				&>.wheel-item {
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