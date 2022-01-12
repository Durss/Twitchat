<template>
	<div class="usercard">
		<!-- <iframe :src="profileURL" frameborder="0" v-if="username"></iframe> -->
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class UserCard extends Vue {

	public username:string = '';

	public get profileURL():string {
		return "https://www.twitch.tv/popout/"+store.state.user.login+"/viewercard/"+this.username;
	}

	mounted() {
		watch(() => store.state.userCard, () => {
			// console.log("OOK");
			this.username = store.state.userCard;
			let params = `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,
			width=350,height=500,left=100,top=100`;

			window.open(this.profileURL, 'test', params);
		});
	}

}
</script>

<style scoped lang="less">
.usercard{
	position: fixed;
	top: 0;
	left: 0;
	width: 200px;
	height: 300px;
	iframe {
		width: 100%;
		height: 100%;
	}
}
</style>