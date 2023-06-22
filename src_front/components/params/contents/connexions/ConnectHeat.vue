<template>
	<ToggleBlock :open="open" class="connectheat" title="Heat" :icons="['heat']">
		<div class="holder">

			<ParamItem class="row item" :paramData="param_enabled" v-model="param_enabled.value" @change="toggleConnect()" />

			<template v-for="t, index in $tm('connexions.heat.usage')">
				<div class="row">{{ t }}</div>
				<Button v-if="index==0" class="row" href="https://dashboard.twitch.tv/extensions/cr20njfkgll4okyrhag7xxph270sqk"
					type="link"
					icon="newtab"
					target="_blank">{{ $t("connexions.heat.install") }}</Button>
			</template>


			<a href="https://ko-fi.com/H2H0I5NI8" target="_blank">{{ $t("connexions.heat.donate") }}</a>
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import HeatSocket from '@/utils/twitch/HeatSocket';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Button from '@/components/Button.vue';
import DataStore from '@/store/DataStore';
import HeatEvent from '@/events/HeatEvent';
import OBSWebsocket from '@/utils/OBSWebsocket';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
export default class ConnectHeat extends Vue {

	public error = false;
	public open = false;
	public showSuccess = false;
	public connecting = false;

	private heatClickHandler!:(e:HeatEvent) => void;

	public get connected() { return HeatSocket.instance.connected; }
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enabled"};

	public toggleConnect():void {
		if(this.param_enabled.value) {
			// HeatSocket.instance.connect( this.$store("auth").twitch.user.id );
			HeatSocket.instance.connect( "104731856" );
		}else{
			HeatSocket.instance.disconnect();
		}
		DataStore.set(DataStore.HEAT_ENABLED, this.param_enabled.value);
	}

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

	public async onHeatClick(e:HeatEvent):Promise<void> {
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
.connectheat{
	.holder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;

		form {
			display: flex;
			flex-direction: column;
			gap: .5em;
		}
	}
}
</style>