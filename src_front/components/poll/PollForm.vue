<template>
	<div class="pollform sidePanel" :class="{embedMode: triggerMode !== false}">
		<div class="head" v-if="triggerMode === false">
			<h1 class="title"><Icon name="poll" class="icon" />{{ $t("poll.form.title") }}</h1>
			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<VoiceGlobalCommandsHelper v-if="voiceControl !== false" class="voiceHelper" />

			<div class="presets" v-if="pollHistory.length > 0">
				<TTButton @click="selectPreset(item)" v-for="item in pollHistory" v-tooltip="'•'+item.options.join('\n•')+'\n('+item.duration+'s)'">{{item.title}}</TTButton>
			</div>

			<form @submit.prevent="submitForm()">
				<ParamItem :paramData="param_title"
					v-model="title"
					:autofocus="title == ''"
					:tabindex="1"
					@change="onValueChange()" />

				<div class="card-item answers">
					<label for="poll_answer">{{ $t("poll.form.answers") }}</label>

					<div class="field" v-for="(a, index) in answers.length" :key="index">
						<input type="text" id="poll_answer" v-model="answers[index]" maxlength="25" v-autofocus="index == 0 && title != ''" :tabindex="index+2" @change="onValueChange()">
						<div class="len">{{answers[index]!.length}}/25</div>
					</div>

					<PlaceholderSelector class="child placeholders" v-if="placeholderList.length > 0"
						copyMode
						:placeholders="placeholderList"
					/>
				</div>
				<ParamItem :paramData="param_extraVotes" v-model="param_extraVotes.value" @change="onValueChange()">
					<ParamItem :paramData="param_points" @change="onValueChange()" v-model="param_points.value" noBackground class="child" />
				</ParamItem>
				<ParamItem :paramData="param_duration" @change="onValueChange()" />

				<TTButton type="submit" v-if="triggerMode === false"
				:loading="loading"
				:disabled="title.length < 1 || answers.filter(v=> v.trim().length > 0).length < 2">{{ $t('global.start') }}</TTButton>
				<div class="errorCard" v-if="error" @click="error = ''">{{error}}</div>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import FormVoiceControllHelper from '@/components/voice/FormVoiceControllHelper';
import StoreProxy from '@/store/StoreProxy';
import { TriggerEventPlaceholders, type TriggerActionPollData, type TriggerData, type ITriggerPlaceholder } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import ParamItem from '../params/ParamItem.vue';
import VoiceGlobalCommandsHelper from '../voice/VoiceGlobalCommandsHelper.vue';
import PlaceholderSelector from '../params/PlaceholderSelector.vue';
import DataStore from '@/store/DataStore';

@Component({
	components:{
		TTButton,
		ParamItem,
		ClearButton,
		PlaceholderSelector,
		VoiceGlobalCommandsHelper,
	},
	emits:['close']
})
class PollForm extends AbstractSidePanel {

	@Prop({type: Boolean, default: false})
	public voiceControl!:boolean;

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionPollData;

	@Prop
	public triggerData!:TriggerData;

	public loading:boolean = false;
	public error = "";
	public title = "";
	public answers:string[] = ["","","","",""];
	public param_title:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", maxLength:60, labelKey:"poll.form.question", placeholderKey:"prediction.form.question_placeholder"};
	public param_extraVotes:TwitchatDataTypes.ParameterData<boolean> = {value:false, type:"boolean", labelKey:"poll.form.additional_votes", icon:"add"};
	public param_points:TwitchatDataTypes.ParameterData<number> = {value:100, type:"number", min:1, max:99999, step:1, icon:"channelPoints", labelKey:"poll.form.additional_votes_amount"};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {value:2*60, type:"duration", min:15, max:1800, labelKey:"poll.form.vote_duration", icon:"timer"};
	public placeholderList:ITriggerPlaceholder<any>[] = [];
	public pollHistory:{title:string, duration:number, options:string[], channelPoints:number}[] = [];

	private voiceController!:FormVoiceControllHelper;

