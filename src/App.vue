<template>
	<div :class="classes">
		<router-view />
		<UserCard />
		<Confirm />
		<Alert />
		<Tooltip />
		<img src="/loader_white.svg" alt="loader" class="loader-init" v-if="showLoader">
	</div>
</template>

<script lang="ts">
import UserCard from '@/components/user/UserCard.vue';
import { Options, Vue } from 'vue-class-component';
import store from './store';
import Alert from "./views/AlertView.vue";
import Confirm from "./views/Confirm.vue";
import Tooltip from "./views/Tooltip.vue";

@Options({
	props:{},
	components:{
		Alert,
		Confirm,
		Tooltip,
		UserCard,
	}
})
export default class App extends Vue {

	public get showLoader():boolean {
		return !this.authenticated && this.$route.meta.noBG !== true && store.state.initComplete;
	}
	public get authenticated():boolean {
		return store.state.authenticated || (this.$route.meta.needAuth !== true && store.state.initComplete);
	}

	public get classes():string[] {
		let res = ["app"];
		if(this.$route.meta.overflow === true) res.push("overflow");
		res.push("messageSize_"+store.state.params.appearance.defaultSize.value);
		return res;
	}

	public mounted():void {
		window.addEventListener('resize', () => this.onWindowResize)
		this.onWindowResize();
	}

	private onWindowResize():void { 
		//vh metric is fucked up on mobile. It doesn't take header/footer UIs into account.
		//Here we calculate the actual page height and set it as a CSS var.
		(document.querySelector(':root') as HTMLHtmlElement).style.setProperty('--vh', window.innerHeight + 'px');
	}

}
</script>

<style scoped lang="less">
.app{
	width: 100%;
	height: var(--vh);
	font-size: 20px;
	overflow: hidden;

	.loader-init {
		transform:scale(10);
	}

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