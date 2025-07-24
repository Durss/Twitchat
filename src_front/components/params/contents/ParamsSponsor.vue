<template>
	<div class="paramssponsor">
		<header class="card-item" ref="head">
			<Icon name="info" class="icon" />
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
			<Button type="link" ref="premium"
				big premium
				icon="premium"
				v-if="!standaloneMode"
				@click="clickPremium()">
					<div class="labelHolder">
						<span v-html="$t('sponsor.premium')"></span>
						<i>{{ $t("sponsor.premium_details") }}</i>
					</div>
			</Button>

			<ToggleBlock class="premium" ref="premium" v-else
			premium :open="false" :icons="['premium']"
			:title="$t('sponsor.premium')"
			:subtitle="$t('sponsor.premium_subtitle')">
				<p>{{ $t("sponsor.premium_details") }}</p>
				<SponsorTable class="sponsorTable" />
				<Button icon="patreon" class="patreonBt" href="https://www.patreon.com/join/durss" target="_blank" type="link" premium>{{ $t("sponsor.donate_patreonBt") }}</Button>
			</ToggleBlock>

			<Button v-for="link in links" type="link" ref="button"
				:href="link.url" target="_blank"
				big secondary
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
import TTButton from '@/components/TTButton.vue';
import Splitter from '@/components/Splitter.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';
import ToggleBlock from '@/components/ToggleBlock.vue';
import SponsorTable from '@/components/premium/SponsorTable.vue';
import type { ComponentPublicInstance } from 'vue';

@Component({
	components:{
		Button: TTButton,
		Splitter,
		ParamItem,
		ToggleBlock,
		SponsorTable,
	}
})
class ParamsSponsor extends Vue implements IParameterContent {

	@Prop({type:Boolean, default:false})
	public animate!:boolean;

	public checkbox:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"sponsor.checkbox"}

	public get standaloneMode():boolean { return this.$route.name == "sponsor"; }

	public links:{url:string, icon:string, key:string}[] = [
		{url:"https://paypal.me/durss", icon:"paypal", key:"paypal"},
		{url:"https://www.patreon.com/join/durss", icon:"patreon", key:"patreon"},
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

	public mounted():void {
		if(this.animate !== false) {
			const refs = ["head","instructions","patrick","premium","button"];
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
					if((item as ComponentPublicInstance).$el) item = (item as ComponentPublicInstance).$el as HTMLElement;
					const delay = (i+j)*.1;
					gsap.set(item as HTMLElement, { opacity:0, y:-20, scale:.85 });
					gsap.to(item as HTMLElement, { duration:.5, scale:1, opacity:1, y:0, clearProps:"all", ease: "back.out", delay });

				}
			}
		}
	}

	public clickPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
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
export default toNative(ParamsSponsor);
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
		.icon {
			height: 1.3em;
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

		&>.premium {
			width: 100%;
			:deep(.header) {
				padding: .75em 1em;
				.icon {
					height: 1.4em;
					width: 1.4em;
				}
				h2 {
					font-weight: normal;
				}
				h3 {
					font-size: .6em;
				}
			}
			.patreonBt {
				margin-top: .5em;
			}

			.sponsorTable{
				font-size: 1rem;
				width: 80%;
				margin: auto;
				margin-top: .5em;
			}
		}

		:deep(.label) {
			flex-grow: 1;
		}

		.button {
			* { pointer-events: all;}
			border-radius: var(--border-radius);
			:deep(.label) {
				flex-shrink: 1;
				flex-grow: 0;
				width: calc(100% - .6em - 1em);
			}
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
			//Kinda dirty but to lazy to find a clean solution.
			//Basically disables the fading of the form if option is
			//unselected
			opacity: 1 !important;
		}
	}
}
</style>
