<template>
	<div class="paramstts">
		<img src="@/assets/icons/tts_purple.svg" alt="emergency icon" class="icon">

		<p class="header">Text to speech parameters.</p>
		<ParamItem class="item enableBt" :paramData="param_enabled" />

		<div class="fadeHolder" :style="holderStyles">
			<section>
				<Splitter class="item splitter" title="Voice parameters" />
				<ParamItem class="item" :paramData="param_voice" />
				<ParamItem class="item" :paramData="param_volume" />
				<ParamItem class="item" :paramData="param_rate" />
				<ParamItem class="item" :paramData="param_pitch" />
				<Button class="item" title="Test" />
			</section>

			<section>
				<Splitter class="item splitter" title="Message parameters" />
				<ParamItem class="item" :paramData="param_maxLength" />
				<ParamItem class="item" :paramData="param_timeout" />
				<ParamItem class="item" :paramData="param_inactivityPeriod" />
				<InputPLaceHolder :paramData="param_readPatternmessage" :placeholders="tts2Placeholders" />
				<InputPLaceHolder :paramData="param_readPatternwhisper" :placeholders="tts2Placeholders" />
				<InputPLaceHolder :paramData="param_readPatternnotice" :placeholders="tts1Placeholder" />
			</section>

			<section>
				<Splitter class="item splitter" title="Removal filters" />
				<ParamItem class="item" :paramData="param_removeEmotes" />
				<ParamItem class="item" :paramData="param_removeURL" />
			</section>

			<section>
				<Splitter class="item splitter" title="Filters" />
				<ParamItem class="item" :paramData="param_readFollow" />
				<ParamItem class="item" :paramData="param_readSubs" />
				<ParamItem class="item" :paramData="param_readRaids" />
				<ParamItem class="item" :paramData="param_readRewards" />
				<ParamItem class="item" :paramData="param_readBits" />
				<ParamItem class="item" :paramData="param_readPolls" />
				<ParamItem class="item" :paramData="param_readBingos" />
				<ParamItem class="item" :paramData="param_readRaffle" />
				<ParamItem class="item" :paramData="param_readPredictions" />
				
				<ToggleBlock title="Users filter" :open="false" small class="item">
					<PermissionsForm v-model="param_ttsPerms" />
				</ToggleBlock>
			</section>
		</div>

    </div>
</template>

