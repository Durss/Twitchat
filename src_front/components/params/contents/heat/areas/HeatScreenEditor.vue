<template>
	<div class="heatscreeneditor">
		<div ref="editor" :class="editorClasses" @pointerdown="$event => addPoint($event)">
			<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
				<g v-for="area in screen.areas" :key="'area_'+screen.id">
					<polygon :points="getSVGPoints(area.points)"
						:class="fillClasses(area)"
						@pointerdown.stop="startDragArea($event, area)" />

					<circle v-for="p, index in area.points" :key="screen.id+'_'+index"
						:cx="(p.x*100)+'%'"
						:cy="(p.y*100)+'%'"
						r="2%"
						@dblclick="resetCurrentArea()"
						@contextmenu.prevent="area.points.splice(index, 1)"
						@pointerdown.stop="startDragPoint($event, p, area, index)"/>
				</g>
			</svg>
		</div>
	</div>
</template>

<script lang="ts">
import type { HeatArea, HeatScreen } from '@/types/HeatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import type { CSSProperties } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["update"],
})
export default class HeatScreenEditor extends Vue {

	@Prop
	public screen!:HeatScreen;
	
	private editMode:null | "add" | "append" | "delete" = null;
	private currentArea:HeatArea | null = null;
	private draggedArea:HeatArea |  null = null;
	private draggedPoint:{x:number, y:number} |  null = null;
	private draggOffset:{x:number, y:number}= {x:0, y:0};
	private mouseUpHandler!:(e:PointerEvent) => void;
	private mouseMoveHandler!:(e:PointerEvent) => void;

	public get editorClasses():string[] {
		const res = ["editor"];
		if(this.editMode) res.push(this.editMode);
		return res;
	}
	
	public async beforeMount():Promise<void> {
		const scenes = await OBSWebsocket.instance.getScenes();

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

	public fillClasses(area:HeatArea):string[] {
		if(area.id != this.currentArea?.id) return [];
		return ["selected"]
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

		const [areaIndex, pointIndex] = this.getSegmentUnderPoint(event.x, event.y);

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

	public startDragPoint(event:PointerEvent, point:{x:number, y:number}, area:HeatArea, index:number):void {
		if(event.ctrlKey) {
			area.points.splice(index, 1);
		}else{
			this.draggedPoint = point;
		}
	}

	public startDragArea(event:PointerEvent, area:HeatArea):void {
		if(this.editMode == "append") {
			this.addPoint(event);
		}else{
			this.currentArea = area;
			this.draggedArea = area;
			this.draggOffset.x = event.x;
			this.draggOffset.y = event.y;
		}
	}

	public onMouseUp(event:PointerEvent):void {
		if(this.draggedPoint || this.draggedArea) {
			event.preventDefault();
			event.stopPropagation();
			this.$emit("update");
		}
		this.draggedPoint = null;
		this.draggedArea = null;
	}

	public onMouseMove(event:PointerEvent):void {
		const editor = this.$refs.editor as HTMLDivElement;
		const bounds = editor.getBoundingClientRect();

		const [areaIndex, pointIndex] = this.getSegmentUnderPoint(event.x, event.y);

		this.editMode = null;
		if(areaIndex > -1 && pointIndex > -1) this.editMode = "append";

		if(this.draggedPoint) {
			this.draggedPoint.x = (event.x - bounds.x)/bounds.width;
			this.draggedPoint.y = (event.y - bounds.y)/bounds.height;
		}

		if(this.draggedArea) {
			for (let i = 0; i < this.draggedArea.points.length; i++) {
				const point = this.draggedArea.points[i];
				point.x += (event.x - this.draggOffset.x)/bounds.width;
				point.y += (event.y - this.draggOffset.y)/bounds.height;
			}
			this.draggOffset.x = event.x;
			this.draggOffset.y = event.y;
		}
	}

	private getSegmentUnderPoint(x:number, y:number):number[] {
		
		const editor = this.$refs.editor as HTMLDivElement;
		const bounds = editor.getBoundingClientRect();
		x = (x - bounds.x)/bounds.width;
		y = (y - bounds.y)/bounds.height;

		let areaIndex = -1;
		let pointIndex = -1;
		let minDist = Number.MAX_SAFE_INTEGER;

		for (let i = 0; i < this.screen.areas.length; i++) {
			const area = this.screen.areas[i];
			//Parse all points going 1 beyond to also check segment between last and first point
			for (let j = 1; j < area.points.length+1; j++) {
				const prevP = area.points[j-1];
				//Make sure we loop the index to check segment between last and first point
				const point = area.points[j%area.points.length];
				//Compute size of the segment
				const dist = Math.sqrt(Math.pow(point.x * 1920 - prevP.x * 1920, 2) + Math.pow(point.y * 1080 - prevP.y * 1080, 2));
				//Compute distance between start point and cusrsor
				const dist1 = Math.sqrt(Math.pow(x * 1920 - prevP.x * 1920, 2) + Math.pow(y * 1080 - prevP.y * 1080, 2));
				//Compute distance between end point and cusrsor
				const dist2 = Math.sqrt(Math.pow(point.x * 1920 - x * 1920, 2) + Math.pow(point.y * 1080 - y * 1080, 2));
				const distFromSegment = dist1 + dist2 - dist;
				if(distFromSegment < 2 && distFromSegment < minDist) {
					areaIndex = i;
					pointIndex = j;
					minDist = distFromSegment;
				}
			}
		}
		return [areaIndex, pointIndex];
	}

}
</script>

<style scoped lang="less">
.heatscreeneditor{

	.editor {
		border: 1px solid var(--color-text);
		width: 100%;
		aspect-ratio: 16/9;
		cursor: crosshair;
		// &.delete {
		// 	cursor: crosshair;
		// }

		svg {
			:deep(polygon) {
				fill: var(--color-text-fader);
				stroke-width: 5px;
				stroke: var(--color-text);
				cursor: grab;
				&:active {
					cursor: grabbing;
				}

				&.selected {
					fill: var(--color-secondary-fader);
					stroke-width: 5px;
					stroke: var(--color-secondary);
				}
			}
			:deep(circle) {
				fill: var(--color-text);
				cursor: pointer;
			}
		}

		&.add {
			cursor: crosshair;
		}
		&.append {
			cursor: copy;
			:deep(polygon) {
				cursor: inherit;
			}
		}
	}
}
</style>