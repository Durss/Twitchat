<template>
	<div :class="classes">
		<router-view />
		<UserCard />
		<Confirm />
		<Alert />
		<Tooltip />
		<img src="/loader_white.svg" alt="loader" class="loader-init" v-if="!authenticated">
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