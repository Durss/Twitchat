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
			<Button v-for="link in links" big type="link" :href="link.url" target="_blank"
				:icon="$image('icons/'+link.icon+'_white.svg')"
				:disabled="!checkbox.value"
				@click.native.capture="clickItem()">
					<span v-html="$t('sponsor.donate_option.'+link.key)"></span>
					<i v-tooltip="$t('sponsor.donate_rate')">({{ $t("sponsor.donate_option."+link.key+"_rate") }})</i>
			</Button>
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

	public links:{url:string, icon:string, key:string}[] = [
		{url:"https://paypal.me/durss", icon:"paypal", key:"paypal"},
		{url:"https://ko-fi.com/durss", icon:"kofi", key:"kofi"},
		{url:"https://github.com/sponsors/Durss", icon:"github", key:"github"},
		{url:"https://www.buymeacoffee.com/durss", icon:"coffee", key:"coffee"},
		{url:"https://www.patreon.com/durss", icon:"patreon", key:"patreon"},
	]

	public getTitle(key:string):string {
		let res = this.$t("sponsor.donate_option."+key);
		res += "<i v-tooltip=\'";
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
		color: var(--mainColor_alert);
		background-color: var(--mainColor_alert_extralight);
		font-size: .9em;
		padding: .5em;
		border-radius: .5em;
		:deep(a) {
			color: var(--mainColor_highlight);
		}

		.readToggle {
			display: inline-block;
		}
	}
}
</style>