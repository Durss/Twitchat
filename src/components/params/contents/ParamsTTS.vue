<template>
	<div class="paramstts">
		<img src="@/assets/icons/tts_purple.svg" alt="emergency icon" class="icon">

		<p class="header">Text to speech parameters.</p>
		<ParamItem class="item enableBt" :paramData="param_enabled" />

		<Splitter class="item splitter" title="Voice parameters" />
		<ParamItem class="item" :paramData="param_voice" />
		<ParamItem class="item" :paramData="param_volume" />
		<ParamItem class="item" :paramData="param_rate" />
		<ParamItem class="item" :paramData="param_pitch" />

		<Splitter class="item splitter" title="Message parameters" />
		<ParamItem class="item" :paramData="param_maxLength" />
		<ParamItem class="item" :paramData="param_timeout" />
		<ParamItem class="item" :paramData="param_inactivityPeriod" />
		<InputPLaceHolder :paramData="param_speakPatternmessage" :placeholders="tts2Placeholders" />
		<InputPLaceHolder :paramData="param_speakPatternwhisper" :placeholders="tts2Placeholders" />
		<InputPLaceHolder :paramData="param_speakPatternnotice" :placeholders="tts1Placeholder" />

		<Splitter class="item splitter" title="Removal filters" />
		<ParamItem class="item" :paramData="param_removeEmotes" />
		<ParamItem class="item" :paramData="param_removeURL" />

		<Splitter class="item splitter" title="Filters" />
		<ParamItem class="item" :paramData="param_speakFollow" />
		<ParamItem class="item" :paramData="param_speakSubs" />
		<ParamItem class="item" :paramData="param_speakRaids" />
		<ParamItem class="item" :paramData="param_speakRewards" />
		<ParamItem class="item" :paramData="param_speakBits" />
		<ParamItem class="item" :paramData="param_speakPolls" />
		<ParamItem class="item" :paramData="param_speakPredictions" />
		<div>
			<ToggleBlock title="Users filter" :open="false" small class="item">
				<PermissionsForm v-model="param_ttsPerms" />
			</ToggleBlock>
		</div>

    </div>
</template>

<script lang="ts">
import type { ParameterData, PermissionsData, PlaceholderEntry, TTSParamsData } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import TTSUtils from '@/utils/TTSUtils';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Splitter from '../../Splitter.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from './obs/PermissionsForm.vue';
import InputPLaceHolder from '../InputPLaceHolder.vue';

