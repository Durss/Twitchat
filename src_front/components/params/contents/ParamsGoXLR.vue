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
			<picture class="item center">
				<source srcset="@/assets/loader/loader_dark.svg" media="(prefers-color-scheme: light)">
				<img src="@/assets/loader/loader.svg" alt="loading" class="loader">
			</picture>
			<div class="item center">{{ $t("goxlr.connecting") }}</div>
		</section>

		<div class="fadeHolder" :style="holderStyles">

			<section class="card-item alert error" v-if="connectionFailed && !connected" @click="connectionFailed = false">
				<div class="item">{{ $t("goxlr.connect_failed") }}</div>
			</section>

			<template v-if="connected">
				Connected !
			</template>

		</div>
	</div>
</template>

<script lang="ts">
import type { StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import PermissionsForm from '../../PermissionsForm.vue';
import Splitter from '../../Splitter.vue';
import ParamItem from '../ParamItem.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';

@Component({
	components:{
		Splitter,
		ParamItem,
		PermissionsForm,
	},
	emits:[],
})
export default class ParamsGoXLR extends Vue {

	public connected:boolean = false;
	public connecting:boolean = false;
	public connectionFailed:boolean = false;

	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true && !this.connecting? 1 : .5,
			pointerEvents:this.param_enabled.value === true && !this.connecting? "all" : "none",
		};
	}

	/**
	 * Called when toggling the "enabled" state
	 */
	public toggleState():void {
		if(this.param_enabled.value === true) {
			this.connect();
		} else {
			this.connected = false;
			GoXLRSocket.instance.disconnect();
		}
	}

	/**
	 * Connect to Voicemod
	 */
	public async connect():Promise<void> {
		this.connected = false;
		this.connecting = true;
		this.connectionFailed = false;
		let res = false;
		try {
			await GoXLRSocket.instance.connect();
			res = true;
		}catch(error) {}

		this.connected = res;
		if(res) {
			// this.populate();
		}
		if(!res) {
			this.connecting = false;
			this.connectionFailed = true;
		}
	}
}
</script>

<style scoped lang="less">
.paramsgoxlr{
	
}
</style>