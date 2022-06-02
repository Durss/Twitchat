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

	public itemList:ListItem[] = [];
	public itemSize:number = 50;
	public scrollOffset:number = 0;
	public listHeight:number = 100;
	public listEnabled:boolean = false;
	public listDisplayed:boolean = false;

	private inc:number = .1;
	private vy:number = 0;
	private vy_eased:number = 0;
	private rafID:number = 0;
	private animStep:number = 0;
	private resizeHandler!:()=>void;
	private resizeDebounce!:number;
	private prevBiggestItem!:HTMLDivElement;
	private frameIndex:number = 0;

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
				this.rafID = Math.random();
				clearTimeout(this.resizeDebounce);
				this.resizeDebounce = setTimeout(()=>this.populate(), 50);
			}
		}
		this.resizeHandler();
		window.addEventListener("resize", this.resizeHandler);
	}

	public beforeUnmount():void {
		this.rafID = 0;
		window.removeEventListener("resize", this.resizeHandler);
	}

	private async populate():Promise<void> {
		await this.$nextTick();
		this.listHeight = document.body.clientHeight;
		this.itemSize = this.listHeight / 15;
		this.scrollOffset = 0;
		this.listEnabled = true;

		let list = [];
		let len = 100;
		let baseColor = Utils.getLessVars().mainColor_dark as string;
		baseColor = baseColor.replace("rgb", "rgba");
		baseColor = baseColor.replace(")", ",1)");
		for (let i = 0; i < len; i++) {
			const alpha = Math.sin(i/(len*.5) * Math.PI * 2)*.025+.025 + .95;
			list.push({
				label:"Entry "+i, 
				value:i, 
				// alpha:(i%20)/20 * .05,
				// alpha:Math.sin(i/(len*.5) * Math.PI * 2)*.025+.025,
				color:baseColor.replace("1)", alpha.toString()+")"),
			});
		}

		Utils.shuffle(list);
		//Duplicate items as many times as necessary to have enough
		//of them for the complete animation
		const baseList = list.slice();
		do {
			list = list.concat(baseList);
		}while(list.length < 200);
		this.itemList = list;

		//Need to wait a little for the component to be mounted.
		//The put a setTimeout() on the mount method so we can't
		//just wait a frame with $nextTick().
		setTimeout(()=>{
			this.scrollOffset = 10 * this.itemSize;
			//Give it a bit of time to actually scroll
			setTimeout(async ()=> {
				this.vy = -5;
				this.vy_eased = this.vy;
				this.renderFrame(this.rafID);
			}, 100)
		},100);
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

		// console.log(offsetY);
		if(this.prevBiggestItem
		&& this.prevBiggestItem != biggestItem
		&& this.prevBiggestItem.classList.contains("selected")) {
			this.prevBiggestItem.classList.remove("selected");
		}
		if(biggestItem) {
			biggestItem.classList.add("selected");
			this.prevBiggestItem = biggestItem;
		}

		const slowOffset = Math.min(100, this.itemList.length*2/3) * this.itemSize;
		if(this.animStep > 1) {
			this.vy_eased += (this.vy - this.vy_eased) * .1;
			if(this.vy < 20 && this.animStep == 2) {
				//Accelerate
				this.vy += this.inc;
			}else if(this.scrollOffset > slowOffset){
				const endY = slowOffset*1.5;
				const ease = Math.max(.01, (100-Math.min(100,(endY-this.scrollOffset)))/1000);
				console.log(ease);
				this.scrollOffset += (endY - this.scrollOffset) * ease;
				this.animStep = 3;
			}
			if(this.animStep == 2){
				this.scrollOffset += this.vy_eased;
			}
		}
	}
}

interface ListItem {
	label:string;
	value:number;
	color:string;
}
</script>

<style scoped lang="less">
.overlaysrafflewheel{
	height: 100%;
	@borderWidth: 3px;
	.list {
		height: 100%;
		max-width: 700px;
		// overflow: hidden !important;
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