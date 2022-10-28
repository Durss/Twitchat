<template>
	<component :is="nodeType" class="infinitelist" @wheel="onWheel($event)">
		<div v-for="(item, index) in items" :key="index" class="list-item"
		:style="getStyles(index)">
			<slot
				:item="item.data"
				:index="index">
			</slot>
		</div>
		
		<div class="scrollbar" ref="scrollbar" v-if="showScrollbar">
			<div class="scrollCursor" ref="cursor" :style="cursorStyles"></div>
		</div>
	</component>
</template>

<script lang="ts">
import type { StyleValue } from 'vue';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		nodeType:{
			type:String,
			default:"div"
		},
		itemSize:{
			type:Number,
			default:50
		},
		itemMargin:{
			type:Number,
			default:0
		},
		listHeight:{
			type:Number,
			default:500
		},
		scrollOffset:{
			type:Number,
			default:0
		},
		lockScroll:{
			type:Boolean,
			default:false
		},
		noScrollbar:{
			type:Boolean,
			default:false
		},
		dataset:{
			type: [Array],
			default: [],
			required: true,
		},
	},
	components:{},
	emits:['update:scrollOffset'],
})
export default class InfiniteList extends Vue {

	public nodeType!:string;
	public itemSize!:number;
	public itemMargin!:number;
	public listHeight!:number;
	public scrollOffset!:number;
	public lockScroll!:boolean;
	public noScrollbar!:boolean;
	// public scrollOffset:number = 0;
	public dataset!:unknown[];

	public items:IListItem[] = [];
	public scrollOffset_local:number = 0;
	public scrollOffset_local_eased:number = 0;
	public cursorY:number = 0;
	public cursorSize:number = 0;

	private mouseY:number = 0;
	private cursorOffsetY:number = 0;
	private draggingCursor:boolean = false;
	private disposed:boolean = false;
	private trackPressed:boolean = false;
	private dragStartHandler!:(e:MouseEvent|TouchEvent) => void;
	private dragHandler!:(e:MouseEvent|TouchEvent) => void;
	private dragStopHandler!:(e:MouseEvent|TouchEvent) => void;

	public getStyles(i:number):(StyleValue | undefined){
		return {
			height: this.itemSize + "px",
			top: this.items[i].py + "px",
		};
	}

	public get cursorStyles():StyleValue {
		return {
			top:this.cursorY+"px",
			height:this.cursorSize+"px",
		}
	}

	public get showScrollbar():boolean { return this.noScrollbar === false; }

	public mounted():void {
		this.scrollOffset_local = this.scrollOffset;
		watch(() => this.scrollOffset, () => {
			if(this.scrollOffset_local_eased === this.scrollOffset) return;//Avoid useless render
			this.scrollOffset_local_eased = this.scrollOffset;
		});
		
		if(this.showScrollbar){
			const scrollbar = this.$refs["scrollbar"] as HTMLDivElement;
			const scrollbarCursor = this.$refs["cursor"] as HTMLDivElement;

			this.dragStartHandler = (e:MouseEvent|TouchEvent) => this.onDragStart(e);
			this.dragHandler = (e:MouseEvent|TouchEvent) => this.onDrag(e);
			this.dragStopHandler = (e:MouseEvent|TouchEvent) => this.onDragStop(e);
	
			scrollbar.addEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.addEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.addEventListener("touchstart", this.dragStartHandler);
			document.addEventListener("mousemove", this.dragHandler);
			document.addEventListener("touchmove", this.dragHandler);
			document.addEventListener("mouseup", this.dragStopHandler);
			document.addEventListener("touchend", this.dragStopHandler);
		}

		requestAnimationFrame(()=>this.renderList());
	}

	public beforeUnmount(): void {
		this.disposed = true;
		if(this.showScrollbar){
			const scrollbar = this.$refs["scrollbar"] as HTMLDivElement;
			const scrollbarCursor = this.$refs["cursor"] as HTMLDivElement;
			
			scrollbar.addEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.removeEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.removeEventListener("touchstart", this.dragStartHandler);
			document.removeEventListener("mousemove", this.dragHandler);
			document.removeEventListener("touchmove", this.dragHandler);
			document.removeEventListener("mouseup", this.dragStopHandler);
			document.removeEventListener("touchend", this.dragStopHandler);
		}
	}

	public onWheel(e:WheelEvent):void {
		this.scrollOffset_local += e.deltaY * .5;
		e.preventDefault()
	}


