<template>
	<div :class="classes">
		<div class="holder" ref="holder">
			<div class="head" v-if="triggerMode === false">
				<span class="title">{{ $t("prediction.form.title") }}</span>
				<Button :aria-label="$t('prediction.form.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<VoiceGlobalCommandsHelper v-if="voiceControl" class="voiceHelper" />

				<form  @submit.prevent="submitForm()">
					<div class="row">
						<label for="prediction_title">{{ $t("prediction.form.question") }}</label>
						<input type="text" id="prediction_title" v-model="title" maxlength="45" v-autofocus="title == ''" tabindex="1" @change="onValueChange()">
					</div>
					<div class="row answers">
						<label for="prediction_answer">{{ $t("prediction.form.outcomes") }}</label>
						<div v-for="(a, index) in answers"
						:class="getAnswerClasses(index)"
						:key="'answer'+index">
							<input type="text"
								maxlength="25"
								v-model="answers[index]"
								v-autofocus="index == 0 && title != ''"
								:tabindex="index + 2"
								@change="onValueChange()"
							>
							<Button :aria-label="$t('prediction.form.outcome_delete_aria')" class="deleteBt" small
								:icon="$image('icons/cross.svg')"
								type="button"
								v-if="answers.length > 2"
								@click="deleteAnswer(index)"
							/>
						</div>
					</div>
					<div class="row shrink">
						<ParamItem :paramData="voteDuration" @change="onValueChange()" />
					</div>
					<div class="row" v-if="triggerMode === false">
						<Button :title="$t('global.submit')" type="submit" :loading="loading" :disabled="!canSubmit" />
						<div class="error" v-if="error" @click="error = ''">{{error}}</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TriggerActionPredictionData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import FormVoiceControllHelper from '../voice/FormVoiceControllHelper';
import VoiceGlobalCommandsHelper from '../voice/VoiceGlobalCommandsHelper.vue';

@Component({
	components:{
		Button,
		ParamItem,
		VoiceGlobalCommandsHelper,
	},
	emits:['close']
})
export default class PredictionForm extends Vue {
	
	@Prop({
			type: Boolean,
			default: false
		})
	public voiceControl!:boolean;
	@Prop({
			type: Boolean,
			default: false
		})
	public triggerMode!:boolean;
	//This is used by the trigger action form.
	@Prop({
			type: Object,
			default:{},
		})
	public action!:TriggerActionPredictionData;

	public loading = false;

	public error = "";
	public title = "";
	public answers:string[] = ["", ""];
	public voteDuration:TwitchatDataTypes.ParameterData<number> = {value:10, type:"number", min:1, max:30};

	private voiceController!:FormVoiceControllHelper;

	public get classes():string[] {
		const res = ["predictionform"];
		if(this.triggerMode !== false) res.push("triggerMode");
		return res;
	}

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
		this.voteDuration.labelKey = 'prediction.form.vote_duration';
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

		if(this.triggerMode && this.action.predictionData) {
			this.voteDuration.value = this.action.predictionData.voteDuration;
			this.title = this.action.predictionData.title;
			for (let i = 0; i < this.action.predictionData.answers.length; i++) {
				this.answers[i] = this.action.predictionData.answers[i];
			}
		}

		if(!this.triggerMode) {
			gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
			gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		}

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
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public async submitForm():Promise<void> {
		this.loading = true;
		this.error = "";

		const answers = this.answers.filter(v => v.length > 0);

		try {
			await TwitchUtils.createPrediction(StoreProxy.auth.twitch.user.id, this.title, answers, this.voteDuration.value * 60);
		}catch(error:unknown) {
			this.loading = false;
			this.error = (error as {message:string}).message;
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
			this.action.predictionData = {
				title:this.title,
				answers:this.answers.filter(v=> v.length > 0),
				voteDuration:this.voteDuration.value,
			};
		}
	}

}
</script>

<style scoped lang="less">
.predictionform{

	&:not(.triggerMode) {
		.modal();
	}

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
				&.inline {
					flex-direction: row;
				}
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
							min-width: 0;
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