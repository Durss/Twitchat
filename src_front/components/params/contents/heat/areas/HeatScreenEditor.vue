<template>
	<div class="heatscreeneditor">

		<div class="form">
			<Button icon="back" class="backBt" @click="$emit('close')">{{ $t("global.back") }}</Button>
			<ParamItem :paramData="params_target" v-model="params_target.value" @change="onSelectOBSScene()"/>
		</div>

		<div class="scrollable" @wheel="onMouseWheel($event)">
			<div ref="editor"
			:style="editorStyles"
			:class="editorClasses"
			@pointerdown="$event => addPoint($event)">
				<div ref="background" class="background" v-if="params_showOBS.value"></div>
				<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
					<g v-for="area in screen.areas" :key="'area_'+screen.id">
						<polygon :points="getSVGPoints(area.points)"
							:class="fillClasses(area)"
							@contextmenu.prevent="onRightClickArea(area)"
							@pointerdown.stop="startDragArea($event, area)" />

						<circle v-for="p, index in area.points" :key="screen.id+'_'+index"
							:cx="(p.x*100)+'%'"
							:cy="(p.y*100)+'%'"
							r="15px"
							:class="pointClasses(area, index)"
							@click="selectPoint(area, index)"
							@dblclick="resetCurrentArea()"
							@contextmenu.prevent="onRightClickPoint(area, index)"
							@pointerdown.stop="startDragPoint($event, p, area, index)"/>
					</g>
				</svg>
			</div>
		</div>

		<div class="form">
			<ParamItem :paramData="params_showOBS" v-model="params_showOBS.value" v-if="obsConnected" class="shrink" />
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { HeatArea, HeatScreen } from '@/types/HeatDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { watch, type CSSProperties } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
	},
	emits:["update", "close"],
})
class HeatScreenEditor extends Vue {

	@Prop
	public screen!:HeatScreen;

