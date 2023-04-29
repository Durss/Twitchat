<template>
	<div :class="classes"
	@click="open()"
	v-if="$store('auth').twitch.user.donor.state || !$store('auth').twitch.user.donor.noAd">
		<CloseButton v-if="!collapse" :aria-label="$t('params.ad_collapse_aria')" @click.stop="close()" />

		<img src="@/assets/icons/twitchat.svg"
			alt="twitchat"
			style="height:2em;">

			<div class="content" ref="content" v-if="!collapse">
				<PostOnChatParam class="param"
					botMessageKey="twitchatAd"
					:noToggle="!isDonor"
					clearToggle
					secondary
					titleKey="params.ad_info"
				/>
		
				<ToggleBlock v-if="!isDonor" class="tip" :open="false" :title="$t('params.ad_bot_info_title')" small>
					<div class="tipContent" v-html="$t('params.ad_bot_info_content')"></div>
				</ToggleBlock>
		
				<p v-if="!isDonor" class="card-item alert disableinstructions" v-html="$t('params.ad_disable_info1')"></p>
			</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import PostOnChatParam from '../PostOnChatParam.vue';
import CloseButton from '@/components/CloseButton.vue';
import { gsap } from 'gsap';

@Component({
	components:{
		Button,
		CloseButton,
		ToggleBlock,
		PostOnChatParam,
	},
	emits:["collapse", "expand"],
})
export default class ParamsTwitchatAd extends Vue {

	@Prop({default:false, type:Boolean})
	public expand!:boolean;

	public collapse:boolean = true;
	public get isDonor():boolean { return this.$store("auth").twitch.user.donor.state; }
	
	public get contentSponsor():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPONSOR; }
	public get adMinFollowersCount():number { return Config.instance.AD_MIN_FOLLOWERS_COUNT; }

	public get classes():string[] {
		let res = ["paramstwitchatad", "card-item", "secondary"];
		if(this.collapse) res.push("collapse");
		return res;
	}
	
	public beforeMount():void {
		this.collapse = DataStore.get(DataStore.COLLAPSE_PARAM_AD_INFO) === "true" && this.expand === false;

		watch(()=>this.expand, ()=> {
			if(this.expand !== false) this.collapse = false;
		})
	}

	public async open():Promise<void> {
		if(!this.collapse) return;
		this.collapse = false;
		await this.$nextTick()
		const content = this.$refs.content as HTMLDivElement;
		DataStore.set(DataStore.COLLAPSE_PARAM_AD_INFO, false);
		gsap.from(content, {padding:0, width:0, height:0, duration:.25, ease:"sine.out", clearProps:"all", onComplete:()=>{
			this.$emit("expand");
		}});
	}

	public close():void {
		if(this.collapse) return;
		const content = this.$refs.content as HTMLDivElement;
		DataStore.set(DataStore.COLLAPSE_PARAM_AD_INFO, true);
		gsap.to(content, {padding:0, width:0, height:0, duration:.25, ease:"sine.out", clearProps:"all", onComplete:()=>{
			this.collapse = true;
			this.$emit("collapse");
		}});
	}
}
</script>

<style scoped lang="less">
.paramstwitchatad{
	position: relative;
	width: fit-content;

	.content {
		overflow: hidden;
		max-width: 600px;
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	&.collapse {
		width: min-content;
		cursor: pointer;
		.content {
			padding: .5em;
		}
		&:hover {
			background-color: var(--color-secondary-light);
		}
	}
	.close {
		position: absolute;
		top: 0;
		right: 0;
		height: 2em;
		margin: .15em;
	}
	.param {
		margin-top: .5em;
	}
	img {
		display: block;
		margin: auto;
	}
	.disableinstructions {
		text-align: center;
		font-weight: bold;
	}
	.details {
		font-size: .8em;
	}
	.donateDetails {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.25em;
		margin: .5em auto 0 auto;
	}

	&.noAd {
		font-size: .8em;
		text-align: center;
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