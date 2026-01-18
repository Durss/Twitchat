<template>
	<component :is="nodeType"
	:style="holderStyles"
	:class="holderClasses"
	@wheel="onWheel($event)">
		<div v-for="(item, index) in items" :key="index" class="list-item"
		:style="getStyles(index)">
			<slot
				v-if="item.data"
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
import type { CSSProperties } from 'vue';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:['update:scrollOffset'],
})
class InfiniteList extends Vue {

	@Prop({
			type:String,
			default:"div"
		})
	public nodeType!:string;
	@Prop({
			type:Number,
			default:50
		})
	public itemSize!:number;
	@Prop({
			type:Number,
			default:0
		})
	public itemMargin!:number;
	@Prop({
			type:Number,
			default:500
		})
	public listHeight!:number;
	@Prop({
			type:Number,
			default:0
		})
	public scrollOffset!:number;
	@Prop({
			type:Boolean,
			default:false
		})
	public lockScroll!:boolean;
	@Prop({
			type:Boolean,
			default:false
		})
	public noScrollbar!:boolean;
	@Prop({
			type:Boolean,
			default:false
		})
	public fillWithDuplicates!:boolean;
	@Prop({
			type: [Array],
			default: [],
			required: true,
		})
	public dataset!:unknown[];

	public items:IListItem[] = [];
	public scrollOffset_local:number = 0;
	public scrollOffset_local_eased:number = 0;
	public cursorY:number = 0;
	public cursorSize:number = 0;

	private mouseY:number = 0;
	private maxScrollY:number = 0;
	private cursorOffsetY:number = 0;
	private draggingList:boolean = false;
	private draggingListOffset:number = 0;
	private draggingCursor:boolean = false;
	private disposed:boolean = false;
	private canScroll:boolean = true;
	private trackPressed:boolean = false;
	private dragStartHandler!:(e:MouseEvent|TouchEvent) => void;
	private dragHandler!:(e:MouseEvent|TouchEvent) => void;
	private dragStopHandler!:(e:MouseEvent|TouchEvent) => void;
	private dragStartListHandler!:(e:TouchEvent) => void;

	public getStyles(i:number):(CSSProperties | undefined){
		return {
			height: this.itemSize + "px",
			top: this.items[i]!.py + "px",
		};
	}

	public get holderClasses():string[] {
		let res = ["infinitelist"];
		if(!this.showScrollbar) res.push("noScroll");
		return res;
	}

	public get holderStyles():CSSProperties {
		if(this.fillWithDuplicates === false) {
			return {
				height:this.dataset.length * (this.itemSize + this.itemMargin) + 1 + "px",
			}
		}
		return {};
	}

	public get cursorStyles():CSSProperties {
		return {
			top:this.cursorY+"px",
			height:this.cursorSize+"px",
		}
	}

	public get showScrollbar():boolean { return this.noScrollbar === false && this.canScroll; }

	public mounted():void {
		this.scrollOffset_local = this.scrollOffset;
		watch(() => this.scrollOffset, () => {
			if(this.scrollOffset_local_eased === this.scrollOffset) return;//Avoid useless render
			this.scrollOffset_local = this.scrollOffset;
		});
		
		const scrollbar = this.$refs["scrollbar"] as HTMLDivElement;
		if(scrollbar){
			const scrollbarCursor = this.$refs["cursor"] as HTMLDivElement;

			this.dragStartListHandler = (e:TouchEvent) => this.ondragStartList(e);
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
			this.$el.addEventListener("touchstart", this.dragStartListHandler);
		}

		requestAnimationFrame(()=>this.renderList());
	}

	public beforeUnmount(): void {
		this.disposed = true;
		const scrollbar = this.$refs["scrollbar"] as HTMLDivElement;
		if(scrollbar){
			const scrollbarCursor = this.$refs["cursor"] as HTMLDivElement;
			
			scrollbar.addEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.removeEventListener("mousedown", this.dragStartHandler);
			scrollbarCursor.removeEventListener("touchstart", this.dragStartHandler);
			document.removeEventListener("mousemove", this.dragHandler);
			document.removeEventListener("touchmove", this.dragHandler);
			document.removeEventListener("mouseup", this.dragStopHandler);
			document.removeEventListener("touchend", this.dragStopHandler);
			this.$el.removeEventListener("touchstart", this.dragStartListHandler);
		}
	}

