<template>
	<div class="paramstts">
		<img src="@/assets/icons/tts_purple.svg" alt="emergency icon" class="icon">

		<p class="head">Read your messages out loud</p>
		<ParamItem class="item enableBt" :paramData="param_enabled" />


		<div class="fadeHolder" :style="holderStyles">
			<transition
				@enter="onShowItem"
				@leave="onHideItem"
			>
				<section v-if="param_readMessages.value === true || param_readWhispers.value === true">
					<Splitter class="item splitter">Read permissions</Splitter>
					<p class="item">Choose who's messages you want to read.</p>
					<p class="item small">It only filters out the chat messages and whispers. It won't affect sub alerts, cheers, raid, channel points, etc...</p>
					<PermissionsForm class="item" v-model="param_ttsPerms" />
				</section>
			</transition>

			<section>
				<Splitter class="item splitter">Messages to read</Splitter>
				<ParamItem class="item" :paramData="param_readMessages" />
				<ParamItem class="item" :paramData="param_readWhispers" />
				<ParamItem class="item" :paramData="param_readFollow" />
				<ParamItem class="item" :paramData="param_readSubs" />
				<ParamItem class="item" :paramData="param_readSubgifts" />
				<ParamItem class="item" :paramData="param_readBits" />
				<ParamItem class="item" :paramData="param_readRaids" />
				<ParamItem class="item" :paramData="param_readRewards" />
				<ParamItem class="item" :paramData="param_readPolls" />
				<ParamItem class="item" :paramData="param_readPredictions" />
				<ParamItem class="item" :paramData="param_readBingos" />
				<ParamItem class="item" :paramData="param_readRaffle" />
				<ParamItem class="item" :paramData="param_readNotices" />
			</section>
			
			<section>
				<Splitter class="item splitter">Voice parameters</Splitter>
				<ParamItem class="item" :paramData="param_voice" />
				<ParamItem class="item" :paramData="param_volume" />
				<ParamItem class="item" :paramData="param_rate" />
				<ParamItem class="item" :paramData="param_pitch" />
				<form @submit.prevent="testVoice()">
					<input class="item center" type="text" v-model="testStr" placeholder="message...">
					<Button class="item center" title="Test" :icon="$image('icons/tts.svg')" type="submit" />
				</form>
			</section>

			<section>
				<Splitter class="item splitter">Filters</Splitter>
				<ParamItem class="item" :paramData="param_removeEmotes" />
				<ParamItem class="item shrinkInput" :paramData="param_removeURL" />
				<ParamItem class="item" :paramData="param_maxDurationToggle" />
				<ParamItem class="item" :paramData="param_maxLengthToggle" />
				<ParamItem class="item" :paramData="param_timeoutToggle" />
				<ParamItem class="item" :paramData="param_inactivityPeriodToggle" />
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
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import Splitter from '../../Splitter.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from './obs/PermissionsForm.vue';

