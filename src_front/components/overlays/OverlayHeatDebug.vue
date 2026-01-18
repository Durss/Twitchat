<template>
	<div class="overlayheatdebug">
		<div class="pointer" ref="pointer"></div>
		<canvas ref="canvas"></canvas>
	</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
class OverlayHeatDebug extends Vue {

	public mounted():void {
		const canvas = this.$refs.canvas as HTMLCanvasElement;
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		canvas.width = document.body.clientWidth;
		canvas.height = document.body.clientHeight;

		//@ts-ignore
		window.addEventListener("heat-click", async (event:{detail:{x:number, y:number, scaleX:number, scaleY:number, uid:string, shift:boolean, alt:boolean, ctrl:boolean, testMode:boolean, login:string, page:string}}):Promise<void> => {
			const hash = await Utils.sha256(document.location.href)
			
			if(event.detail.page != hash) return;
			
			const pointer = this.$refs.pointer as HTMLDivElement;
			pointer.style.left = (event.detail.x * document.body.clientWidth) + "px";
			pointer.style.top = (event.detail.y * document.body.clientHeight) + "px";
			pointer.style.transform = "translate(-50%, -50%) scale("+(1/event.detail.scaleX)+", "+(1/event.detail.scaleY)+")";
		});

		//@ts-ignore
		window.addEventListener("heat-rects", async (event:{detail:{rects:string}}):Promise<void> => {
			ctx.clearRect(0,0,canvas.width,canvas.height);
			const rects = JSON.parse(event.detail.rects) as number[][];
			const colors = ["#ff0000","#0000ff","#008000","#b22222","#ff7f50","#9acd32","#ff4500","#2e8b57","#daa520","#d2691e","#5f9ea0","#1e90ff","#ff69b4","#8a2be2","#00ff7f"];
			for (let i = 0; i < rects.length; i++) {
				const rect = rects[i]!;
				ctx.beginPath();
				// ctx.lineWidth = Math.random() * 20;
				ctx.lineWidth = 4;
				ctx.strokeStyle = colors[i%colors.length]!;
				ctx.moveTo(rect[0]!, rect[1]!);
				for (let j = 2; j < rect.length; j += 2) {
					ctx.lineTo(rect[j]!, rect[j+1]!);
				}
				ctx.closePath();
				ctx.stroke();
			}
		});
	}

}
export default toNative(OverlayHeatDebug);
</script>

<style scoped lang="less">
.overlayheatdebug{
	.pointer {
		border-radius: 50%;
		border: 2px solid red;
		width: 20px;
		height: 20px;
		position: absolute;
		top: 0;
		left: 0;
		transform: translate(-50%, -50%);
	}
	canvas {
		position: absolute;
		top: 0;
		left: 0;
	}
}
</style>