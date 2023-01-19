<template>
	<div class="paramsabout">

		<ToggleBlock class="block" :title="$t('about.suggestion')" :icons="['idea_purple']" :open="false">
			<p class="item">{{ $t("about.suggestion_content1") }}</p>
			<Button class="item" :title="$t('about.discordBt')" :icon="$image('icons/discord.svg')" :href="discordURL" target="_blank" type="link" />
			<p class="item" v-html="$t('about.suggestion_content2')"></p>
		</ToggleBlock>

		<ToggleBlock class="block" :title="$t('about.api')" :icons="['api_purple']" :open="false">
			<p class="item">{{ $t("about.api_content1") }}</p>
			<p class="item">{{ $t("about.api_content2") }}</p>
			<Button class="item" :title="$t('about.documentationBt')" :icon="$image('icons/github_white.svg')" :href="apiURL" target="_blank" type="link"/>
		</ToggleBlock>

		<ToggleBlock class="block" :title="$t('about.sponsor')" :icons="['coin_purple']" :open="false">
			<ParamsSponsor />
		</ToggleBlock>

		<ToggleBlock class="block" :title="$t('about.credits')" :icons="['info_purple']" :open="true">
			<p class="item" v-html="$t('about.credits_author', {USER:'<a href=\'https://twitch.tv/durss\' target=\'_blank\'>Durss</a>'})"></p>
			<p class="item" v-html="$t('about.credits_sources', {URL:'<a href=\'https://github.com/Durss/Twitchat\' target=\'_blank\'>Github</a>'})"></p>
			<p class="item">{{ $t("about.credits_sites") }}</p>
			<p class="item socials">
				<a class="link" href="https://box.durss.ninja" target="_blank"><img src="@/assets/img/boxes.svg" data-tooltip="Durss puzzle boxes" alt="puzzle boxes"></a>
				<a class="link" href="https://multiblindtest.com" target="_blank"><img src="@/assets/img/multiblindtest.png" data-tooltip="Multiblindtest" alt="multi blindtest"></a>
				<a class="link" href="https://www.durss.ninja" target="_blank"><img src="@/assets/img/work.svg" data-tooltip="Portfolio" alt="portfolio"></a>
				<a class="link" href="https://instagram.com/durss" target="_blank"><img src="@/assets/img/instagram.png" data-tooltip="Instagram" alt="instagram"></a>
				<a class="link" href="https://tiktok.com/@dursss" target="_blank"><img src="@/assets/img/tiktok.png" data-tooltip="Tiktok" alt="tiktok"></a>
				<a class="link" href="https://github.com/durss" target="_blank"><img src="@/assets/img/github.png" data-tooltip="Github" alt="github"></a>
				<a class="link" href="https://twitch.tv/durss" target="_blank"><img src="@/assets/img/twitch.png" data-tooltip="Twitch" alt="twitch"></a>
			</p>
		</ToggleBlock>

		<ToggleBlock class="block" :title="$t('about.donors')" :icons="['follow_purple']">
			<ParamsDonorList />
		</ToggleBlock>

	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '@/components/ToggleBlock.vue';
import Button from '@/components/Button.vue';
import ParamsSponsor from './ParamsSponsor.vue';
import Config from '@/utils/Config';
import ParamsDonorList from './ParamsDonorList.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
		ParamsSponsor,
		ParamsDonorList,
	}
})
export default class ParamsAbout extends Vue {
	

	public get discordURL():string { return Config.instance.DISCORD_URL; }
	public get apiURL():string { return "https://github.com/Durss/Twitchat/blob/main/PUBLIC_API.md"; }

}
</script>

<style scoped lang="less">
.paramsabout{

	.feedBt {
		margin: auto;
		display: block;
	}

	.block {
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		margin-top: 1em;
		min-width: 400px;

		.item {
			margin-bottom: .5em;
		}
		
		p {
			font-size: .85em;
	
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
	}
}
</style>