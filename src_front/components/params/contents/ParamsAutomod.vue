<template>
	<div class="paramsautomod">
		<img src="@/assets/icons/mod_purple.svg" alt="emergency icon" class="icon">
		
		<div class="head">{{ $t("automod.header") }}</div>
		<ParamItem class="enableBt" :paramData="param_enabled" v-model="automodData.enabled" @change="save()" />
	
		<div class="disclaimers">
			<ToggleBlock class="infos first" :title="$t('automod.disclaimers.why.title')" small :open="false">
				<p v-for="label in $tm('automod.disclaimers.why.contents')" v-html="label"></p>
			</ToggleBlock>
			<ToggleBlock class="infos" :title="$t('automod.disclaimers.delete.title')" small :open="false">
				<p v-for="label in $tm('automod.disclaimers.delete.contents')" v-html="label"></p>
			</ToggleBlock>
		</div>
	
		<div class="fadeHolder" :style="holderStyles">
	
			<section>
				<Splitter class="item splitter">{{ $t("automod.rule.title") }}</Splitter>
				<div class="list" v-if="automodData.keywordsFilters.length > 0">
					<ToggleBlock class="block" medium
					v-for="f in automodData.keywordsFilters"
					:key="f.id"
					:title="f.label.length > 0? f.label : $t('automod.rule.new')"
					:open="keywordToOpen[f.id]">
						<template #right_actions>
							<ToggleButton class="toggleButton" v-model="f.enabled" @click.stop="" clear v-tooltip="$t('automod.rule.toggle_tt')" />
							<Button :icon="$image('icons/cross_white.svg')" highlight small class="deleteBt" @click.stop="deleteRule(f)" />
						</template>
						<ParamItem class="item sync" :paramData="param_ruleSync[f.id]" v-model="f.serverSync" v-tooltip="$t('automod.rule.sync_tt')" />
							<ParamItem class="item emergency" :paramData="param_ruleEmergency[f.id]" v-model="f.emergency" v-tooltip="$t('automod.rule.emergency_tt')" />
						<ParamItem class="item onlyFirst" :paramData="param_ruleOnlyFirst[f.id]" v-model="f.firstTimeChatters" v-tooltip="$t('automod.rule.firstTime_tt')" />
						<ParamItem class="item ruleName" :paramData="param_ruleLabel[f.id]" v-model="f.label" />
						<ParamItem class="item rule" :paramData="param_ruleRegex[f.id]" v-model="f.regex" :error="keywordToValid[f.id] === false" @change="onRegexChange(f)" />
						<div class="regError" v-if="keywordToValid[f.id] === false">{{ $t("automod.rule.invalid_rule") }}</div>
					</ToggleBlock>
				</div>
				<Button :title="$t('automod.rule.add')" :icon="$image('icons/add.svg')" class="addBt" @click="addRule()" />
			</section>
			
			<section class="testForm">
				<Splitter class="item splitter">{{ $t("automod.test.title") }}</Splitter>
				<input type="text" v-model="testStr" :placeholder="$t('automod.test.input_placeholder')">
				<div class="result" v-if="testClean" v-tooltip="$t('automod.test.result_tt')">{{testClean}}</div>
				<div class="matchingRules" v-if="blockedBy.length > 0">
					<p class="title">{{ $t("automod.test.blocked_title", blockedBy.length) }}</p>
					<ul>
						<li v-for="r in blockedBy">{{r.label}}</li>
					</ul>
				</div>
				<div class="pass" v-else-if="testStr.length > 0">{{ $t("automod.test.no_block") }}</div>
			</section>

			<section class="options">
				<Splitter class="item splitter">{{ $t("automod.options.title") }}</Splitter>
				<ParamItem class="" :paramData="param_banUserNames" v-model="automodData.banUserNames" @change="save()" />
				<div class="permsTitle">{{ $t("automod.options.exclude_users") }}</div>
				<PermissionsForm class="perms" v-model="automodData.exludedUsers" />
			</section>
		</div>

	</div>
