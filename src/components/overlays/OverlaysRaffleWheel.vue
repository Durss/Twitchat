<template>
	<div class="overlaysrafflewheel">
		<InfiniteList class="list" ref="list"
		v-show="listDisplayed"
		v-if="listEnabled"
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

		// const originalItemCount = list.length;
		list = list.concat(list);
		do {
			list = list.concat(list);
		}while(list.length < 500);
		this.itemList = list;
		const originalItemCount = Math.round(list.length/3);

		//Need to wait a little for the component to be mounted.
		//The put a setTimeout() on the mount method so we can't
		//just wait a frame with $nextTick().
		setTimeout(()=>{
			this.scrollOffset = 5 * this.itemSize;
			//Give it a bit of time to actually scroll
			setTimeout(()=> {
				this.renderFrame(this.rafID);
				this.vy = -5;
				this.vy_eased = this.vy;
				//Show the list only then, once it had time to render to avoid glitches
				this.listDisplayed = true;
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
			const scale = (Math.abs(Math.cos(ratio))) * .75 + .25;
			item.style.opacity = ((1-Math.abs(ratio))*.2 + .8).toString();
			item.style.transform = "scale("+scale+") translateY("+py+"px)"; //translateZ("+pz+"px) rotateX("+angle+"deg)
			if(scale > biggestItemScale) {
				biggestItem = item;
				biggestItemScale = scale;
			}
		}
		// console.log(offsetY);
		if(this.prevBiggestItem
		&& this.prevBiggestItem != biggestItem
		&& this.prevBiggestItem.classList.contains("selected")) {
			this.prevBiggestItem.classList.remove("selected");
		}
		biggestItem.classList.add("selected");
		this.prevBiggestItem = biggestItem;

		this.scrollOffset += this.vy_eased;
		if(this.vy < 10 && this.animStep == 0) {
			this.vy += this.inc;
		}else{
			if(this.animStep < 2) {
				this.animStep = 1;
				this.vy *= .995;
			}else if(this.animStep == 2){
				this.vy *= .95;
				this.inc *= .95;
			}
		}
		this.vy_eased += (this.vy - this.vy_eased) * .1;
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