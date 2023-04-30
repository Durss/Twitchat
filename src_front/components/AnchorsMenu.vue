<template>
	<div class="anchorsmenu">
		<div v-for="(a, i) in items" :key="i" :class="getClasses(a)"
		@mouseenter="mouseEnter"
		@mouseleave="mouseLeave"
		@click="selectItem(a)"
		ref="item">
			<button>
				<img :src="a.icon" class="icon">
				<div class="label">{{a.label}}</div>
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["select"],
})
export default class AnchorsMenu extends Vue {

	@Prop({
			type:Array,
			default:[],
		})
	public items!:TwitchatDataTypes.AnchorData[];
	@Prop({
			type:Boolean,
			default:false,
		})
	public openAnimaton!:boolean;
	@Prop({
			type:Number,
			default:0,
		})
	public openDelay!:number;

	public getClasses(a:TwitchatDataTypes.AnchorData):string[] {
		let res = ["item"];
		if(a.selected) res.push("selected");
		return res;
	}

	public async mounted():Promise<void> {
		watch(()=>this.items, () => this.resetRender());
		await this.$nextTick();
		this.resetRender();
	}

	private resetRender():void{
		const labels = (this.$el as HTMLDivElement).querySelectorAll(".label");
		if(labels.length > 0) gsap.set(labels, {padding:0, margin:0, width:0});
		if(this.openAnimaton !== false && this.$refs.item) {
			const delay = this.openDelay ?? 0;
			gsap.from(this.$refs.item as HTMLDivElement[], {duration:.3, x:-50, stagger:0.035, ease:"back.out(3)", delay});
		}
	}

	public mouseEnter(event:MouseEvent):void {
		const target = event.target as HTMLDivElement;
		const label = target.querySelector(".label");
		gsap.killTweensOf(label);
		label?.removeAttribute("style");
		gsap.from(label, {duration:.25, padding:0, margin:0, width:0});
	}

	public mouseLeave(event:MouseEvent):void {
		const target = event.target as HTMLDivElement;
		const label = target.querySelector(".label");
		gsap.killTweensOf(label);
		gsap.to(label, {duration:.25, padding:0, margin:0, width:0});
	}

	public selectItem(item:TwitchatDataTypes.AnchorData):void {
		for (let i = 0; i < this.items.length; i++) {
			this.items[i].selected = false;
		}

		if(item.selected !== true) {
			item.selected = true;
			this.$emit("select", item);
		}
	}


}
</script>

<style scoped lang="less">
.anchorsmenu{
	position: fixed;
	left: 0;
	top: 50%;
	transform: translate(0, -50%);
	gap: 10px;
	display: flex;
	flex-direction: column;
	padding-left: .5em;
	z-index: 1;

	.item {
		@size: 1.75em;
		@sizeHover: 1.75em;
		min-width: @size;
		cursor: pointer;
		transition: all .25s;
	
		button {
			display: flex;
			flex-direction: row;
			align-items: center;
			border-radius: 10em;
			background-color: var(--color-light-fadest);
			transition: background-color .25s;

			.icon {
				width: @size;
				height: @size;
				padding: .2em;
				object-fit: fill;
			}

			.label {
				flex-grow: 1;
				white-space: nowrap;
				font-size: .8em;
				margin: 0 .5em 0 0;
				color: var(--color-light);
				overflow: hidden;
			}
		}

		&.selected {
			@size:1.5em;
			font-size: @size;
			margin-left: calc((1em - @size ) / 2);
			button {
				background-color: var(--color-secondary);
			}
		}
	}
}
@media only screen and (max-width: 900px) {
	.anchorsmenu{
		.item {

			button {
				.label {
					display: none;
				}
			}
		}
	}

}
</style>