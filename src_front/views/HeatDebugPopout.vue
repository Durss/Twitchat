<template>
	<div class="heatdebugpopout" ref="areaHolder">
		<div ref="area" class="area" @click="onClickArea" @mousemove="mouseMoveHandler">
			<div class="cursor" ref="cursor"></div>
		</div>
		<div v-for="click in clicks" class="click" :style="getClickStyles(click)" :key="click.id"></div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket from '@/utils/OBSWebsocket';
import HeatSocket from '@/utils/twitch/HeatSocket';
import { watch, type StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
export default class HeatDebugPopout extends Vue {

	public clicks:ClickData[] = [];
	private obsScreener:number = -1;

	public mounted():void {
		if(OBSWebsocket.instance.connected){
			this.refreshImage();
		}else{
			watch(()=>OBSWebsocket.instance.connected, ()=>{
				this.refreshImage();
			});
		}
	}

	public beforeUnmount():void {
		clearTimeout(this.obsScreener);
	}

	public getClickStyles(data:ClickData):StyleValue {
		const bounds = (this.$refs.areaHolder as HTMLDivElement).getBoundingClientRect();
		let res:StyleValue = {};
		res.left = (data.px - bounds.left)+"px";
		res.top = (data.py - bounds.top)+"px";
		res.borderColor = data.color;
		return res;
	}

	public mouseMoveHandler(event:MouseEvent):void {
		const bounds = (this.$refs.area as HTMLDivElement).getBoundingClientRect();
		(this.$refs.cursor as HTMLDivElement).style.left = (event.clientX-bounds.left)+"px";
		(this.$refs.cursor as HTMLDivElement).style.top = (event.clientY-bounds.top)+"px";
	}

	public onClickArea(event:MouseEvent):void {
		const bounds = (this.$refs.area as HTMLDivElement).getBoundingClientRect();
		let px = event.clientX - bounds.x;
		let py = event.clientY - bounds.y;
		this.clicks.push({
			id:Math.random(),
			px:event.clientX,
			py:event.clientY,
			color:event.altKey || event.ctrlKey || event.shiftKey? "#12c7d0" : "#e55a37",
		});
		setTimeout(()=>{
			this.clicks.shift();
		}, 500)
		px = px/bounds.width
		py = py/bounds.height
		if(HeatSocket.instance.connected) {
			const uid = this.$store("auth").twitch.user.id
			HeatSocket.instance.fireEvent(uid, px, py, event.altKey, event.ctrlKey, event.shiftKey);
		}

		if(window.opener?.simulateHeatClick) {
			window.opener.simulateHeatClick(px, py, event.altKey, event.ctrlKey, event.shiftKey);
		}
	}

	/**
	 * Grabs an OBS screenshot to set it as area's background
	 */
	private async refreshImage():Promise<void> {
		const area = (this.$refs.areaHolder as HTMLDivElement);
		//@ts-ignore
		if(area) {
			const image = await OBSWebsocket.instance.getScreenshot();
			area.style.backgroundImage = "url("+image+")";
		}

		clearTimeout(this.obsScreener);
		this.obsScreener = setTimeout(()=>this.refreshImage(), 60);
	}
}
interface ClickData {
	id:number;
	px:number;
	py:number;
	color:string;
}
</script>

<style scoped lang="less">
.heatdebugpopout{
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	position: absolute;
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center center;
	width: 100%;
	aspect-ratio: 16/9;
	background-color: var(--color-primary);
	
	.area {
		cursor: none;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100%;
		aspect-ratio: 16/9;
		background-color: var(--color-light-fader);

		&:hover {
			.cursor {
				display: block !important;
			}
		}
	}

	.click {
		z-index: 999998;
		position: absolute;
		pointer-events: none;
		top: 0;
		left: 0;
		border-radius: 50%;
		border: 1px solid red;
		width: 7px;
		height: 7px;
		transform-origin: center center;
		animation: expandFadeOut .5s linear;
		transform: translate(-50%, -50%);

		@keyframes expandFadeOut {
			0% {
				opacity: 1;
			}
			50% {
				opacity: 1;
				width: 15px;
				height: 15px;
			}
			100% {
				opacity: 0;
				width: 20px;
				height: 20px;
			}
		}
	}

	.cursor {
		.emboss();
		pointer-events: none;
		position: absolute;
		z-index: 999999;
		top: 0;
		left: 0;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background-color: #e55a37;
		box-shadow: 2px 2px 2px 0px rgba(0, 0, 0, .5);
		transform-origin: center center;
		transform: translate(-50%, -50%);
		display: none;
	}
}
</style>