<template>
	<div class="paramsaccount">

		<Button @click="logout()" :icon="require('@/assets/icons/logout.svg')" bounce title="Logout" highlight class="logoutBt" />
		<Button @click="$emit('setContent', 'sponsor')" :icon="require('@/assets/icons/coin.svg')" bounce title="Feed me 🍔👉😮" class="feedBt" />
		
		<div class="splitter">
			<ToggleBlock title="Add chat as an OBS overlay" icon="obs_purple" :open="false">
				<p>Use this if you want to display the chat on your stream. The current parameters are defined on the URL.</p>
				<i>- coming soon -</i>
				<!-- <input type="text" v-model="obsOverlayURL"> -->
			</ToggleBlock>
		</div>
		
		<div class="splitter">
			<ToggleBlock title="Suggestions and issues" icon="idea_purple" :open="true">
				<p>If you have a feature idea or are experiencing an issue:</p>
				<Button :icon="require('@/assets/icons/discord.svg')" title="Tell us on Discord" href="https://discord.gg/xFVBprgRvg" target="_blank" type="link" class="discordBt" />
				<p>I want this tool to be as good as possible, <strong>if anything annoys you when using it, I want to know</strong>!</p>
			</ToggleBlock>
		</div>
		
		<div class="splitter">
			<ToggleBlock title="Credits" icon="info_purple" :open="true">
				<p>App made by <a href="https://twitch.tv/durss" target="_blank">Durss</a></p>
				<p>Sources on <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
				<p class="socials">
					<a class="link" href="https://box.durss.ninja" target="_blank"><img src="@/assets/img/boxes.svg" data-tooltip="Durss puzzle boxes" alt="puzzle boxes"></a>
					<a class="link" href="https://multiblindtest.com" target="_blank"><img src="@/assets/img/multiblindtest.png" data-tooltip="Multiblindtest" alt="multi blindtest"></a>
					<a class="link" href="https://www.durss.ninja" target="_blank"><img src="@/assets/img/work.svg" data-tooltip="Portfolio" alt="portfolio"></a>
					<a class="link" href="https://instagram.com/durss" target="_blank"><img src="@/assets/img/instagram.png" data-tooltip="Instagram" alt="instagram"></a>
					<a class="link" href="https://tiktok.com/@dursss" target="_blank"><img src="@/assets/img/tiktok.png" data-tooltip="Tiktok" alt="tiktok"></a>
					<a class="link" href="https://github.com/durss" target="_blank"><img src="@/assets/img/github.png" data-tooltip="Github" alt="github"></a>
					<a class="link" href="https://twitch.tv/durss" target="_blank"><img src="@/assets/img/twitch.png" data-tooltip="Twitch" alt="twitch"></a>
				</p>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import router from '@/router';
import store, { ParameterCategory, ParameterData } from '@/store';
import Store from '@/store/Store';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	}
})
export default class ParamsAccount extends Vue {

	public obsOverlayURL:string = "";
	public showSuggestions:boolean = false;
	public showObs:boolean = false;
	public showCredits:boolean = true;

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
			const values = store.state.params[cat as ParameterCategory];
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
	.logoutBt, .feedBt {
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

		p {
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

			&.socials {
				margin-top: 1em;
			}
		}

		.discordBt {
			margin: .5em 0;
		}
	}
}
</style>