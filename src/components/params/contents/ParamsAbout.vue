<template>
	<div class="paramsabout">
		<ToggleBlock class="block" title="Feed me" icon="coin_purple" :open="true">
			<ParamsSponsor />
		</ToggleBlock>

		<ToggleBlock class="block" title="Suggestions and issues" icon="idea_purple" :open="true">
			<p>If you have a feature idea or are experiencing an issue:</p>
			<Button :icon="require('@/assets/icons/discord.svg')" title="Tell us on Discord" href="https://discord.gg/fmqD2xUYvP" target="_blank" type="link" class="discordBt" />
			<p>I want this tool to be as good as possible, <strong>if anything annoys you when using it, I want to know</strong>!</p>
		</ToggleBlock>

		<ToggleBlock class="block" title="Credits" icon="info_purple" :open="true">
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
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '@/components/ToggleBlock.vue';
import Button from '@/components/Button.vue';
import ParamsSponsor from './ParamsSponsor.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
		ParamsSponsor,
	}
})
export default class ParamsAbout extends Vue {

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
	
		p {
			font-size: .85em;
			margin-bottom: .5em;
	
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