	public params_showOBS:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:true, labelKey:"heat.areas.show_obs" };
	public params_target:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", labelKey:"heat.areas.target" };

	private editMode:null | "add" | "append" | "delete" = null;
	private currentArea:HeatArea | null = null;
	private currentPointIndex:number = -1
	private draggedArea:HeatArea |  null = null;
	private draggedPoint:{x:number, y:number} |  null = null;
	private draggOffset:{x:number, y:number}= {x:0, y:0};
	private disposed:boolean = false;
	private editorScale:number = 1;

	private keyDownHandler!:(e:KeyboardEvent) => void;
	private mouseUpHandler!:(e:PointerEvent) => void;
	private mouseMoveHandler!:(e:PointerEvent) => void;

	public get editorClasses():string[] {
		const res = ["editor"];
		if(this.editMode) res.push(this.editMode);
		return res;
	}

	public get editorStyles():CSSProperties {
		const res:CSSProperties = {};
		res.transform = "scale("+this.editorScale+")";
		res.width = (this.editorScale * 100)+"%";
		return res;
	}

	public get obsConnected():boolean { return OBSWebsocket.instance.connected.value; }

	public async beforeMount():Promise<void> {
		if(this.screen.areas.length == 0) {
			this.screen.areas.push({
				id:Utils.getUUID(),
				points: [],
			});
		}

		this.keyDownHandler = (e:KeyboardEvent) => this.onKeyDown(e);
		this.mouseUpHandler = (e:PointerEvent) => this.onMouseUp(e);
		this.mouseMoveHandler = (e:PointerEvent) => this.onMouseMove(e);

		document.addEventListener("keydown", this.keyDownHandler, {capture:true});
		document.addEventListener("pointerup", this.mouseUpHandler);
		document.addEventListener("pointermove", this.mouseMoveHandler);

		watch(()=>OBSWebsocket.instance.connected.value, ()=>{
			this.populateOBSScenes();
		});
		this.populateOBSScenes();
		this.refreshImage();
	}

	public beforeUnmount():void {
		this.disposed = true;
		document.removeEventListener("keydown", this.keyDownHandler, {capture:true});
		document.removeEventListener("pointerup", this.mouseUpHandler);
		document.removeEventListener("pointermove", this.mouseMoveHandler);
	}

	public async populateOBSScenes():Promise<void> {

		this.params_target.listValues = [{value:"", labelKey:"heat.areas.target_always"}];

		if(OBSWebsocket.instance.connected.value){
			const scenes = await OBSWebsocket.instance.getScenes();
			scenes.scenes.forEach(v=> {
				this.params_target.listValues!.push({value:v.sceneName, label:v.sceneName});
			});
		}else{
			this.params_target.listValues!.push({value:"obs", labelKey:"heat.areas.connect_obs"});
		}
		this.params_target.value = this.screen.activeOBSScene;
	}

	public onSelectOBSScene():void {
		if(this.params_target.value == "obs") {
			this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.OBS);
			return;
		}
		this.screen.activeOBSScene = this.params_target.value;
		this.$emit('update');
	}

	public fillClasses(area:HeatArea):string[] {
		if(area.id != this.currentArea?.id) return [];
		return ["selected"]
	}

	public pointClasses(area:HeatArea, index:number):string[] {
		if(area.id != this.currentArea?.id) return [];
		if(index == this.currentPointIndex) return ["selected"];
		return [];
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

		if(areaIndex && pointIndex && areaIndex > -1) {
			console.log("INTERSECTION FOUND");
			this.currentArea = this.screen.areas[areaIndex]!;
			this.currentPointIndex = pointIndex;
			this.currentArea.points.splice(pointIndex, 0, {x, y});

		}else if(this.currentArea) {
			console.log("PUSH TO current AREA");
			this.currentArea.points.push({x, y});
			this.currentPointIndex = this.currentArea.points.length -1;

		}else {
			console.log("CREATE NEW");
			this.currentArea = {
				id:Utils.getUUID(),
				points:[{x, y}],
			};
			this.currentPointIndex = 0;
			this.screen.areas.push(this.currentArea);
		}

		this.$emit("update");
	}

	public selectPoint(area:HeatArea, index:number):void {
		this.currentArea = area;
		this.currentPointIndex = index;
	}

	public onRightClickArea(area:HeatArea):void {
		if(area.id == this.currentArea?.id) {
			this.resetCurrentArea();
		}
	}

	public onRightClickPoint(area:HeatArea, pointIndex:number):void {
		area.points.splice(pointIndex, 1);
		this.currentPointIndex = -1;
	}

	public resetCurrentArea():void {
		this.currentArea = null;
		this.currentPointIndex = -1;
	}

	public startDragPoint(event:PointerEvent, point:{x:number, y:number}, area:HeatArea, index:number):void {
		if(event.ctrlKey || event.metaKey) {
			area.points.splice(index, 1);
			this.currentPointIndex = -1;
		}else{
			this.draggedPoint = point;
			this.currentArea = area;
			this.currentPointIndex = index;
		}
	}

	public startDragArea(event:PointerEvent, area:HeatArea):void {
		if(this.editMode == "append") {
			this.addPoint(event);
		}else{
			this.currentPointIndex = -1;
			this.currentArea = area;
			this.draggedArea = area;
			this.draggOffset.x = event.x;
			this.draggOffset.y = event.y;
		}
	}

	public onKeyDown(event:KeyboardEvent):void {
		const metaKey = event.metaKey || event.ctrlKey;

		//Delete an area or a point
		if((event.key == "Delete" || event.key == "Backspace") && this.currentArea) {
			const index = this.screen.areas.findIndex(v=>v.id == this.currentArea!.id);
			if(index > -1) {
				if(this.currentPointIndex > -1) {
					this.currentArea.points.splice(this.currentPointIndex, 1);
				}else{
					this.screen.areas.splice(index, 1);
				}
				this.currentArea = null;
				this.$emit("update");
			}
			event.preventDefault();
		}

		//Unselect an area
		if(event.key == "Escape" && this.currentArea) {
			event.stopPropagation();
			event.preventDefault();
			this.resetCurrentArea();
		}

		//Copy current area to clipboard
		if(event.key == "c" && metaKey && this.currentArea) {
			const wrapper = {
				dataType:"heatarea",
				data:this.currentArea,
			}
			Utils.copyToClipboard(JSON.stringify(wrapper));
		}

		//Paste an area from clipboard
		if(event.key == "v" && metaKey) {
			navigator.clipboard.readText().then(text=> {
				try {
					const json = JSON.parse(text);
					if(json.dataType=="heatarea") {
						const area = json.data;
						area.id = Utils.getUUID();
						this.screen.areas.push(area);
						this.currentArea = area;
						this.$emit("update");
					}
				}
				catch(error){}
			});
		}

		//Move area or point with arrows
		if(this.currentArea) {
			const editor = this.$refs.editor as HTMLDivElement;
			const bounds = editor.getBoundingClientRect();
			const scale = metaKey? 50 : event.shiftKey? 10 : 1;
			let addX = 0;
			let addY = 0;
			if(event.key == "ArrowLeft")	addX = -1/bounds.width * scale;
			if(event.key == "ArrowRight")	addX = 1/bounds.width * scale;
			if(event.key == "ArrowUp")		addY = -1/bounds.height * scale;
			if(event.key == "ArrowDown")	addY = 1/bounds.height * scale;

			if(addX != 0 || addY != 0) {
				if(this.currentPointIndex > -1) {
					this.currentArea.points[this.currentPointIndex]!.x += addX;
					this.currentArea.points[this.currentPointIndex]!.y += addY;
				}else {
					for (const point of this.currentArea.points) {
						point.x += addX;
						point.y += addY;
					}
				}
				event.preventDefault();
				event.stopPropagation();
			}
		}
	}

	public onMouseWheel(event:WheelEvent):void {
		if(event.deltaY == 0) return;
		if(!event.ctrlKey && !event.metaKey) return; //require ctrl key or meta key to be pressed
		let delta = event.deltaY > 0? .9 : 1.1;
		let scale = this.editorScale;
		scale *= delta;
		scale = Math.min(3, Math.max(1, scale));
		this.editorScale = scale;
		event.preventDefault();
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
		if(areaIndex && pointIndex && areaIndex > -1 && pointIndex > -1) this.editMode = "append";

		if(this.draggedPoint) {
			//Move a single point
			this.draggedPoint.x = (event.x - bounds.x)/bounds.width;
			this.draggedPoint.y = (event.y - bounds.y)/bounds.height;
		}

		if(this.draggedArea) {
			const centroid = this.computeCentroid(this.draggedArea.points);
			centroid.x *= bounds.width;
			centroid.y *= bounds.height;
			let offsetX = event.x - this.draggOffset.x
			let offsetY = event.y - this.draggOffset.y

			//Limit area position to avoid losing it out of screen
			if(centroid.x + offsetX < 0) offsetX -= centroid.x + offsetX;
			if(centroid.x + offsetX > bounds.width) offsetX += bounds.width - (centroid.x + offsetX);
			if(centroid.y + offsetY < 0) offsetY -= centroid.y + offsetY;
			if(centroid.y + offsetY > bounds.height) offsetY += bounds.height - (centroid.y + offsetY);

			//Move all points
			for (const point of this.draggedArea.points) {
				point.x += offsetX/bounds.width;
				point.y += offsetY/bounds.height;
			}
			this.draggOffset.x = event.x;
			this.draggOffset.y = event.y;
		}
	}

	/**
	 * Checks if the given coordinates are near any of the areas segments
	 * @param x
	 * @param y
	 */
	private getSegmentUnderPoint(x:number, y:number):number[] {
		const editor = this.$refs.editor as HTMLDivElement;
		const bounds = editor.getBoundingClientRect();
		x = (x - bounds.x)/bounds.width;
		y = (y - bounds.y)/bounds.height;

		let areaIndex = -1;
		let pointIndex = -1;
		let minDist = Number.MAX_SAFE_INTEGER;

		for (let i = 0; i < this.screen.areas.length; i++) {
			const area = this.screen.areas[i]!;
			//Parse all points going 1 beyond to also check segment between last and first point
			for (let j = 1; j < area.points.length+1; j++) {
				const prevP = area.points[j-1]!;
				//Make sure we loop the index to check segment between last and first point
				const point = area.points[j % area.points.length]!;
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

	/**
	 * Compute the centroid coordinates of a polygon
	 * @param points
	 */
	private computeCentroid(points:{x:number, y:number}[]) {
		let cx = 0;
		let cy = 0;
		const n = points.length;
		for (let i = 0; i < n; i++) {
			cx += points[i]!.x;
			cy += points[i]!.y;
		}
		cx /= n;
		cy /= n;

		return { x: cx, y: cy };
	}

	/**
	 * Grabs an OBS screenshot to set it as area's background
	 */
	private async refreshImage():Promise<void> {
		if(this.disposed) return;
		const area = (this.$refs.background as HTMLDivElement);
		//@ts-ignore
		if(area && this.params_showOBS.value == true && OBSWebsocket.instance.connected.value) {
			const scene = this.params_target.value? this.params_target.value : undefined;
			const image = await OBSWebsocket.instance.getScreenshot(scene);
			area.style.backgroundImage = "url("+image+")";
		}

		window.setTimeout(()=>this.refreshImage(), 60);
	}

}
export default toNative(HeatScreenEditor);
</script>

<style scoped lang="less">
.heatscreeneditor{

	.scrollable {
		width: 100%;
		aspect-ratio: 16/9.1;//No idea why this weird ratio avoids scrollbar to show up when zoomed out
		overflow: auto;
	}

	.editor {
		border: 1px solid var(--color-text);
		cursor: crosshair;
		user-select: none;
		position: relative;
		width: 100%;
		aspect-ratio: 16/9;
		.background {
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			opacity: .5;
			position: absolute;
			background-size: contain;
			background-repeat: no-repeat;
			background-position: center center;
		}
		// &.delete {
		// 	cursor: crosshair;
		// }

		svg {
			position: relative;
			z-index: 1;
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

				&.selected {
					fill: var(--color-secondary);
				}
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

	.form {
		display: flex;
		flex-direction: column;
		gap: .25em;
		margin-top: .5em;

		&:first-of-type {
			margin-top: 0;
			margin-bottom: .5em;
		}

		.shrink {
			align-self: center;
		}

		.backBt {
			text-transform: capitalize;
			align-self: center;
		}
	}
}
</style>
