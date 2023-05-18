<template>
	<div :class="classes">
		<router-view />
		<Confirm />
		<Alert />

		<img v-if="demoMode" :src="cursorImage" :style="cursorProps" class="cursor">
	</div>
</template>

<script lang="ts">
import { watch, type VNode } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Alert from "./views/AlertView.vue";
import Confirm from "./views/Confirm.vue";
import Config from './utils/Config';


@Component({
	components:{
		Alert,
		Confirm,
	}
})
export default class App extends Vue {

	public node!:VNode;
	public cursorImage:string = "";
	public mousePos = {x:0, y:0};
	public cursorOffset = {x:0, y:0};
	public cursorProps = {left:'0px', top:'0px'};

	public get demoMode() { return Config.instance.DEMO_MODE && this.$route.name !="overlay"; }

	private dispose = false;
	private resizeHandler!:() => void;
	private mouseDownHandler!:(e:MouseEvent) => boolean;
	private mouseMoveHandler!:(e:MouseEvent) => boolean;

	public get dyslexicFont():boolean { return this.$store("params").appearance.dyslexicFont.value as boolean; }

	public get classes():string[] {
		let res = ["app"];
		if(this.dyslexicFont === true) res.push("dyslexicFont");
		if(this.$route.meta.overflow === true) res.push("overflow");
		if(this.demoMode === true) res.push("demoMode");
		res.push("messageSize_"+this.$store("params").appearance.defaultSize.value);
		return res;
	}

	public mounted():void {
		this.resizeHandler = ()=> this.onWindowResize();
		window.addEventListener("resize", this.resizeHandler);
		this.onWindowResize();
		watch(()=> this.$store("main").initComplete, ()=> this.hideMainLoader())
		this.hideMainLoader();
		
		if(this.demoMode) {
			document.body.classList.add("demoMode");
			this.renderFrame();
			this.mouseMoveHandler = (e) => this.onMouseMove(e);
			this.mouseDownHandler = (e) => this.onMouseDown(e);
			window.addEventListener("mousemove", this.mouseMoveHandler);
			window.addEventListener("dragstart", this.mouseDownHandler);
		}
	}
	
	public beforeUnmount():void {
		this.dispose = true;
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("mousemove", this.mouseMoveHandler);
		window.removeEventListener("dragstart", this.mouseDownHandler);
	}

	private onWindowResize():void {
		//vh metric is fucked up on mobile. It doesn't take header/footer UIs into account.
		//Here we calculate the actual page height and set it as a CSS var.
		(document.querySelector(':root') as HTMLHtmlElement).style.setProperty('--vh', window.innerHeight + 'px');
	}

	private onMouseDown(e:MouseEvent):boolean {
		//Avoid showing cursor on interaction when using demo mode
		return false;
	}

	private onMouseMove(e:MouseEvent):boolean {
		this.mousePos.x = e.clientX;
		this.mousePos.y = e.clientY;
		let target:HTMLElement|null = e.target as HTMLElement;
		let isButton = false;

		// console.log(target);
		while(target) {
			// console.log(target.style);
			if(target.tagName == "BUTTON" || target.tagName == "A"
			|| target.classList.contains("buttonnotification")
			|| target.classList.contains("switchbutton")
			|| target.classList.contains("togglebutton")
			|| target.classList.contains("button")
			|| target.classList.contains("toggle")
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
			this.cursorImage = this.$image("img/cursorDemo_pointer.svg?v=1");
		}else{
			this.cursorOffset.x = 0;
			this.cursorImage = this.$image("img/cursorDemo_default.svg?v=1");
		}
		return false;
	}

	private hideMainLoader():void {
		if(this.$store("main").initComplete === true) {
			//@ts-ignore
			closeInitLoader();//Method declared on index.html
		}
	}

	private renderFrame():void {
		if(this.dispose) return;
		requestAnimationFrame(()=>this.renderFrame());
		this.cursorProps.left = (this.mousePos.x+this.cursorOffset.x)+'px';
		this.cursorProps.top = (this.mousePos.y-2)+'px';
	}
}
</script>

<style scoped lang="less">
.app{
	width: 100%;
	height: var(--vh);
	font-family: var(--font-inter);
	overflow: hidden;

	&.demoMode {
		// max-width: var(--vw) !important;
		// width: var(--vw) !important;
	}

	.cursor {
		pointer-events: none;
		position: fixed;
		width: 50px;
		z-index: 99999;
	}

	&.dyslexicFont {
		font-size: .9em;
		--font-inter: "OpenDyslexic";
		--font-nunito: "OpenDyslexic";
		--font-roboto: "OpenDyslexic";
		--font-azeret: "OpenDyslexic";
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