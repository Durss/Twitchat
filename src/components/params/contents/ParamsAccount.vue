<template>
	<div class="paramsaccount">
		<div class="row">
			<label for="obsEmbed">Add chat in OBS overlay</label>
			<p class="info">Use this if you want to display the chat on your stream. The current parameters are defined on the URL.</p>
			<input type="text" id="obsEmbed" v-model="obsOverlayURL">
		</div>

		<Button @click="logout()" :icon="require('@/assets/icons/cross_white.svg')" bounce title="Logout" highlight class="logoutBt" />
		
		<div class="credits">
			<h2>Credits</h2>
			<p>App made by <a href="https://twitch.tv/durss" target="_blank">Durss</a></p>
			<p>Sources on <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			<p>
				<a class="link" href="https://www.durss.ninja" target="_blank"><img src="@/assets/img/work.svg" data-tooltip="Portfolio" alt="portfolio"></a>
				<a class="link" href="https://instagram.com/durss" target="_blank"><img src="@/assets/img/instagram.png" data-tooltip="Instagram" alt="instagram"></a>
				<a class="link" href="https://github.com/durss" target="_blank"><img src="@/assets/img/github.png" data-tooltip="Github" alt="github"></a>
				<a class="link" href="https://tiktok.com/@dursss" target="_blank"><img src="@/assets/img/tiktok.png" data-tooltip="Tiktok" alt="tiktok"></a>
				<a class="link" href="https://twitch.tv/durss" target="_blank"><img src="@/assets/img/twitch.png" data-tooltip="Twitch" alt="twitch"></a>
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import router from '@/router';
import store, { ParameterData } from '@/store';
import Store from '@/store/Store';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class ParamsAccount extends Vue {

	public obsOverlayURL:string = "";

	public logout():void {
		Utils.confirm("Logout?", "All your parameters will be lost.").then(()=> {
			Store.clear();
			store.dispatch('logout');
			this.$router.push({name:'logout'});
		}).catch(()=> {});
	}

	public mounted():void {
		watch(()=> store.state.params, ()=> this.onParamChanged());
		this.onParamChanged();
	}

	private onParamChanged():void {
		let path = router.resolve({name:'chatLight', params:{login:store.state.user.login}}).href;
		//eslint-disable-next-line
		const params:any = {};
		for (const cat in store.state.params) {
			//eslint-disable-next-line
			const values = (store.state.params as any)[cat];
			for (const key in values) {
				const p = values[key] as ParameterData;
				if(p.id) {
					params[p.id] = p.value;
				}
			}
		}
		params.access_token = store.state.oAuthToken;
		this.obsOverlayURL = document.location.origin+path+"?params="+btoa(JSON.stringify(params));
	}

}
</script>

<style scoped lang="less">
.paramsaccount{
	.logoutBt {
		margin: auto;
		display: block;
		margin-bottom: 5px;
	}

	.row {
		display: flex;
		flex-direction: column;
		margin-bottom: 10px;
		justify-content: flex-start;

		p {
			font-size: .8em;
			margin-bottom: 5px;
			font-style: italic;
		}
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