</template>

<script lang="ts">
import Splitter from '@/components/Splitter.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import UnicodeUtils from '@/utils/UnicodeUtils';
import Utils from '@/utils/Utils';
import { reactive, watch, type StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../../Button.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ToggleButton from '../../ToggleButton.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from '../../PermissionsForm.vue';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button,
		Splitter,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		PermissionsForm,
	}
})
export default class ParamsAutomod extends Vue implements IParameterContent {

	public testStr:string = "";//ⓣ🅗ｉ⒮ 𝖎𝓼 𝕒 𝙩🄴🆂𝔱 - ǝsɹǝʌǝɹ
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false};
	public param_banUserNames:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false};
	public param_ruleLabel:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_ruleRegex:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_ruleSync:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_ruleEmergency:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_ruleOnlyFirst:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
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
		this.param_enabled.labelKey		= "global.enabled";
		this.automodData				= reactive(JSON.parse(JSON.stringify(this.$store("automod").params)));
		this.param_enabled.value		= this.automodData.enabled;
		this.param_banUserNames.value	= this.automodData.banUserNames;
		this.param_banUserNames.labelKey= "automod.ban_usernames";
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

	public onNavigateBack(): boolean { return false; }

	/**
	 * Add a rule
	 */
	public addRule():void {
		const item:TwitchatDataTypes.AutomodParamsKeywordFilterData = {
			id:Utils.getUUID(),
			label:"",
			regex:"",
			enabled:true,
			serverSync:true,
			emergency:false,
			firstTimeChatters:false,
		};
		this.automodData.keywordsFilters.push(item);
		this.initRule(item);
	}

	/**
	 * Delete a rule
	 */
	public deleteRule(rule:TwitchatDataTypes.AutomodParamsKeywordFilterData):void {
		this.$confirm(this.$t("automod.delete_confirm_title"), this.$t("automod.delete_confirm_description")).then(()=> {
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
		this.$store("automod").setAutomodParams(this.automodData);
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
		this.param_ruleLabel[data.id]		= {labelKey:"automod.rule.name", type:'string', value:'', maxLength:100};
		this.param_ruleRegex[data.id]		= {labelKey:"automod.rule.keywords", type:'string', value:'', maxLength:5000, longText:true};
		this.param_ruleSync[data.id]		= {labelKey:"automod.rule.sync", type:'boolean', value:false};
		this.param_ruleEmergency[data.id]	= {labelKey:"automod.rule.emergency", type:'boolean', value:false, icon:"emergency_purple.svg"};
		this.param_ruleOnlyFirst[data.id]	= {labelKey:"automod.rule.firstTime", type:'boolean', value:false, icon:"firstTime_purple.svg"};
	}

}
</script>

<style scoped lang="less">
.paramsautomod{
	.parameterContent();

	.disclaimers {
		display: flex;
		flex-direction: column;
		margin-top: 1em;
		padding: .5em;
		border-radius: .5em;
		background-color: fade(@mainColor_normal, 10%);

		.infos {
			p {
				min-height: 1em;
			}
		}
	}

	.options{
		.permsTitle {
			margin-top: .5em;
			margin-bottom: .5em;
		}
		.perms {
			width: 80%;
		}
	}
	
	.testForm {
		display: flex;
		flex-direction: column;
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


	.item {
		&:not(:first-child) {
			margin-top: .5em;
		}
	}

	.fadeHolder {
		transition: opacity .2s;

		section {
	
			.addBt {
				margin: auto;
				margin-top: 1em;
				display: block;
			}
	
			.list {
				margin-top: 1em;
				display: flex;
				flex-direction: column;
				gap: .5em;

				.block {

					&:deep(h2) {
						margin-left: calc(2em + 20px + .5em);//Make sure title is centered
					}
					&:deep(.content) {
						background-color: @mainColor_light;
					}

					.deleteBt {
						border-radius: 0;
						margin-left: .5em;
						align-self: stretch;
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
							font-family: var(--font-inter);
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