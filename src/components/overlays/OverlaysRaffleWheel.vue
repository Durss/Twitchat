<template>
	<div class="overlaysrafflewheel">
		<InfiniteList class="list" ref="list"
		v-if="itemList.length > 0"
		:data="itemList"
		:width="'100%'"
		:height="listHeight"
		:itemSize="itemSize"
		:debug="false"
		:scrollOffset="scrollOffset"
		v-slot="{ item }">
			<div class="item" :style="getStyles(item)">{{ item.label }}</div>
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

	private resizeHandler!:()=>void;

	/**
	 * The background color is there to better understand
	 * the scrolling direction
	 * 
	 * @param data
	 */
	public getStyles(data:ListItem):{[key:string]:string} {
		return {
			// backgroundColor: data.color,
		};
	}

	public async mounted():Promise<void> {
		this.resizeHandler = ()=> {
			this.listHeight = document.body.clientHeight;
			this.itemSize = this.listHeight / 7;
		}
		this.resizeHandler();
		document.body.addEventListener("resize", this.resizeHandler);
		
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
				color:baseColor.replace("1", alpha.toString()),
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
			this.scrollOffset = originalItemCount * this.itemSize;
			const endScroll = this.scrollOffset + originalItemCount * this.itemSize;
			gsap.to(this, {duration:10, delay:1, scrollOffset:endScroll, ease:"back.out"});
		},100)
	}

	public beforeDestroy():void {
		document.body.removeEventListener("resize", this.resizeHandler);
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
	.list {
		height: 100%;
		overflow: hidden !important;
		:deep(.vue3-infinite-list) {
			padding-bottom: 10px;
		}
		.item {
			display: flex;
			justify-content: center;
			align-items: center;
			color: @mainColor_light;
			height: 100%;
			background-color: @mainColor_dark;
			box-shadow: 0 2px 2px rgba(0,0,0,.5);
		}
	}
}
</style>