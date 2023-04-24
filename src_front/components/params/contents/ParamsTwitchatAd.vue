<template>
	<div :class="classes"
	@click="open()"
	v-if="$store('auth').twitch.user.donor.state || !$store('auth').twitch.user.donor.noAd">
			
		<CloseButton v-if="!collapse" :aria-label="$t('params.ad_collapse_aria')" @click.stop="close()" />

		<img src="@/assets/icons/twitchat.svg"
			alt="twitchat"
			style="height:2em;">

		<PostOnChatParam class="param"
			botMessageKey="twitchatAd"
			:noToggle="!isDonor"
			clearToggle
			secondary
			titleKey="params.ad_info"
			v-if="!collapse"
		/>

		<Button class="donateBt" white icon="automod"
			@click="showAdInfo=true"
			v-if="!showAdInfo && !collapse && !isDonor">{{ $t('params.ad_disableBt') }}</Button>

		<div v-if="showAdInfo && !collapse && !isDonor" class="donateDetails">
			<p class="title" v-html="$t('params.ad_disable_info1')"></p>
			<Button class="donateBt" white icon="coin" @click="$store('params').openParamsPage(contentSponsor)">{{ $t('params.ad_donateBt') }}</Button>
		</div>

		<ToggleBlock v-if="!collapse && !isDonor" class="tip" :open="false" :title="$t('params.ad_bot_info_title')" small>
			<div class="tipContent" v-html="$t('params.ad_bot_info_content')"></div>
		</ToggleBlock>
	</div>
	<!-- <div class="ad noAd" v-else>When you'll have more than {{ adMinFollowersCount }} followers</div> -->
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
	public showAdInfo:boolean = false;
	public get isDonor():boolean { return false; return this.$store("auth").twitch.user.donor.state; }
	
	public get contentSponsor():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPONSOR; }
	public get adMinFollowersCount():number { return Config.instance.AD_MIN_FOLLOWERS_COUNT; }

	public get classes():string[] {
		let res = ["paramstwitchatad"];
		if(this.collapse) res.push("collapse");
		return res;
	}
	
	public beforeMount():void {
		this.collapse = DataStore.get(DataStore.COLLAPSE_PARAM_AD_INFO) === "true" && this.expand === false;

		watch(()=>this.expand, ()=> {
			if(this.expand !== false) this.collapse = false;
		})
	}

	public open():void {
		this.collapse = false;
		DataStore.set(DataStore.COLLAPSE_PARAM_AD_INFO, false);
		this.$emit("expand");
	}

	public close():void {
		this.collapse = true;
		DataStore.set(DataStore.COLLAPSE_PARAM_AD_INFO, true);
		this.$emit("collapse");
	}
}
</script>

<style scoped lang="less">
.paramstwitchatad{
	background-color: var(--color-secondary);
	padding: 1em;
	border-radius: 1em;
	transition: all .25s;
	max-width: 600px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: .5em;
	align-items: center;
	position: relative;

	&.collapse {
		width: min-content;
		margin: auto;
		padding: .5em;
		cursor: pointer;
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
	.title {
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
		font-size: .7em;
		:deep(.header) {
			.title {
				color: var(--color-light);
			}
			&:hover {
				background-color: var(--color-dark-fade) !important;
			}
		}
	}
}
</style>