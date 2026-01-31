<template>
	<div class="overlayparamspredictions overlayParamsSection">

		<div class="header">{{ $t("overlay.predictions.head") }}</div>

		<a href="https://www.youtube.com/watch?v=IcX-KnYJuCA" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ $t("overlay.title_install") }}</div>
			</div>
			<OverlayInstaller type="predictions" @obsSourceCreated="getOverlayPresence(true)" />

			<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<CSSPollsVarStyles />
				<div class="cssHead">{{ $t("overlay.predictions.css") }}</div>
				<ul class="cssStructure">

					<li>#holder { ... }
						<ul>
							<li>#progress { ... }</li>
							<li>#title { ... }</li>
							<li>#list { ... }
								<ul>
									<li>#list_choice { ... }
										<ul>
											<li>#list_choice_label { ... }</li>
											<li>#list_choice_bar { ... }
												<ul>
													<li>#list_choice_bar_details { ... }
														<ul>
															<li>#list_choice_bar_details_percent { ... }</li>
															<li>#list_choice_bar_details_votes { ... }</li>
															<li>#list_choice_bar_details_points { ... }</li>
														</ul>
													</li>
												</ul>
											</li>
										</ul>
									</li>
								</ul>
							</li>
							<li>#line { ... }
								<ul>
									<li>#line_labelList { ... }
										<ul>
											<li>#line_labelList_label { ... }</li>
										</ul>
									</li>
									<li>#line_bar { ... }
										<ul>
											<li>#line_bar_item { ... }
												<ul>
													<li>#line_bar_item_details { ... }
														<ul>
															<li>#line_bar_item_details_percent { ... }</li>
															<li>#line_bar_item_details_votes { ... }</li>
															<li>#line_bar_item_details_points { ... }</li>
														</ul>
													</li>
												</ul>
											</li>
										</ul>
									</li>
								</ul>
							</li>
						</ul>
					</li>
				</ul>
			</ToggleBlock>
		</section>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="params" /> {{ $t("overlay.title_settings") }}</div>
			</div>

			<ParamItem :paramData="param_listMode" v-model="params.listMode" @change="onChangeParam()">
				<ParamItem :paramData="param_listModeOnlyMore2" class="child" noBackground v-model="params.listModeOnlyMore2" @change="onChangeParam()" />
			</ParamItem>
			<ParamItem :paramData="param_showTitle" v-model="params.showTitle" @change="onChangeParam()" />
			<ParamItem :paramData="param_showLabels" v-model="params.showLabels" @change="onChangeParam()" />
			<ParamItem :paramData="param_showVotes" v-model="params.showVotes" @change="onChangeParam()" />
			<ParamItem :paramData="param_showVoters" v-model="params.showVoters" @change="onChangeParam()" />
			<ParamItem :paramData="param_showPercent" v-model="params.showPercent" @change="onChangeParam()" />
			<ParamItem :paramData="param_showProgress" v-model="params.showTimer" @change="onChangeParam()" />
			<ParamItem :paramData="param_hideUntilResolved" v-model="params.hideUntilResolved" @change="onChangeParam()" />
			<ParamItem :paramData="param_showOnlyResult" v-model="params.showOnlyResult" @change="onChangeParam()" />
			<ParamItem :paramData="param_resultDuration" v-model="params.resultDuration_s" @change="onChangeParam()" />

			<div class="card-item placement">
				<p>{{ $t("overlay.predictions.param_placement") }}</p>
				<PlacementSelector v-model="params.placement" @change="onChangeParam()" />
			</div>
			<TTButton class="center"
				v-if="overlayExists || checkingOverlayPresence"
				:loading="loading || checkingOverlayPresence"
				@click="testOverlay()" icon="test">{{ $t('overlay.predictions.testBt') }}</TTButton>

			<div class="center card-item alert" v-else>{{ $t("overlay.overlay_not_configured") }}</div>

		</section>
	</div>
</template>

<script lang="ts">
import PlacementSelector from '@/components/PlacementSelector.vue';
import CSSPollsVarStyles from './CSSPollsVarStyles.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TTButton } from '@/components/TTButton.vue';
import type { PredictionOverlayParamStoreData } from '@/store/prediction/storePrediction';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import Utils from '@/utils/Utils';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { ParamItem } from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
		OverlayInstaller,
		CSSPollsVarStyles,
		PlacementSelector,
	},
	emits:[],
})
class OverlayParamsPredictions extends Vue {

	public loading = false;
	public overlayExists = false;
	public checkingOverlayPresence:boolean = true;