	public onWheel(e:WheelEvent):void {
		this.scrollOffset_local += e.deltaY;
		if(this.lockScroll) {
			if(this.scrollOffset_local <= 0 && e.deltaY < 0) return;
			if(this.scrollOffset_local > this.maxScrollY && e.deltaY > 0) return;
		}
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

	private ondragStartList(e:MouseEvent | TouchEvent):void {
		e.preventDefault();
		this.onDrag(e);
		this.draggingList = true;
		this.draggingListOffset = this.mouseY;
	}

	private onDrag(e:MouseEvent | TouchEvent):void {
		if(e.type == "mousemove" || e.type == "mousedown") {
			this.mouseY = (e as MouseEvent).clientY;
		}else{
			this.mouseY = (e as TouchEvent).touches[0]!.clientY;
		}
	}

	private onDragStop(e:MouseEvent | TouchEvent):void {
		this.draggingCursor	= false;
		this.trackPressed	= false;
		this.draggingList	= false;
	}
	
	private async renderList():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderList());

		const bounds			= this.$el.getBoundingClientRect();
		const itemsCount		= Math.ceil( bounds.height / (this.itemSize + this.itemMargin) ) + 2;
		this.maxScrollY			= this.dataset.length*(this.itemSize+this.itemMargin) - bounds.height;
		this.scrollOffset_local_eased += (this.scrollOffset_local - this.scrollOffset_local_eased) * .1;

		if(itemsCount != this.items.length) {
			const items:IListItem[] = [];
			for (let i = 0; i < itemsCount; i++) {
				items.push({id:i, data:this.dataset[i], py:0});
			}
			this.items = items;
		}

		if(this.lockScroll !== false) {
			if(this.scrollOffset_local_eased < 0) {
				this.scrollOffset_local = this.scrollOffset_local_eased = 0;
			}
			if(this.scrollOffset_local_eased > this.maxScrollY) {
				this.scrollOffset_local = this.scrollOffset_local_eased = this.maxScrollY;
			}
		}

		const ih = (this.itemSize + this.itemMargin);
		
		this.canScroll = this.fillWithDuplicates !== false || this.dataset.length*ih > bounds.height;
		const vPos = this.canScroll? this.scrollOffset_local_eased : 0;
		
		for (let i = 0; i < this.items.length; i++) {
			const len = this.items.length;
			let index:number = (i - vPos/ih)%len;
			if(index < -1) index += len;
			let py:number = index * ih;
			py -= ih;//offset all from one item to top to avoid a gap when scrolling to top	
			
			let dataIndex:number = Math.round((py+vPos)/ih);
			if(this.fillWithDuplicates !== false) {
				dataIndex = dataIndex % this.dataset.length;
				if(dataIndex < 0) dataIndex += this.dataset.length;
			}
			
			this.items[i]!.py = py;
			this.items[i]!.data = dataIndex < this.dataset.length? this.dataset[dataIndex] : null;
		}

		if(this.draggingList) {
			this.scrollOffset_local -= (this.mouseY - this.draggingListOffset)*2;
			this.draggingListOffset = this.mouseY
		}

		const scrollbar = this.$refs["scrollbar"] as HTMLDivElement;
		if(scrollbar){
			const scrollbar_b		= scrollbar.getBoundingClientRect();
			const scrollbarCursor	= this.$refs["cursor"] as HTMLDivElement;
			const scrollbarCursor_b	= scrollbarCursor.getBoundingClientRect();
			const scrollH = (scrollbar_b.height - scrollbarCursor_b.height);
			if(this.draggingCursor) {
				const py = (this.mouseY - scrollbar_b.top - this.cursorOffsetY) / scrollH;
				// console.log(py);
				this.scrollOffset_local = this.maxScrollY * py;
			}else if(this.trackPressed) {
				const py = (this.mouseY - scrollbar_b.top - scrollbarCursor_b.height/2) / scrollH;
				// console.log(py);
				this.scrollOffset_local = this.maxScrollY * py;
			}
			this.cursorY = this.scrollOffset_local_eased / this.maxScrollY * scrollH;
			this.cursorSize = Math.max(20, bounds.height / (this.maxScrollY+bounds.height) * scrollbar_b.height);
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

export default toNative(InfiniteList);
</script>

<style scoped lang="less">
.infinitelist{
	@scrollWidth:.5em;
	position: relative;
	.list-item {
		width: calc(100% - @scrollWidth - .25em);
		position: absolute;
	}

	&.noScroll {
		.list-item {
			width: 100%;
		}
	}

	.scrollbar {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		width: @scrollWidth;
		background: var(--color-dark-fadest);
		border-radius: 1em;
		.scrollCursor {
			position: absolute;
			top:0;
			left:0;
			cursor: pointer;
			width: @scrollWidth;
			background-color: var(--color-dark-extralight);
			border-radius: 1em;
		}	
	}
}
</style>