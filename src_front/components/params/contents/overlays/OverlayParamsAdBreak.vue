<template>
	<div class="overlayparamsadbreak overlayParamsSection">
		<div class="card-item alert center" v-if="!scopeGranted">
			<p>{{ $t("overlay.heatDistort.needs_scope") }}</p>
			<Button class="button"
				icon="obs"
				light alert
				@click="grantScopes()">{{ $t('overlay.heatDistort.grant_scopeBt') }}</Button>
		</div>
		
		<a href="https://www.youtube.com/watch?v=p_DYIjclLCM" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<i18n-t tag="div" class="header" scope="global" keypath="overlay.adBreak.description">
			<template #DASHBOARD_LINK>
				<a href="https://dashboard.twitch.tv/monetization/ads/ads-manager" target="_blank">{{ $t("overlay.adBreak.description_link") }}</a>
			</template>
		</i18n-t>
		
		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ $t("overlay.title_install") }}</div>
			</div>

			<OverlayInstaller type="adbreak" />

			<!-- <ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div class="head">{{ $t("overlay.adBreak.css") }}</div>
				<ul class="cssStructure">
					<li>#todo { ... }</li>
				</ul>
			</ToggleBlock> -->
		</section>


		<section class="card-item options">
			<div class="header">
				<div class="title"><Icon name="params" /> {{ $t("overlay.title_settings") }}</div>
			</div>
			
			<ParamItem class="param" :paramData="param_showApproaching" v-model="localData.showApproaching">
				<div class="children">
					<ParamItem class="child" :paramData="param_approachingStyle" noBackground v-model="localData.approachingStyle" />
					<ParamItem class="child" :paramData="param_approachingDelay" noBackground v-model="localData.approachingDelay" />
					<ParamItem class="child" :paramData="param_approachingSize" noBackground v-model="localData.approachingSize" />
					<ParamItem class="child" :paramData="param_approachingThickness" v-if="localData.approachingStyle == 'bar'" noBackground v-model="localData.approachingThickness" />
					<ParamItem class="child" :paramData="param_approachingColor" noBackground v-model="localData.approachingColor" />
					<div class="placement parameter-child">
						<div class="holder">
							<p><Icon name="move" class="icon" />{{ $t("overlay.adBreak.param_placement") }}</p>
							<PlacementSelector v-model="localData.approachingPlacement" :sidesOnly="localData.approachingStyle == 'bar'" />
						</div>
					</div>
					<ParamItem class="child" :paramData="param_approachingLabel" noBackground v-model="localData.approachingLabel" />

					<div class="center" v-if="overlayExists">
						<Button :loading="testingApproaching" @click="testApproaching()" icon="test">{{ $t('overlay.adBreak.testBt') }}</Button>
					</div>
					<div class="center card-item alert" v-if="!overlayExists">{{ $t("overlay.overlay_not_configured") }}</div>
				</div>

			</ParamItem>

			<ParamItem class="param" :paramData="param_showRunning" v-model="localData.showRunning">
				<div class="children">
					<ParamItem class="child" :paramData="param_runningStyle" noBackground v-model="localData.runningStyle" />
					<ParamItem class="child" :paramData="param_runningSize" noBackground v-model="localData.runningSize" />
					<ParamItem class="child" :paramData="param_runningThickness" v-if="localData.runningStyle == 'bar'" noBackground v-model="localData.runningThickness" />
					<ParamItem class="child" :paramData="param_runningColor" noBackground v-model="localData.runningColor" />
					<div class="placement parameter-child">
						<div class="holder">
							<p><Icon name="move" class="icon" />{{ $t("overlay.adBreak.param_placement") }}</p>
							<PlacementSelector v-model="localData.runningPlacement" :sidesOnly="localData.runningStyle == 'bar'" />
						</div>
					</div>
					<ParamItem class="child" :paramData="param_runningLabel" noBackground v-model="localData.runningLabel" />

					<div class="center" v-if="overlayExists">
						<Button :loading="testingRunning" @click="testRunning()" icon="test">{{ $t('overlay.adBreak.testBt') }}</Button>
					</div>
					<div class="center card-item alert" v-if="!overlayExists">{{ $t("overlay.overlay_not_configured") }}</div>
				</div>
			</ParamItem>
		</section>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import PlacementSelector from '@/components/PlacementSelector.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import type { JsonObject } from "type-fest";
import { watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import OverlayInstaller from './OverlayInstaller.vue';
import ParamItem from '../../ParamItem.vue';
import TTButton from '@/components/TTButton.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';

@Component({
	components:{
		Icon,
		Button: TTButton,
		ParamItem,
		ToggleBlock,
		OverlayInstaller,
		PlacementSelector,
	},
	emits:[],
})
class OverlayParamsAdBreak extends Vue {

	public overlayExists = false;
	public testingRunning = false;
	public testingApproaching = false;

	public param_showApproaching:TwitchatDataTypes.ParameterData<boolean>	= {type:"boolean", value:false, icon:"timer", labelKey:"overlay.adBreak.param_showApproaching"};
	public param_showRunning:TwitchatDataTypes.ParameterData<boolean>		= {type:"boolean", value:false, icon:"play", labelKey:"overlay.adBreak.param_showRunning"};
	public param_approachingDelay:TwitchatDataTypes.ParameterData<number>	= {type:"number", value:30, max:5*60, icon:"timer", labelKey:"overlay.adBreak.param_approachingDelay"};
	public param_approachingStyle:TwitchatDataTypes.ParameterData<TwitchatDataTypes.AdBreakOverlayData["approachingStyle"], TwitchatDataTypes.AdBreakOverlayData["approachingStyle"]>
																			= {type:"list", value:"bar", listValues:[], icon:"overlay", labelKey:"overlay.adBreak.param_style"};
	public param_runningStyle:TwitchatDataTypes.ParameterData<TwitchatDataTypes.AdBreakOverlayData["runningStyle"], TwitchatDataTypes.AdBreakOverlayData["runningStyle"]>
																			= {type:"list", value:"bar", listValues:[], icon:"overlay", labelKey:"overlay.adBreak.param_style"};
	public param_approachingSize:TwitchatDataTypes.ParameterData<number>	= {type:"number", value:10, min:10, max:100, icon:"fontSize", labelKey:"overlay.adBreak.param_size"};
	public param_runningSize:TwitchatDataTypes.ParameterData<number>		= {type:"number", value:10, min:10, max:100, icon:"fontSize", labelKey:"overlay.adBreak.param_size"};
	public param_approachingThickness:TwitchatDataTypes.ParameterData<number>= {type:"number", value:10, min:0, max:100, icon:"thickness", labelKey:"overlay.adBreak.param_thickness"};
	public param_runningThickness:TwitchatDataTypes.ParameterData<number>	= {type:"number", value:10, min:0, max:100, icon:"thickness", labelKey:"overlay.adBreak.param_thickness"};
	public param_approachingColor:TwitchatDataTypes.ParameterData<string>	= {type:"color", value:"#ffffff", icon:"pipette", labelKey:"overlay.adBreak.param_color"};
	public param_runningColor:TwitchatDataTypes.ParameterData<string>		= {type:"color", value:"#ffffff", icon:"pipette", labelKey:"overlay.adBreak.param_color"};
	public param_approachingLabel:TwitchatDataTypes.ParameterData<string>	= {type:"string", value:"{TIMER}s", longText:true, maxLength:500, icon:"font", labelKey:"overlay.adBreak.param_label"};
	public param_runningLabel:TwitchatDataTypes.ParameterData<string>		= {type:"string", value:"{TIMER}s", longText:true, maxLength:500, icon:"font", labelKey:"overlay.adBreak.param_label"};

	public localData:TwitchatDataTypes.AdBreakOverlayData = {
		showApproaching:false,
		showRunning:false,
		approachingDelay:30,
		approachingStyle:"bar",
		runningStyle:"text",
		approachingSize:15,
		runningSize:15,
		approachingThickness:5,
		runningThickness:5,
		approachingColor:"#e04e00",
		runningColor:"#b71f1f",
		approachingPlacement:"b",
		runningPlacement:"br",
		approachingLabel:"{TIMER}s",
		runningLabel:"{TIMER}s",
	};

	private checkInterval:number = -1;
	private subcheckTimeout:number = -1;
	private overlayPresenceHandler!:()=>void;

	public get scopeGranted():boolean{ return TwitchUtils.hasScopes([TwitchScopes.ADS_READ, TwitchScopes.ADS_SNOOZE]); }
	
	public beforeMount():void {
		this.localData.approachingLabel = this.$t("overlay.adBreak.ad_approaching");
		this.localData.runningLabel = this.$t("overlay.adBreak.ad_running");
		this.param_runningStyle.listValues		=
		this.param_approachingStyle.listValues	= [
													{value:"bar", labelKey:"overlay.adBreak.param_styles.bar"},
													{value:"text", labelKey:"overlay.adBreak.param_styles.text"},
												];

		this.param_approachingLabel.placeholderList	=
		this.param_runningLabel.placeholderList		= [{tag:"TIMER", descKey:"overlay.adBreak.param_label_placeholder_timer"}]

		const storeData = DataStore.get(DataStore.AD_BREAK_OVERLAY_PARAMS);
		if(storeData) {
			this.localData = JSON.parse(storeData) as TwitchatDataTypes.AdBreakOverlayData;
		}
		
		watch(()=>this.localData, ()=>this.onChange(), {deep:true});

		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.AD_BREAK_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>{
			PublicAPI.instance.broadcast(TwitchatEvent.GET_AD_BREAK_OVERLAY_PRESENCE);
			clearTimeout(this.subcheckTimeout);
			//If after 1,5s the overlay didn't answer, assume it doesn't exist
			this.subcheckTimeout = window.setTimeout(()=>{
				this.overlayExists = false;
			}, 1500);
		}, 2000);

		//Forces first data init save
		this.onChange();
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.AD_BREAK_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	public grantScopes():void {
		TwitchUtils.requestScopes([TwitchScopes.ADS_READ, TwitchScopes.ADS_SNOOZE]);
	}

	public onChange():void {
		DataStore.set(DataStore.AD_BREAK_OVERLAY_PARAMS, this.localData);
		PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_OVERLAY_PARAMETERS, (this.localData as unknown) as JsonObject);
	}

	public testApproaching():void {
		this.testingApproaching = true;
		const data:TwitchatDataTypes.CommercialData = {
			currentAdDuration_ms: 0,
			prevAdStart_at: 0,
			nextAdStart_at: Date.now() + this.localData.approachingDelay * 1000,
			nextSnooze_at: 0,
			remainingSnooze: 3,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_DATA, (data as unknown) as JsonObject);
		window.setTimeout(()=> {
			this.testingApproaching = false;
		}, 250);
	}
	
	public testRunning():void {
		this.testingRunning = true;
		const data:TwitchatDataTypes.CommercialData = {
			currentAdDuration_ms: 30000,
			prevAdStart_at: Date.now(),
			nextAdStart_at: 0,
			nextSnooze_at: 0,
			remainingSnooze: 3,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_DATA, (data as unknown) as JsonObject);
		window.setTimeout(()=> {
			this.testingRunning = false;
		}, 250);
	}
}
export default toNative(OverlayParamsAdBreak);
</script>

<style scoped lang="less">
.overlayparamsadbreak{
	.options {
		width: 100%;
		max-width: 500px;
	}
	.children {
		gap: .25em;
		display: flex;
		flex-direction: column;
	}
	.placement {
		position: relative;
		&::before {
			position: absolute;
			left: -1em;
			top: .1em;
			font-size: 1em;
			content: "⤷";
			display: block;
		}
		.holder {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			.icon {
				height: 1em;
				margin-right: .5em;
			}
			&:hover::before {
				opacity: 1;
			}

			&::before {
				content: "";
				opacity: 0;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				position: absolute;
				filter: blur(5px);
				pointer-events: none;
				background-color: var(--background-color-fadest);
				background: linear-gradient(170deg, var(--background-color-fadest) 0%, transparent 100%);
			}
		}
	}

	:deep(.paramitem) {
		.holder:not(.text) {
			.inputHolder, select, input {
				flex-basis: 200px;
			}
		}
	}
}
</style>