<template>
	<div class="app">
		<router-view />
		<Parameters v-if="$store.state.authenticated" />
		<Confirm />
		<Alert />
		<Tooltip />
	</div>
</template>

<script lang="ts">
import Parameters from '@/components/params/Parameters.vue';
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
		Parameters,
	}
})
export default class App extends Vue {


	public mounted():void {
	}

}
</script>

<style scoped lang="less">
.app{
	font-family: Inter, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	width: 100%;
	height: 100vh;

	.loader {
		.center();
		position: absolute;
		width: 80px;
		height: 80px;
	}
}
</style>