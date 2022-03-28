<template>
	<div class="paramsaccount">

		<Button @click="logout()" :icon="require('@/assets/icons/logout.svg')" bounce title="Logout" highlight class="logoutBt" />
		
		<div class="splitter">
			<h2 for="obsEmbed"><img src="@/assets/icons/obs_purple.svg" alt="obs" class="icon">Add chat as an OBS overlay</h2>
			<p class="info">Use this if you want to display the chat on your stream. The current parameters are defined on the URL.</p>
			<input type="text" id="obsEmbed" v-model="obsOverlayURL">
		</div>
		
		<div class="splitter">
			<h2><img src="@/assets/icons/idea_purple.svg" alt="suggestion" class="icon suggestion">Suggestions and issues</h2>
			<p>If you have a feature idea or experiencing an issue, please <a href="https://github.com/Durss/Twitchat/issues" target="_blank">create an issue on github</a>.</p>
			<p>I want this tool to be as good as possible, if anything annoys you when using it, I want to know it!</p>
		</div>
		
		<div class="splitter">
			<h2><img src="@/assets/icons/info_purple.svg" alt="infos" class="icon">Credits</h2>
			<p>App made by <a href="https://twitch.tv/durss" target="_blank">Durss</a></p>
			<p>Sources on <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			<p>Put food in my mouth <a href="https://github.com/sponsors/Durss" target="_blank" class="button">🍔👉😮</a></p>
			<p>
				<a class="link" href="https://box.durss.ninja" target="_blank"><img src="@/assets/img/boxes.svg" data-tooltip="Durss puzzle boxes" alt="puzzle boxes"></a>
				<a class="link" href="https://multiblindtest.com" target="_blank"><img src="@/assets/img/multiblindtest.png" data-tooltip="Multiblindtest" alt="multi blindtest"></a>
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

	.splitter {
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;

		&:not(:first-child) {
			margin-top: 20px;
		}

		h2 {
			border-bottom: 2px solid @mainColor_normal;
			// border-left: 3px solid @mainColor_normal;
			padding-left: 5px;
			font-size: 20px;
			

			.icon {
				height: 1.5em;
				display: block;
				margin:auto;
				&.suggestion {
					height: 2em;
				}
			}
		}
		p {
			margin-left: 10px;
			margin-top: 10px;
			font-size: .85em;
			margin-bottom: 5px;

			.link {
				&:not(:last-child) {
					margin-right: 10px;
				}
				img {
					height: 40px;
				}
			}
		}

		.button {
			background-color: @mainColor_normal;
			padding: 3px;
			border-radius: 5px;
			&:hover {
				background-color: @mainColor_normal_light;
			}
		}
	}
}
</style>