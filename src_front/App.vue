<template>
	<div :class="classes">
		<router-view />
		<Confirm />
		<Alert />

		<img v-if="demoMode && cursorImage == 'arrow'" src="@/assets/img/cursorDemo_default.svg" :style="cursorProps" class="cursor">
		<img v-if="demoMode && cursorImage == 'pointer'" src="@/assets/img/cursorDemo_pointer.svg" :style="cursorProps" class="cursor">
		<div v-if="demoMode" class="clickIndicator" ref="clickIndicator" :style="clickIndicatorProps"></div>
	</div>
</template>

<script lang="ts">
import { gsap } from 'gsap/gsap-core';
import { watch, type VNode } from 'vue';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import Config from './utils/Config';
import Alert from "./views/AlertView.vue";
import Confirm from "./views/Confirm.vue";
import StreamdeckSocket from './utils/StreamdeckSocket';


@Component({
	components:{
		Alert,
		Confirm,
	}
})
class App extends Vue {

	public node!:VNode;
	public cursorImage:"pointer"|"arrow" = "arrow";
	public mousePos = {x:0, y:0};
	public cursorOffset = {x:0, y:0};
	public cursorProps = {left:'0px', top:'0px'};
	public clickIndicatorProps = {left:'0px', top:'0px'};

	public get demoMode() { return Config.instance.DEMO_MODE && this.$route.name !="overlay"; }

	private requestAnimID = -1;
	private resizeHandler!:() => void;
	private dragStartHandler!:(e:MouseEvent) => boolean;
	private mouseDownHandler!:(e:MouseEvent) => boolean;
	private mouseMoveHandler!:(e:MouseEvent) => boolean;
	private keyDownHandler!:(e:KeyboardEvent) => void;

	public get dyslexicFont():boolean { return this.$store.params.appearance.dyslexicFont.value as boolean; }
	public get adhdFont():boolean { return this.$store.params.appearance.adhdFont.value as boolean; }

	public get classes():string[] {
		let res = ["app"];
		if(this.dyslexicFont === true) res.push("dyslexicFont");
		if(this.adhdFont === true) res.push("adhdFont");
		if(this.$route.meta.overflow === true) res.push("overflow");
		if(this.demoMode === true) res.push("demoMode");
		res.push("messageSize_"+this.$store.params.appearance.defaultSize.value);
		return res;
	}

	public mounted():void {
		this.resizeHandler = ()=> this.onWindowResize();
		window.addEventListener("resize", this.resizeHandler);
		this.onWindowResize();
		watch(()=> this.$store.main.initComplete, ()=> this.hideMainLoader())
		this.hideMainLoader();

		watch(()=> Config.instance.DEMO_MODE, () => {
			if(this.demoMode) {
				document.body.classList.add("demoMode");
				this.renderFrame();
				this.mouseMoveHandler = (e) => this.onMouseMove(e);
				this.dragStartHandler = (e) => this.onDragStart(e);
				this.mouseDownHandler = (e) => this.onMouseDown(e);
				this.keyDownHandler = (e) => this.onKeyDown(e);
				window.addEventListener("mousedown", this.mouseDownHandler);
				window.addEventListener("mousemove", this.mouseMoveHandler, true);
				window.addEventListener("dragover", this.mouseMoveHandler);
				window.addEventListener("dragstart", this.dragStartHandler);
				window.addEventListener("keydown", this.keyDownHandler);
			}else{
				document.body.classList.remove("demoMode");
				cancelAnimationFrame(this.requestAnimID);
				window.removeEventListener("mousedown", this.mouseDownHandler);
				window.removeEventListener("mousemove", this.mouseMoveHandler, true);
				window.removeEventListener("dragover", this.mouseMoveHandler);
				window.removeEventListener("dragstart", this.dragStartHandler);
				window.removeEventListener("keydown", this.keyDownHandler);
			}
		})
	}

	public beforeUnmount():void {
		cancelAnimationFrame(this.requestAnimID);
		window.removeEventListener("resize", this.resizeHandler);
		if(this.demoMode) {
			window.removeEventListener("mousedown", this.mouseDownHandler);
			window.removeEventListener("mousemove", this.mouseMoveHandler, true);
			window.removeEventListener("dragover", this.mouseMoveHandler);
			window.removeEventListener("dragstart", this.dragStartHandler);
			window.removeEventListener("keydown", this.keyDownHandler);
		}
	}

	private onWindowResize():void {
		//vh metric is fucked up on mobile. It doesn't take header/footer UIs into account.
		//Here we calculate the actual page height and set it as a CSS var.
		(document.querySelector(':root') as HTMLHtmlElement).style.setProperty('--vh', window.innerHeight + 'px');
	}

	private onKeyDown(e:KeyboardEvent):void {
		//Debuging stuff
		/*
		if(e.key == "a" && e.ctrlKey && e.altKey) {
			EventSub.instance.simulateFollowbotRaid();
			// for (let i = 0; i < 30; i++) {
			// 	Utils.promisedTimeout(i*100).then(()=>{
			// 		if(Math.random() >= .5) {
			// 			MessengerProxy.instance.sendMessage("/fake !q {LOREM}")
			// 		}else{
			// 			MessengerProxy.instance.sendMessage("/fake !howto {LOREM}")
			// 		}
			// 	})
			// }
		}
		if(e.key == "q" && e.ctrlKey && e.altKey) {
			MessengerProxy.instance.stopSpam();
		}
		//*/
	}

