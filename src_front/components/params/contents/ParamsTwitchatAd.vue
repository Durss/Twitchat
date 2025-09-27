<template>
	<div :class="classes"
	@click="open()"
	v-if="$store.auth.donorLevel == -1 || $store.auth.isPremium || !$store.auth.noAd">
		<ClearButton v-if="!collapse" :aria-label="$t('params.ad_collapse_aria')" @click.stop="close()" theme="light" />

		<Icon name="twitchat"
			alt="twitchat"
			theme="light"
			class="icon" />

			<div class="content" ref="content" v-if="!collapse">
				<PostOnChatParam class="param"
					botMessageKey="twitchatAd"
					:noToggle="!isDonor"
					clearToggle
					noBackground
					titleKey="params.ad_info"
				/>

				<template v-if="!isDonor">
					<ToggleBlock class="tip" :open="false" :title="$t('params.ad_bot_info_title')" small>
						<div class="tipContent" v-html="$t('params.ad_bot_info_content')"></div>
					</ToggleBlock>

					<div class="card-item dark disableinstructions">
						<p v-html="$t('params.ad_disable_info')"></p>
						<TTButton @click="openDonate()" light secondary icon="coin">{{ $t('params.ad_disableBt') }}</TTButton>
						<TTButton @click="openPremium()" premium icon="premium">{{ $t('premium.become_premiumBt') }}</TTButton>
					</div>
				</template>
			</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import PostOnChatParam from '../PostOnChatParam.vue';
import ClearButton from '@/components/ClearButton.vue';
import { gsap } from 'gsap';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
		ToggleBlock,
		PostOnChatParam,
	},
	emits:["collapse", "expand"],
})
class ParamsTwitchatAd extends Vue {

	@Prop({default:false, type:Boolean})
	public expand!:boolean;

	public collapse:boolean = true;
	public blink:boolean = false;

	public get isDonor():boolean { return this.$store.auth.donorLevel > -1 || this.$store.auth.isPremium; }
	public get adMinFollowersCount():number { return Config.instance.AD_MIN_FOLLOWERS_COUNT; }

	public get classes():string[] {
		let res = ["paramstwitchatad", "card-item", "secondary"];
		if(this.collapse) res.push("collapse");
		if(this.blink) res.push("blink");
		return res;
	}

	public beforeMount():void {
		const subContent = this.$store.params.currentPageSubContent;
		if(subContent == "ad") {
			this.blink = true;
			window.setTimeout(()=>{
				this.blink = false;
				this.$store.params.currentPageSubContent = "";
			}, 3000);
		}
		this.collapse = DataStore.get(DataStore.COLLAPSE_PARAM_AD_INFO) === "true" && this.expand === false && subContent != "ad";

		watch(()=>this.expand, ()=> {
			if(this.expand !== false) this.collapse = false;
		})
		watch(()=>this.$store.params.currentPageSubContent, ()=> {
			if(this.$store.params.currentPageSubContent === "ad") {
				this.collapse = false;
				this.blink = true;
				window.setTimeout(()=>{
					this.blink = false;
					this.$store.params.currentPageSubContent = "";
				}, 3000);
			}
		})
	}

	public async open():Promise<void> {
		if(!this.collapse) return;
		this.collapse = false;
		await this.$nextTick();
		await this.$nextTick();
		await this.$nextTick();
		await this.$nextTick();
		await this.$nextTick();
		await this.$nextTick();
		const content = this.$refs.content as HTMLDivElement;
		DataStore.set(DataStore.COLLAPSE_PARAM_AD_INFO, false);
		gsap.from(content, {padding:0, width:0, height:0, duration:.35, ease:"quad.inOut", clearProps:"all", onComplete:()=>{
			this.$emit("expand");
		}});
	}

	public close():void {
		if(this.collapse) return;
		const content = this.$refs.content as HTMLDivElement;
		DataStore.set(DataStore.COLLAPSE_PARAM_AD_INFO, true);
		gsap.to(content, {padding:0, width:0, height:0, duration:.35, ease:"quad.inOut", clearProps:"all", onComplete:()=>{
			this.collapse = true;
			this.$emit("collapse");
		}});
	}

	public openDonate():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.DONATE);
	}

	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

}
export default toNative(ParamsTwitchatAd);
</script>

<style scoped lang="less">
.paramstwitchatad{
	position: relative;
	width: fit-content;
	border: 5px solid transparent;

	.content {
		max-width: 600px;
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	&.collapse {
		overflow: hidden;
		width: min-content;
		cursor: pointer;
		.content {
			padding: .5em;
		}
		&:hover {
			background-color: var(--color-secondary-light);
		}
	}

	&.blink {
		animation: blinkAnimation .5s 3 forwards;
		animation-delay: 1s;
		@keyframes blinkAnimation {
			0% {
				border-color: var(--color-light);
			}
			50% {
				border-color: transparent;
			}
			100% {
				border-color: var(--color-light);
			}
		}
}
	.param {
		margin-top: .5em;
	}

	.icon {
		display: block;
		margin: auto;
		width:2em;
		height:2em;
	}
	
	.disableinstructions {
		text-align: center;
		line-height: 1.25em;
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.tip {
		width: 100%;
		:deep(.header) {
			.title {
				color: var(--color-light);
			}
		}
	}
}
</style>
