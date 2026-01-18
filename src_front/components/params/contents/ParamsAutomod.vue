<template>
	<div class="paramsautomod parameterContent">
		<Icon name="mod" class="icon" />

		<div class="head">{{ $t("automod.header") }}</div>

		<ParamItem class="enableBt" :paramData="param_enabled" v-model="automodData.enabled" @change="save()" />

		<div class="card-item disclaimers">
			<ToggleBlock class="infos first" :title="$t('automod.disclaimers.why.title')" small :open="false">
				<p v-for="label in $tm('automod.disclaimers.why.contents')" v-html="label"></p>
			</ToggleBlock>
			<ToggleBlock class="infos" :title="$t('automod.disclaimers.delete.title')" small :open="false">
				<p v-for="label in $tm('automod.disclaimers.delete.contents')" v-html="label"></p>
			</ToggleBlock>
		</div>

		<div class="fadeHolder" :style="holderStyles">

			<Splitter class="splitter">{{ $t("automod.rule.title") }}</Splitter>

			<section class="">
				<div class="ruleList" v-if="automodData.keywordsFilters.length > 0">
					<ToggleBlock class="rule"
					v-for="f in automodData.keywordsFilters"
					:key="f.id"
					:title="f.label.length > 0? f.label : $t('automod.rule.new')"
					:open="keywordToOpen[f.id]">
						<template #left_actions>
							<div class="actions">
								<ToggleButton class="toggleButton" v-model="f.enabled" @click.stop="" clear v-tooltip="$t('automod.rule.toggle_tt')" />
							</div>
						</template>
						<template #right_actions>
							<div class="actions">
								<TTButton icon="trash" alert class="deleteBt" @click.stop="deleteRule(f)" />
							</div>
						</template>
						<div class="ruleContent">
							<ParamItem class="sync" :paramData="param_ruleSync[f.id]" v-model="f.serverSync" v-tooltip="$t('automod.rule.sync_tt')" />
							<ParamItem class="emergency" :paramData="param_ruleEmergency[f.id]" v-model="f.emergency" v-tooltip="$t('automod.rule.emergency_tt')" />
							<ParamItem class="onlyFirst" :paramData="param_ruleOnlyFirst[f.id]" v-model="f.firstTimeChatters" v-tooltip="$t('automod.rule.firstTime_tt')" />
							<ParamItem class="ruleName" :paramData="param_ruleLabel[f.id]" v-model="f.label" />
							<ParamItem class="rule" :paramData="param_ruleRegex[f.id]" v-model="f.regex"
								:error="keywordToValid[f.id] === false"
								:errorMessage="$t('automod.rule.invalid_rule')"
								@change="onRegexChange(f)" />
						</div>
					</ToggleBlock>
				</div>
				<TTButton icon="add" class="addBt" @click="addRule()">{{ $t('automod.rule.add') }}</TTButton>
			</section>

			<Splitter class="splitter">{{ $t("automod.test.title") }}</Splitter>

			<section class="card-item testForm">
				<input type="text" v-model="testStr" :placeholder="$t('automod.test.input_placeholder')">
				<div class="result" v-if="testClean" v-tooltip="$t('automod.test.result_tt')">{{testClean}}</div>
				<div class="card-item secondary matchingRules" v-if="blockedBy.length > 0">
					<p class="title">{{ $t("automod.test.blocked_title", blockedBy.length) }}</p>
					<ul>
						<li v-for="r in blockedBy">{{r.label}}</li>
					</ul>
				</div>
				<div class="card-item primary pass" v-else-if="testStr.length > 0">{{ $t("automod.test.no_block") }}</div>
			</section>

			<Splitter class="splitter">{{ $t("automod.options.title") }}</Splitter>

			<section class="card-item options">
				<ParamItem class="" :paramData="param_banUserNames" v-model="automodData.banUserNames" @change="save()" noBackground />
				<div class="permsTitle"><Icon name="user" />{{ $t("automod.options.exclude_users") }}</div>
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
import { reactive, watch, type CSSProperties } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../../TTButton.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ToggleButton from '../../ToggleButton.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from '../../PermissionsForm.vue';
import type IParameterContent from './IParameterContent';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		Splitter,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		PermissionsForm,
	}
})
class ParamsAutomod extends Vue implements IParameterContent {

