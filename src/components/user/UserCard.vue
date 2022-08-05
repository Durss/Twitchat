<template>
	<div class="usercard">
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/utils/StoreProxy';
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
		watch(() => StoreProxy.store.state.userCard, () => {
			this.username = StoreProxy.store.state.userCard;
			if(this.username == null) return;

			let url = "https://www.twitch.tv/"+this.username;
			if(UserSession.instance.authToken.login) {
				let params = `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,
				width=350,height=500,left=100,top=100`;
				url ="https://www.twitch.tv/popout/"+UserSession.instance.authToken.login+"/viewercard/"+this.username;
				window.open(url, 'profilePage', params);
				StoreProxy.store.dispatch("openUserCard", null);//Reset so we can open the same card again
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