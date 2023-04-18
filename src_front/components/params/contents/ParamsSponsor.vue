<template>
	<div class="paramssponsor">
		<p v-for="i in $tm('sponsor.head')" v-html="i" ref="head"></p>

		<div class="important" ref="instructions">
			<strong>{{ $t("sponsor.important") }}</strong>
			<p v-html="$t('sponsor.important_content1')"></p>
			<p v-html="$t('sponsor.important_content2')"></p>
			<ParamItem class="readToggle" :paramData="checkbox" white alertToggle />
		</div>

		<img src="@/assets/img/eating.gif" alt="eating" class="patrick" ref="patrick" />

		<div class="buttons">
			<Button v-for="link in links" type="link" ref="button"
				:href="link.url" target="_blank"
				big primary
				:icon="link.icon+'_white'"
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
import { Component, Prop, Vue } from 'vue-facing-decorator';
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

	@Prop({type:Boolean, default:false})
	public animate!:boolean;

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

	public async mounted():Promise<void> {
		if(this.animate !== false) {
			const refs = ["head","instructions","patrick","button"];
			await this.$nextTick();
			for (let i = 0; i < refs.length; i++) {
				let el = this.$refs[refs[i]];
				let list:unknown[] = [];
				if(!Array.isArray( el )) {
					list = [el];
				}else{
					list = el;
				}
				for (let j = 0; j < list.length; j++) {
					let item = list[j];
					if((item as Vue).$el) item = (item as Vue).$el as HTMLElement;
					const delay = (i+j)*.1+.5;
					gsap.fromTo(item as HTMLElement, {opacity:0, y:-20, scale:.85}, 
									{duration:.5, scale:1, opacity:1, y:0, clearProps:"all", ease: "back.out", delay});
					
				}
			}
		}
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
			i {
				font-style: italic;
				font-size: .6em;
				display: block;
			}
			
			:deep(.erase) {
				text-decoration: line-through;
				font-style: normal;
				font-size: .8em;
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
			color: var(--color-secondary);
		}

		.readToggle {
			display: inline-block;
			color: var(--color-alert);
		}
	}
}
</style>