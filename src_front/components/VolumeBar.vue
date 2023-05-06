<template>
	<div class="volumebar">
		<img src="@/assets/icons/volume.svg" alt="volume" class="icon">
		<div class="holder"
		ref="holder"
		@mousedown="mousePressed = true"
		@mousemove="onSeek($event)"
		@click="onSeek($event, true)">
			<div class="fill" :style="fillStyles"></div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["update:modelValue"]
})
export default class VolumeBar extends Vue {

	@Prop({
			type:Number,
			default:.25,
		})
	public modelValue!:number;

	public mousePressed = false;
	public mouseUpHandler!:(e:MouseEvent) => void;

	public get fillStyles():{[key:string]:string} {
		return {
			width: `${this.modelValue * 100}%`,
		}
	}

	public mounted():void {
		this.mouseUpHandler = () => this.mousePressed = false;
		document.addEventListener("mouseup", this.mouseUpHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("mouseup", this.mouseUpHandler);
	}

	public onSeek(e:MouseEvent, force = false):void {
		if(!this.mousePressed && !force) return;
		const bar = this.$refs.holder as HTMLDivElement;
		const bounds = bar.getBoundingClientRect();
		const percent = e.offsetX/bounds.width;
		this.$emit("update:modelValue", percent);
	}
}
</script>

<style scoped lang="less">
.volumebar{
	display: flex;
	flex-direction: row;
	min-width: 200px;
	align-items: center;

	.icon {
		height: 1em;
		margin-right: .25em;
	}

	.holder {
		flex-grow: 1;
		height: 1em;
		cursor: pointer;
		position: relative;

		&::before {
			content: "";
			width: 100%;
			height: .25em;
			background-color: var(--color-light-fader);
			position: absolute;
			top: 50%;
			left: 0;
			transform: translate(0, -50%);
		}

		.fill {
			width: 50%;
			height: .25em;
			margin-top: .33em;
			background-color: var(--color-light);
		}
	}
}
</style>