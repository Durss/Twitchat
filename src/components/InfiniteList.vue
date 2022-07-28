<template>
	<div class="infinitelist" @wheel="onWheel($event)">
		<div v-for="(item, index) in items" :key="index" class="list-item"
		:style="getStyles(index)">
			<slot
				:item="item.data"
				:index="index">
			</slot>
		</div>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
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
		dataset:{
			type: [Array],
			default: [],
			required: true,
		},
	},
	components:{}
})
export default class InfiniteList extends Vue {

	public itemSize!:number;
	public itemMargin!:number;
	public listHeight!:number;
	public scrollOffset!:number;
	// public scrollOffset:number = 0;
	public dataset!:unknown[];

	public items:IListItem[] = [];
	public renderDebounce!:number;

	public getStyles(i:number):(StyleValue | undefined){
		return {
			height: this.itemSize + "px",
			top: this.items[i].py + "px",
		};
	}

	public mounted():void {
		watch(() => this.dataset, () => this.datasetUpdate());
		watch(() => this.itemSize, () => this.scheduleRender());
		watch(() => this.listHeight, () => this.scheduleRender());
		watch(() => this.scrollOffset, () => this.scheduleRender());
		this.scheduleRender();
	}

	public onWheel(e:WheelEvent):void {
		this.scrollOffset += e.deltaY * .1;
	}

	private datasetUpdate():void {
		this.scheduleRender();
	}

	private scheduleRender():void {
		clearTimeout(this.renderDebounce);
		this.renderDebounce = setTimeout(()=>{
			this.renderList();
		},0)
	}
	
	private async renderList():Promise<void> {
		const bounds = this.$el.getBoundingClientRect();
		const itemsCount = Math.ceil( bounds.height / (this.itemSize + this.itemMargin) ) + 2;
		if(itemsCount != this.items.length) {
			const items:IListItem[] = [];
			for (let i = 0; i < itemsCount; i++) {
				items.push({id:i, data:this.dataset[i], py:0});
			}
			this.items = items;
		}

		const ih = (this.itemSize + this.itemMargin);
		for (let i = 0; i < this.items.length; i++) {
			const len = this.items.length;
			let index:number = (i - this.scrollOffset/ih)%len;
			if(index < -1) index += len;
			let py:number = index * ih;
			py -= ih;//offset all from one item to top to avoid a gap when scrolling to top	
			
			let dataIndex:number = Math.round((py+this.scrollOffset)/ih);
			dataIndex = dataIndex % this.dataset.length;
			if(dataIndex < 0) dataIndex += this.dataset.length;
			
			this.items[i].py = py;
			this.items[i].data = this.dataset[dataIndex];
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
	position: relative;
	.list-item {
		width: 100%;
		position: absolute;
	}
}
</style>