	public params!:PredictionOverlayParamStoreData;
	public param_listMode:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"list", labelKey:"overlay.predictions.param_listMode"};
	public param_listModeOnlyMore2:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"overlay.predictions.param_listModeOnlyMore2"};
	public param_showTitle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"font", labelKey:"overlay.predictions.param_showTitle"};
	public param_showLabels:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"font", labelKey:"overlay.predictions.param_showLabels"};
	public param_showVotes:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"channelPoints", labelKey:"overlay.predictions.param_showVotes"};
	public param_showVoters:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"user", labelKey:"overlay.predictions.param_showVoters"};
	public param_showPercent:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"percent", labelKey:"overlay.predictions.param_showPercent"};
	public param_showProgress:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"timer", labelKey:"overlay.predictions.param_showProgress"};
	public param_showOnlyResult:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"prediction", labelKey:"overlay.predictions.param_showOnlyResult"};
	public param_resultDuration:TwitchatDataTypes.ParameterData<number> = {type:"duration", value:5, min:0, max:60*10, icon:"timer", labelKey:"overlay.predictions.param_resultDuration"};
	public param_hideUntilResolved:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, icon:"hide", labelKey:"overlay.predictions.param_hideUntilResolved"};

	private testing:boolean = false;
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
			showTimer: this.$store.prediction.overlayParams.showTimer,
			placement: this.$store.prediction.overlayParams.placement,
			showOnlyResult: this.$store.prediction.overlayParams.showOnlyResult,
			hideUntilResolved: this.$store.prediction.overlayParams.hideUntilResolved,
			resultDuration_s: this.$store.prediction.overlayParams.resultDuration_s,
		}
		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			this.checkingOverlayPresence = false;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener("ON_PREDICTIONS_OVERLAY_PRESENCE", this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>this.getOverlayPresence(), 2000);
	}

	public beforeUnmount():void {
		if(this.testing) this.$store.prediction.setPrediction(null);
		clearTimeout(this.simulateEndTimeout);
		SetIntervalWorker.instance.delete(this.simulateInterval);
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener("ON_PREDICTIONS_OVERLAY_PRESENCE", this.overlayPresenceHandler);
	}

	/**
	 * Checks if overlay exists
	 */
	public getOverlayPresence(showLoader:boolean = false):void {
		if(showLoader) this.checkingOverlayPresence = true;
		PublicAPI.instance.broadcast("GET_PREDICTIONS_OVERLAY_PRESENCE");
		clearTimeout(this.subcheckTimeout);
		//If after 1,5s the overlay didn't answer, assume it doesn't exist
		this.subcheckTimeout = window.setTimeout(()=>{
			this.overlayExists = false;
			this.checkingOverlayPresence = false;
		}, 1500);
	}

	/**
	 * Send fake data to overlay
	 */
	public async testOverlay():Promise<void> {
		this.testing = true;
		const predi:TwitchatDataTypes.MessagePredictionData = await this.$store.debug.simulateMessage<TwitchatDataTypes.MessagePredictionData>(TwitchatDataTypes.TwitchatMessageType.PREDICTION, undefined, false);
		predi.outcomes.forEach(v=> {
			v.voters = 0;
			v.votes = 0;
		});
		predi.isFake = true;
		predi.duration_s = this.param_showOnlyResult.value? 0 : 15;
		predi.started_at = Date.now();
		SetIntervalWorker.instance.delete(this.simulateInterval);
		const winnerBackup = predi.winner;
		predi.winner = undefined;
		const fakeVotes = ()=>{
			const fakeUpdates = Math.ceil(Math.random() * 5);
			for (let i = 0; i < fakeUpdates; i++) {
				const outcome =  Utils.pickRand(predi.outcomes);
				outcome.voters ++;
				outcome.votes += Math.round(Math.random() * 100);
			}
			this.$store.prediction.setPrediction(predi);
		};

		let pendingDuration = 2000;
		if(this.param_showOnlyResult.value == true) {
			console.log("Direct fake votes!")
			fakeVotes();
			pendingDuration = 0;
			predi.duration_s = 0;
		}else{
			console.log("Multiple fake votes!")
			this.simulateInterval = SetIntervalWorker.instance.create(fakeVotes, 1000);
		}
		
		clearTimeout(this.simulateEndTimeout);
		console.log("End in", predi.duration_s * 1000, "ms with pending duration", pendingDuration);
		this.simulateEndTimeout = window.setTimeout(() => {
			SetIntervalWorker.instance.delete(this.simulateInterval);
			predi.pendingAnswer = true;
			this.$store.prediction.setPrediction(predi);

			this.simulateEndTimeout = window.setTimeout( async ()=>{
				console.log("Show winner");
				predi.winner = winnerBackup;
				this.$store.prediction.setPrediction(predi);
				await this.$nextTick();
				console.log("Test ended, clearing prediction");
				this.$store.prediction.setPrediction(null);
				this.testing = false;
			}, pendingDuration)
		}, predi.duration_s * 1000);

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

	.placement {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