@Options({
	props:{},
	components:{
		Button,
		Splitter,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class ParamsTTS extends Vue {

	public testStr:string = "This is a test message";
	public param_enabled:TwitchatDataTypes.ParameterData = {type:"toggle", label:"Enabled", value:false};
	public param_volume:TwitchatDataTypes.ParameterData = {type:"slider", value:1, label:"Volume {VALUE}", min:0, max:1, step:0.1};
	public param_rate:TwitchatDataTypes.ParameterData = {type:"slider", value:1, label:"Speed {VALUE}", min:0.1, max:5, step:0.1};
	public param_pitch:TwitchatDataTypes.ParameterData = {type:"slider", value:1, label:"Pitch {VALUE}", min:0, max:2, step:0.1};
	public param_voice:TwitchatDataTypes.ParameterData = {type:"list", value:'', listValues:[], label:"Voice", id:404, parent:400};
	public param_removeEmotes:TwitchatDataTypes.ParameterData = {type:"toggle", value:true, label:"Remove emotes"};

	public param_maxLengthToggle:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Limit message size" };
	public param_maxLength:TwitchatDataTypes.ParameterData = {type:"slider", value:200, label:"Read {VALUE} chars max", min:10, max:500, step:10};
	public param_maxDurationToggle:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Limit message duration" };
	public param_maxDuration:TwitchatDataTypes.ParameterData = {type:"slider", value:30, label:"Stop reading a message after {VALUE} seconds", min:0, max:60, step:1};
	public param_timeoutToggle:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Remove message from queue if they're not read within..." };
	public param_timeout:TwitchatDataTypes.ParameterData = {type:"slider", value:60, label:"{VALUE} minutes", min:0, max:30, step:1};
	public param_inactivityPeriodToggle:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Read messages only if no message has been received for..." };
	public param_inactivityPeriod:TwitchatDataTypes.ParameterData = {type:"slider", value:0, label:"{VALUE} minutes", min:0, max:60, step:1};

	public param_removeURL:TwitchatDataTypes.ParameterData = {type:"toggle", value:true, label:"Remove links"};
	public param_replaceURL:TwitchatDataTypes.ParameterData = {type:"text", value:'link', label:"Replace by"};

	public param_readMessages:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Chat messages", icon:"user_purple.svg" };
	public param_readMessagesPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderMessages};
	public param_readWhispers:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Whispers", icon:"whispers_purple.svg" };
	public param_readWhispersPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderMessages};
	public param_readNotices:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Notices (TO, ban, join/leave, emote-only,...)", icon:"info_purple.svg" };
	public param_readNoticesPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderNotices};
	public param_readRewards:TwitchatDataTypes.ParameterData = {type:"toggle", value:true, label:"Channel point rewards", icon:"channelPoints_purple.svg"};
	public param_readRewardsPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderRewards};
	public param_readSubs:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Sub alerts", icon:"sub_purple.svg" };
	public param_readSubsPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderSubs};
	public param_readSubgifts:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Subgift alerts", icon:"gift_purple.svg" };
	public param_readSubgiftsPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderSubgifts};
	public param_readBits:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Bits alerts", icon:"bits_purple.svg" };
	public param_readBitsMinAmount:TwitchatDataTypes.ParameterData = {type:"number", value:0, label:"Minimum bits amount", min:0, max:1000000 };
	public param_readBitsPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderBits};
	public param_readRaids:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Raid alerts", icon:"raid_purple.svg" };
	public param_readRaidsPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderRaids};
	public param_readFollow:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Follow alerts", icon:"follow_purple.svg" };
	public param_readFollowPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderFollows};
	public param_readPolls:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Poll results", icon:"poll_purple.svg" };
	public param_readPollsPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderPolls};
	public param_readPredictions:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Prediction results", icon:"prediction_purple.svg" };
	public param_readPredictionsPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderPredictions};
	public param_readBingos:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Bingo results", icon:"bingo_purple.svg" };
	public param_readBingosPattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderBingo};
	public param_readRaffle:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, label:"Raffle results", icon:"ticket_purple.svg" };
	public param_readRafflePattern:TwitchatDataTypes.ParameterData = {type:"text", value:"", label:"Format", placeholderList:TTSUtils.placeholderRaffles};
	public param_readUsers:TwitchatDataTypes.ParameterData = {type:"list", value:"", label:"Users to read out loud"};
	public param_ttsPerms:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
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

	public get finalData():TwitchatDataTypes.TTSParamsData {
		return {
			enabled:this.param_enabled.value as boolean,
			volume:this.param_volume.value as number,
			rate:this.param_rate.value as number,
			pitch:this.param_pitch.value as number,
			voice:this.param_voice.value as string,
			ttsPerms:this.param_ttsPerms,
			removeEmotes:this.param_removeEmotes.value as boolean,
			maxLength:this.param_maxLengthToggle.value === true? this.param_maxLength.value as number : 0,
			maxDuration:this.param_maxDurationToggle.value === true? this.param_maxDuration.value as number : 0,
			timeout:this.param_timeoutToggle.value === true? this.param_timeout.value as number : 0,
			inactivityPeriod:this.param_inactivityPeriodToggle.value === true? this.param_inactivityPeriod.value as number : 0,
			removeURL:this.param_removeURL.value as boolean,
			replaceURL:this.param_replaceURL.value as string,
			readMessages:this.param_readMessages.value as boolean,
			readMessagePatern:this.param_readMessagesPattern.value as string,
			readWhispers:this.param_readWhispers.value as boolean,
			readWhispersPattern:this.param_readWhispersPattern.value as string,
			readNotices:this.param_readNotices.value as boolean,
			readNoticesPattern:this.param_readNoticesPattern.value as string,
			readRewards:this.param_readRewards.value as boolean,
			readRewardsPattern:this.param_readRewardsPattern.value as string,
			readSubs:this.param_readSubs.value as boolean,
			readSubsPattern:this.param_readSubsPattern.value as string,
			readSubgifts:this.param_readSubgifts.value as boolean,
			readSubgiftsPattern:this.param_readSubgiftsPattern.value as string,
			readBits:this.param_readBits.value as boolean,
			readBitsMinAmount:this.param_readBitsMinAmount.value as number,
			readBitsPattern:this.param_readBitsPattern.value as string,
			readRaids:this.param_readRaids.value as boolean,
			readRaidsPattern:this.param_readRaidsPattern.value as string,
			readFollow:this.param_readFollow.value as boolean,
			readFollowPattern:this.param_readFollowPattern.value as string,
			readPolls:this.param_readPolls.value as boolean,
			readPollsPattern:this.param_readPollsPattern.value as string,
			readBingos:this.param_readBingos.value as boolean,
			readBingosPattern:this.param_readBingosPattern.value as string,
			readRaffle:this.param_readRaffle.value as boolean,
			readRafflePattern:this.param_readRafflePattern.value as string,
			readPredictions:this.param_readPredictions.value as boolean,
			readPredictionsPattern:this.param_readPredictionsPattern.value as string,
			readUsers:this.param_readUsers.listValues!.map(v => v.value) as string[],
		};
	}

	public setVoices():void {
		this.param_voice.listValues = window.speechSynthesis.getVoices().map(x => { return {label:x.name, value:x.name} });
	}

	public async beforeMount():Promise<void> {
		let params: TwitchatDataTypes.TTSParamsData = this.$store("tts").params;
		
		this.setVoices();

		this.param_enabled.value = params.enabled;
		this.param_volume.value = params.volume;
		this.param_rate.value = params.rate;
		this.param_pitch.value = params.pitch;
		this.param_voice.value = params.voice;
		this.param_ttsPerms = params.ttsPerms;
		this.param_readUsers.listValues = (params.readUsers ?? []).map(v => { return {label:v, value:v}});
		this.param_removeEmotes.value = params.removeEmotes;
		this.param_maxLength.value = params.maxLength;
		this.param_maxDuration.value = params.maxDuration;
		this.param_timeout.value = params.timeout;
		this.param_inactivityPeriod.value = params.inactivityPeriod;
		this.param_removeURL.value = params.removeURL;
		this.param_replaceURL.value = params.replaceURL;

		this.param_readMessages.value = params.readMessages === true;
		this.param_readMessagesPattern.value = params.readMessagePatern;
		this.param_readWhispers.value = params.readWhispers === true;
		this.param_readWhispersPattern.value = params.readWhispersPattern;
		this.param_readNotices.value = params.readNotices === true;
		this.param_readNoticesPattern.value = params.readNoticesPattern;
		this.param_readRewards.value = params.readRewards === true;
		this.param_readRewardsPattern.value = params.readRewardsPattern;
		this.param_readSubs.value = params.readSubs === true;
		this.param_readSubsPattern.value = params.readSubsPattern;
		this.param_readSubgifts.value = params.readSubgifts === true;
		this.param_readSubgiftsPattern.value = params.readSubgiftsPattern;
		this.param_readBits.value = params.readBits === true;
		this.param_readBitsMinAmount.value = params.readBitsMinAmount;
		this.param_readBitsPattern.value = params.readBitsPattern;
		this.param_readRaids.value = params.readRaids === true;
		this.param_readRaidsPattern.value = params.readRaidsPattern;
		this.param_readFollow.value = params.readFollow === true;
		this.param_readFollowPattern.value = params.readFollowPattern;
		this.param_readPolls.value = params.readPolls === true;
		this.param_readPollsPattern.value = params.readPollsPattern;
		this.param_readBingos.value = params.readBingos === true;
		this.param_readBingosPattern.value = params.readBingosPattern;
		this.param_readRaffle.value = params.readRaffle === true;
		this.param_readRafflePattern.value = params.readRafflePattern;
		this.param_readPredictions.value = params.readPredictions === true;
		this.param_readPredictionsPattern.value = params.readPredictionsPattern;
		
		this.param_removeURL.children = [this.param_replaceURL];

		this.param_readMessages.children = [this.param_readMessagesPattern];
		this.param_readWhispers.children = [this.param_readWhispersPattern];
		this.param_readNotices.children = [this.param_readNoticesPattern];
		this.param_readRewards.children = [this.param_readRewardsPattern];
		this.param_readSubs.children = [this.param_readSubsPattern];
		this.param_readSubgifts.children = [this.param_readSubgiftsPattern];
		this.param_readBits.children = [this.param_readBitsMinAmount, this.param_readBitsPattern];
		this.param_readRaids.children = [this.param_readRaidsPattern];
		this.param_readFollow.children = [this.param_readFollowPattern];
		this.param_readPolls.children = [this.param_readPollsPattern];
		this.param_readBingos.children = [this.param_readBingosPattern];
		this.param_readRaffle.children = [this.param_readRafflePattern];
		this.param_readPredictions.children = [this.param_readPredictionsPattern];

		this.param_maxLengthToggle.children = [this.param_maxLength];
		this.param_maxDurationToggle.children = [this.param_maxDuration];
		this.param_timeoutToggle.children = [this.param_timeout];
		this.param_inactivityPeriodToggle.children = [this.param_inactivityPeriod];

		this.param_maxLengthToggle.value = this.param_maxLength.value as number > 0;
		this.param_maxDurationToggle.value = this.param_maxDuration.value as number > 0;
		this.param_timeoutToggle.value = this.param_timeout.value as number > 0;
		this.param_inactivityPeriodToggle.value = this.param_inactivityPeriod.value as number > 0;

		watch(()=>this.finalData, ()=> {
			this.$store("tts").setTTSParams(this.finalData);
		}, {deep:true});
		
	}

	public testVoice():void {
		const uid = StoreProxy.auth.twitch.user.id;
		const m:TwitchatDataTypes.MessageChatData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitchat",
			channel_id: uid,
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			user: StoreProxy.users.getUserFrom("twitch", uid, uid),
			message: this.testStr,
			message_html: this.testStr,
			message_no_emotes: this.testStr,
			answers: [],
			is_short:false,
		};
		TTSUtils.instance.readNow(m);
	}

	public async onShowItem(el:HTMLDivElement, done:()=>void):Promise<void> {
		await this.$nextTick();
		gsap.killTweensOf(el);
		gsap.from(el, {height:0, margin:0, paddingTop:0, paddingBottom:0, duration:.5, ease:"sine.inOut", clearProps:"all", onComplete:()=>{
			done();
		}});
	}

	public onHideItem(el:HTMLDivElement, done:()=>void):void {
		gsap.killTweensOf(el);
		gsap.to(el, {height:0, margin:0, paddingTop:0, paddingBottom:0, duration:.5, ease:"sine.inOut", onComplete:()=>{
			done();
		}});
	}
}
</script>

<style scoped lang="less">
.paramstts{
	.parameterContent();

	.enableBt {
		width: min-content;
		margin: auto;
		border: 1px solid @mainColor_normal;
		border-radius: 1em;
		padding: .5em 1em !important;
		background-color: fade(@mainColor_normal_extralight, 30%);
		:deep(label) {
			white-space: nowrap;
		}
	}

	.fadeHolder {
		transition: opacity .2s;

		section {
			overflow: hidden;
			border-radius: .5em;
			background-color: fade(@mainColor_normal_extralight, 30%);
			padding: .5em;
			margin-top: 1.5em;
			
			.item {
				&:not(:first-child) {
					margin-top: .5em;
				}
				&.splitter {
					margin: .5em 0 1em 0;
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
				&.small {
					font-size: .8em;
				}
				&.center {
					display: block;
					margin-left: auto;
					margin-right: auto;
				}
				&.shrinkInput {
					:deep(input) {
						width: auto;
					}
				}
	
				:deep(input[type="range"]) {
					width: 100%;
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