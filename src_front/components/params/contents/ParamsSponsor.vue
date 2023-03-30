<template>
	<div class="paramssponsor">
		<p v-for="i in $tm('sponsor.head')" v-html="i"></p>

		<div class="important" ref="instructions">
			<strong>{{ $t("sponsor.important") }}</strong>
			<p v-html="$t('sponsor.important_content1')"></p>
			<p v-html="$t('sponsor.important_content2')"></p>
			<ParamItem class="readToggle" :paramData="checkbox" white alertToggle />
		</div>

		<img src="@/assets/img/eating.gif" alt="eating" class="patrick" />

		<div class="buttons">
			<Button big type="link" href="https://paypal.me/durss" target="_blank"
				:title="getTitle('paypal')"
				:icon="$image('icons/paypal_white.svg')"
				:disabled="!checkbox.value"
				@click.native.capture="clickItem()" />

			<Button big type="link" href="https://ko-fi.com/durss" target="_blank"
				:title="getTitle('kofi')"
				:icon="$image('icons/kofi_white.svg')" class="kofiBt"
				:disabled="!checkbox.value"
				@click.native.capture="clickItem()" />

			<Button big type="link" href="https://github.com/sponsors/Durss" target="_blank"
				:title="getTitle('github')"
				:icon="$image('icons/github_white.svg')"
				:disabled="!checkbox.value"
				@click.native.capture="clickItem()" />

			<Button big type="link" href="https://www.buymeacoffee.com/durss" target="_blank"
				:title="getTitle('coffee')"
				:icon="$image('icons/coffee_white.svg')" class="coffeeBt"
				:disabled="!checkbox.value"
				@click.native.capture="clickItem()" />

			<Button big type="link" href="https://www.patreon.com/durss" target="_blank"
				:title="getTitle('patreon')"
				:icon="$image('icons/patreon_white.svg')"
				:disabled="!checkbox.value"
				@click.native.capture="clickItem()" />

			<!-- <Button big type="link" href="https://www.twitch.tv/products/durss" target="_blank"
				:title="getTitle('twitch')"
				:icon="$image('icons/twitch_white.svg')"
				@click="clickItem()" /> -->

		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Splitter from '@/components/Splitter.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button,
		Splitter,
		ParamItem,
	}
})
export default class ParamsSponsor extends Vue implements IParameterContent {

	public checkbox:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"sponsor.checkbox"}

	public getTitle(key:string):string {
		let res = this.$t("sponsor.donate_option."+key);
		res += "<i data-tooltip=\'";
		res += this.$t("sponsor.donate_rate").replace(/'/g, "\'").replace(/"/g, "\"");
		res += "\'>("+this.$t("sponsor.donate_option."+key+"_rate")+")</i>";
		return res;
	}

	public clickItem():void {
		if(this.checkbox.value === false) {
			const target = this.$refs.instructions as HTMLDivElement;
			//@ts-ignore
			if(target.scrollIntoViewIfNeeded) {
				//@ts-ignore
				target.scrollIntoViewIfNeeded();//Works everywhere but firefox
			}else{
				target.scrollIntoView(false);
			}
			gsap.fromTo(target, {scale:1.15, filter:"brightness(2)"}, {scale:1, filter:"brightness(1)", duration:0.5});
		}
	}

	public onNavigateBack(): boolean { return false; }

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

		.readToggle {
			display: inline-block;
		}
	}
}
</style>