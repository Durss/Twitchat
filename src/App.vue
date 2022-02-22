<template>
	<div :class="classes">
		<router-view />
		<Parameters v-if="$store.state.authenticated" />
		<UserCard />
		<Confirm />
		<Alert />
		<Tooltip />
		<img src="/loader_white.svg" alt="loader" class="loader-init" v-if="!authenticated">
	</div>
</template>

<script lang="ts">
import Parameters from '@/components/params/Parameters.vue';
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
		Parameters,
	}
})
export default class App extends Vue {

	public get authenticated():boolean {
		return store.state.authenticated || (this.$route.meta.needAuth !== true && store.state.initComplete);
	}

	public get classes():string[] {
		let res = ["app"];
		if(this.$route.meta.noBG === true) res.push("noBG");
		if(this.$route.meta.overflow === true) res.push("overflow");
		return res;
	}

}
</script>

<style scoped lang="less">
.app{
	width: 100%;
	height: 100vh;
	font-size: 20px;
	overflow: hidden;

	&.overflow {
		overflow: auto;
	}

	&:not(.noBG) {
		background-color: @mainColor_dark;
	}

	.loader {
		.center();
		position: absolute;
		width: 80px;
		height: 80px;
	}
}
@media only screen and (max-width: 500px) {
	.app{
		font-size: 18px;
	}
}
</style>