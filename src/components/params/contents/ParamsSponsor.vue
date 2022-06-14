<template>
	<div class="paramssponsor">
		<p>Twitchat took <strong>A LOT</strong> of my personnal time to create. Litterally months of my time.</p>
		<p>It's free for you to use but it costs me money, and I like eating <i>(vegy)</i> food.</p>
		<p><strong>If you can afford it</strong>, feel free to thank me and make my day brighter with one of the options bellow!</p>

		<img src="@/assets/img/eating.gif" alt="eating" />

		<div class="buttons">
			<Button big type="link" href="https://paypal.me/durss" target="_blank" title="Paypal" :icon="getImage('assets/icons/paypal_white.svg')" />
			<Button big type="link" href="https://www.buymeacoffee.com/durss" target="_blank" title="Buy me a <i>coffee</i> grenadine" :icon="getImage('assets/icons/coffee_white.svg')" class="coffeeBt" />
			<Button big type="link" href="https://github.com/sponsors/Durss" target="_blank" title="Sponsor me on Github" :icon="getImage('assets/icons/github_white.svg')" />
			<Button big type="link" href="https://www.twitch.tv/products/durss" target="_blank" title="Subscribe on Twitch" :icon="getImage('assets/icons/twitch_white.svg')" />
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Splitter from '@/components/Splitter.vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{
		Button,
		Splitter,
	}
})
export default class ParamsSponsor extends Vue {
	
	public getImage(path:string):string { return new URL(`/src/${path}`, import.meta.url).href; }

}
</script>

<style scoped lang="less">
.paramssponsor{
	h1 {
		text-align: center;
		margin-bottom: 1em;
	}

	img {
		margin: auto;
		display: block;
		height: 100px;
	}

	p {
		margin-bottom: 1em;
	}

	.buttons {
		display: flex;
		flex-direction: column;
		// margin-top: 1em;

		:deep(.label) {
			flex-grow: 1;
		}

		.button {
			margin-bottom: .5em;
			padding: .5em;
			border-radius: 3em;
		}

		.coffeeBt {
			:deep(i) {
				text-decoration: line-through;
				font-style: normal;
				font-size: .8em;
			}
		}
	}
}
</style>