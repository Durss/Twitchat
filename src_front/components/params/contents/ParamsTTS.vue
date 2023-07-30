<template>
	<div class="paramstts parameterContent">
		<Icon name="tts" class="icon" />

		<p class="head">{{ $t("tts.header") }}</p>
		<ParamItem  class="card-item enableBt" :paramData="param_enabled" />

		<div class="fadeHolder" :style="holderStyles">
			<transition
				@enter="onShowItem"
				@leave="onHideItem"
			>
				<div class="permissions" v-if="param_readMessages.value === true || param_readWhispers.value === true">
					<Splitter class="splitter">{{ $t("tts.chat_perms.title") }}</Splitter>
					<section class="card-item">
						<p>{{ $t("tts.chat_perms.head") }}</p>
						<p class="small">{{ $t("tts.chat_perms.infos") }}</p>
						<PermissionsForm class="form" v-model="param_ttsPerms" />
					</section>
				</div>
			</transition>

			<Splitter class="splitter">{{ $t("tts.messages.title") }}</Splitter>

			<section>
				<ParamItem class="card-item" :paramData="param_readMessages" />
				<ParamItem class="card-item" :paramData="param_readWhispers" />
				<ParamItem class="card-item" :paramData="param_readFollow" />
				<ParamItem class="card-item" :paramData="param_readSubs" />
				<ParamItem class="card-item" :paramData="param_readSubgifts" />
				<ParamItem class="card-item" :paramData="param_readBits" />
				<ParamItem class="card-item" :paramData="param_readRaids" />
				<ParamItem class="card-item" :paramData="param_readRewards" />
				<ParamItem class="card-item" :paramData="param_readPolls" />
				<ParamItem class="card-item" :paramData="param_readPredictions" />
				<ParamItem class="card-item" :paramData="param_readBingos" />
				<ParamItem class="card-item" :paramData="param_readRaffle" />
				<ParamItem class="card-item" :paramData="param_readTimeouts" />
				<ParamItem class="card-item" :paramData="param_readBans" />
				<ParamItem class="card-item" :paramData="param_readUnbans" />
				<ParamItem class="card-item" :paramData="param_readNotices" />
				<ParamItem class="card-item" :paramData="param_read1stMessageToday" />
				<ParamItem class="card-item" :paramData="param_read1stTimeChatters" />
				<ParamItem class="card-item" :paramData="param_readAutomod" />
			</section>
			
			<Splitter class="splitter">{{ $t("tts.params.title") }}</Splitter>

			<section class="card-item">
				<ParamItem noBackground :paramData="param_voice" />
				<ParamItem noBackground :paramData="param_volume" />
				<ParamItem noBackground :paramData="param_rate" />
				<ParamItem noBackground :paramData="param_pitch" />
				<form @submit.prevent="testVoice()">
					<input class="center" type="text" v-model="testStr" :placeholder="$t('tts.params.test_placeholder')">
					<Button class="center" icon="tts" type="submit">{{ $t('tts.params.testBt') }}</Button>
				</form>
			</section>

			<Splitter class="splitter">{{ $t("tts.filters.title") }}</Splitter>

			<section>
				<ParamItem class="card-item" :paramData="param_removeEmotes" />
				<ParamItem class="card-item shrinkInput" :paramData="param_removeURL" />
				<ParamItem class="card-item" :paramData="param_maxDurationToggle" />
				<ParamItem class="card-item" :paramData="param_maxLengthToggle" />
				<ParamItem class="card-item" :paramData="param_timeoutToggle" />
				<ParamItem class="card-item" :paramData="param_inactivityPeriodToggle" />
			</section>
		</div>

	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TTSUtils from '@/utils/TTSUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { watch, type StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../../Button.vue';
import Splitter from '../../Splitter.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from '../../PermissionsForm.vue';
import type IParameterContent from './IParameterContent';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

