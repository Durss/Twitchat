<template>
	<div class="pollform">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Create poll</span>
				<Button aria-label="Close poll form" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			
			<VoiceGlobalCommandsHelper v-if="voiceControl" class="voiceHelper" />

			<div class="content">
				<form  @submit.prevent="submitPoll()">
					<div class="row">
						<label for="poll_title">Question</label>
						<div class="field">
							<input type="text" id="poll_title" v-model="title" maxlength="60" v-autofocus="title == ''">
							<div class="len">{{title.length}}/60</div>
						</div>
					</div>
					<div class="row">
						<label for="poll_answer">Answers (at least 2)</label>
						<div class="field">
							<input type="text" id="poll_answer" v-model="answer1" maxlength="25" v-autofocus="title != ''">
							<div class="len">{{answer1.length}}/25</div>
						</div>
						<div class="field">
							<input type="text" v-model="answer2" maxlength="25">
							<div class="len">{{answer2.length}}/25</div>
						</div>
						<div class="field">
							<input type="text" v-model="answer3" maxlength="25">
							<div class="len">{{answer3.length}}/25</div>
						</div>
						<div class="field">
							<input type="text" v-model="answer4" maxlength="25">
							<div class="len">{{answer4.length}}/25</div>
						</div>
						<div class="field">
							<input type="text" v-model="answer5" maxlength="25">
							<div class="len">{{answer5.length}}/25</div>
						</div>
					</div>
					<div class="row right">
						<ParamItem :paramData="extraVotesParam" />
					</div>
					<div class="row inline right" v-if="extraVotesParam.value === true">
						<ParamItem :paramData="bitsVoteParam" />
					</div>
					<div class="row inline right" v-if="extraVotesParam.value === true">
						<ParamItem :paramData="pointsVoteParam" />
					</div>
					<div class="row">
						<ParamItem :paramData="voteDuration" />
					</div>
					<div class="row">
						<Button title="Submit" type="submit" :loading="loading" :disabled="title.length < 1 || answers.length < 2" />
						<div class="error" v-if="error" @click="error = ''">{{error}}</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { ParameterData } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import TwitchUtils from '@/utils/TwitchUtils';
