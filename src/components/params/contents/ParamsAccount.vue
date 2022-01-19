<template>
	<div class="paramsaccount">
		<Button @click="clearData()" :icon="require('@/assets/icons/cross_white.svg')" bounce title="Clear data storage" highlight class="logoutBt" />
		<Button @click="logout()" :icon="require('@/assets/icons/cross_white.svg')" bounce title="Logout" highlight class="logoutBt" />
		<div class="credits">
			<h2>Credits</h2>
			<p>App made by <a href="https://twitch.tv/durss" target="_blank">Durss</a></p>
			<p>Sources on <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			<p>
				<a class="link" href="https://github.com/durss" target="_blank"><img src="@/assets/img/github.png" data-tooltip="Github" alt="github"></a>
				<a class="link" href="https://instagram.com/durss" target="_blank"><img src="@/assets/img/instagram.png" data-tooltip="Instagram" alt="instagram"></a>
				<a class="link" href="https://tiktok.com/@dursss" target="_blank"><img src="@/assets/img/tiktok.png" data-tooltip="Tiktok" alt="tiktok"></a>
				<a class="link" href="https://www.durss.ninja" target="_blank"><img src="@/assets/img/work.svg" data-tooltip="Portfolio" alt="portfolio"></a>
				<a class="link" href="https://twitch.tv/durss" target="_blank"><img src="@/assets/img/twitch.png" data-tooltip="Twitch" alt="twitch"></a>
			</p>
		</div>
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

	.credits {
		text-align: center;

		h2 {
			border-bottom: 1px solid @mainColor_normal;
			// border-left: 3px solid @mainColor_normal;
			padding-left: 5px;
			font-size: 20px;
			margin-top: 20px;
		}
		p {
			margin-left: 10px;
			margin-top: 10px;

			.link {
				&:not(:last-child) {
					margin-right: 10px;
				}
				img {
					height: 40px;
				}
			}
		}
	}
}
</style>