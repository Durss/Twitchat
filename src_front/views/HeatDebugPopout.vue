<template>
	<div class="heatdebugpopout" ref="areaHolder">
		<div ref="area" class="area" @click="onClickArea" @contextmenu="onClickArea" @mousemove="mouseMoveHandler">
			<div class="cursor" ref="cursor"></div>
		</div>

		<div v-for="click in clicks" class="click" :style="getClickStyles(click)" :key="click.id"></div>

		<div class="ctas">
			<button class="fsBt" @click="goFullscreen()" v-tooltip="$t('heat.debug.popout')" v-if="!isPopout"><Icon name="newtab" theme="light" /></button>
			<button class="cacheBt" @click="clearOBSCache()" v-tooltip="$t('heat.debug.obs')" v-if="obsConnected"><Icon name="obs" theme="light" /></button>
		</div>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import OBSWebsocket from '@/utils/OBSWebsocket';
import HeatSocket from '@/utils/twitch/HeatSocket';
import { watch, type CSSProperties } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
class HeatDebugPopout extends Vue {

	public isPopout:boolean = false;
	public clicks:ClickData[] = [];

	private disposed:boolean = false
	private debugInterval:number = -1;
	private keyupHandler!:(e:KeyboardEvent) => void;

	public mounted():void {
		this.isPopout = this.$route.name == "heatDebug";
		if(OBSWebsocket.instance.connected){
			this.refreshImage();
		}else{
			watch(()=>OBSWebsocket.instance.connected, ()=>{
				this.refreshImage();
			});
		}
		this.keyupHandler = (e:KeyboardEvent) => this.onKeyUp(e);
		document.addEventListener("keydown", this.keyupHandler);
	}

	public beforeUnmount():void {
		this.disposed = true;
		clearTimeout(this.debugInterval);
		document.removeEventListener("keydown", this.keyupHandler);
	}

	public getClickStyles(data:ClickData):CSSProperties {
		const bounds = (this.$refs.areaHolder as HTMLDivElement).getBoundingClientRect();
		let res:CSSProperties = {};
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
		if(event.type == "contextmenu") {
			event.preventDefault();
			this.clearOBSCache();
		}
		const bounds = (this.$refs.area as HTMLDivElement).getBoundingClientRect();
		let px = event.clientX - bounds.x;
		let py = event.clientY - bounds.y;
		this.clicks.push({
			id:Math.random(),
			px:event.clientX,
			py:event.clientY,
			color:event.altKey || event.ctrlKey || event.shiftKey? "#12c7d0" : "#e55a37",
		});
		window.setTimeout(()=>{
			this.clicks.shift();
		}, 500)
		px = px/bounds.width
		py = py/bounds.height
		if(HeatSocket.instance.connected) {
			const uid = this.$store.auth.twitch.user.id
			HeatSocket.instance.fireEvent(uid, px, py, event.altKey, event.ctrlKey, event.shiftKey, true);
		}

		if(window.opener?.simulateHeatClick) {
			window.opener.simulateHeatClick(px, py, event.altKey, event.ctrlKey, event.shiftKey);
		}
	}

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }

	public goFullscreen():void {
		let params = `scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,directories=no,menubar=no,width=1080,height=800,left=600,top=100`;
		const url = new URL(document.location.origin + this.$router.resolve({name:"heatDebug"}).href);

		const port = DataStore.get(DataStore.OBS_PORT);
		const pass = DataStore.get(DataStore.OBS_PASS);
		const ip = DataStore.get(DataStore.OBS_IP);
		if(port) url.searchParams.append("obs_port", port);
		if(pass) url.searchParams.append("obs_pass", pass);
		if(ip) url.searchParams.append("obs_ip", ip);

		window.open(url, "heatDebug", params);
	}

	public clearOBSCache():void {
		OBSWebsocket.instance.clearSourceTransformCache()
		if(window.opener?.clearOBSCache) {
			window.opener.clearOBSCache();
		}
	}

	/**
	 * Show a debug field on CTRL+ALT+D
	 * @param e
	 */
	private onKeyUp(e:KeyboardEvent):void {
		clearInterval(this.debugInterval);
		if(e.key.toUpperCase() == "D" && e.ctrlKey && e.altKey) {
			const bounds = (this.$refs.area as HTMLDivElement).getBoundingClientRect();
			this.debugInterval = window.setInterval(()=>{
				this.clearOBSCache();
				this.onClickArea(new MouseEvent("click", {
					clientX:bounds.left,
					clientY:bounds.top,
				}))
			}, 100);
		}
	}

	/**
	 * Grabs an OBS screenshot to set it as area's background
	 */
	private async refreshImage():Promise<void> {
		if(this.disposed) return;
		const area = (this.$refs.areaHolder as HTMLDivElement);
		//@ts-ignore
		if(area) {
			const image = await OBSWebsocket.instance.getScreenshot();
			area.style.backgroundImage = "url("+image+")";
		}

		window.setTimeout(()=>this.refreshImage(), 60);
	}
}
interface ClickData {
	id:number;
	px:number;
	py:number;
	color:string;
}
export default toNative(HeatDebugPopout);
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
	background-color: var(--color-text-inverse);

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

	.ctas {
		position: absolute;
		top: .5em;
		right: .5em;
		gap: .5em;
		display: flex;
		flex-direction: column;
		button {
			cursor: pointer;
			width: 1em;
			height: 1em;
			img {
				width: 100%;
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
