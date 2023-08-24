<template>
	<div class="paramsgoxlr parameterContent">
		<Icon name="goxlr" class="icon" />
		
		<i18n-t scope="global" class="head" tag="div" keypath="goxlr.header">
			<template #LINK>
				<a href="https://github.com/GoXLR-on-Linux/goxlr-utility/releases/latest" target="_blank">{{ $t("goxlr.header_link") }}</a>
			</template>
		</i18n-t>

		<template v-if="$store('auth').isPremium">
			<ParamItem class="item enableBt" :paramData="param_enabled" @change="toggleState()" />
	
			<section v-if="connecting" class="card-item">
				<Icon class="item center" name="loader" />
				<div class="item center">{{ $t("goxlr.connecting") }}</div>
			</section>
	
			<div class="fadeHolder" :style="holderStyles">
				<GoXLRConnectForm />
			</div>
		</template>
		<Button icon="premium" @click="openPremium()" v-else premium>{{ $t('premium.become_premiumBt')  }}</Button>

		<div class="fadeHolder" :style="subholderStyles" v-if="connected">
		<!-- <div class="fadeHolder"> -->
			<section class="card-item alert error" v-if="noDevice">
				<div class="item">{{ $t("goxlr.no_device") }}</div>
			</section>

			<ToggleBlock :icons="['scroll']" :title="$t('goxlr.scroll_info')">
				<ParamItem class="item" :paramData="param_chatColIndex" noBackground @change="onSelectChatColumnIndex()" />
				
				<template v-if="param_chatColIndex.value >= 0">
					<div class="item center">{{ $t("goxlr.scroll_select_encoder") }}</div>
					<GoXLRUI class="item" childMode knobMode v-model="knobSelection" @change="onGoXLRSelectionChange()" />
				</template>
			</ToggleBlock>
		</div>
		
		<section class="card-item info">
			<p v-for="info, index in $tm('goxlr.infos')"><Icon name="info" v-if="index === 0" />{{ info }}</p>
			<Button class="triggersBt" @click="openTriggers()">{{ $t("goxlr.triggersBt") }}</Button>
		</section>
		
		<i18n-t scope="global" class="donate" tag="div" keypath="goxlr.donate">
			<template #LINK>
				<a href="https://ko-fi.com/frostycoolslug" target="_blank">{{ $t("goxlr.donate_link") }}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Icon from '@/components/Icon.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import GoXLRUI from '@/components/goxlr/GoXLRUI.vue';
import type { GoXLRTypes } from '@/types/GoXLRTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import type { StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import PermissionsForm from '../../PermissionsForm.vue';
import Splitter from '../../Splitter.vue';
import ParamItem from '../ParamItem.vue';
import GoXLRConnectForm from './goxlr/GoXLRConnectForm.vue';

@Component({
	components:{
		Icon,
		Button,
		GoXLRUI,
		Splitter,
		ParamItem,
		ToggleBlock,
		GoXLRConnectForm,
		PermissionsForm,
	},
	emits:[],
})
export default class ParamsGoXLR extends Vue {

	public connecting:boolean = false;
	public knobSelection:GoXLRTypes.ButtonTypesData[] = [];

	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};
	public param_chatColIndex:TwitchatDataTypes.ParameterData<number> = {type:"list", value:-1, labelKey:"goxlr.param_chat_col"};

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true && !this.connecting? 1 : .5,
			pointerEvents:this.param_enabled.value === true && !this.connecting? "all" : "none",
		};
	}

	public get subholderStyles():StyleValue {
		return {
			opacity:this.connected === true && !this.connecting? 1 : .35,
			pointerEvents:this.connected === true && !this.connecting? "all" : "none",
		};
	}

	public get connected():boolean { return GoXLRSocket.instance.connected === true; }
	public get noDevice():boolean { return GoXLRSocket.instance.status != null; }
	public get isGoXLRMini():boolean { return GoXLRSocket.instance.isGoXLRMini; }

	public beforeMount():void {
		this.param_enabled.value = this.$store("params").goxlrConfig.enabled;
		const cols:TwitchatDataTypes.ParameterDataListValue<number>[] = [
			{value:-1, labelKey:"global.select_placeholder"}
		];
		for (let i = 0; i < this.$store("params").chatColumnsConfig.length; i++) {
			cols.push({value:i, label:(i+1).toString()});
		}
		this.param_chatColIndex.listValues = cols;
	}

	/**
	 * Called when clicking triggers button
	 */
	public openTriggers():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

	/**
	 * Called when toggling the "enabled" state
	 */
	public toggleState():void {
		this.$store("params").setGoXLREnabled(this.param_enabled.value);
	}

	/**
	 * Opens the premium param page
	 */
	public openPremium():void{
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Called when selecting a new chat column index
	 */
	public onSelectChatColumnIndex():void {
		if(this.param_chatColIndex.value == -1) return;
		const configs = this.$store("params").goxlrConfig;
		this.knobSelection = configs.chatScrollSources[this.param_chatColIndex.value] || [];
	}

	/**
	 * Called when selection changes on GoXLR UI
	 */
	public onGoXLRSelectionChange():void {
		//Extract last knob ID
		const knobs = this.knobSelection.filter(v => v == "reverb" || v == "echo" || v == "pitch" || v == "gender");
		const knob = knobs.pop();
		//Remove all knob IDs and push the previously extracted one
		const list = this.knobSelection.filter(v => v != "reverb" && v != "echo" && v != "pitch" && v != "gender");
		if(knob) list.push(knob);
		this.knobSelection = list;

		const index = this.param_chatColIndex.value;
		this.$store("params").setGoXLRChatColScrollParams(index, list);
	}
}
</script>

<style scoped lang="less">
.paramsgoxlr{
	.fadeHolder {
		transition: opacity .2s;
		width: 100%;
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	section, .toggleblock {
		
		.item {
			&:not(:first-child) {
				margin-top: .5em;
			}
			&.splitter {
				margin: .5em 0 1em 0;
			}
			&.label {
				i {
					font-size: .8em;
				}
				.icon {
					width: 1.2em;
					max-height: 1.2em;
					margin-right: .5em;
					margin-bottom: 2px;
					display: inline;
					vertical-align: middle;
				}
				p {
					display: inline;
				}
			}
			&.small {
				font-size: .8em;
			}
			&.center {
				display: block;
				margin-left: auto;
				margin-right: auto;
				text-align: center;
			}
			&.shrinkInput {
				:deep(.inputHolder) {
					max-width: 150px;
				}
				:deep(input) {
					max-width: 150px;
				}
			}
			&.param {
				margin-top: 0;
				:deep(.icon) {
					width: 2em;
					height: 2em;
				}
				:deep(.content) {
					align-items: center;
				}
			}
			&.users {
				padding-left: 1em;
			}
		}

		&.error {
			text-align: center;
		}

		&.info {
			p:first-of-type {
				display: inline;
			}
			.triggersBt {
				margin: auto;
			}
		}
		&.scroll {
			margin: 0;
		}
	}

	.donate {
		text-align: center;
		font-style: italic;
		text-decoration: none;
		line-height: 1.25em;
	}
	
}
</style>