	public testStr:string = "";//ⓣ🅗ｉ⒮ 𝖎𝓼 𝕒 𝙩🄴🆂𝔱 - ǝsɹǝʌǝɹ
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};
	public param_banUserNames:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"automod.ban_usernames", icon:"user"};
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
	public get testClean():string { return UnicodeUtils.instance.normalizeAlphaNum(this.testStr).toLowerCase().trim(); }

	/**
	 * Check if the current test matches any of the rules
	 */
	public get blockedBy():TwitchatDataTypes.AutomodParamsKeywordFilterData[] {
		if(this.testClean.length == 0) return [];

		let matchingRules:TwitchatDataTypes.AutomodParamsKeywordFilterData[] = [];
		for (const f of this.automodData.keywordsFilters) {
			if(f.regex.trim().length === 0) continue;
			let reg!:RegExp, valid:boolean = true;
			try {
				reg = new RegExp(f.regex.trim(), "gi");
			}catch(error){
				valid = false;
			}
			if(valid) {
				if(reg.test(this.testClean)) {
					matchingRules.push(f);
				}else
				if(reg.test(UnicodeUtils.instance.normalizeLeet(this.testStr).toLowerCase().trim())) {
					matchingRules.push(f);
				}
			}
		}
		return matchingRules;
	}

	/**
	 * Fade content when automod is disabled
	 */
	public get holderStyles():CSSProperties {
		return {
			opacity:this.param_enabled.value === true? 1 : .5,
			pointerEvents:this.param_enabled.value === true? "all" : "none",
		};
	}

	public beforeMount():void {
		this.automodData				= reactive(JSON.parse(JSON.stringify(this.$store.automod.params)));
		this.param_enabled.value		= this.automodData.enabled;
		this.param_banUserNames.value	= this.automodData.banUserNames;
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
				const f = this.automodData.keywordsFilters[i]!;
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
		this.$store.automod.setAutomodParams(this.automodData);
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
		this.param_ruleLabel[data.id]		= {labelKey:"automod.rule.name", type:'string', value:'', maxLength:30};
		this.param_ruleRegex[data.id]		= {labelKey:"automod.rule.keywords", type:'string', value:'', maxLength:5000, longText:true};
		this.param_ruleSync[data.id]		= {labelKey:"automod.rule.sync", type:'boolean', value:false};
		this.param_ruleEmergency[data.id]	= {labelKey:"automod.rule.emergency", type:'boolean', value:false, icon:"emergency"};
		this.param_ruleOnlyFirst[data.id]	= {labelKey:"automod.rule.firstTime", type:'boolean', value:false, icon:"firstTime"};
	}

}
export default toNative(ParamsAutomod);
</script>

<style scoped lang="less">
.paramsautomod{
	.disclaimers {
		.infos {
			line-height: 1.3em;
			p {
				min-height: 1em;
			}
		}
	}

	.options{
		.perms {
			width: 100%;
		}
		.icon {
			width: 1em;
			height: 1em;
			margin-right: .5em;
		}
	}

	.fadeHolder {
		transition: opacity .2s;

		section {

			&.testForm {
				display: flex;
				flex-direction: column;
				width: fit-content;
				width: 300px;

				input {
					z-index: 1;
				}

				*:not(:first-child) {
					margin-top
					: .25em;
				}
				.result {
					margin:auto;
					text-align: center;
					margin-top: -.5em;
					padding: .25em .5em;
					width: calc(100% - 1.5em);
					background-color: var(--color-secondary-fadest);
					border-bottom-left-radius: .5em;
					border-bottom-right-radius: .5em;
					word-wrap: break-word;
					font-size: .9em;
				}

				.pass {
					text-align: center;
				}

				.matchingRules {
					.title {
						font-weight: bold;
					}

					ul {
						li {
							list-style-position: inside;
						}
					}
				}
			}

			.addBt {
				margin: auto;
			}

			.ruleList {
				display: flex;
				flex-direction: row;
				flex-direction: column;
				// flex-wrap: wrap;
				justify-content: center;
				gap: .5em;

				.rule {
					width: 100%;
					&.closed {
						// width: fit-content;
					}
					.actions {
						gap: .5em;
						display: flex;
						flex-direction: row;
						.deleteBt {
							margin: -.5em 0;
							border-radius: 0;
							// :deep(.icon){
							// 	height: 1.5em;
							// }
						}
					}
					.ruleContent {
						gap: .5em;
						display: flex;
						flex-direction: column;

						.sync {
							width: fit-content;
							margin: auto;
						}
					}
				}
			}
		}
	}

}
</style>