@Options({
	props:{},
	components:{
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
    public param_voice:ParameterData = {type:"list", value:'Microsoft Hortense - French (France)', listValues:[], label:"voice", id:404, parent:400};
    public param_removeEmotes:ParameterData = {type:"toggle", value:true, label:"Remove emotes"};
    public param_speakPatternmessage:ParameterData = {type:"text", value:'{USER} says {MESSAGE}', label:"Message pattern, empty=mute", longText:false};
    public param_speakPatternwhisper:ParameterData = {type:"text", value:'{USER} whispers {MESSAGE}', label:"Whisper pattern, empty=mute"};
    public param_speakPatternnotice:ParameterData = {type:"text", value:'{MESSAGE}', label:"Notice pattern, empty=mute"};
    public param_maxLength:ParameterData = {type:"slider", value:200, label:"Max spoken text length (0=unlimited)", min:0, max:2000, step:10};
    public param_timeout:ParameterData = {type:"slider", value:60, label:"Timeout (seconds, 0=no timeout)", min:0, max:300, step:10};
    public param_removeURL:ParameterData = {type:"toggle", value:true, label:"Remove URLs"};
    public param_replaceURL:ParameterData = {type:"text", value:'url', label:"Replace by"};
    public param_inactivityPeriod:ParameterData = {type:"slider", value:0, label:"Inactivity period (minutes)", min:0, max:60, step:1};
    public param_speakRewards:ParameterData = {type:"toggle", value:true, label:"Speak rewards redeemed", icon:"channelPoints_purple.svg"};
    public param_speakSubs:ParameterData = {type:"toggle", value:true, label:"Speak sub alerts", icon:"sub_purple.svg"};
    public param_speakBits:ParameterData = {type:"toggle", value:true, label:"Speak bit alerts", icon:"bits_purple.svg"};
    public param_speakRaids:ParameterData = {type:"toggle", value:true, label:"Speak raid alerts", icon:"raid_purple.svg"};
    public param_speakFollow:ParameterData = {type:"toggle", value:true, label:"Speak follow alerts", icon:"follow_purple.svg"};
    public param_speakPolls:ParameterData = {type:"toggle", value:true, label:"Speak polls", icon:"poll_purple.svg"};
    public param_speakPredictions:ParameterData = {type:"toggle", value:true, label:"Speak predictions", icon:"prediction_purple.svg"};
	public param_ttsPerms:PermissionsData = {
		mods:true,
		vips:false,
		subs:false,
		all:false,
		users:"",
	};

	public get finalData():TTSParamsData {
		return {
			enabled:this.param_enabled.value as boolean,
            volume:this.param_volume.value as number,
            rate:this.param_rate.value as number,
            pitch:this.param_pitch.value as number,
            voice:this.param_voice.value as string,
            removeEmotes:this.param_removeEmotes.value as boolean,
            speakPatternmessage:this.param_speakPatternmessage.value as string,
            speakPatternwhisper:this.param_speakPatternwhisper.value as string,
            speakPatternnotice:this.param_speakPatternnotice.value as string,
            maxLength:this.param_maxLength.value as number,
            timeout:this.param_timeout.value as number,
            removeURL:this.param_removeURL.value as boolean,
            replaceURL:this.param_replaceURL.value as string,
            inactivityPeriod:this.param_inactivityPeriod.value as number,
            speakRewards:this.param_speakRewards.value as boolean,
            speakSubs:this.param_speakSubs.value as boolean,
            speakBits:this.param_speakBits.value as boolean,
            speakRaids:this.param_speakRaids.value as boolean,
            speakFollow:this.param_speakFollow.value as boolean,
            speakPolls:this.param_speakPolls.value as boolean,
            speakPredictions:this.param_speakPredictions.value as boolean,
			ttsPerms:this.param_ttsPerms,
		};
	}

	public setVoices():void {
		this.param_voice.listValues = window.speechSynthesis.getVoices().map(x => { return {label:x.name, value:x.name} });
	}

	public async beforeMount():Promise<void> {
		let params: TTSParamsData = StoreProxy.store.state.ttsParams;
		
		this.param_removeURL.children = [this.param_replaceURL];
		Object.keys(params).forEach(
			param => {
				console.log(param, (this as any)['param_'+param]);
				
				if (typeof (params as any)[param] === "object") {
					(this as any)['param_'+param] = (params as any)[param];
				} else {
					(this as any)['param_'+param].value = (params as any)[param];
				}
			}
		);
		console.log(this.param_voice.listValues);
		
		this.setVoices();
		console.log(this.param_voice.listValues);
		watch(()=>this.finalData, ()=> {
			StoreProxy.store.dispatch("setTTSParams", this.finalData);
		}, {deep:true});
		
	}

	public onShowItem(el:HTMLDivElement, done:()=>void):void {
		gsap.killTweensOf(el);
		//Delay the opening so the animation occurs after the child's animation.
		//this way the user has more chances to see it appear than if all the
		//animations occured at the same time
		gsap.from(el, {height:0, duration:.2, ease:"sine.out", delay:.5, onComplete:()=>{
			done();
		}});
	}

	public onHideItem(el:HTMLDivElement, done:()=>void):void {
		gsap.killTweensOf(el);
		gsap.to(el, {height:0, duration:.2, ease:"sine.out", onComplete:()=>{
			done();
		}});
	}

	/**
	 * Gets all the available OBS sources and sort them alphabetically
	 */
	// private async listOBSSources():Promise<void> {
	// 	try {
	// 		this.obsSources = await OBSWebsocket.instance.getSources();
	// 	}catch(error){
	// 		//
	// 	}
	// 	this.obsSources.sort((a, b) => {
	// 		if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
	// 		if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
	// 		return 0;
	// 	});

	// 	//Prefill form from storage
	// 	const list = [];
	// 	for (let i = 0; i < this.obsSources.length; i++) {
	// 		const el = this.obsSources[i];
	// 		if((StoreProxy.store.state.emergencyParams.obsSources as string[]).findIndex(v => v === el.sourceName) > -1) {
	// 			list.push(el);
	// 		}
	// 	}
	// 	this.selectedOBSSources = list;
	// }

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
	
	.info {
		overflow: hidden;
		padding: .5em;
		padding-left: calc(1em + 10px);
		background-color: @mainColor_light;
		border-radius: .5em;
		margin-bottom: .5em;
		img {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
		.label {
			display: inline;
			color: @mainColor_warn;
		}
	}

	.item {
		margin-top: .5em;
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

		&.splitter {
			margin-top: 2em;
		}

		&.enableBt {
			max-width: 200px;
			margin: auto;
			border: 1px solid @mainColor_normal;
			border-radius: 1em;
			padding: .5em 1em !important;
		}
		
		&.infos {
			font-size: .8em;
			background-color:  @mainColor_light;
			padding: .5em;
			border-radius: .5em;
			// margin-top: 0;
			// overflow: hidden;
			// padding-left: calc(1em + 10px);

			.togglable {
				overflow: hidden;
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