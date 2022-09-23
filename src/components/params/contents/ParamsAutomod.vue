<template>
	<div class="paramsautomod">
		<img src="@/assets/icons/mod_purple.svg" alt="emergency icon" class="icon">
		
		<div class="header">Automatically delete messages</div>
		<ParamItem class="enableBt" :paramData="param_enabled" v-model="automodData.enabled" @change="save()" />
	
		<div class="disclaimers">
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
			<ToggleBlock class="infos" title="Is deleting a message efficient against doxxing?" small :open="false">
				No.<br>
				<br>
				But it's the only way to moderate a message after it's sent.<br>
				The main problem is that extensions like <a href="https://betterttv.com" target="_blank">BetterTTV</a> allow users to keep deleted message.<br>
				<br>
				<strong>If you want to avoid this</strong>, you'll have to configure a chat delay <i>(<a href="https://dashboard.twitch.tv/settings/moderation" target="_blank">see Chat Options</a>)</i>. If a message is deleted during this time lapse, it won't be displayed anywhere, even for BTTV users.<br>
				<i>Note that the message is still sent to everyone so it's technically possible to get it. Just more complicated.</i><br>
				<br>
				The only safe way of filtering a message is when Twitch deletes it based on blocked terms before sending it to everyone. But as explained before, it's very limited :/
			</ToggleBlock>
		</div>
	
		<div class="fadeHolder" :style="holderStyles">

			<ToggleBlock medium class="options" title="Options" :icons="['params']" :open="false">
				<ParamItem class="" :paramData="param_banUserNames" v-model="automodData.banUserNames" @change="save()" />
				<div class="permsTitle">Exclude users from automod rules:</div>
				<PermissionsForm class="perms" v-model="automodData.exludedUsers" />
			</ToggleBlock>
	
			<div class="testForm">
				<div>Test rules:</div>
				<input type="text" v-model="testStr" placeholder="write text...">
				<div class="result" v-if="testClean" data-tooltip="Cleaned up message<br>with special chars replaced<br>by their latin equivalent">{{testClean}}</div>
				<div class="matchingRules" v-if="blockedBy.length > 0">
					<p class="title">Message blocked by rule(s):</p>
					<ul>
						<li v-for="r in blockedBy">{{r.label}}</li>
					</ul>
				</div>
				<div class="pass" v-else-if="testStr.length > 0">This message passes automod</div>
			</div>
	
			<div class="holder">
				<Button title="Add rule" :icon="$image('icons/add.svg')" class="addBt" @click="addRule()" />
		
				<div class="list" v-if="automodData.keywordsFilters.length > 0">
					<ToggleBlock class="block" medium
					v-for="f in automodData.keywordsFilters"
					:key="f.id"
					:title="f.label.length > 0? f.label : 'New rule'"
					:open="keywordToOpen[f.id]">
						<template #actions>
							<ToggleButton class="toggleButton" v-model="f.enabled" @click.stop="" clear data-tooltip="Enable/Disable rule" />
							<Button :icon="$image('icons/cross_white.svg')" highlight small class="deleteBt" @click.stop="deleteRule(f)" />
						</template>
						<ParamItem class="item sync" :paramData="param_keywordsSync[f.id]" v-model="f.serverSync" data-tooltip="If the rule contains personnal information<br>you can choose not to save it on server.<br>You'll loose it if you clean your cookies." />
						<ParamItem class="item ruleName" :paramData="param_keywordsLabel[f.id]" v-model="f.label" />
						<ParamItem class="item rule" :paramData="param_keywordsRegex[f.id]" v-model="f.regex" :error="keywordToValid[f.id] === false" @change="onRegexChange(f)" />
						<div class="regError" v-if="keywordToValid[f.id] === false">Invalid rule</div>
					</ToggleBlock>
				</div>
			</div>
		</div>

	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import UnicodeUtils from '@/utils/UnicodeUtils';
