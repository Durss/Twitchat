<template>
	<div :class="classes"
	@click="open()"
	v-if="$store('auth').twitch.user.donor.state || !$store('auth').twitch.user.donor.noAd">
		<Button v-if="!collapse"
			:aria-label="$t('params.ad_collapse_aria')"
			icon="minus"
			@click="close()"
			class="close clearButton" bounce />

		<img src="@/assets/icons/twitchat.svg"
			alt="twitchat"
			style="height:2em;">

		<PostOnChatParam class="param"
			botMessageKey="twitchatAd"
			:noToggle="!isDonor"
			clearToggle
			titleKey="params.ad_info"
			v-if="!collapse"
		/>

		<Button class="donateBt" white small icon="info_purple"
			@click="showAdInfo=true"
			:title="$t('params.ad_disableBt')"
			v-if="!showAdInfo && !collapse && !isDonor" />
		<div v-if="showAdInfo && !collapse && !isDonor" class="donateDetails">
			<p class="title" v-html="$t('params.ad_disable_info1')"></p>
			<Button class="donateBt" white small icon="coin_purple" @click="$store('params').openParamsPage(contentSponsor)" :title="$t('params.ad_donateBt')" />
		</div>
		<ToggleBlock v-if="!collapse && !isDonor" class="tip" :open="false" :title="$t('params.ad_bot_info_title')" small>
			<div v-html="$t('params.ad_bot_info_content')"></div>
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

@Component({
	components:{
		Button,
		ToggleBlock,
		PostOnChatParam,
	},
	emits:["collapse", "expand"],
})
export default class ParamsTwitchatAd extends Vue {

	@Prop({
		default:false,
		type:Boolean,
	})
	public expand!:boolean;

	public collapse:boolean = true;
	public showAdInfo:boolean = false;
	public get isDonor():boolean { return this.$store("auth").twitch.user.donor.state; }
	
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
		this.collapse = true
		DataStore.set(DataStore.COLLAPSE_PARAM_AD_INFO, true);
		this.$emit("collapse");
	}
}
</script>

<style scoped lang="less">
.paramstwitchatad{
	color: var(--mainColor_light);
	background-color: var(--mainColor_normal_light);
	margin: 0;
	margin-top: 1em;
	padding: 1em;
	border-radius: 1em;
	position: relative;
	transition: padding .25s;
	&.collapse {
		width: min-content;
		margin: auto;
		padding: .5em;
		cursor: pointer;
		&:hover {
			background-color: var(--mainColor_normal);
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
	&:first-child {
		margin-top: 0;
		margin-bottom: .5em;
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
	.donateBt {
		display: flex;
		margin: .5em auto 0 auto;
	}
	.donateDetails {
		display: block;
		line-height: 1.25em;
		margin: .5em auto 0 auto;
	}
	.tip {
		margin-top: 1em;
	}
	
	a {
		color:var(--mainColor_warn_extralight);
	}

	&.noAd {
		font-size: .8em;
		text-align: center;
	}
}
</style>