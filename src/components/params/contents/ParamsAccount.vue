<template>
	<div class="paramsaccount">
		<Button @click="clearData()" :icon="require('@/assets/icons/cross_white.svg')" bounce title="Clear data storage" highlight class="logoutBt" />
		<Button @click="logout()" :icon="require('@/assets/icons/cross_white.svg')" bounce title="Logout" highlight class="logoutBt" />
	</div>
</template>

<script lang="ts">
import store from '@/store';
import Store from '@/store/Store';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class ParamsAccount extends Vue {

	public logout():void {
		store.dispatch('logout');
		this.$router.push({name:'login'});
	}

	public clearData():void {
		Utils.confirm("Clear data?", "All your parameters and session will be lost. You'll be logged out").then( () => {
			Store.clear();
			this.logout();
		});
	}
}
</script>

<style scoped lang="less">
.paramsaccount{
	.logoutBt {
		// width: min-content;
		margin: auto;
		display: block;
		margin-bottom: 5px;
	}
}
</style>