<template>
	<div :class="['overlaysrafflewheel', skin]">
		<InfiniteList class="list"
		v-if="itemList.length > 0"
		ref="listHolder"
		fillWithDuplicates
		:dataset="itemList"
		:itemSize="itemSize"
		:scrollOffset="scrollOffset"
		:style="listStyles"
		noScrollbar
		v-slot="{ item }">
			<div class="wheel-item" id="wheel-item">
				<span class="label">{{ item.label }}</span>
			</div>
		</InfiniteList>

		<div class="stars">
			<div class="starHolder" v-for="s in stars" :style="getStarStyles(s)">
				<svg version="1.1"
				viewBox="0 0 445.2 426.2" style="enable-background:new 0 0 445.2 426.2;"
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
				xml:space="preserve">
					<path class="wheel-star" d="M247.5,16l47.2,95.6c4,8.2,11.8,13.9,20.9,15.2L421,142c22.7,3.3,31.8,31.3,15.4,47.3L360,263.7
						c-6.5,6.4-9.5,15.5-8,24.5l18,105c3.9,22.7-19.9,39.9-40.2,29.2l-94.3-49.6c-8.1-4.2-17.7-4.2-25.8,0l-94.3,49.6
						c-20.3,10.7-44.1-6.6-40.2-29.2l18-105c1.5-9-1.4-18.2-8-24.5L8.9,189.3c-16.5-16-7.4-44,15.4-47.3l105.4-15.3
						c9-1.3,16.8-7,20.9-15.2L197.8,16C207.9-4.7,237.3-4.7,247.5,16z"/>
				</svg>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import InfiniteList from '../InfiniteList.vue';
import type { JsonObject } from "type-fest";
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { ComponentPublicInstance, CSSProperties } from 'vue';

@Component({
	components:{
		InfiniteList,
	}
})
class OverlaysRaffleWheel extends Vue {

	public skin:string = "";
	public itemSize = 50;
	public scrollOffset = 0;
	public listHeight = 100;
	public listDisplayed = false;
	public stars:StarData[] = [];
	public itemList:TwitchatDataTypes.EntryItem[] = [];

	private rafID = 0;
	private prevTs = 0;
	private animStep = 0;
	private endOffset = 0;
	private frameIndex = 0;
	private itemsCount = 15;
	private selectedItemIndex = 0;
	private sessionId = "";
	private winnerData!:TwitchatDataTypes.EntryItem;
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

	public getStarStyles(s:StarData):CSSProperties {
		return {
			opacity: s.a.toString(),
			transform: "translate("+s.x+"px, "+s.y+"px) rotate("+s.r+"deg) scale("+s.s+")",
		}
	}

	public async mounted():Promise<void> {
		this.resizeHandler = async ()=> {
			if(this.listHeight != document.body.clientHeight) {
				clearTimeout(this.resizeDebounce);
				if(this.itemList.length > 0) {
					//Only populate on resize
					this.resizeDebounce = window.setTimeout(()=>this.populate(), 50);
				}
			}
		}
		this.resizeHandler();
		window.addEventListener("resize", this.resizeHandler);

		PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_PRESENCE);

