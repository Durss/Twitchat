<template>
	<div class="predictionform">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Create prediction</span>
				<Button aria-label="Close prediction form" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<VoiceGlobalCommandsHelper v-if="voiceControl" class="voiceHelper" />

				<form  @submit.prevent="submitForm()">
					<div class="row">
						<label for="prediction_title">Question</label>
						<input type="text" id="prediction_title" v-model="title" maxlength="45" v-autofocus="title == ''" tabindex="1">
					</div>
					<div class="row answers">
						<label for="prediction_answer">Answers</label>
						<div v-for="(a, index) in answers"
						:class="getAnswerClasses(index)"
						:key="'answer'+index">
							<input type="text"
								v-model="answers[index]"
								maxlength="25"
								v-autofocus="index == 0 && title != ''"
								:tabindex="index + 2"
							>
							<Button aria-label="Delte outcome option" class="deleteBt" small
								:icon="$image('icons/cross.svg')"
								type="button"
								v-if="answers.length > 2"
								@click="deleteAnswer(index)"
							/>
						</div>
					</div>
					<div class="row">
						<ParamItem :paramData="voteDuration" />
					</div>
					<div class="row">
						<Button title="Submit" type="submit" :loading="loading" :disabled="!canSubmit" />
						<div class="error" v-if="error" @click="error = ''">{{error}}</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import FormVoiceControllHelper from '../voice/FormVoiceControllHelper';
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
export default class PredictionForm extends Vue {

	public voiceControl!:boolean;

	public loading = false;

	public error = "";
	public title = "";
	public answers:string[] = ["", ""];
	public voteDuration:TwitchatDataTypes.ParameterData = {label:"Vote duration (minutes)", value:10, type:"number", min:1, max:30};

	private voiceController!:FormVoiceControllHelper;

	public get canSubmit():boolean {
		return this.title.length > 1 && this.answers[0].length > 0 && this.answers[1].length > 0;
	}

	public get filledCount():number {
		let filledCount = 0;
		for (let i = 0; i < this.answers.length; i++) {
			if(this.answers[i].length > 0) filledCount++;
		}
		return filledCount;
	}

	public getAnswerClasses(index:number):string[] {
		const res = ["answer"];
		if(this.filledCount < 3 && index == 1) res.push("red"); 
		if(index > 1 && this.answers[index].length==0) res.push("disabled"); 
		return res;
	}

	public async beforeMount():Promise<void> {
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

		watch(()=>this.answers, ()=> {
			let emptyCount = 0;
			for (let i = 0; i < this.answers.length; i++) {
				if(this.answers[i].length === 0) emptyCount++;
			}
			if(emptyCount == 0 && this.answers.length < Config.instance.MAX_PREDICTION_OUTCOMES) {
				this.answers.push("");
			}else if(emptyCount > 1 && this.answers.length > 2) {
				while(emptyCount > 1) {
					for (let i = 0; i < this.answers.length; i++) {
						if(this.answers[i].length === 0) {
							this.answers.splice(i, 1);
							emptyCount--;
							break;
						}
					}
				}

			}
		}, {deep:true});
	}

	public beforeUnmount():void {
		if(this.voiceController) this.voiceController.dispose();
	}

	public async deleteAnswer(index:number):Promise<void> {
		this.answers.splice(index, 1);
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

		const answers = this.answers.filter(v => v.length > 0);

		try {
			await TwitchUtils.createPrediction(StoreProxy.auth.twitch.user.id, this.title, answers, this.voteDuration.value as number * 60);
		}catch(error:unknown) {
			this.loading = false;
			this.error = (error as {message:string}).message;
			if(this.error.indexOf("or equal to 2") > -1) {
				this.error = "Twitch API still not allows to create predictions with more than 2 items, sorry :(";
			}
			return;
		}
		this.loading = false;
		this.close();
	}

}
</script>

<style scoped lang="less">
.predictionform{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
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

				&.answers {
					.answer {
						flex-grow: 1;
						display: flex;
						flex-direction: row;
						&:not(:last-child) {
							margin-bottom: 5px;
						}
						&.red {
							input {
								@c:#f50e9b;
								color: @c;
								border-color: @c;
								background-color: lighten(@c, 40%);
							}
						}
						&.disabled {
							input {
								@c:#727272;
								color: @c;
								border-color: @c;
								background-color: lighten(@c, 40%);
							}
						}
						input {
							flex-grow: 1;
							border-width: 3px;
							@c:#387aff;
							color: @c;
							border-color: @c;
							background-color: lighten(@c, 30%);
						}
						.deleteBt {
							background: none;
							padding-right: 0;
						}
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