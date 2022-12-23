<template>
	<div class="pollform">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title" v-t="'poll.form.title'"></span>
				<Button :aria-label="$t('poll.form.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="close" bounce/>
			</div>

			<div class="content">
				<VoiceGlobalCommandsHelper v-if="voiceControl !== false" class="voiceHelper" />

				<form  @submit.prevent="submitForm()">
					<div class="row">
						<label for="poll_title" v-t="'poll.form.question'"></label>
						<div class="field">
							<input type="text" id="poll_title" v-model="title" maxlength="60" v-autofocus="title == ''" tabindex="1">
							<div class="len">{{title.length}}/60</div>
						</div>
					</div>
					<div class="row">
						<label for="poll_answer" v-t="'poll.form.answers'"></label>
						<div class="field">
							<input type="text" id="poll_answer" v-model="answer1" maxlength="25" v-autofocus="title != ''" tabindex="2">
							<div class="len">{{answer1.length}}/25</div>
						</div>
						<div class="field">
							<input type="text" v-model="answer2" maxlength="25" tabIndex="3">
							<div class="len">{{answer2.length}}/25</div>
						</div>
						<div class="field">
							<input type="text" v-model="answer3" maxlength="25" tabIndex="4">
							<div class="len">{{answer3.length}}/25</div>
						</div>
						<div class="field">
							<input type="text" v-model="answer4" maxlength="25" tabIndex="5">
							<div class="len">{{answer4.length}}/25</div>
						</div>
						<div class="field">
							<input type="text" v-model="answer5" maxlength="25" tabIndex="6">
							<div class="len">{{answer5.length}}/25</div>
						</div>
					</div>
					<div class="row">
						<ParamItem :paramData="extraVotesParam" />
					</div>
					<div class="row shrink" v-if="extraVotesParam.value === true">
						<ParamItem :paramData="pointsVoteParam" />
					</div>
					<div class="row shrink">
						<ParamItem :paramData="voteDuration" />
					</div>
					<div class="row">
						<Button :title="$t('global.submit')" type="submit" :loading="loading" :disabled="title.length < 1 || answers.length < 2" />
						<div class="error" v-if="error" @click="error = ''">{{error}}</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import FormVoiceControllHelper from '@/components/voice/FormVoiceControllHelper';
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import VoiceGlobalCommandsHelper from '../voice/VoiceGlobalCommandsHelper.vue';

@Options({
	props:{
		voiceControl: {
			type: Boolean,
			default: false
		}
	},
	components:{
		Button,
		ParamItem,
		VoiceGlobalCommandsHelper,
	},
	emits:['close']
})
export default class PollForm extends Vue {

	public voiceControl!:boolean;

	public loading:boolean = false;

	public error = "";
	public title = "";
	public answer1 = "";
	public answer2 = "";
	public answer3 = "";
	public answer4 = "";
	public answer5 = "";
	public extraVotesParam:TwitchatDataTypes.ParameterData = {label:"", value:false, type:"toggle"};;
	public pointsVoteParam:TwitchatDataTypes.ParameterData = {label:"", value:0, type:"number", min:0, max:99999, step:1};;
	public voteDuration:TwitchatDataTypes.ParameterData = {label:"", value:2, type:"number", min:1, max:30};;

	private voiceController!:FormVoiceControllHelper;

	public get answers():string[] {
		let res = [];
		if(this.answer1) res.push(this.answer1);
		if(this.answer2) res.push(this.answer2);
		if(this.answer3) res.push(this.answer3);
		if(this.answer4) res.push(this.answer4);
		if(this.answer5) res.push(this.answer5);
		return res;
	}

	public async beforeMount():Promise<void> {
		this.extraVotesParam.label	= this.$t("poll.form.additional_votes");
		this.pointsVoteParam.label	= this.$t('poll.form.additional_votes_amount');
		this.voteDuration.label		= this.$t('poll.form.vote_duration');

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
		
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public beforeUnmount():void {
		if(this.voiceController) this.voiceController.dispose();
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public async submitForm():Promise<void> {
		this.loading = true;
		this.error = "";

		try {
			await TwitchUtils.createPoll(StoreProxy.auth.twitch.user.id,
									this.title,
									this.answers,
									this.voteDuration.value as number * 60,
									this.pointsVoteParam.value as number);
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
}
</script>

<style scoped lang="less">
.pollform{
	.modal();

	.content {

		.voiceHelper {
			margin: auto;
		}
		
		form {
			display: flex;
			flex-direction: column;
			.row {
				margin-top: 10px;
				display: flex;
				flex-direction: column;
				background-color: fade(@mainColor_normal_extralight, 30%);
				padding: .5em;
				border-radius: .5em;
				&.right {
					align-self: flex-end;
				}
				&.shrink {
					:deep(input) {
						flex-basis: 80px;
					}
				}
				.error {
					margin-top: 5px;
					color: @mainColor_light;
					padding: 5px 10px;
					border-radius: 5px;
					text-align: center;
					background-color: @mainColor_alert;
				}

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
			}
		}
	}
	.voiceFocus {
		border: 2px solid @mainColor_normal;
	}
}
</style>