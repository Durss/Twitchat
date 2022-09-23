<template>
	<div :class="classes">
		<router-view />
		<Confirm />
		<Alert />
		<Tooltip />
	</div>
</template>

<script lang="ts">
import { getCurrentInstance, inject, watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
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

	private resizeHandler!:() => void;

	public get classes():string[] {
		let res = ["app"];
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
	font-size: 20px;
	overflow: hidden;

	&.overflow {
		overflow: auto;
	}

	&.messageSize_1 {
		:root & {
			--messageSize: 11px;
		}
	}
	&.messageSize_2 {
		:root & {
			--messageSize: 13px;
		}
	}
	&.messageSize_3 {
		:root & {
			--messageSize: 18px;
		}
	}
	&.messageSize_4 {
		:root & {
			--messageSize: 24px;
		}
	}
	&.messageSize_5 {
		:root & {
			--messageSize: 30px;
		}
	}
	&.messageSize_6 {
		:root & {
			--messageSize: 40px;
		}
	}
	&.messageSize_7 {
		:root & {
			--messageSize: 50px;
		}
	}
}
@media only screen and (max-width: 500px) {
	.app{
		font-size: 18px;
	}
}
</style>