		this.startWheelHandler = (e:TwitchatEvent)=>this.onStartWheel(e);
		this.wheelPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_PRESENCE); }

		PublicAPI.instance.addEventListener(TwitchatEvent.WHEEL_OVERLAY_START, this.startWheelHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE, this.wheelPresenceHandler);

		//Populate with fake data
		/*
		let list:TwitchatDataTypes.EntryItem[] = [];
		for (let i = 0; i < 90000; i++) {
			let id = i.toString();
			// list.push({id, label:"Item "+i});
			list.push({id, label:i+"pouet"});
		}
		this.winnerData = Utils.pickRand(list);
		this.itemList = list;
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

		this.prevTs = Date.now();
		this.renderFrame(this.prevTs, this.rafID);
	}

	private renderFrame(ts:number, id:number):void {
		if(id != this.rafID) return;
		requestAnimationFrame((ts:number)=>this.renderFrame(ts, id));

		const timeScale = (60/1000) * (ts - this.prevTs);
		this.prevTs = ts;

		if(this.stars.length > 0) {
			for (let i = 0; i < this.stars.length; i++) {
				const s = this.stars[i];
				s.x += s.vx;//Do not multiply by timescale. If perfs are low the hearts run out of screen
				s.y += s.vy * timeScale;
				s.r += s.vr * timeScale;
				s.vx *= .94;//Do not multiply by timescale. If perfs are low the hearts run out of screen
				s.a -= s.va * timeScale;
				if(s.a < .01) {
					this.stars.splice(i, 1);
					i--;
				}
			}
			return;
		}

		const items = this.$el.querySelectorAll(".list-item");
		if(items.length == 0) return;

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
					//* Comment to avoid rotation
					tween.eventCallback("onComplete", ()=>{
						this.animStep = 2;
						this.endOffset = this.selectedItemIndex*this.itemSize - this.listHeight/2 + this.itemSize/2;
						const duration = 9;//Math.abs(this.endOffset - this.scrollOffset)*.001;
						//Scroll down after last item has appeared
						gsap.to(this, {scrollOffset: this.endOffset, duration, ease:"sine.inOut", onComplete:()=>{
							window.setTimeout(()=>{
								this.onAnimationComplete();
							},500);
						}});
					});
					//*/
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
			this.prevBiggestItem.getElementsByClassName("wheel-item")[0].classList.remove("selected");
		}
		if(biggestItem) {
			if(this.scrollOffset > this.endOffset*.8) {
				biggestItem.classList.add("selected");
				biggestItem.getElementsByClassName("wheel-item")[0].classList.add("selected");
			}
			this.prevBiggestItem = biggestItem;
		}
	}

	public async onStartWheel(e:TwitchatEvent):Promise<void> {
		const data = (e.data as unknown) as TwitchatDataTypes.WheelData;
		const winner = data.items.find(v=>v.id == data.winner);
		if(!winner) {
			console.log("Invalid winner ID", data.winner);
			return;
		}

		this.sessionId = data.sessionId;
		this.winnerData = winner;
		this.itemList = [];
		this.skin = data.skin || "";
		await this.$nextTick();//Let vue unmount the component
		this.itemList = data.items;
		this.listDisplayed = false;
		gsap.killTweensOf(this);
		this.populate();
	}

	private async onAnimationComplete():Promise<void> {
		await this.$nextTick();

		const items = [...(this.$el as HTMLDivElement).querySelectorAll(".list-item")];
		const selectedItem = (this.$el as HTMLDivElement).querySelector(".list-item.selected") as HTMLDivElement;


		gsap.set(selectedItem, {scale:"1", rotate:0, x:0, y:0});
		gsap.from(selectedItem, {scaleY:"2", scaleX:"1.25", rotate:0, x:0, duration:1,
								onStart:()=> {
									this.burstStars(selectedItem);
								},
								delay:.5, immediateRender:false, ease:"elastic.out"});

		items.sort((itemA, itemB) => {
			const rectA = itemA.getBoundingClientRect();
			const rectB = itemB.getBoundingClientRect();
			return rectA.top - rectB.top;
		});

		gsap.to(items, {left:"-110%", duration:.35, ease:"quad.in", stagger:.035, delay:3,
						onComplete:()=>{
							//Reset everything to free up memory
							this.itemList = [];
							this.rafID ++;
						}});

		//Tell twitchat animation completed
		const data = (this.winnerData as unknown) as JsonObject;
		PublicAPI.instance.broadcast(TwitchatEvent.RAFFLE_RESULT, {winner:data, sessionId:this.sessionId, delay:5000});
	}

	public burstStars(heart:HTMLDivElement):void {
		const holder = (this.$refs.listHolder as ComponentPublicInstance).$el as HTMLDivElement;
		const bounds = heart.getBoundingClientRect();

		// console.log(bounds);
		for (let i = 0; i < 40; i++) {
			const s:StarData = { x:0, vx:0, y:0, vy:0, r:0, vr:0, a:1, va:0, s:0};
			const cx = (holder.offsetWidth)/2;
			const cy = (holder.offsetHeight)/2;
			s.x = cx + (Math.random()-Math.random()) * (bounds.width/2);
			s.y = cy + (Math.random()-Math.random()) * (bounds.height/2);

			const a = Math.atan2(s.y - cy, s.x - cx);

			s.r = Math.random() * 360;
			s.vx = Math.cos(a)*(Math.random() * 4 + 2);
			s.vy = Math.sin(a)*(Math.random() * 10 + 5);
			s.vr = (Math.random() - Math.random()) * 20;
			s.va = Math.random()*.025+.01;
			s.s = Math.random()*1+.15;
			this.stars.push(s);
		}
	}
}

interface StarData {
	x:number;
	y:number;
	vx:number;
	vy:number;
	r:number;
	vr:number;
	a:number;
	va:number;
	s:number;
}

export default toNative(OverlaysRaffleWheel);
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
		width: 50%;
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
				height: 100%;
				color: var(--color-primary);
				background-color: var(--color-light);
				transition: all .5s;
				will-change: transform;//Avoid text jittering
				border-left: none;
				margin-right: 15%;
				.label {
					text-overflow: ellipsis;
					overflow: hidden;
					width: 100%;
					padding: 0 .5em;
					white-space: nowrap;
					text-align: center;
				}
			}
			&.selected {
				z-index: 1;
				width: 100%;
				&>.wheel-item {
					margin-right: 0;
					color: var(--color-light);
					background-color: var(--color-primary);
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

	.stars {
		position: absolute;
		top:0;
		left:0;
		z-index: 1;

		.starHolder {
			position: fixed;
			pointer-events: none;
			width: 50px;
			height: 50px;
			.wheel-star {
				fill:#fff;
			}
		}
	}

	&.etc {
		:deep(.list-item) {
			.wheel-item {
				color: white;
				border: 2px solid #92ffff;
				background-color: #020617;
				border-left-width: 0;
			}
			&.selected {
				&>.wheel-item {
					color: #020617;
					background-color: #92ffff;
				}
			}
		}

	}
}
</style>
