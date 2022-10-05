<template>
	<div :class="classes" :style="styles">
		<router-view />
		<Confirm />
		<Alert />
		<Tooltip />
	</div>
</template>

<script lang="ts">
import { watch, type StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Store from './store/Store';
import StoreProxy from './utils/StoreProxy';
import Alert from "./views/AlertView.vue";
import Confirm from "./views/Confirm.vue";
import Tooltip from "./views/Tooltip.vue";

@Options({
	props:{},
	components:{
		Alert,
		Confirm,
		Tooltip,
	}
})
export default class App extends Vue {

	public scale:number = 1.25;
	
	public defaultScale:number = 1.25;
	private resizeHandler!:() => void;
	private keyDownHandler!:(e:KeyboardEvent) => void;

	public get classes():string[] {
		let res = ["app"];
		if(this.$route.meta.overflow === true) res.push("overflow");
		res.push("messageSize_"+StoreProxy.store.state.params.appearance.defaultSize.value);
		return res;
	}

	public get styles():StyleValue {
		let res:StyleValue = {};
		if(this.scale != 1 && !isNaN(this.scale)) {
			res.fontSize = Math.min(2.95, Math.max(.95, this.scale))+"em";
		}
		return res;
	}

	public mounted():void {
		const scale = Store.get(Store.INTERFACE_SCALE);
		if(scale) {
			this.scale = parseFloat(scale);
			if(isNaN(this.scale)) this.scale = 1;
		}
		this.resizeHandler = ()=> this.onWindowResize();
		this.keyDownHandler = (e)=> this.onKeyDown(e);
		window.addEventListener("resize", this.resizeHandler);
		window.addEventListener("keydown", this.keyDownHandler);
		this.onWindowResize();
		watch(()=> StoreProxy.store.state.initComplete, ()=> this.hideMainLoader());
		this.hideMainLoader();
	}

	public beforeUnmount():void {
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("keydown", this.keyDownHandler);
	}

	private onWindowResize():void {
		//vh metric is fucked up on mobile. It doesn't take header/footer UIs into account.
		//Here we calculate the actual page height and set it as a CSS var.
		(document.querySelector(':root') as HTMLHtmlElement).style.setProperty('--vh', window.innerHeight + 'px');
	}

	private onKeyDown(e:KeyboardEvent):void {
		if(!e.shiftKey && e.key !== "Insert") return;
		let scale = this.scale;
		if(e.key === "=" || e.key === "+") scale += .1;
		if(e.key === "6") scale -= .1;
		if(e.key === "0" || e.key === "Insert") scale = this.defaultScale;
		scale = Math.min(2.95, Math.max(.95, scale));
		this.scale = scale;
		Store.set(Store.INTERFACE_SCALE, scale, false);
	}

	private hideMainLoader():void {
		if(StoreProxy.store.state.initComplete === true) {
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
	font-size: 1.25em;
	overflow: hidden;
	
	&.overflow {
		overflow: auto;
	}

	&.messageSize_1 {
		:root & {
			--messageSize: .55em;
		}
	}
	&.messageSize_2 {
		:root & {
			--messageSize: .65em;
		}
	}
	&.messageSize_3 {
		:root & {
			--messageSize: .9em;
		}
	}
	&.messageSize_4 {
		:root & {
			--messageSize: 1.25em;
		}
	}
	&.messageSize_5 {
		:root & {
			--messageSize: 1.5em;
		}
	}
	&.messageSize_6 {
		:root & {
			--messageSize: 2em;
		}
	}
	&.messageSize_7 {
		:root & {
			--messageSize: 2.5em;
		}
	}
}
@media only screen and (max-width: 500px) {
	.app{
		font-size: 18px;
	}
}
</style>