<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<h1 class="title">{{ $t("poll.form.title") }}</h1>
			<CloseButton @click="close()" />
		</div>

		<div class="content">
			<VoiceGlobalCommandsHelper v-if="voiceControl !== false" class="voiceHelper" />

			<form @submit.prevent="submitForm()">
				<ParamItem :paramData="param_title"
					v-model="title"
					:autofocus="title == ''"
					@change="onValueChange()" />

				<div class="card-item answers">
					<label for="poll_answer">{{ $t("poll.form.answers") }}</label>

					<div class="field" v-for="(a, index) in answers.length" :key="index">
						<input type="text" id="poll_answer" v-model="answers[index]" maxlength="25" v-autofocus="index == 0 && title != ''" :tabindex="index+2" @change="onValueChange()">
						<div class="len">{{answers[index].length}}/25</div>
					</div>
				</div>
				<ParamItem :paramData="pram_extraVotes" @change="onValueChange()" />
				<ParamItem :paramData="param_points" @change="onValueChange()" v-if="pram_extraVotes.value === true" />
				<ParamItem :paramData="param_duration" @change="onValueChange()" />
				
				<Button type="submit" :loading="loading" :disabled="title.length < 1 || answers.length < 2">{{ $t('global.submit') }}</Button>
				<div class="errorCard" v-if="error" @click="error = ''">{{error}}</div>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import FormVoiceControllHelper from '@/components/voice/FormVoiceControllHelper';
import StoreProxy from '@/store/StoreProxy';
import type { TriggerActionPollData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import ParamItem from '../params/ParamItem.vue';
import VoiceGlobalCommandsHelper from '../voice/VoiceGlobalCommandsHelper.vue';

@Component({
	components:{
		Button,
		ParamItem,
		CloseButton,
		VoiceGlobalCommandsHelper,
	},
	emits:['close']
})
export default class PollForm extends AbstractSidePanel {

	@Prop({type: Boolean, default: false})
	public voiceControl!:boolean;

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionPollData;

	public loading:boolean = false;
	public error = "";
	public title = "";
	public answers:string[] = ["","","","",""];
	public param_title:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", maxLength:60, labelKey:"prediction.form.question", placeholderKey:"prediction.form.question_placeholder"};
	public pram_extraVotes:TwitchatDataTypes.ParameterData<boolean> = {value:false, type:"boolean"};
	public param_points:TwitchatDataTypes.ParameterData<number> = {value:0, type:"number", min:0, max:99999, step:1};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {value:2, type:"number", min:1, max:30};

	private voiceController!:FormVoiceControllHelper;

	public get classes():string[] {
		const res = ["pollform", "sidePanel"];
		if(this.triggerMode !== false) res.push("embedMode");
		return res;
	}

	public async beforeMount():Promise<void> {
		this.pram_extraVotes.labelKey	= "poll.form.additional_votes";
		this.param_points.labelKey		= 'poll.form.additional_votes_amount';
		this.param_duration.labelKey	= 'poll.form.vote_duration';

		if(this.$store("main").tempStoreValue) {
			const titlePrefill = this.$store("main").tempStoreValue as string;
			if(titlePrefill) this.title = titlePrefill;
			this.$store("main").tempStoreValue = null;
		}
	}

	public async mounted():Promise<void> {
		watch(()=>this.voiceControl, ()=>{
			if(this.voiceControl && !this.voiceController) {
				this.voiceController = new FormVoiceControllHelper(this.$el, this.close, this.submitForm);
			}
		});

		if(this.triggerMode && this.action.pollData) {
			this.pram_extraVotes.value = this.action.pollData.pointsPerVote > 0;
			this.param_points.value = this.action.pollData.pointsPerVote ?? 1;
			this.param_duration.value = this.action.pollData.voteDuration;
			this.title = this.action.pollData.title;
			for (let i = 0; i < this.action.pollData.answers.length; i++) {
				this.answers[i] = this.action.pollData.answers[i];
			}
		}
		
		if(!this.triggerMode) {
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
									this.param_duration.value * 60,
									this.param_points.value);
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
		this.close(); 
	}

	/**
	 * Called when any value is changed
	 */
	public onValueChange():void {
		if(this.action) {
			this.action.pollData = {
				title:this.title,
				answers:this.answers.filter(v=> v.length > 0),
				pointsPerVote:this.param_points.value,
				voteDuration:this.param_duration.value,
			};
		}
	}
}
</script>

<style scoped lang="less">
.pollform{
	.content > form > .card-item {
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
</style>