	private onDragStart(e:MouseEvent | TouchEvent):void {
		e.preventDefault();
		this.onDrag(e);
		const scrollbar			= this.$refs["scrollbar"] as HTMLDivElement;
		const scrollbarCursor	= this.$refs["cursor"] as HTMLDivElement;
		const scrollbarCursor_b	= scrollbarCursor.getBoundingClientRect();
		this.cursorOffsetY		= this.mouseY - scrollbarCursor_b.top;
		if(e.target == scrollbar) {
			this.trackPressed	= true;
		}else{
			this.draggingCursor = true;
		}
	}

	private onDrag(e:MouseEvent | TouchEvent):void {
		if(e.type == "mousemove" || e.type == "mousedown") {
			this.mouseY = (e as MouseEvent).clientY;
		}else{
			this.mouseY = (e as TouchEvent).touches[0].clientY;
		}
	}

	private onDragStop(e:MouseEvent | TouchEvent):void {
		this.draggingCursor		= false;
		this.trackPressed	= false;
	}
	
	private async renderList():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderList());

		const bounds			= this.$el.getBoundingClientRect();
		const itemsCount		= Math.ceil( bounds.height / (this.itemSize + this.itemMargin) ) + 2;

		this.scrollOffset_local_eased += (this.scrollOffset_local - this.scrollOffset_local_eased) * .1;

		if(itemsCount != this.items.length) {
			const items:IListItem[] = [];
			for (let i = 0; i < itemsCount; i++) {
				items.push({id:i, data:this.dataset[i], py:0});
			}
			this.items = items;
		}

		const maxScrollY = this.dataset.length*(this.itemSize+this.itemMargin) - bounds.height;
		if(this.lockScroll !== false) {
			if(this.scrollOffset_local_eased < 0) {
				this.scrollOffset_local = this.scrollOffset_local_eased = 0;
			}
			if(this.scrollOffset_local_eased > maxScrollY) {
				this.scrollOffset_local = this.scrollOffset_local_eased = maxScrollY;
			}
		}

		const ih = (this.itemSize + this.itemMargin);
		for (let i = 0; i < this.items.length; i++) {
			const len = this.items.length;
			let index:number = (i - this.scrollOffset_local_eased/ih)%len;
			if(index < -1) index += len;
			let py:number = index * ih;
			py -= ih;//offset all from one item to top to avoid a gap when scrolling to top	
			
			let dataIndex:number = Math.round((py+this.scrollOffset_local_eased)/ih);
			dataIndex = dataIndex % this.dataset.length;
			if(dataIndex < 0) dataIndex += this.dataset.length;
			
			this.items[i].py = py;
			this.items[i].data = this.dataset[dataIndex];
		}

		if(this.showScrollbar){
			const scrollbar			= this.$refs["scrollbar"] as HTMLDivElement;
			const scrollbar_b		= scrollbar.getBoundingClientRect();
			const scrollbarCursor	= this.$refs["cursor"] as HTMLDivElement;
			const scrollbarCursor_b	= scrollbarCursor.getBoundingClientRect();
			const scrollH = (scrollbar_b.height - scrollbarCursor_b.height);
			if(this.draggingCursor) {
				const py = (this.mouseY - scrollbar_b.top - this.cursorOffsetY) / scrollH;
				// console.log(py);
				this.scrollOffset_local = maxScrollY * py;
			}else if(this.trackPressed) {
				const py = (this.mouseY - scrollbar_b.top - scrollbarCursor_b.height/2) / scrollH;
				// console.log(py);
				this.scrollOffset_local = maxScrollY * py;
			}
			this.cursorY = this.scrollOffset_local_eased / maxScrollY * scrollH;
			this.cursorSize = Math.max(20, bounds.height / (maxScrollY+bounds.height) * scrollbar_b.height);
		}

		if(this.scrollOffset_local_eased != this.scrollOffset) {
			this.$emit("update:scrollOffset", this.scrollOffset_local_eased);
		}


	}

}

interface IListItem {
	id:number;
	data:unknown;
	py:number;
}

</script>

<style scoped lang="less">
.infinitelist{
	@scrollWidth:.5em;
	position: relative;
	.list-item {
		width: calc(100% - @scrollWidth - .25em);
		position: absolute;
	}

	.scrollbar {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		width: @scrollWidth;
		background: fade(@mainColor_dark, 20%);
		border-radius: 1em;
		.scrollCursor {
			position: absolute;
			top:0;
			left:0;
			cursor: pointer;
			width: @scrollWidth;
			background: @mainColor_dark;
			border-radius: 1em;
		}	
	}
}
</style>