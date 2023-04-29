<template>
	<div class="paramssponsor">
		<header class="card-item" ref="head">
			<img src="@/assets/icons/info.svg" alt="">
			<p v-for="i in $tm('sponsor.head')" v-html="i"></p>
		</header>

		<div class="card-item secondary important" ref="instructions">
			<i18n-t scope="global" keypath="sponsor.important_content1">
				<template #LINK>
					<a class="link" href="https://twitch.tv/durss" target="_blaink" type="link">{{ $t("sponsor.important_content1_link") }}</a>
				</template>
				<template #STRONG>
					<strong>{{ $t("sponsor.important_content1_strong") }}</strong>
				</template>
			</i18n-t>
			<p v-html="$t('sponsor.important_content2')"></p>
			<ParamItem class="readToggle" :paramData="checkbox" secondary />
		</div>

		<img src="@/assets/img/eating.gif" alt="eating" class="patrick" ref="patrick" />

		<div class="buttons">
			<Button v-for="link in links" type="link" ref="button"
				:href="link.url" target="_blank"
				big primary
				:icon="link.icon+''"
				:disabled="!checkbox.value"
				@click.native.capture="clickItem()">
					<div class="labelHolder">
						<span v-html="$t('sponsor.donate_option.'+link.key)"></span>
						<i v-tooltip="$t('sponsor.donate_rate')">({{ $t("sponsor.donate_option."+link.key+"_rate") }})</i>
					</div>
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
		{url:"https://www.patreon.com/durss", icon:"patreon", key:"patreon"},
		{url:"https://ko-fi.com/durss", icon:"kofi", key:"kofi"},
		{url:"https://www.buymeacoffee.com/durss", icon:"coffee", key:"coffee"},
		{url:"https://github.com/sponsors/Durss", icon:"github", key:"github"},
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

	header {
		line-height: 1.5em;
		p:first-of-type {
			display: inline;
		}
		img {
			height: 2em;
			margin-right: .25em;
			vertical-align: middle;
		}
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
			* { pointer-events: all;}
			border-radius: var(--border-radius);
			.labelHolder {
				display: flex;
				flex-direction: column;
				i {
					font-style: italic;
					font-size: .6em;
					line-height: 1em;
					align-self: center;
				}
			}
			
			:deep(.erase) {
				text-decoration: line-through;
				font-style: normal;
				font-size: .8em;
			}
		}
	}

	.important {
		text-align: center;
		line-height: 1.5em;

		.link {
			color: var(--color-light);
		}

		.readToggle {
			display: inline-block;
		}
	}
}
</style>