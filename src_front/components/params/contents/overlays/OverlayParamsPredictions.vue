<template>
	<div class="overlayparamspredictions overlayParamsSection">

		<div class="header">{{ $t("overlay.predictions.head") }}</div>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ $t("overlay.title_install") }}</div>
			</div>
			<OverlayInstaller type="predictions" @obsSourceCreated="getOverlayPresence(true)" />
			
			<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div class="cssHead">{{ $t("overlay.predictions.css") }}</div>
				<ul class="cssStructure">
					<li>#todo { ... }</li>
				</ul>
			</ToggleBlock>
		</section>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="params" /> {{ $t("overlay.title_settings") }}</div>
			</div>
		
			<Icon class="center loader card-item" name="loader" v-if="checkingOverlayPresence" />

			<template v-else-if="overlayExists">
				<ParamItem :paramData="param_listMode" v-model="params.listMode" @change="onChangeParam()">
					<ParamItem :paramData="param_listModeOnlyMore2" class="child" noBackground v-model="params.listModeOnlyMore2" @change="onChangeParam()" />
				</ParamItem>
				<ParamItem :paramData="param_showTitle" v-model="params.showTitle" @change="onChangeParam()" />
				<ParamItem :paramData="param_showLabels" v-model="params.showLabels" @change="onChangeParam()" />
				<ParamItem :paramData="param_showVotes" v-model="params.showVotes" @change="onChangeParam()" />
				<ParamItem :paramData="param_showVoters" v-model="params.showVoters" @change="onChangeParam()" />
				<ParamItem :paramData="param_showPercent" v-model="params.showPercent" @change="onChangeParam()" />
				<TTButton class="center" :loading="loading" @click="testOverlay()" icon="test">{{ $t('overlay.predictions.testBt') }}</TTButton>
			</template>
	
			<div class="center card-item alert" v-else-if="!overlayExists">{{ $t("overlay.overlay_not_configured") }}</div>
		</section>
	</div>
</template>

<script lang="ts">
import { ToggleBlock } from '@/components/ToggleBlock.vue';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import OverlayInstaller from './OverlayInstaller.vue';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import { TTButton } from '@/components/TTButton.vue';
import Utils from '@/utils/Utils';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import { ParamItem } from '../../ParamItem.vue';
import type { PredictionOverlayParamStoreData } from '@/store/prediction/storePrediction';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
		OverlayInstaller,
	},
	emits:[],
})
class OverlayParamsPredictions extends Vue {

	public loading = false;
	public overlayExists = false;
	public checkingOverlayPresence:boolean = true;

	public params!:PredictionOverlayParamStoreData;
	public param_listMode:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"list", labelKey:"overlay.predictions.param_listMode"}
	public param_listModeOnlyMore2:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"overlay.predictions.param_listModeOnlyMore2"}
	public param_showTitle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"font", labelKey:"overlay.predictions.param_showTitle"}
	public param_showLabels:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"font", labelKey:"overlay.predictions.param_showLabels"}
	public param_showVotes:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"channelPoints", labelKey:"overlay.predictions.param_showVotes"}
	public param_showVoters:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"user", labelKey:"overlay.predictions.param_showVoters"}
	public param_showPercent:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"percent", labelKey:"overlay.predictions.param_showPercent"}

	private checkInterval:number = -1;
	private subcheckTimeout:number = -1;
	private simulateInterval:string = "";
	private simulateEndTimeout:number = -1;
	private overlayPresenceHandler!:()=>void;
	
	public beforeMount():void {
		this.params = {
			showTitle: this.$store.prediction.overlayParams.showTitle,
			listMode: this.$store.prediction.overlayParams.listMode,
			listModeOnlyMore2: this.$store.prediction.overlayParams.listModeOnlyMore2,
			showLabels: this.$store.prediction.overlayParams.showLabels,
			showVotes: this.$store.prediction.overlayParams.showVotes,
			showVoters: this.$store.prediction.overlayParams.showVoters,
			showPercent: this.$store.prediction.overlayParams.showPercent,
		}
		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			this.checkingOverlayPresence = false;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.PREDICTIONS_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>this.getOverlayPresence(), 2000);
	}

	public beforeUnmount():void {
		clearTimeout(this.simulateEndTimeout);
		SetIntervalWorker.instance.delete(this.simulateInterval);
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.PREDICTIONS_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	/**
	 * Checks if overlay exists
	 */
	public getOverlayPresence(showLoader:boolean = false):void {
		if(showLoader) this.checkingOverlayPresence = true;
		PublicAPI.instance.broadcast(TwitchatEvent.GET_PREDICTIONS_OVERLAY_PRESENCE);
		clearTimeout(this.subcheckTimeout);
		//If after 1,5s the overlay didn't answer, assume it doesn't exist
		this.subcheckTimeout = setTimeout(()=>{
			this.overlayExists = false;
			this.checkingOverlayPresence = false;
		}, 1500);
	}

	/**
	 * Send fake data to overlay
	 */
	public async testOverlay():Promise<void> {
		const predi:TwitchatDataTypes.MessagePredictionData = await this.$store.debug.simulateMessage<TwitchatDataTypes.MessagePredictionData>(TwitchatDataTypes.TwitchatMessageType.PREDICTION, undefined, false);
		predi.outcomes.forEach(v=> {
			v.voters = 0;
			v.votes = 0;
		});
		predi.duration_s = 5;
		SetIntervalWorker.instance.delete(this.simulateInterval);
		this.simulateInterval = SetIntervalWorker.instance.create(()=>{
			const fakeUpdates = Math.ceil(Math.random() * 5);
			for (let i = 0; i < fakeUpdates; i++) {
				const outcome =  Utils.pickRand(predi.outcomes);
				outcome.voters ++;
				outcome.votes += Math.round(Math.random() * 100);
			}
			this.$store.prediction.setPrediction(predi);
		}, 1000);

		// clearTimeout(this.simulateEndTimeout);
		// this.simulateEndTimeout = setTimeout(() => {
		// 	SetIntervalWorker.instance.delete(this.simulateInterval);
		// 	this.$store.prediction.setPrediction(null);
		// }, predi.duration_s * 1000);

		this.$store.prediction.setPrediction(predi);
	}

	/**
	 * Called when a param changes
	 */
	public onChangeParam():void {
		this.$store.prediction.setOverlayParams(this.params);
	}

}
export default toNative(OverlayParamsPredictions);
</script>

<style scoped lang="less">
.overlayparamspredictions{
	
}
</style>