@Component({
	components:{
		Button,
		Splitter,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
//TODO replace all the hardcoded message types and build them dynamically
export default class ParamsTTS extends Vue implements IParameterContent {

	public testStr:string = "";
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", label:"", value:false};
	public param_volume:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, label:"", min:0, max:1, step:0.1};
	public param_rate:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, label:"", min:0.1, max:5, step:0.1};
	public param_pitch:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:1, label:"", min:0, max:2, step:0.1};
	public param_voice:TwitchatDataTypes.ParameterData<string> = {type:"list", value:'', listValues:[], label:"", id:404, parent:400};
	public param_removeEmotes:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, label:""};

	public param_maxLengthToggle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"" };
	public param_maxLength:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:200, label:"", min:10, max:500, step:10};
	public param_maxDurationToggle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"" };
	public param_maxDuration:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:30, label:"", min:0, max:60, step:1};
	public param_timeoutToggle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"" };
	public param_timeout:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:60, label:"", min:0, max:30, step:1};
	public param_inactivityPeriodToggle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"" };
	public param_inactivityPeriod:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:0, label:"", min:0, max:60, step:1};
	public param_removeURL:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, label:""};
	public param_replaceURL:TwitchatDataTypes.ParameterData<string> = {type:"string", value:'link', label:""};

	public param_readMessages:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"user" };
	public param_readMessagesPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderMessages, maxLength:300};
	public param_readWhispers:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"whispers" };
	public param_readWhispersPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderMessages, maxLength:300};
	public param_readNotices:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"info" };
	public param_readNoticesPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderNotices, maxLength:300};
	public param_readTimeouts:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"timeout" };
	public param_readTimeoutsPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderTimeouts, maxLength:300};
	public param_readBans:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"ban" };
	public param_readBansPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderBans, maxLength:300};
	public param_readUnbans:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"unban" };
	public param_readUnbansPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderUnbans, maxLength:300};
	public param_readRewards:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, label:"", icon:"channelPoints"};
	public param_readRewardsPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderRewards, maxLength:300};
	public param_readSubs:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"sub" };
	public param_readSubsPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderSubs, maxLength:300};
	public param_readSubgifts:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"gift" };
	public param_readSubgiftsPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderSubgifts, maxLength:300};
	public param_readBits:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"bits" };
	public param_readBitsMinAmount:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, label:"Minimum bits amount", min:0, max:1000000 };
	public param_readBitsPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderBits, maxLength:300};
	public param_readRaids:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"raid" };
	public param_readRaidsPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderRaids, maxLength:300};
	public param_readFollow:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"follow" };
	public param_readFollowPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderFollows, maxLength:300};
	public param_readPolls:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"poll" };
	public param_readPollsPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderPolls, maxLength:300};
	public param_readPredictions:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"prediction" };
	public param_readPredictionsPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderPredictions, maxLength:300};
	public param_readBingos:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"bingo" };
	public param_readBingosPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderBingo, maxLength:300};
	public param_readRaffle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"ticket" };
	public param_readRafflePattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderRaffles, maxLength:300};
	public param_read1stMessageToday:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"firstTime" };
	public param_read1stMessageTodayPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholder1stMessageToday, maxLength:300};
	public param_read1stTimeChatters:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"firstTime" };
	public param_read1stTimeChattersPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholder1stTimeChatters, maxLength:300};
	public param_readAutomod:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, label:"", icon:"automod" };
	public param_readAutomodPattern:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"", placeholderList:TTSUtils.placeholderAutomod, maxLength:300};
	public param_ttsPerms:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:false,
		subs:false,
		all:false,
		follower:true,
		follower_duration_ms:0,
		usersAllowed:[],
		usersRefused:[],
	};

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true? 1 : .5,
			pointerEvents:this.param_enabled.value === true? "all" : "none",
		};
	}

	public get finalData():TwitchatDataTypes.TTSParamsData {
		return {
			enabled:this.param_enabled.value,
			volume:this.param_volume.value,
			rate:this.param_rate.value,
			pitch:this.param_pitch.value,
			voice:this.param_voice.value,
			ttsPerms:this.param_ttsPerms,
			removeEmotes:this.param_removeEmotes.value,
			maxLength:this.param_maxLengthToggle.value === true? this.param_maxLength.value : 0,
			maxDuration:this.param_maxDurationToggle.value === true? this.param_maxDuration.value : 0,
			timeout:this.param_timeoutToggle.value === true? this.param_timeout.value : 0,
			inactivityPeriod:this.param_inactivityPeriodToggle.value === true? this.param_inactivityPeriod.value : 0,
			removeURL:this.param_removeURL.value,
			replaceURL:this.param_replaceURL.value,
			readMessages:this.param_readMessages.value,
			readMessagePatern:this.param_readMessagesPattern.value,
			readWhispers:this.param_readWhispers.value,
			readWhispersPattern:this.param_readWhispersPattern.value,
			readNotices:this.param_readNotices.value,
			readNoticesPattern:this.param_readNoticesPattern.value,
			readRewards:this.param_readRewards.value,
			readRewardsPattern:this.param_readRewardsPattern.value,
			readSubs:this.param_readSubs.value,
			readSubsPattern:this.param_readSubsPattern.value,
			readSubgifts:this.param_readSubgifts.value,
			readSubgiftsPattern:this.param_readSubgiftsPattern.value,
			readBits:this.param_readBits.value,
			readBitsMinAmount:this.param_readBitsMinAmount.value,
			readBitsPattern:this.param_readBitsPattern.value,
			readRaids:this.param_readRaids.value,
			readRaidsPattern:this.param_readRaidsPattern.value,
			readFollow:this.param_readFollow.value,
			readFollowPattern:this.param_readFollowPattern.value,
			readPolls:this.param_readPolls.value,
			readPollsPattern:this.param_readPollsPattern.value,
			readBingos:this.param_readBingos.value,
			readBingosPattern:this.param_readBingosPattern.value,
			readRaffle:this.param_readRaffle.value,
			readRafflePattern:this.param_readRafflePattern.value,
			readPredictions:this.param_readPredictions.value,
			readPredictionsPattern:this.param_readPredictionsPattern.value,
			read1stMessageToday:this.param_read1stMessageToday.value,
			read1stMessageTodayPattern:this.param_read1stMessageTodayPattern.value,
			read1stTimeChatters:this.param_read1stTimeChatters.value,
			read1stTimeChattersPattern:this.param_read1stTimeChattersPattern.value,
			readAutomod:this.param_readAutomod.value,
			readAutomodPattern:this.param_readAutomodPattern.value,
			readTimeouts:this.param_readTimeouts.value,
			readTimeoutsPattern:this.param_readTimeoutsPattern.value,
			readBans:this.param_readBans.value,
			readBansPattern:this.param_readBansPattern.value,
			readUnbans:this.param_readUnbans.value,
			readUnbansPattern:this.param_readUnbansPattern.value,
		};
	}

	public setVoices():void {
		this.param_voice.listValues = window.speechSynthesis.getVoices().map(x => { return {label:x.name, value:x.name} });
	}

	public async beforeMount():Promise<void> {
		let params: TwitchatDataTypes.TTSParamsData = this.$store("tts").params;
		
		this.setVoices();

		this.testStr								= this.$t("tts.params.test_message");

		this.param_enabled.labelKey					= "global.enable";
		this.param_volume.labelKey					= "tts.params.param_volume";
		this.param_rate.labelKey					= "tts.params.param_rate";
		this.param_pitch.labelKey					= "tts.params.param_pitch";
		this.param_voice.labelKey					= "tts.params.param_voice";
		this.param_removeEmotes.labelKey			= "tts.params.param_removeEmotes";

		this.param_readMessages.labelKey			= "tts.messages.param_readMessages";
		this.param_readWhispers.labelKey			= "tts.messages.param_readWhispers";
		this.param_readNotices.labelKey				= "tts.messages.param_readNotices";
		this.param_readRewards.labelKey				= "tts.messages.param_readRewards";
		this.param_readSubs.labelKey				= "tts.messages.param_readSubs";
		this.param_readSubgifts.labelKey			= "tts.messages.param_readSubgifts";
		this.param_readBits.labelKey				= "tts.messages.param_readBits";
		this.param_readRaids.labelKey				= "tts.messages.param_readRaids";
		this.param_readFollow.labelKey				= "tts.messages.param_readFollow";
		this.param_readPolls.labelKey				= "tts.messages.param_readPolls";
		this.param_readPredictions.labelKey			= "tts.messages.param_readPredictions";
		this.param_readBingos.labelKey				= "tts.messages.param_readBingos";
		this.param_readRaffle.labelKey				= "tts.messages.param_readRaffle";
		this.param_read1stMessageToday.labelKey		= "tts.messages.param_read1stMessageToday";
		this.param_read1stTimeChatters.labelKey		= "tts.messages.param_read1stTimeChatters";
		this.param_readAutomod.labelKey				= "tts.messages.param_readAutomod";
		this.param_readTimeouts.labelKey			= "tts.messages.param_readTimeouts";
		this.param_readBans.labelKey				= "tts.messages.param_readBans";
		this.param_readUnbans.labelKey				= "tts.messages.param_readUnbans";

		this.param_maxLengthToggle.labelKey			= "tts.filters.param_maxLengthToggle";
		this.param_maxLength.labelKey				= "tts.filters.param_maxLength";
		this.param_maxDurationToggle.labelKey		= "tts.filters.param_maxDurationToggle";
		this.param_maxDuration.labelKey				= "tts.filters.param_maxDuration";
		this.param_timeoutToggle.labelKey			= "tts.filters.param_timeoutToggle";
		this.param_timeout.labelKey					= "tts.filters.param_timeout";
		this.param_inactivityPeriodToggle.labelKey	= "tts.filters.param_inactivityPeriodToggle";
		this.param_inactivityPeriod.labelKey		= "tts.filters.param_inactivityPeriod";
		this.param_removeURL.labelKey				= "tts.filters.param_removeURL";
		this.param_replaceURL.labelKey				= "tts.filters.param_replaceURL";

		this.param_readMessagesPattern.labelKey		= 
		this.param_readWhispersPattern.labelKey		= 
		this.param_readNoticesPattern.labelKey		= 
		this.param_readRewardsPattern.labelKey		= 
		this.param_readSubsPattern.labelKey			= 
		this.param_readSubgiftsPattern.labelKey		= 
		this.param_readBitsPattern.labelKey			= 
		this.param_readRaidsPattern.labelKey		= 
		this.param_readFollowPattern.labelKey		= 
		this.param_readPollsPattern.labelKey		= 
		this.param_readPredictionsPattern.labelKey	= 
		this.param_readBingosPattern.labelKey		= 
		this.param_readRafflePattern.labelKey		= 
		this.param_readAutomodPattern.labelKey		= 
		this.param_readTimeoutsPattern.labelKey		= 
		this.param_readBansPattern.labelKey			= 
		this.param_readUnbansPattern.labelKey		= 
		this.param_read1stMessageTodayPattern.labelKey	= 
		this.param_read1stTimeChattersPattern.labelKey	= "tts.messages.param_format";

		this.param_enabled.value = params.enabled;
		this.param_volume.value = params.volume;
		this.param_rate.value = params.rate;
		this.param_pitch.value = params.pitch;
		this.param_voice.value = params.voice;
		this.param_ttsPerms = params.ttsPerms;
		this.param_removeEmotes.value = params.removeEmotes;
		this.param_maxLength.value = params.maxLength;
		this.param_maxDuration.value = params.maxDuration;
		this.param_timeout.value = params.timeout;
		this.param_inactivityPeriod.value = params.inactivityPeriod;
		this.param_removeURL.value = params.removeURL;
		this.param_replaceURL.value = params.replaceURL;

		function label(label1:string, label2:string):string {
			if(label1.length > 0) return label1;
			if(label2.length > 0) return label2;
			return "";
		}

		this.param_readMessages.value				= params.readMessages === true;
		this.param_readMessagesPattern.value		= label(params.readMessagePatern, this.$t("tts.patterns.readMessagePatern"));
		this.param_readWhispers.value				= params.readWhispers === true;
		this.param_readWhispersPattern.value		= label(params.readWhispersPattern, this.$t("tts.patterns.readWhispersPattern"));
		this.param_readNotices.value				= params.readNotices === true;
		this.param_readNoticesPattern.value			= label(params.readNoticesPattern, this.$t("tts.patterns.readNoticesPattern"));
		this.param_readRewards.value				= params.readRewards === true;
		this.param_readRewardsPattern.value			= label(params.readRewardsPattern, this.$t("tts.patterns.readRewardsPattern"));
		this.param_readSubs.value					= params.readSubs === true;
		this.param_readSubsPattern.value			= label(params.readSubsPattern, this.$t("tts.patterns.readSubsPattern"));
		this.param_readSubgifts.value				= params.readSubgifts === true;
		this.param_readSubgiftsPattern.value		= label(params.readSubgiftsPattern, this.$t("tts.patterns.readSubgiftsPattern"));
		this.param_readBits.value					= params.readBits === true;
		this.param_readBitsMinAmount.value			= params.readBitsMinAmount;
		this.param_readBitsPattern.value			= label(params.readBitsPattern, this.$t("tts.patterns.readBitsPattern"));
		this.param_readRaids.value					= params.readRaids === true;
		this.param_readRaidsPattern.value			= label(params.readRaidsPattern, this.$t("tts.patterns.readRaidsPattern"));
		this.param_readFollow.value					= params.readFollow === true;
		this.param_readFollowPattern.value			= label(params.readFollowPattern, this.$t("tts.patterns.readFollowPattern"));
		this.param_readPolls.value					= params.readPolls === true;
		this.param_readPollsPattern.value			= label(params.readPollsPattern, this.$t("tts.patterns.readPollsPattern"));
		this.param_readBingos.value					= params.readBingos === true;
		this.param_readBingosPattern.value			= label(params.readBingosPattern, this.$t("tts.patterns.readBingosPattern"));
		this.param_readRaffle.value					= params.readRaffle === true;
		this.param_readRafflePattern.value			= label(params.readRafflePattern, this.$t("tts.patterns.readRafflePattern"));
		this.param_readPredictions.value			= params.readPredictions === true;
		this.param_readPredictionsPattern.value		= label(params.readPredictionsPattern, this.$t("tts.patterns.readPredictionsPattern"));
		this.param_read1stMessageToday.value		= params.read1stMessageToday === true;
		this.param_read1stMessageTodayPattern.value	= label(params.read1stMessageTodayPattern, this.$t("tts.patterns.read1stMessageTodayPattern"));
		this.param_read1stTimeChatters.value		= params.read1stTimeChatters === true;
		this.param_read1stTimeChattersPattern.value	= label(params.read1stTimeChattersPattern, this.$t("tts.patterns.read1stTimeChattersPattern"));
		this.param_readAutomod.value				= params.readAutomod === true;
		this.param_readAutomodPattern.value			= label(params.readAutomodPattern, this.$t("tts.patterns.readAutomodPattern"));
		this.param_readTimeouts.value				= params.readTimeouts === true;
		this.param_readTimeoutsPattern.value		= label(params.readTimeoutsPattern, this.$t("tts.patterns.readTimeoutsPattern"));
		this.param_readBans.value					= params.readBans === true;
		this.param_readBansPattern.value			= label(params.readBansPattern, this.$t("tts.patterns.readBansPattern"));
		this.param_readUnbans.value					= params.readUnbans === true;
		this.param_readUnbansPattern.value			= label(params.readUnbansPattern, this.$t("tts.patterns.readUnbansPattern"));
		
		this.param_readMessages.children			= [this.param_readMessagesPattern];
		this.param_readWhispers.children			= [this.param_readWhispersPattern];
		this.param_readNotices.children				= [this.param_readNoticesPattern];
		this.param_readRewards.children				= [this.param_readRewardsPattern];
		this.param_readSubs.children				= [this.param_readSubsPattern];
		this.param_readSubgifts.children			= [this.param_readSubgiftsPattern];
		this.param_readBits.children				= [this.param_readBitsMinAmount, this.param_readBitsPattern];
		this.param_readRaids.children				= [this.param_readRaidsPattern];
		this.param_readFollow.children				= [this.param_readFollowPattern];
		this.param_readPolls.children				= [this.param_readPollsPattern];
		this.param_readBingos.children				= [this.param_readBingosPattern];
		this.param_readRaffle.children				= [this.param_readRafflePattern];
		this.param_readPredictions.children			= [this.param_readPredictionsPattern];
		this.param_read1stMessageToday.children		= [this.param_read1stMessageTodayPattern];
		this.param_read1stTimeChatters.children		= [this.param_read1stTimeChattersPattern];
		this.param_readAutomod.children				= [this.param_readAutomodPattern];
		this.param_readTimeouts.children			= [this.param_readTimeoutsPattern];
		this.param_readBans.children				= [this.param_readBansPattern];
		this.param_readUnbans.children				= [this.param_readUnbansPattern];

		this.param_removeURL.children				= [this.param_replaceURL];
		this.param_maxLengthToggle.children			= [this.param_maxLength];
		this.param_maxDurationToggle.children		= [this.param_maxDuration];
		this.param_timeoutToggle.children			= [this.param_timeout];
		this.param_inactivityPeriodToggle.children	= [this.param_inactivityPeriod];

		this.param_maxLengthToggle.value			= this.param_maxLength.value > 0;
		this.param_maxDurationToggle.value			= this.param_maxDuration.value > 0;
		this.param_timeoutToggle.value				= this.param_timeout.value > 0;
		this.param_inactivityPeriodToggle.value		= this.param_inactivityPeriod.value > 0;

		watch(()=>this.finalData, ()=> {
			this.$store("tts").setTTSParams(this.finalData);
		}, {deep:true});
	}

	public onNavigateBack(): boolean { return false; }

	public testVoice():void {
		const uid = StoreProxy.auth.twitch.user.id;
		const chunks = TwitchUtils.parseMessageToChunks(this.testStr);
		const m:TwitchatDataTypes.MessageChatData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitchat",
			channel_id: uid,
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			user: StoreProxy.users.getUserFrom("twitch", uid, uid),
			message: this.testStr,
			message_chunks: chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
			answers: [],
			children: [],
			is_short:false,
		};
		TTSUtils.instance.readNow(m);
	}

	public async onShowItem(el:Element, done:()=>void):Promise<void> {
		await this.$nextTick();
		gsap.killTweensOf(el);
		gsap.from(el, {height:0, margin:0, paddingTop:0, paddingBottom:0, duration:.5, ease:"sine.inOut", clearProps:"all", onComplete:()=>{
			done();
		}});
	}

	public onHideItem(el:Element, done:()=>void):void {
		gsap.killTweensOf(el);
		gsap.to(el, {height:0, margin:0, paddingTop:0, paddingBottom:0, duration:.5, ease:"sine.inOut", onComplete:()=>{
			done();
		}});
	}
}
</script>

<style scoped lang="less">
.paramstts{
	.fadeHolder {
		transition: opacity .2s;

		.permissions {
			overflow: hidden;
			.form {
				width: 100%;
			}
		}

		section, form {
			display: flex;
			flex-direction: column;
			gap: .5em;
			
			.card-item, &.card-item {
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
				.center {
					margin-left: auto;
					margin-right: auto;
				}
				&.shrinkInput {
					:deep(.inputHolder) {
						flex-basis: 10px;
					}
				}
	
				:deep(input[type="range"]) {
					width: 100%;
				}

				.icon {
					width: 1em;
					height: 1em;
					object-fit: fill;
					margin-right: 0.5em;
				}
			}
			.small {
				font-size: .8em;
			}
		}
	}

}
</style>