	private onMouseDown(e:MouseEvent):boolean {
		if(!this.demoMode) return false;
		const indicator = this.$refs.clickIndicator as HTMLElement;
		gsap.fromTo(indicator, {scale:0, opacity:1}, {scale:1, opacity:0});
		this.clickIndicatorProps.left = this.mousePos.x+'px';
		this.clickIndicatorProps.top = (this.mousePos.y-2)+'px';
		return true;
	}

	private onDragStart(e:MouseEvent):boolean {
		//Avoid showing cursor on drag when using demo mode
		return false;
	}

	private onMouseMove(e:DragEvent|MouseEvent):boolean {
		if(!this.demoMode) return false;
		this.mousePos.x = e.clientX;
		this.mousePos.y = e.clientY;
		let target:HTMLElement|null = e.target as HTMLElement;
		let isButton = false;

		// console.log(target);
		while(target) {
			// console.log(target.style);
			// console.log(target.computedStyleMap().get("cursor"));
			if(target.tagName == "BUTTON"
			|| target.tagName == "A"
			|| target.classList.contains("checkbox")
			|| target.classList.contains("buttonnotification")
			|| target.classList.contains("switchbutton")
			|| target.classList.contains("ToggleButton.vue")
			|| target.classList.contains("button")
			|| target.classList.contains("toggle")
			|| (target.classList.contains("header") && (target.parentElement as HTMLElement).classList.contains("toggleblock"))
			|| target.classList.contains("timercountdowninfo")
			|| target.classList.contains("mx-context-menu-item-wrapper")
			|| (typeof target.className === "string" && target.className.indexOf("Bt") > -1)

			) {
				isButton = true;
				break;
			}
			target = target.parentElement as HTMLElement;
			if(target === document.body) target = null;
		}

		if(isButton) {
			this.cursorOffset.x = -20;
			this.cursorImage = "pointer";
		}else{
			this.cursorOffset.x = 0;
			this.cursorImage = "arrow";
		}
		return false;
	}

	private hideMainLoader():void {
		if(this.$store.main.initComplete === true) {
			//@ts-ignore
			closeInitLoader();//Method declared on index.html
		}
	}

	private renderFrame():void {
		this.requestAnimID = requestAnimationFrame(()=>this.renderFrame());
		this.cursorProps.left = (this.mousePos.x+this.cursorOffset.x)+'px';
		this.cursorProps.top = (this.mousePos.y-2)+'px';
	}
}
export default toNative(App);
</script>

<style scoped lang="less">
.app{
	width: 100%;
	height: var(--vh);
	font-family: var(--font-inter);
	overflow: hidden;

	// &.demoMode {
		// max-width: var(--vw) !important;
		// width: var(--vw) !important;
	// }

	.cursor {
		pointer-events: none;
		position: fixed;
		width: 50px;
		z-index: 99999;
	}
	.clickIndicator {
		z-index: 99998;
		pointer-events: none;
		top: 0;
		left: 0;
		position: fixed;
		background-color: var(--color-text);
		border-radius: 50%;
		width: 100px;
		height: 100px;
		transform: translate(-50%, -50%) scale(0);
	}

	&.dyslexicFont {
		font-size: .9em;
		--font-inter: "OpenDyslexic";
		--font-nunito: "OpenDyslexic";
		--font-roboto: "OpenDyslexic";
		--font-azeret: "OpenDyslexic";
	}

	&.adhdFont {
		--font-inter: "FastMono";
		--font-nunito: "FastMono";
		--font-roboto: "FastMono";
		--font-azeret: "FastMono";
	}

	&.overflow {
		overflow: auto;
	}


	&.messageSize_1 {
		--messageSize: .6em;
	}
	&.messageSize_2 {
		--messageSize: .7em;
	}
	&.messageSize_3 {
		--messageSize: .8em;
	}
	&.messageSize_4 {
		--messageSize: .9em;
	}
	&.messageSize_5 {
		--messageSize: 1em;
	}
	&.messageSize_6 {
		--messageSize: 1.1em;
	}
	&.messageSize_7 {
		--messageSize: 1.2em;
	}
	&.messageSize_8 {
		--messageSize: 1.3em;
	}
	&.messageSize_9 {
		--messageSize: 1.4em;
	}
	&.messageSize_10 {
		--messageSize: 1.5em;
	}
	&.messageSize_11 {
		--messageSize: 1.6em;
	}
	&.messageSize_12 {
		--messageSize: 1.7em;
	}
	&.messageSize_13 {
		--messageSize: 1.8em;
	}
	&.messageSize_14 {
		--messageSize: 1.9em;
	}
	&.messageSize_15 {
		--messageSize: 2em;
	}
	&.messageSize_16 {
		--messageSize: 2.1em;
	}
	&.messageSize_17 {
		--messageSize: 2.2em;
	}
	&.messageSize_18 {
		--messageSize: 2.3em;
	}
	&.messageSize_19 {
		--messageSize: 2.4em;
	}
	&.messageSize_20 {
		--messageSize: 2.5em;
	}
}
</style>
