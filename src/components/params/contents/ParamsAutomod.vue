<template>
	<div class="paramsautomod">
		<img src="@/assets/icons/mod_purple.svg" alt="emergency icon" class="icon">
		
		<div class="header">Automatically delete messages</div>
		<ParamItem class="item enableBt" :paramData="param_enabled" v-model="automodData.enabled" />
		
		<ToggleBlock class="infos first" title="Why this feature? <span>(important read)</span>" small :open="false">
			Twitch already has a blocked terms feature, but it's very basic and cannot do complex filtering.<br>
			If you block the word <mark>twitchat</mark>, chatters can easily bypass this restriction by sending <mark>twit_chat</mark> or <mark>twitch🅐t</mark> and many other alternatives.<br>
			<br>
			Bots like <a href="https://nightbot.tv" target="_blank">Nightbot</a> or <a href="https://wizebot.tv/index" target="_blank">Wizebot</a> allow you to filter messages with complex rules via what's called <a href="https://en.wikipedia.org/wiki/Regular_expression" target="_blank">Regular Expressions</a>.<br>
			<br>
			<strong>Twitchat's</strong> automod feature allows you to use Regular Expressions but also tries to make usage of alternative chars useless for bypassing automod rules.<br>
			Before applying a rule it will replace all alternative chars, including accented ones, by their latin equivalent.
			For example, <mark>𝕥🅦ⓘ𝒕𝓬🄷🇦🇹</mark> will be replaced by <mark>twitchat</mark> before applying automod rules on it.<br>
			<br>
			<strong>Warning</strong> though, this process has its cost on performances and may slowdown twitchat a little if you receive lots of messages.
		</ToggleBlock>
		<ToggleBlock class="infos" title="Is deleting a message efficient?" small :open="false">
			No.<br>
			<br>
			But it's the only way to moderate a message after it's sent.<br>
			Extensions like <a href="https://betterttv.com" target="_blank">BetterTTV</a> allow users to keep deleted message.<br>
			<br>
			<strong>If you want to avoid this</strong>, you'll have to configure a chat delay <i>(<a href="https://dashboard.twitch.tv/settings/moderation" target="_blank">see Chat Options</a>)</i>. If a message is deleted during this time lapse, it won't be displayed anywhere <i>(although it's technically possible)</i>.<br>
			<br>
			The only safe way of filtering a message is when Twitch deletes it based on blocked terms. But as explained before, it's very limited :/
		</ToggleBlock>

		<div class="testForm">
			<div>Test chars cleanup:</div>
			<input type="text" v-model="testStr" placeholder="write text...">
			<div class="result" v-if="testClean">{{testClean}}</div>
		</div>

		<div class="holder" v-if="automodData.enabled">
			<Button title="Add rule" :icon="$image('icons/add.svg')" class="addBt" @click="addRule()" />
	
			<div class="list">
				<div v-for="(f, index) in automodData.keywordsFilters" :key="f.id">
					<input type="text" v-model="f.regex">
				</div>
			</div>
		</div>

	</div>
</template>

<script lang="ts">
import type { AutomodParamsData, ParameterData } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import UnicodeUtils from '@/utils/UnicodeUtils';
import { reactive, watch, type StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ParamItem from '../ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	}
})
export default class ParamsAutomod extends Vue {

	public testStr:string = "ⓣ🅗ｉ⒮ 𝖎𝓼 𝕒 𝙩🄴🆂𝔱 - ǝsɹǝʌǝɹ";
	public param_enabled:ParameterData = {type:"toggle", label:"Enabled", value:false};
	public automodData!:AutomodParamsData;

	public get testClean():string { return UnicodeUtils.instance.normalizeAlphaNum(this.testStr); }

	public beforeMount():void {
		this.automodData = reactive(JSON.parse(JSON.stringify(StoreProxy.store.state.automodParams)))
		watch(()=>this.automodData, ()=> {
			this.save();
		});
	}

	public mounted():void {
		// const s = performance.now();
		// console.log(UnicodeUtils.instance.normalizeAlphaNum("𝕥🅦ⓘ𝒕𝓬🄷🅰🇦🇹🇸🇲"));
		// const e = performance.now();
		// console.log(e-s);
	}

	public addRule():void {
		this.automodData.keywordsFilters.push({
			id:crypto.randomUUID(),
			label:"",
			regex:"",
		})
	}

	private save():void {
		//TODO
	}

}
</script>

<style scoped lang="less">
.paramsautomod{
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding-top: 0;

	&>.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	&>.enableBt {
		max-width: 200px;
		margin: auto;
		margin-top: 1.5em;
		border: 1px solid @mainColor_normal;
		border-radius: 1em;
		padding: .5em 1em !important;
		background-color: fade(@mainColor_normal_extralight, 30%);
	}

	.header {
		text-align: center;
		.small {
			font-size: .8em;
		}
	}

	.infos {
		&.first {
			margin-top: 1.5em;
			margin-bottom: .5em;
		}
	}
	
	.testForm {
		display: flex;
		flex-direction: column;
		margin: 1.5em auto 0 auto;
		width: 100%;
		max-width: 300px;
		padding: .5em;
		border-radius: .5em;
		background-color: fade(@mainColor_normal, 10%);

		*:not(:first-child) {
			margin-top
			: .25em;
		}
		.result {
			text-align: center;
			margin:auto;
			margin-top: 0;
			padding: .25em .5em;
			width: calc(100% - .75em);
			background-color: fade(@mainColor_light, 50%);
			border-bottom-left-radius: .5em;
			border-bottom-right-radius: .5em;
		}
	}

	mark {
		line-height: 1.5em;
		background-color: fade(@mainColor_normal, 15%);
		padding: .1em .5em;
		border-radius: .5em;
	}

	.holder {
		margin-top: 1.5em;
		transition: opacity .2s;
		width: 100%;

		.addBt {
			margin: auto;
			display: block;
		}
	}
	
}
</style>