import VoiceAction from '@/utils/VoiceAction';
import VoiceController from '@/utils/VoiceController';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import VoiceGlobalCommandsHelper from '../voice/VoiceGlobalCommandsHelper.vue';
import TwitchatEvent, { type TwitchatActionType } from '@/utils/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';

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
	public extraVotesParam:ParameterData = {label:"Allow additional votes", value:false, type:"toggle"};
	public bitsVoteParam:ParameterData = {label:"Bits per vote", value:0, type:"number", min:0, max:99999, step:1};
	public pointsVoteParam:ParameterData = {label:"Points per vote", value:0, type:"number", min:0, max:99999, step:1};
	public voteDuration:ParameterData = {label:"Vote duration (minutes)", value:2, type:"number", min:1, max:30};

	private tabIndex:number = 0;
	private prevField:HTMLInputElement|null = null;
	private prevFieldValue:string = "";
	private originalTabIndex:number = 0;
	private voiceActionHandler!:(e:TwitchatEvent)=>void;
	private batchVoiceActionHandler!:(e:TwitchatEvent)=>void;

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
		if(StoreProxy.store.state.tempStoreValue) {
			this.title = StoreProxy.store.state.tempStoreValue as string;
			StoreProxy.store.state.tempStoreValue = null;
		}
	}

	public async mounted():Promise<void> {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		
		// watch(()=>VoiceController.instance.tempText, ()=> this.onText());
		// watch(()=>VoiceController.instance.finalText, ()=> this.originalTabIndex = this.tabIndex);
		

		this.voiceActionHandler = (e:TwitchatEvent) => this.onVoiceAction(e);
		this.batchVoiceActionHandler = (e:TwitchatEvent) => this.onBatchVoiceAction(e);
		PublicAPI.instance.addEventListener(VoiceAction.ERASE, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.SUBMIT, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.PREVIOUS, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.NEXT, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.TEXT_UPDATE, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.SPEECH_END, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.ACTION_BATCH, this.batchVoiceActionHandler);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(VoiceAction.ERASE, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.SUBMIT, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.PREVIOUS, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.NEXT, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.TEXT_UPDATE, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.SPEECH_END, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.ACTION_BATCH, this.batchVoiceActionHandler);
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public async submitPoll():Promise<void> {
		this.loading = true;
		this.error = "";

		try {
			await TwitchUtils.createPoll(this.title,
									this.answers,
									this.voteDuration.value as number * 60,
									this.bitsVoteParam.value as number,
									this.pointsVoteParam.value as number);
		}catch(error:unknown) {
			this.loading = false;
			this.error = (error as {message:string}).message;
			return;
		}
		this.loading = false;
		this.close(); 
	}

	public get currentInput():HTMLInputElement {
		return (this.$el as HTMLDivElement).getElementsByTagName("input")[this.tabIndex];
	}

	private onText(text:string = ""):void {
		const maxLength = this.currentInput.maxLength;
		// text too long, shake the field
		if(text.length > maxLength) {
			gsap.fromTo(this.currentInput, {x:-2}, {x:2, duration:0.01, clearProps:"x", repeat:20});
			text = text.substring(0, maxLength);
		}
		
		this.currentInput.value = text;
		this.currentInput.dispatchEvent(new Event("input"));
	}

	private onVoiceAction(e:TwitchatEvent, isBatch:boolean = false):void {
		// console.log("ON ACTION ", e.type, e.data);
		const inputList = (this.$el as HTMLDivElement).getElementsByTagName("input");
		
		const prevTabIndex = this.tabIndex;
		const prevInput = this.currentInput;
		switch(e.type) {
			case VoiceAction.SPEECH_END: {
				this.originalTabIndex = this.tabIndex
				break;
			}
			case VoiceAction.ERASE: {
				this.currentInput.value = "";
				this.currentInput.dispatchEvent(new Event("input"));
				break;
			}
			case VoiceAction.SUBMIT: this.submitPoll(); break;
			case VoiceAction.PREVIOUS: this.tabIndex --; break;
			case VoiceAction.NEXT: this.tabIndex ++; break;
			case VoiceAction.TEXT_UPDATE: {
				this.onText((e.data as {text:string}).text as string);
				return;
			}
		}

		if(e.type != VoiceAction.SPEECH_END
		&& e.type != VoiceAction.ERASE
		&& this.prevField) {
			//Backup prev field value to revert it if just using a global command
			this.prevField.value = this.prevFieldValue;
			this.prevField.dispatchEvent(new Event("input"));
			this.prevField = null;
			this.prevFieldValue = "";
			// console.log("_____RESTORE content", this.prevFieldValue);
		}else{
			this.prevField = this.currentInput;
			this.prevFieldValue = this.currentInput.value;
			// console.log("_____BACKUP content", this.prevFieldValue);
		}
		if(this.tabIndex != prevTabIndex && prevInput) prevInput.classList.remove("voiceFocus");
		if(this.tabIndex < 0) this.tabIndex = 0;
		if(this.tabIndex > inputList.length-1) this.tabIndex = inputList.length-1;
		if(this.tabIndex != prevTabIndex) {
			this.currentInput.focus();
			this.currentInput.classList.add("voiceFocus");
		}
	}

	private onBatchVoiceAction(e:TwitchatEvent):void {
		const actionList = e.data as {id:string, value:string}[];
		this.tabIndex = this.originalTabIndex;
		// console.log("ON BATCH ACTION ", this.tabIndex, actionList);
		for (let i = 0; i < actionList.length; i++) {
			const a = actionList[i];
			this.onVoiceAction(new TwitchatEvent(a.id as TwitchatActionType, a.value), true);
		}
	}
}
</script>

<style scoped lang="less">
.pollform{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	.modal();

	.voiceHelper {
		margin: auto;
	}

	.content {
		form {
			display: flex;
			flex-direction: column;
			.row {
				margin-top: 10px;
				display: flex;
				flex-direction: column;
				&.inline {
					flex-direction: row;
				}
				&.right {
					align-self: flex-end;
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
						&.voiceFocus {
							// border: 2px solid @mainColor_normal;
							outline: 1px solid @mainColor_normal;
							// background-color: @mainColor_highlight_extralight;
						}
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