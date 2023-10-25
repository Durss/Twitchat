<template>
	<div class="paramsabout">

		<!-- <ToggleBlock class="block" :title="$t('about.sponsor')" :icons="['coin']" :open="false" secondary>
			<ParamsSponsor />
		</ToggleBlock> -->

		<ToggleBlock class="block" :title="$t('about.suggestion')" :icons="['idea']" :open="true">
			<p class="item">{{ $t("about.suggestion_content1") }}</p>
			<Button class="item" icon="discord" :href="discordURL" target="_blank" type="link">{{ $t('about.discordBt') }}</Button>
			<p class="item" v-html="$t('about.suggestion_content2')"></p>
		</ToggleBlock>

		<ToggleBlock class="block" :title="$t('about.api')" :icons="['api']" :open="true">
			<p class="item">{{ $t("about.api_content1") }}</p>
			<p class="item">{{ $t("about.api_content2") }}</p>
			<Button class="item" icon="github" :href="apiURL" target="_blank" type="link">{{ $t('about.documentationBt') }}</Button>
		</ToggleBlock>

		<ToggleBlock class="block" :title="$t('about.credits')" :icons="['info']" :open="true">
			<p class="item" v-html="$t('about.credits_author', {USER:'<a href=\'https://twitch.tv/durss\' target=\'_blank\'>Durss</a>'})"></p>
			<p class="item" v-html="$t('about.credits_sources', {URL:'<a href=\'https://github.com/Durss/Twitchat\' target=\'_blank\'>Github</a>'})"></p>
			<p class="item">{{ $t("about.credits_sites") }}</p>
			<p class="item socials">
				<a class="link" href="https://box.durss.ninja" target="_blank"><img src="@/assets/img/boxes.svg" v-tooltip="'Durss puzzle boxes'" alt="puzzle boxes"></a>
				<a class="link" href="https://multiblindtest.com" target="_blank"><img src="@/assets/img/multiblindtest.png" v-tooltip="'Multiblindtest'" alt="multi blindtest"></a>
				<a class="link" href="https://www.durss.ninja" target="_blank"><img src="@/assets/img/work.svg" v-tooltip="'Portfolio'" alt="portfolio"></a>
				<a class="link" href="https://instagram.com/durss" target="_blank"><img src="@/assets/img/instagram.png" v-tooltip="'Instagram'" alt="instagram"></a>
				<a class="link" href="https://tiktok.com/@dursss" target="_blank"><img src="@/assets/img/tiktok.png" v-tooltip="'Tiktok'" alt="tiktok"></a>
				<a class="link" href="https://github.com/durss" target="_blank"><img src="@/assets/img/github.png" v-tooltip="'Github'" alt="github"></a>
				<a class="link" href="https://twitch.tv/durss" target="_blank"><img src="@/assets/img/twitch.png" v-tooltip="'Twitch'" alt="twitch"></a>
				<a class="link" href="https://bsky.app/profile/durss.fr" target="_blank"><img src="@/assets/img/bluesky.webp" v-tooltip="'Bluesky'" alt="bluesky"></a>
			</p>
		</ToggleBlock>

		<ToggleBlock class="block" :title="$t('about.dad.title')" :icons="['follow']" :open="false" v-newflag="{date:1693519200000, id:'about_dad'}">
			<div class="dad">
				<p v-for="i in $tm('about.dad.content')">{{ i }}</p>
			</div>
			<img src="@/assets/img/papa.png" alt="my dad">
		</ToggleBlock>

		<div class="footer">
			<a :href="$router.resolve({name:'privacypolicy'}).href" target="_blank">{{ $t("global.privacy") }}</a>
			<a :href="$router.resolve({name:'termsofuse'}).href" target="_blank">{{ $t("global.terms") }}</a>
		</div>

	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import Config from '@/utils/Config';
import { Component, Vue } from 'vue-facing-decorator';
import type IParameterContent from './IParameterContent';
import ParamsSponsor from './ParamsSponsor.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
		ParamsSponsor,
	}
})
export default class ParamsAbout extends Vue implements IParameterContent {
	

	public get discordURL():string { return Config.instance.DISCORD_URL; }
	public get apiURL():string { return "https://github.com/Durss/Twitchat/blob/main/PUBLIC_API.md"; }

	public onNavigateBack(): boolean { return false; }

}
</script>

<style scoped lang="less">
.paramsabout{

	.feedBt {
		margin: auto;
		display: block;
	}

	.block {
		position: relative;
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		margin-top: 1em;

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

	.footer {
		margin-top: 1em;
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dad {
		line-height: 1.3em;
		text-align: left;
		p:first-letter {
			font-weight: bold;
			margin-left: .5em;
		}
		p:first-child {
			font-style: italic;
			margin-bottom: 1em;
			&::first-letter {
				font-weight: normal;
			}
		}
	}
}
</style>