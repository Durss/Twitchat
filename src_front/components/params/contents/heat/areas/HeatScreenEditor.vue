<template>
	<div class="heatscreeneditor">
		<div ref="editor" class="editor" @pointerdown="$event => addPoint($event)">
			<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
				<g v-for="area in screen.areas" :key="'fill_'+screen.id">
					<polygon :points="getSVGPoints(area.points)" />
					<circle v-for="p, index in area.points" :key="screen.id+'_'+index"
					:cx="(p.x*100)+'%'"
					:cy="(p.y*100)+'%'"
					r="2%"
					@dblclick="resetCurrentArea()"
					@contextmenu.prevent="area.points.splice(index, 1)"
					@pointerdown.stop="startDragPoint(p)"/>
				</g>
			</svg>
		</div>
	</div>
</template>

<script lang="ts">
import type { HeatArea, HeatScreen } from '@/types/HeatDataTypes';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["update"],
})
export default class HeatScreenEditor extends Vue {

	@Prop
	public screen!:HeatScreen;
	
	private currentArea:HeatArea | null = null;
	private draggedPoint:{x:number, y:number} |  null = null;
	private mouseUpHandler!:(e:PointerEvent) => void;
	private mouseMoveHandler!:(e:PointerEvent) => void;

	public mounted():void {
		if(this.screen.areas.length == 0) {
			this.screen.areas.push({
				id:Utils.getUUID(),
				points: [],
			});
		}

		this.mouseUpHandler = (e:PointerEvent) => this.onMouseUp(e);
		this.mouseMoveHandler = (e:PointerEvent) => this.onMouseMove(e);

		document.addEventListener("pointerup", this.mouseUpHandler);
		document.addEventListener("pointermove", this.mouseMoveHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("pointerup", this.mouseUpHandler);
		document.removeEventListener("pointermove", this.mouseMoveHandler);
	}

	public getSVGPoints(p:{x:number, y:number}[]):string {
		return p.map(w => (w.x * 1920)+","+(w.y * 1080)).join(",");
	}

	public addPoint(event:PointerEvent):void {
		if(this.draggedPoint) return;
		
		const editor = this.$refs.editor as HTMLDivElement;
		const bounds = editor.getBoundingClientRect();
		const x = (event.x - bounds.x)/bounds.width;
		const y = (event.y - bounds.y)/bounds.height;

		let areaIndex = -1;
		let pointIndex = -1;
		let minDist = Number.MAX_SAFE_INTEGER;

		for (let i = 0; i < this.screen.areas.length; i++) {
			const area = this.screen.areas[i];
			for (let j = 1; j < area.points.length; j++) {
				const prevP = area.points[j-1];
				const point = area.points[j];
				const dist = Math.sqrt(Math.pow(point.x * 1920 - prevP.x * 1920, 2) + Math.pow(point.y * 1080 - prevP.y * 1080, 2));
				const dist1 = Math.sqrt(Math.pow(x * 1920 - prevP.x * 1920, 2) + Math.pow(y * 1080 - prevP.y * 1080, 2));
				const dist2 = Math.sqrt(Math.pow(point.x * 1920 - x * 1920, 2) + Math.pow(point.y * 1080 - y * 1080, 2));
				const distFromSegment = dist1 + dist2 - dist;
				console.log(distFromSegment);
				if(distFromSegment < 5 && distFromSegment < minDist) {
					areaIndex = i;
					pointIndex = j;
					minDist = distFromSegment;
					console.log(distFromSegment, i, j)
				}
			}
		}

		if(areaIndex > -1) {
			console.log("INTERSECTION FOUND");
			this.currentArea = this.screen.areas[areaIndex];
			this.currentArea.points.splice(pointIndex, 0, {x, y});

		}else if(this.currentArea) {
			console.log("PUSH TO current AREA");
			this.currentArea.points.push({x, y});

		}else {
			console.log("CREATE NEW");
			this.currentArea = {
				id:Utils.getUUID(),
				points:[{x, y}],
			};
			this.screen.areas.push(this.currentArea);
		}

		this.$emit("update");
	}

	public resetCurrentArea():void {
		this.currentArea = null;
	}

	public startDragPoint(point:{x:number, y:number}):void {
		this.draggedPoint = point;
	}

	public onMouseUp(event:PointerEvent):void {
		if(this.draggedPoint) {
			event.preventDefault();
			event.stopPropagation();
			this.$emit("update");
		}
		this.draggedPoint = null;
	}

	public onMouseMove(event:PointerEvent):void {
		if(!this.draggedPoint) return;

		const editor = this.$refs.editor as HTMLDivElement;
		const bounds = editor.getBoundingClientRect();

		this.draggedPoint.x = (event.x - bounds.x)/bounds.width;
		this.draggedPoint.y = (event.y - bounds.y)/bounds.height;
	}

}
</script>

<style scoped lang="less">
.heatscreeneditor{

	.editor {
		border: 1px solid var(--color-text);
		width: 100%;
		aspect-ratio: 16/9;

		svg {
			:deep(polygon) {
				fill: var(--color-text-fader);
				stroke-width: 5px;
				stroke: var(--color-text);
			}
			:deep(circle) {
				fill: var(--color-text);
			}
		}
	}
}
</style>