import { reactive, watch, type StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ToggleButton from '../../ToggleButton.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from './obs/PermissionsForm.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		PermissionsForm,
	}
})
export default class ParamsAutomod extends Vue {

	public testStr:string = "";//ⓣ🅗ｉ⒮ 𝖎𝓼 𝕒 𝙩🄴🆂𝔱 - ǝsɹǝʌǝɹ
	public param_enabled:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Enabled", value:false};
	public param_banUserNames:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Ban users whose names match a mod rule", value:false};
	public param_keywordsLabel:{[key:string]:TwitchatDataTypes.ParameterData} = {};
	public param_keywordsRegex:{[key:string]:TwitchatDataTypes.ParameterData} = {};
	public param_keywordsSync:{[key:string]:TwitchatDataTypes.ParameterData} = {};
	public keywordToValid:{[key:string]:boolean} = {};
	public keywordToOpen:{[key:string]:boolean} = {};
	public automodData!:TwitchatDataTypes.AutomodParamsData;

	/**
	 * Cleaned up test string with special chars replaced
	 */
	public get testClean():string { return UnicodeUtils.instance.normalizeAlphaNum(this.testStr).toLowerCase(); }

	/**
	 * Check if the current test matches any of the rules
	 */
	public get blockedBy():TwitchatDataTypes.AutomodParamsKeywordFilterData[] {
		let matchedRules:TwitchatDataTypes.AutomodParamsKeywordFilterData[] = [];
		for (let i = 0; i < this.automodData.keywordsFilters.length; i++) {
			const f = this.automodData.keywordsFilters[i];
			if(f.regex.length === 0) continue;
			let reg!:RegExp, valid:boolean = true;
			try {
				reg = new RegExp(f.regex, "gi");
			}catch(error){
				valid = false;
			}
			if(valid) {
				if(reg.test(this.testClean)) {
					matchedRules.push(f);
				}
			}
		}
		return matchedRules;
	}

