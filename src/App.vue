<template>
	<div class="app">
		<router-view />
		<Button @click="logout()" title="Logout" class="logoutBt" v-if="$store.state.authenticated" />
		<Confirm />
		<Alert />
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import Alert from "./views/AlertView.vue";
import Confirm from "./views/Confirm.vue";
import Button from "./components/Button.vue";
import store from './store';

@Options({
	props:{},
	components:{
		Alert,
		Confirm,
		Button,
	}
})
export default class App extends Vue {

	public logout():void {
		console.log("OKOFDKOKFD");
		store.dispatch('logout');
		this.$router.push({name:'login'});
	}
}
</script>

<style scoped lang="less">
.app{
	font-family: Futura, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;

	.logoutBt {
		position: absolute;
		top: 0;
		right: 0;
	}
}
</style>