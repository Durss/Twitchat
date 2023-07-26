<template>
	<div class="paramsgoxlr parameterContent">
		<Icon name="goxlr" class="icon" />
		
		<i18n-t scope="global" class="head" tag="div" keypath="goxlr.header">
			<template #LINK>
				<a href="https://github.com/GoXLR-on-Linux/goxlr-utility/releases/latest" target="_blank">{{ $t("goxlr.header_link") }}</a>
			</template>
		</i18n-t>

		<ParamItem class="item enableBt" :paramData="param_enabled" @change="toggleState()" />

		<section v-if="connecting" class="card-item">
			<Icon class="item center" name="loader" />
			<div class="item center">{{ $t("goxlr.connecting") }}</div>
		</section>

		<div class="fadeHolder" :style="holderStyles">
			<GoXLRConnectForm />
		</div>

		<div class="fadeHolder" :style="subholderStyles">
			<section class="card-item alert error" v-if="connected && noDevice">
				<div class="item">{{ $t("goxlr.no_device") }}</div>
			</section>

			<div class="card-item" v-if="!noDevice && !isGoXLRMini">
				Scroll any chat column by using one of the four knobs.
				Select a knob and give it a chat column index to scroll.
				If you want that knob to control chat only when on a specific FX preset, select a preset as well
				<GoXLRUI knobMode childMode />
			</div>
	
			<section class="card-item info">
				<p v-for="info, index in $tm('goxlr.infos')"><Icon name="info" v-if="index === 0" />{{ info }}</p>
				<Button class="triggersBt" @click="openTriggers()">{{ $t("goxlr.triggersBt") }}</Button>
			</section>
		</div>
		
		<i18n-t scope="global" class="donate" tag="div" keypath="goxlr.donate">
			<template #LINK>
				<a href="https://ko-fi.com/frostycoolslug" target="_blank">{{ $t("goxlr.donate_link") }}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import PermissionsForm from '../../PermissionsForm.vue';
import Splitter from '../../Splitter.vue';
import ParamItem from '../ParamItem.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import Icon from '@/components/Icon.vue';
import GoXLRConnectForm from './goxlr/GoXLRConnectForm.vue';
import Button from '@/components/Button.vue';
import DataStore from '@/store/DataStore';
import GoXLRUI from '@/components/goxlr/GoXLRUI.vue';

@Component({
	components:{
		Icon,
		Button,
		GoXLRUI,
		Splitter,
		ParamItem,
		GoXLRConnectForm,
		PermissionsForm,
	},
	emits:[],
})
export default class ParamsGoXLR extends Vue {

	public connecting:boolean = false;

	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};

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
	public get noDevice():boolean { return GoXLRSocket.instance.status == null; }
	public get isGoXLRMini():boolean { return GoXLRSocket.instance.isGoXLRMini; }

	public mounted():void {
		this.param_enabled.value = DataStore.get(DataStore.GOXLR_ENABLED) === "true";
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
		DataStore.set(DataStore.GOXLR_ENABLED, this.param_enabled.value);
		if(this.param_enabled.value !== true) {
			GoXLRSocket.instance.disconnect();
		}
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

	section {
		
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
	}

	.donate {
		text-align: center;
		font-style: italic;
		text-decoration: none;
		line-height: 1.25em;
	}
	
}
</style>