	/**
	 * Fade content when automod is disabled
	 */
	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true? 1 : .5,
			pointerEvents:this.param_enabled.value === true? "all" : "none",
		};
	}

	public beforeMount():void {
		this.automodData = reactive(JSON.parse(JSON.stringify(StoreProxy.automod.params)));
		this.param_enabled.value = this.automodData.enabled;
		this.param_banUserNames.value = this.automodData.banUserNames;
		this.automodData.keywordsFilters.forEach(v=> {
			this.initRule(v);
		});
		watch(()=>this.automodData, ()=> this.save(), {deep:true} );
	}

	public mounted():void {
		// const s = performance.now();
		// console.log(UnicodeUtils.instance.normalizeAlphaNum("𝕥🅦ⓘ𝒕𝓬🄷🅰🇦🇹🇸🇲"));
		// const e = performance.now();
		// console.log(e-s);
	}

	/**
	 * Add a rule
	 */
	public addRule():void {
		const item:TwitchatDataTypes.AutomodParamsKeywordFilterData = {
			id:crypto.randomUUID(),
			label:"",
			regex:"",
			enabled:true,
			serverSync:true,
		};
		this.automodData.keywordsFilters.push(item);
		this.initRule(item);
	}

	/**
	 * Delete a rule
	 */
	public deleteRule(rule:TwitchatDataTypes.AutomodParamsKeywordFilterData):void {
		this.$confirm("Delete rule?", "This cannot be undone").then(()=> {
			for (let i = 0; i < this.automodData.keywordsFilters.length; i++) {
				const f = this.automodData.keywordsFilters[i];
				if(f.id == rule.id) {
					this.automodData.keywordsFilters.splice(i,1);
					i--;
				}
			}
		}).catch(e=>{});
	}

	/**
	 * Save automod params
	 */
	public save():void {
		StoreProxy.automod.setAutomodParams(this.automodData);
	}

	/**
	 * Test if a regex is valid
	 */
	public onRegexChange(data:TwitchatDataTypes.AutomodParamsKeywordFilterData):void {
		let valid:boolean = true;
		try {
			new RegExp(data.regex, "gi");
		}catch(error){
			valid = false;
		}
		this.keywordToValid[data.id] = valid;
	}

	private initRule(data:TwitchatDataTypes.AutomodParamsKeywordFilterData):void {
		this.keywordToOpen[data.id]			= data.label.length === 0 || data.regex.length === 0;
		this.keywordToValid[data.id]		= true;
		this.param_keywordsLabel[data.id]	= {label:'Rule name', type:'text', value:'', maxLength:100};
		this.param_keywordsRegex[data.id]	= {label:'Rule (accepts <a href="https://en.wikipedia.org/wiki/Regular_expression" target="_blank">Regexp</a> - <a href="https://regexr.com" target="_blank">Test your regexp</a>)', type:'text', value:'', maxLength:5000, longText:true};
		this.param_keywordsSync[data.id]	= {label:'Save to server', type:'toggle', value:false};
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
		width: min-content;
		margin: auto;
		margin-top: 1.5em;
		border: 1px solid @mainColor_normal;
		border-radius: 1em;
		padding: .5em 1em !important;
		background-color: fade(@mainColor_normal_extralight, 30%);
		:deep(label) {
			white-space: nowrap;
		}
	}

	.header {
		text-align: center;
		.small {
			font-size: .8em;
		}
	}

	.disclaimers {
		display: flex;
		flex-direction: column;
		margin-top: 1.5em;
		padding: .5em;
		border-radius: .5em;
		background-color: fade(@mainColor_normal, 10%);
	}

	.options{
		margin-top: 1.5em;
		.permsTitle {
			margin-top: 1em;
			margin-bottom: .5em;
		}
		.perms {
			width: 80%;
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
			word-wrap: break-word;
			font-size: .8em;
		}

		.pass {
			margin:auto;
			margin-top: .5em;
			padding: .25em .5em;
			width: calc(100% - .75em);
			color: @mainColor_light;
			background-color: @mainColor_highlight;
			border-radius: .5em;
			text-align: center;
			font-size: .8em;
		}

		.matchingRules {
			margin:auto;
			margin-top: .5em;
			padding: .25em .5em;
			width: calc(100% - .75em);
			color: @mainColor_light;
			background-color: @mainColor_alert;
			border-radius: .5em;

			.title {
				font-size: .8em;
				font-weight: bold;
			}

			ul {
				li {
					font-size: .8em;
					list-style-type: disc;
					list-style-position: inside;
				}
			}
		}
	}

	mark {
		line-height: 1.5em;
		background-color: fade(@mainColor_normal, 15%);
		padding: .1em .5em;
		border-radius: .5em;
	}
	

	.item {
		&:not(:first-child) {
			margin-top: .5em;
		}
	}

	.fadeHolder {
		transition: opacity .2s;

		.holder {
			margin-top: 1em;
			width: 100%;
	
			.addBt {
				margin: auto;
				display: block;
			}
	
			.list {
				margin-top: 1em;

				.block {
					&:not(:last-child) {
						margin-bottom: .5em;
					}

					&:deep(h2) {
						margin-left: calc(2em + 20px + .5em);
					}

					.deleteBt {
						border-radius: 0;
						height: 100%;
						margin-left: .5em;
					}
					
	
					.sync {
						width: min-content;
						margin: auto;
						:deep(label) {
							white-space: nowrap;
						}
					}
	
					.ruleName {
						:deep(input) {
							width: auto;
							flex-grow: 1;
						}
					}

					.rule {
						:deep(textarea) {
							font-family: "Inter";
							font-size: .9em;
						}
					}
					
	
					.regError {
						text-align: center;
						color: @mainColor_light;
						background-color: @mainColor_alert;
						padding: .5em;
						font-size: .8em;
						border-bottom-left-radius: .5em;
						border-bottom-right-radius: .5em;
					}
				}
			}
		}
	}
	
}
</style>