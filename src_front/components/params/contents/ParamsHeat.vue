<template>
	<div class="paramsheat parameterContent">
		<Icon name="heat" alt="heat icon" class="icon" />

		<div class="head">
			<p>{{ $t("heat.header") }}</p>
			<Button class="installBt" href="https://dashboard.twitch.tv/extensions/cr20njfkgll4okyrhag7xxph270sqk"
				type="link" secondary
				icon="newtab"
				target="_blank">{{ $t("heat.install") }}</Button>
		</div>
		
		<ParamItem class="item enableBt" :paramData="param_enabled" @change="toggleState()" />

		<div class="fadeHolder" :style="holderStyles">
			<HeatOverlayClick />
			<HeatAreaClick />
			<HeatDebug />
		</div>

		<a href="https://ko-fi.com/scottmadethis" target="_blank" class="donate">{{ $t("heat.donate") }}</a>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import HeatSocket from '@/utils/twitch/HeatSocket';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import HeatOverlayClick from './heat/HeatOverlayClick.vue';
import HeatAreaClick from './heat/HeatAreaClick.vue';
import type { StyleValue } from 'vue';
import HeatDebug from './heat/HeatDebug.vue';

@Component({
	components:{
		Button,
		ParamItem,
		HeatDebug,
		HeatAreaClick,
		HeatOverlayClick,
	},
	emits:[],
})
export default class ParamsHeat extends Vue {
	
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};

	public get holderStyles():StyleValue {
	return {
		opacity:this.param_enabled.value === true? 1 : .5,
		pointerEvents:this.param_enabled.value === true? "all" : "none",
	};
}

	public beforeMount():void {
		if(DataStore.get(DataStore.HEAT_ENABLED) === "true") {
			this.param_enabled.value = true;
		}
	}
	
	public beforeUnmount():void {
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Called when toggling the "enabled" state
	 */
	public toggleState():void {
		if(this.param_enabled.value) {
			HeatSocket.instance.connect( this.$store("auth").twitch.user.id );
		}else{
			HeatSocket.instance.disconnect();
		}
		DataStore.set(DataStore.HEAT_ENABLED, this.param_enabled.value);
	}

}
</script>

<style scoped lang="less">
.paramsheat{
	.installBt {
		margin-top: .5em;
	}

	.fadeHolder {
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	.donate {
		text-align: center;
		font-style: italic;
		text-decoration: none;
	}
}
</style>