	public async beforeMount():Promise<void> {

		if(this.$store.main.tempStoreValue) {
			const titlePrefill = this.$store.main.tempStoreValue as string;
			if(titlePrefill) this.title = titlePrefill;
			this.$store.main.tempStoreValue = null;
		}

		if(this.triggerMode !== false) {
			this.placeholderList =
			this.param_title.placeholderList = TriggerEventPlaceholders(this.triggerData.type);
			if(this.action.pollData) {
				this.param_extraVotes.value = this.action.pollData.pointsPerVote > 0;
				this.param_points.value = this.action.pollData.pointsPerVote ?? 1;
				this.param_duration.value = this.action.pollData.voteDuration;
				this.title = this.action.pollData.title;
				for (let i = 0; i < this.action.pollData.answers.length; i++) {
					this.answers[i] = this.action.pollData.answers[i]!;
				}
			}else{
				this.onValueChange();
			}
		}else{
			this.param_duration.value = parseInt(DataStore.get(DataStore.POLL_DEFAULT_DURATION)) || 2*60;
			TwitchUtils.getPolls().then(polls=>{
				const done:{[key:string]:boolean} = {};
				this.pollHistory = polls.map(v => {
					const options = v.choices.map(c=>c.title);
					const channelPoints = v.channel_points_voting_enabled? v.channel_points_per_vote : 0;
					let key = v.title+v.duration+channelPoints+options.join(",");
					if(done[key]) return null;
					done[key] = true;
					return {title:v.title, duration:v.duration, channelPoints, options};
				}).filter(v=> v != null) as typeof this.pollHistory;
			});
		}

	}

	public async mounted():Promise<void> {
		watch(()=>this.voiceControl, ()=>{
			if(this.voiceControl && !this.voiceController) {
				this.voiceController = new FormVoiceControllHelper(this.$el, this.close, this.submitForm);
			}
		});

		if(this.triggerMode === false) {
			super.open();
		}
	}

	public beforeUnmount():void {
		if(this.voiceController) this.voiceController.dispose();
	}

	public async submitForm():Promise<void> {
		this.loading = true;
		this.error = "";

		try {
			await TwitchUtils.createPoll(StoreProxy.auth.twitch.user.id,
									this.title,
									this.answers.filter(v=> v.trim().length > 0),
									this.param_duration.value,
									this.param_extraVotes.value? this.param_points.value : 0);
		}catch(error:unknown) {
			this.loading = false;
			let message = (error as {message:string}).message;
			if(message.toLowerCase().indexOf("pollalreadyactive") > -1) {
				message = this.$t("error.poll_active");
			}else
			if(message.toLowerCase().indexOf("illegal_argument") > -1) {
				message = this.$t("error.poll_automod");
			}
			this.error = message;
			return;
		}
		this.loading = false;
		DataStore.set(DataStore.POLL_DEFAULT_DURATION, this.param_duration.value);
		this.close();
	}

	/**
	 * Called when any value is changed
	 */
	public onValueChange():void {
		if(this.action) {
			if(!this.param_extraVotes.value) {
				this.param_points.value = 0;
			}
			this.action.pollData = {
				title:this.title,
				answers:this.answers.filter(v=> v.length > 0),
				pointsPerVote:this.param_points.value,
				voteDuration:this.param_duration.value,
			};

		}
	}

	/**
	 * Selects a poll's preset
	 * @param params
	 */
	public selectPreset(params:typeof this.pollHistory[number]):void {
		this.param_title.value = params.title;
		this.param_duration.value = params.duration;
		this.param_extraVotes.value = params.channelPoints > 0;
		this.param_points.value = params.channelPoints;
		this.answers = params.options.concat();
		while(this.answers.length < 5) {
			this.answers.push("");
		}
	}
}
export default toNative(PollForm);
</script>

<style scoped lang="less">
.pollform{
	.content{
		.presets {
			row-gap: .5em;
			column-gap: .2em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			max-height: 5em;
			overflow-y: auto;
			min-height: 2em;
		}
		form > .card-item {
			.field {
				flex-grow: 1;
				position: relative;
				input {
					width: 100%;
					padding-right: 3em;
				}
				.len {
					font-size: .7em;
					position: absolute;
					right: .5em;
					top: 50%;
					transform: translateY(-50%);
				}
			}
			&.answers{
				gap:5px;
				display: flex;
				flex-direction: column;
				label {
					display: block;
					margin-bottom: .5em;
				}
			}
		}
	}
}
</style>
