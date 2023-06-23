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
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import HeatSocket from '@/utils/twitch/HeatSocket';
import DataStore from '@/store/DataStore';
import HeatEvent from '@/events/HeatEvent';
import OBSWebsocket from '@/utils/OBSWebsocket';
import HeatOverlayClick from './heat/HeatOverlayClick.vue';

@Component({
	components:{
		Button,
		ParamItem,
		HeatOverlayClick,
	},
	emits:[],
})
export default class ParamsHeat extends Vue {
	
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};

	private heatClickHandler!:(e:HeatEvent) => void;

	public mounted():void {
		if(DataStore.get(DataStore.HEAT_ENABLED) === "true") {
			this.param_enabled.value = true;
		}

		this.heatClickHandler = (e:HeatEvent) => this.onHeatClick(e);
		HeatSocket.instance.addEventListener(HeatEvent.CLICK, this.heatClickHandler);
	}
	
	public beforeUnmount():void {
		HeatSocket.instance.removeEventListener(HeatEvent.CLICK, this.heatClickHandler);
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Called when toggling the "enabled" state
	 */
	public toggleState():void {
		if(this.param_enabled.value) {
			// HeatSocket.instance.connect( this.$store("auth").twitch.user.id );
			HeatSocket.instance.connect( "104731856" );
		}else{
			HeatSocket.instance.disconnect();
		}
		DataStore.set(DataStore.HEAT_ENABLED, this.param_enabled.value);
	}

	private async onHeatClick(e:HeatEvent):Promise<void> {
		let res = await OBSWebsocket.instance.getSources(true);
		console.log(res);
		for (let i = 0; i < res.length; i++) {
			if(res[i].inputKind != "browser_source") continue;
			let settingsResult = await OBSWebsocket.instance.getSourceSettings(res[i].sourceName) as {inputSettings:{url:string}, inputKind: string};
			if(settingsResult.inputSettings.url.indexOf("cascade") > -1) {
				console.log("FOUND it !");
				console.log(res[i]);
			}
		}
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