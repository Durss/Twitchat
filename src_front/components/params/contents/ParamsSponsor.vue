<template>
	<div class="paramssponsor">
		<p v-for="i in $tm('sponsor.head')" v-html="i"></p>

		<div class="important">
			<strong>{{ $t("sponsor.important") }}</strong>
			<p v-html="$t('sponsor.important_content1')"></p>
			<p v-html="$t('sponsor.important_content2')"></p>
		</div>

		<img src="@/assets/img/eating.gif" alt="eating" class="patrick" />

		<div class="buttons">
			<Button big type="link" href="https://paypal.me/durss" target="_blank"
				:title="getTitle('paypal')"
				:icon="$image('icons/paypal_white.svg')" />

			<Button big type="link" href="https://ko-fi.com/durss" target="_blank"
				:title="getTitle('kofi')"
				:icon="$image('icons/kofi_white.svg')" class="kofiBt" />

			<Button big type="link" href="https://github.com/sponsors/Durss" target="_blank"
				:title="getTitle('github')"
				:icon="$image('icons/github_white.svg')" />

			<Button big type="link" href="https://www.buymeacoffee.com/durss" target="_blank"
				:title="getTitle('coffee')"
				:icon="$image('icons/coffee_white.svg')" class="coffeeBt" />

			<Button big type="link" href="https://www.patreon.com/durss" target="_blank"
				:title="getTitle('patreon')"
				:icon="$image('icons/patreon_white.svg')" />

			<!-- <Button big type="link" href="https://www.twitch.tv/products/durss" target="_blank"
				:title="getTitle('twitch')"
				:icon="$image('icons/twitch_white.svg')" /> -->

		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Splitter from '@/components/Splitter.vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
		Splitter,
	}
})
export default class ParamsSponsor extends Vue {

	public getTitle(key:string):string {
		let res = this.$t("sponsor.donate_option."+key);
		res += "<i data-tooltip=\'";
		res += this.$t("sponsor.donate_rate").replace(/'/g, "\'").replace(/"/g, "\"");
		res += "\'>("+this.$t("sponsor.donate_option."+key+"_rate")+")</i>";
		return res;
	}

}
</script>

<style scoped lang="less">
.paramssponsor{

	display: flex;
	flex-direction: column;
	gap: 1em;
	
	h1 {
		text-align: center;
		margin-bottom: 1em;
	}

	.patrick {
		margin: auto;
		display: block;
		height: 100px;
	}


	.buttons {
		display: flex;
		flex-direction: column;
		margin-top: -1em;
		gap: .5em;

		:deep(.label) {
			flex-grow: 1;
		}

		.button {
			border-radius: 3em;
			
			:deep(.label) {
				pointer-events: unset;
			}
			:deep(i) {
				font-style: italic;
				font-size: .7em;
				display: block;
			}
			
			:deep(.erase) {
				text-decoration: line-through;
				font-style: normal;
				font-size: .8em;
			}
			:deep(.icon) {
				max-width: 2em;
			}
		}
	}

	.important {
		color: @mainColor_alert;
		background-color: @mainColor_alert_extralight;
		font-size: .9em;
		padding: .5em;
		border-radius: .5em;
		:deep(a) {
			color: @mainColor_highlight;
		}
	}
}
</style>