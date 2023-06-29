<template>
	<div class="paramsheat parameterContent">
		<Icon name="heat" alt="heat icon" class="icon" />

		<div class="head">
			<p>{{ $t("heat.header") }}</p>
			<Button class="installBt" href="https://dashboard.twitch.tv/extensions/cr20njfkgll4okyrhag7xxph270sqk"
				type="link" small secondary
				icon="newtab"
				target="_blank">{{ $t("heat.install") }}</Button>
		</div>
		
		<ParamItem class="item enableBt" :paramData="param_enabled" @change="toggleState()" />

		<HeatOverlayClick />
		<HeatAreaClick />
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

@Component({
	components:{
		Button,
		ParamItem,
		HeatAreaClick,
		HeatOverlayClick,
	},
	emits:[],
})
export default class ParamsHeat extends Vue {
	
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};


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
			// HeatSocket.instance.connect( this.$store("auth").twitch.user.id );
			HeatSocket.instance.connect( "55807620" );
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
}
</style>