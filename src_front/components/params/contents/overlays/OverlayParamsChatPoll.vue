<template>
	<div class="overlayparamschatpolls overlayParamsSection">

		<i18n-t scope="global" tag="div" keypath="overlay.chatPoll.head" class="header">
			<template #CMD><mark>/chatpoll</mark></template>
			<template #MENU><Icon name="commands" /></template>
		</i18n-t>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ $t("overlay.title_install") }}</div>
			</div>
			<OverlayInstaller type="chatPoll" @obsSourceCreated="getOverlayPresence(true)" />

			<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<CSSPollsVarStyles />
				<div class="cssHead">{{ $t("overlay.chatPoll.css") }}</div>
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
			<ParamItem :paramData="param_showPercent" v-model="params.showPercent" @change="onChangeParam()" />
			<ParamItem :paramData="param_showProgress" v-model="params.showTimer" @change="onChangeParam()" />
			<ParamItem :paramData="param_showOnlyResult" v-model="params.showOnlyResult" @change="onChangeParam()" />
			<ParamItem :paramData="param_resultDuration" v-model="params.resultDuration_s" @change="onChangeParam()" />

			<div class="card-item placement">
				<p>{{ $t("overlay.chatPoll.param_placement") }}</p>
				<PlacementSelector v-model="params.placement" @change="onChangeParam()" />
			</div>

			<Icon class="center loader" name="loader" v-if="checkingOverlayPresence" />
			<div class="center card-item alert" v-else-if="!overlayExists">{{ $t("overlay.overlay_not_configured") }}</div>
		</section>
	</div>
</template>

<script lang="ts">
import PlacementSelector from '@/components/PlacementSelector.vue';
import { ToggleBlock } from '@/components/ToggleBlock.vue';
import { TTButton } from '@/components/TTButton.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import type { PollOverlayParamStoreData } from '@/store/poll/storePoll';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { ParamItem } from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import CSSPollsVarStyles from './CSSPollsVarStyles.vue';

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
class OverlayParamsPoll extends Vue {

	public loading = false;
	public overlayExists = false;
	public checkingOverlayPresence:boolean = true;

	public params!:PollOverlayParamStoreData;
	public param_listMode:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"list", labelKey:"overlay.chatPoll.param_listMode"};
	public param_listModeOnlyMore2:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"overlay.chatPoll.param_listModeOnlyMore2"};
	public param_showTitle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"font", labelKey:"overlay.chatPoll.param_showTitle"};
	public param_showLabels:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"font", labelKey:"overlay.chatPoll.param_showLabels"};
	public param_showVotes:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"user", labelKey:"overlay.chatPoll.param_showVotes"};
	public param_showPercent:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"percent", labelKey:"overlay.chatPoll.param_showPercent"};
	public param_showProgress:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"timer", labelKey:"overlay.chatPoll.param_showProgress"};
	public param_showOnlyResult:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, icon:"poll", labelKey:"overlay.chatPoll.param_showOnlyResult"};
	public param_resultDuration:TwitchatDataTypes.ParameterData<number> = {type:"duration", value:5, min:0, max:60*10, icon:"timer", labelKey:"overlay.chatPoll.param_resultDuration"};

	private testing:boolean = false;
	private checkInterval:number = -1;
	private subcheckTimeout:number = -1;
	private simulateInterval:string = "";
	private simulateEndTimeout:number = -1;
	private overlayPresenceHandler!:()=>void;

	public beforeMount():void {
		this.params = {
			showTitle: this.$store.chatPoll.overlayParams.showTitle,
			listMode: this.$store.chatPoll.overlayParams.listMode,
			listModeOnlyMore2: this.$store.chatPoll.overlayParams.listModeOnlyMore2,
			showLabels: this.$store.chatPoll.overlayParams.showLabels,
			showVotes: this.$store.chatPoll.overlayParams.showVotes,
			showPercent: this.$store.chatPoll.overlayParams.showPercent,
			showTimer: this.$store.chatPoll.overlayParams.showTimer,
			placement: this.$store.chatPoll.overlayParams.placement,
			showOnlyResult: this.$store.chatPoll.overlayParams.showOnlyResult,
			resultDuration_s: this.$store.chatPoll.overlayParams.resultDuration_s,
		}
		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			this.checkingOverlayPresence = false;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_POLL_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>this.getOverlayPresence(), 2000);
	}

	public beforeUnmount():void {
		if(this.testing) this.$store.chatPoll.setCurrentPoll(null);
		SetIntervalWorker.instance.delete(this.simulateInterval);
		clearTimeout(this.simulateEndTimeout);
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_POLL_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	/**
	 * Checks if overlay exists
	 */
	public getOverlayPresence(showLoader:boolean = false):void {
		if(showLoader) this.checkingOverlayPresence = true;
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CHAT_POLL_OVERLAY_PRESENCE);
		clearTimeout(this.subcheckTimeout);
		//If after 1,5s the overlay didn't answer, assume it doesn't exist
		this.subcheckTimeout = window.setTimeout(()=>{
			this.overlayExists = false;
			this.checkingOverlayPresence = false;
		}, 1500);
	}

	/**
	 * Called when a param changes
	 */
	public onChangeParam():void {
		this.$store.chatPoll.setOverlayParams(this.params);
	}

}
export default toNative(OverlayParamsPoll);
</script>

<style scoped lang="less">
.overlayparamschatpolls{

	.placement {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
