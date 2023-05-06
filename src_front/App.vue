<template>
	<div :class="classes">
		<router-view />
		<Confirm />
		<Alert />
	</div>
</template>

<script lang="ts">
import { watch, type StyleValue, compile, h, type VNode } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import DataStore from './store/DataStore';
import Alert from "./views/AlertView.vue";
import Confirm from "./views/Confirm.vue";


@Component({
	components:{
		Alert,
		Confirm,
	}
})
export default class App extends Vue {

	public node!:VNode;
	
	private resizeHandler!:() => void;

	public get dyslexicFont():boolean { return this.$store("params").appearance.dyslexicFont.value as boolean; }

	public get classes():string[] {
		let res = ["app"];
		if(this.dyslexicFont === true) res.push("dyslexicFont");
		if(this.$route.meta.overflow === true) res.push("overflow");
		res.push("messageSize_"+this.$store("params").appearance.defaultSize.value);
		return res;
	}

	public mounted():void {
		this.resizeHandler = ()=> this.onWindowResize();
		window.addEventListener("resize", this.resizeHandler);
		this.onWindowResize();
		watch(()=> this.$store("main").initComplete, ()=> this.hideMainLoader())
		this.hideMainLoader();
	}
	
	public beforeUnmount():void {
		window.removeEventListener("resize", this.resizeHandler);
	}

	private onWindowResize():void {
		//vh metric is fucked up on mobile. It doesn't take header/footer UIs into account.
		//Here we calculate the actual page height and set it as a CSS var.
		(document.querySelector(':root') as HTMLHtmlElement).style.setProperty('--vh', window.innerHeight + 'px');
	}

	private hideMainLoader():void {
		if(this.$store("main").initComplete === true) {
			//@ts-ignore
			closeInitLoader();//Method declared on index.html
		}
	}
}
</script>

<style scoped lang="less">
.app{
	width: 100%;
	height: var(--vh);
	font-family: var(--font-inter);
	overflow: hidden;

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