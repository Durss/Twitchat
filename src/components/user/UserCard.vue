<template>
	<div class="usercard">
	</div>
</template>

<script lang="ts">
import store from '@/store';
import UserSession from '@/utils/UserSession';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class UserCard extends Vue {

	public username = '';

	public mounted():void {
		watch(() => store.state.userCard, () => {
			this.username = store.state.userCard;
			if(this.username == null) return;

			let url = "https://www.twitch.tv/"+this.username;
			if(UserSession.instance.user.login) {
				let params = `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,
				width=350,height=500,left=100,top=100`;
				url ="https://www.twitch.tv/popout/"+UserSession.instance.user.login+"/viewercard/"+this.username;
				window.open(url, 'profilePage', params);
				store.dispatch("openUserCard", null);//Reset so we can open the same card again
			}else{
				window.open(url, '_blank');
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