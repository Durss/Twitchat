<template>
	<ToggleBlock class="overlayparamsadbreak" :title="$t('overlay.adBreak.title')" :icons="['ad']">
		<div class="holder">
			<div class="item">
				<div class="info">{{ $t("overlay.adBreak.description") }}</div>
			</div>
			
			<input class="primary" type="text" id="highlight_overlay_url" v-model="overlayUrl" v-click2Select>
			<ToggleBlock class="cssToggle" small :title="$t('overlay.css_customization')" :open="false">
				<div class="head">{{ $t("overlay.adBreak.css") }}</div>
				<ul class="cssStructure">
					<li>#todo { ... }</li>
				</ul>
			</ToggleBlock>

			<ParamItem :paramData="param_showApproaching" v-model="localData.showApproaching">
				<div class="children">
					<ParamItem :paramData="param_approachingStyle" noBackground v-model="localData.approachingStyle" />
					<ParamItem :paramData="param_approachingDelay" noBackground v-model="localData.approachingDelay" />
					<ParamItem :paramData="param_approachingSize" noBackground v-model="localData.approachingSize" />
					<ParamItem :paramData="param_approachingThickness" v-if="localData.approachingStyle == 'bar'" noBackground v-model="localData.approachingThickness" />
					<ParamItem :paramData="param_approachingColor" noBackground v-model="localData.approachingColor" />
					<div class="placement">
						<div class="holder">
							<p><Icon name="move" class="icon" />{{ $t("overlay.adBreak.param_placement") }}</p>
							<PlacementSelector v-model="localData.approachingPlacement" :sidesOnly="localData.approachingStyle == 'bar'" />
						</div>
					</div>
					<ParamItem :paramData="param_approachingLabel" noBackground v-model="localData.approachingLabel" class="label" />

					<div class="center" v-if="overlayExists">
						<Button :loading="testingApproaching" @click="testApproaching()" icon="test">{{ $t('overlay.raffle.testBt') }}</Button>
					</div>
					<div class="center card-item alert" v-if="!overlayExists">{{ $t("overlay.raffle.no_overlay") }}</div>
				</div>

			</ParamItem>

			<ParamItem :paramData="param_showRunning" v-model="localData.showRunning">
				<div class="children">
					<ParamItem :paramData="param_runningStyle" noBackground v-model="localData.runningStyle" />
					<ParamItem :paramData="param_runningSize" noBackground v-model="localData.runningSize" />
					<ParamItem :paramData="param_runningThickness" v-if="localData.runningStyle == 'bar'" noBackground v-model="localData.runningThickness" />
					<ParamItem :paramData="param_runningColor" noBackground v-model="localData.runningColor" />
					<div class="placement">
						<div class="holder">
							<p><Icon name="move" class="icon" />{{ $t("overlay.adBreak.param_placement") }}</p>
							<PlacementSelector v-model="localData.runningPlacement" :sidesOnly="localData.runningStyle == 'bar'" />
						</div>
					</div>
					<ParamItem :paramData="param_runningLabel" noBackground v-model="localData.runningLabel" class="label" />
	
					<div class="center" v-if="overlayExists">
						<Button :loading="testingRunning" @click="testRunning()" icon="test">{{ $t('overlay.raffle.testBt') }}</Button>
					</div>
					<div class="center card-item alert" v-if="!overlayExists">{{ $t("overlay.raffle.no_overlay") }}</div>
				</div>
			</ParamItem>
		</div>
	</ToggleBlock>
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
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import Button from '@/components/Button.vue';

@Component({
	components:{
		Icon,
		Button,
		ParamItem,
		ToggleBlock,
		PlacementSelector,
	},
	emits:[],
})
export default class OverlayParamsAdBreak extends Vue {

	public overlayExists = false;
	public testingRunning = false;
	public testingApproaching = false;

	public param_showApproaching:TwitchatDataTypes.ParameterData<boolean>	= {type:"boolean", value:false, icon:"timer", labelKey:"overlay.adBreak.param_showApproaching"};
	public param_showRunning:TwitchatDataTypes.ParameterData<boolean>		= {type:"boolean", value:false, icon:"play", labelKey:"overlay.adBreak.param_showRunning"};
	public param_approachingDelay:TwitchatDataTypes.ParameterData<number>	= {type:"time", value:30, max:5*60, icon:"timer", labelKey:"overlay.adBreak.param_approachingDelay"};
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

	private checkInterval!:number;
	private subcheckTimeout!:number;
	private overlayPresenceHandler!:()=>void;
	
	public get overlayUrl():string { return this.$overlayURL("adbreak"); }

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
			this.subcheckTimeout = setTimeout(()=>{
				this.overlayExists = false;
			}, 1500);
		}, 2000);
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.AD_BREAK_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	public onChange():void {
		DataStore.set(DataStore.AD_BREAK_OVERLAY_PARAMS, this.localData);
		PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_OVERLAY_PARAMETERS, (this.localData as unknown) as JsonObject);
	}

	public testApproaching():void {
		this.testingApproaching = true;
		const data:TwitchatDataTypes.CommercialData = {
			adCooldown_ms:0,
			currentAdDuration_ms: 0,
			currentAdStart_at: 0,
			nextAdStart_at: Date.now() + this.localData.approachingDelay * 1000,
			nextSnooze_at: 0,
			remainingSnooze: 3,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_DATA, (data as unknown) as JsonObject);
		setTimeout(()=> {
			this.testingApproaching = false;
		}, 250);
	}
	
	public testRunning():void {
		this.testingRunning = true;
		const data:TwitchatDataTypes.CommercialData = {
			adCooldown_ms:0,
			currentAdDuration_ms: 30000,
			currentAdStart_at: Date.now(),
			nextAdStart_at: 0,
			nextSnooze_at: 0,
			remainingSnooze: 3,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_DATA, (data as unknown) as JsonObject);
		setTimeout(()=> {
			this.testingRunning = false;
		}, 250);
	}
}
</script>

<style scoped lang="less">
.overlayparamsadbreak{
	
	.holder {
		display: flex;
		flex-direction: column;
		gap: .5em;

		input {
			width: 100%;
		}
		.children {
			gap: .25em;
			display: flex;
			flex-direction: column;
		}
		.center {
			align-self: center;
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
			.placeholderselector  {
				padding-left: 0;
			}
		}
	}

	.cssToggle {
		width: 100%;
		.head {
			margin-bottom: .5em;
		}
		.cssPositionning {
			margin-left: .6em;
		}
	}
	
}
</style>