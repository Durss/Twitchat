<template>
	<div class="app">
		<router-view />
		<Confirm />
		<Alert />
		<Tooltip />
	</div>
</template>

<script lang="ts">
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
}
</script>

<style scoped lang="less">
.app{
	font-family: Futura, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}
</style>