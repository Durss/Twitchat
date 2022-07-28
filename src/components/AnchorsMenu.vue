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
import type { AnchorData } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		items:{
			type:Array,
			default:[],
		},
		openAnimaton:{
			type:Boolean,
			default:false,
		},
		openDelay:{
			type:Number,
			default:0,
		}
	},
	components:{},
	emits:["select"],
})
export default class AnchorsMenu extends Vue {

	public items!:AnchorData[];
	public openAnimaton!:boolean;
	public openDelay!:number;

	public getClasses(a:AnchorData):string[] {
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
		gsap.set(labels, {padding:0, margin:0, width:0});
		if(this.openAnimaton !== false) {
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

	public selectItem(item:AnchorData):void {
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
	border-left: none;
	display: flex;
	flex-direction: column;
	// align-items: center;
	padding: 0;
	padding-left: .5em;
	z-index: 1;

	.item {
		@size: 1.6em;
		@innerSize: @size * .7;
		min-width: @size;
		height: @size;
		cursor: pointer;
		transition: margin .25s, height .25s, min-width .25s;
	
		button {
			margin: 0;
			margin-top: @size * .15;
			margin-left: @size * .15;
			z-index: 1;
			background: transparent;
			padding: 0;
			min-width: @innerSize;
			height: @innerSize;
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
			border-radius: 1em;
			transition: all .25s;
			background-color: fade(@mainColor_light, 15%);

			.icon {
				width: @innerSize;
				height: @innerSize;
				padding: .2em;
				object-fit: contain;
				transition: all .25s;
			}

			.label {
				flex-grow: 1;
				white-space: nowrap;
				font-size: .8em;
				margin: 0 .5em 0 0;
				color: @mainColor_light;
				overflow: hidden;
				transition: color .25s;
			}
		}

		&.selected {
			@innerSize: @size * .9;
			min-width: @innerSize;
			height: @innerSize;
			margin: @size * .25 0;

			button {
				margin-top: @size * .05;
				margin-left: @size * .05;
				min-width: @innerSize;
				height: @innerSize;
				outline: 2px solid @mainColor_light;
				.icon {
					width: @innerSize;
					height: @innerSize;
					padding: .3em;
				}
				.label {
					color: @mainColor_light;
				}
			}
		}
	}
}
@media only screen and (max-width: 900px) {
	.anchorsmenu{
		padding-left: 0;
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