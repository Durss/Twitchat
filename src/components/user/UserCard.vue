<template>
	<div class="usercard">
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

	public mounted():void {
		watch(() => store.state.userCard, () => {
			this.username = store.state.userCard;

			let url = "https://www.twitch.tv/"+this.username;
			if(store.state.user?.login) {
				let params = `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,
				width=350,height=500,left=100,top=100`;
				url ="https://www.twitch.tv/popout/"+store.state.user.login+"/viewercard/"+this.username;
				window.open(url, 'profilePage', params);
			}else{
				window.open(url, '_bloank');
			}
		});
	}

}
</script>

<style scoped lang="less">
.usercard{
	position: fixed;
	top: 0;
	left: 0;
}
</style>