<script lang="ts">
import type { ParameterData, PermissionsData, PlaceholderEntry, TTSParamsData } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import { watch, type StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import Splitter from '../../Splitter.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import InputPLaceHolder from '../InputPLaceHolder.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from './obs/PermissionsForm.vue';

@Options({
	props:{},
	components:{
		Button,
		Splitter,
		ParamItem,
		ToggleBlock,
		InputPLaceHolder,
		PermissionsForm,
	}
})
export default class ParamsTTS extends Vue {

	public param_enabled:ParameterData = {type:"toggle", label:"Enabled", value:false};
    public param_volume:ParameterData = {type:"slider", value:1, label:"Volume", min:0, max:1, step:0.1};
    public param_rate:ParameterData = {type:"slider", value:1, label:"Speed", min:0.1, max:10, step:0.1};
    public param_pitch:ParameterData = {type:"slider", value:1, label:"Pitch", min:0, max:2, step:0.1};
    public param_voice:ParameterData = {type:"list", value:'', listValues:[], label:"Voice", id:404, parent:400};
    public param_removeEmotes:ParameterData = {type:"toggle", value:true, label:"Remove emotes"};
    public param_readPatternmessage:ParameterData = {type:"text", value:'{USER} says {MESSAGE}', label:"Message pattern, empty=mute", longText:false};
    public param_readPatternwhisper:ParameterData = {type:"text", value:'{USER} whispers {MESSAGE}', label:"Whisper pattern, empty=mute"};
    public param_readPatternnotice:ParameterData = {type:"text", value:'{MESSAGE}', label:"Notice pattern, empty=mute"};
    public param_maxLength:ParameterData = {type:"slider", value:200, label:"Max spoken text length (0=unlimited)", min:0, max:2000, step:10};
    public param_timeout:ParameterData = {type:"slider", value:60, label:"Timeout (seconds, 0=no timeout)", min:0, max:300, step:10};
    public param_removeURL:ParameterData = {type:"toggle", value:true, label:"Remove links"};
    public param_replaceURL:ParameterData = {type:"text", value:'url', label:"Replace by"};
    public param_inactivityPeriod:ParameterData = {type:"slider", value:0, label:"Inactivity period (minutes)", min:0, max:60, step:1};
    public param_readRewards:ParameterData = {type:"toggle", value:true, label:"Read rewards redeemed", icon:"channelPoints_purple.svg"};
    public param_readSubs:ParameterData = {type:"toggle", value:true, label:"Read sub alerts", icon:"sub_purple.svg"};
    public param_readBits:ParameterData = {type:"toggle", value:true, label:"Read bit alerts", icon:"bits_purple.svg"};
    public param_readRaids:ParameterData = {type:"toggle", value:true, label:"Read raid alerts", icon:"raid_purple.svg"};
    public param_readFollow:ParameterData = {type:"toggle", value:true, label:"Read follow alerts", icon:"follow_purple.svg"};
    public param_readPolls:ParameterData = {type:"toggle", value:true, label:"Read polls", icon:"poll_purple.svg"};
    public param_readBingos:ParameterData = {type:"toggle", value:true, label:"Read bingos", icon:"bingo_purple.svg"};
    public param_readRaffle:ParameterData = {type:"toggle", value:true, label:"Read raffles", icon:"ticket_purple.svg"};
    public param_readPredictions:ParameterData = {type:"toggle", value:true, label:"Read predictions", icon:"prediction_purple.svg"};
	public param_ttsPerms:PermissionsData = {
		mods:true,
		vips:false,
		subs:false,
		all:false,
		users:"",
	};

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true? 1 : .5,
			pointerEvents:this.param_enabled.value === true? "all" : "none",
		};
	}

	public get finalData():TTSParamsData {
		return {
			enabled:this.param_enabled.value as boolean,
            volume:this.param_volume.value as number,
            rate:this.param_rate.value as number,
            pitch:this.param_pitch.value as number,
            voice:this.param_voice.value as string,
            removeEmotes:this.param_removeEmotes.value as boolean,
            readPatternmessage:this.param_readPatternmessage.value as string,
            readPatternwhisper:this.param_readPatternwhisper.value as string,
            readPatternnotice:this.param_readPatternnotice.value as string,
            maxLength:this.param_maxLength.value as number,
            timeout:this.param_timeout.value as number,
            removeURL:this.param_removeURL.value as boolean,
            replaceURL:this.param_replaceURL.value as string,
            inactivityPeriod:this.param_inactivityPeriod.value as number,
            readRewards:this.param_readRewards.value as boolean,
            readSubs:this.param_readSubs.value as boolean,
            readBits:this.param_readBits.value as boolean,
            readRaids:this.param_readRaids.value as boolean,
            readFollow:this.param_readFollow.value as boolean,
            readPolls:this.param_readPolls.value as boolean,
            readBingos:this.param_readBingos.value as boolean,
            readRaffle:this.param_readRaffle.value as boolean,
            readPredictions:this.param_readPredictions.value as boolean,
			ttsPerms:this.param_ttsPerms,
		};
	}

	public setVoices():void {
		this.param_voice.listValues = window.speechSynthesis.getVoices().map(x => { return {label:x.name, value:x.name} });
	}

	public async beforeMount():Promise<void> {
		let params: TTSParamsData = StoreProxy.store.state.ttsParams;
		
		this.setVoices();
		
		this.param_removeURL.children = [this.param_replaceURL];
		Object.keys(params).forEach(
			param => {
				if (typeof (params as any)[param] === "object") {
					(this as any)['param_'+param] = (params as any)[param];
				} else {
					(this as any)['param_'+param].value = (params as any)[param];
				}
			}
		);

		watch(()=>this.finalData, ()=> {
			StoreProxy.store.dispatch("setTTSParams", this.finalData);
		}, {deep:true});
		
	}

	public get tts2Placeholders():PlaceholderEntry[] {
		return [
			{
				tag:"USER",
				desc:"User name",
			},
			{
				tag:"MESSAGE",
				desc:"Message",
			},
		];
	}

	public get tts1Placeholder():PlaceholderEntry[] {
		return [
			{
				tag:"MESSAGE",
				desc:"Message",
			},
		];
	}
}
</script>

<style scoped lang="less">
.paramstts{
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding-top: 0;

	&>.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.enableBt {
		max-width: 200px;
		margin: auto;
		margin-top: .5em;
		border: 1px solid @mainColor_normal;
		border-radius: 1em;
		padding: .5em 1em !important;
	}

	.header {
		text-align: center;
		margin-bottom: .5em;
		&.small {
			font-size: .8em;
			.btExample {
				height: 1.25em;
				padding: .25em;
				border-radius: .25em;
				background-color: @mainColor_alert;
				vertical-align: middle;
			}
		}
	}

	.fadeHolder {
		transition: opacity .2s;

		section {
			margin-top: 2em;
			border-radius: .5em;
			background-color: fade(@mainColor_normal_extralight, 30%);
			padding: .5em;
			
			.item {
				&:not(:first-child) {
					margin-top: .5em;
				}
				&.label {
					i {
						font-size: .8em;
					}
					.icon {
						width: 1.2em;
						max-height: 1.2em;
						margin-right: .5em;
						margin-bottom: 2px;
						display: inline;
						vertical-align: middle;
					}
					p {
						display: inline;
					}
				}
			}
		}
	}

	.sourceSelector {
		background-color: @mainColor_light;
		:deep(.vs__selected) {
			color: @mainColor_light;
			background-color: @mainColor_normal;
			border: none;
			svg {
				fill: @mainColor_light;
			}
		}
	}

	mark {
		font-weight: bold;
		padding: .25em .5em;
		border-radius: .5em;
		font-size: .8em;
		background: fade(@mainColor_normal, 15%);
	}
	
}
</style>