<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<CloseButton @click="close()" />
			<h1>{{ $t("prediction.form.title") }}</h1>
		</div>
		<div class="content">
			<VoiceGlobalCommandsHelper v-if="voiceControl !== false" class="voiceHelper" />

			<form  @submit.prevent="submitForm()">
				<div class="card-item primary">
					<ParamItem :paramData="param_title"
						v-model="title"
						v-autofocus="title == ''"
						@change="onValueChange()" />
				</div>

				<div class="card-item primary answers">
					<label for="prediction_answer">{{ $t("prediction.form.outcomes") }}</label>
					<div v-for="(a, index) in answers"
					:class="getAnswerClasses(index)"
					:key="'answer'+index">
						<div class="inputHolder">
							<input type="text"
								maxlength="25"
								v-model="answers[index]"
								v-autofocus="index == 0 && title != ''"
								:tabindex="index + 2"
								:placeholder="$t('prediction.form.answer_placeholder')"
								@change="onValueChange()">
							<div class="len">{{answers[index].length}}/25</div>
						</div>
						<Button :aria-label="$t('prediction.form.outcome_delete_aria')" class="deleteBt"
							icon="cross"
							type="button"
							alert small
							v-if="answers.length > 2 && (index < answers.length-1 || answers.length == 10)"
							@click="deleteAnswer(index)"
						/>
					</div>
				</div>

				<div class="card-item primary shrink">
					<ParamItem :paramData="voteDuration" @change="onValueChange()" />
				</div>
				
				<Button type="submit" :loading="loading" :disabled="!canSubmit">{{ $t('global.submit') }}</Button>
				<div class="errorCard" v-if="error" @click="error = ''">{{error}}</div>
			</form>
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
import { Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import ParamItem from '../params/ParamItem.vue';
import FormVoiceControllHelper from '../voice/FormVoiceControllHelper';
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
export default class PredictionForm extends AbstractSidePanel {
	
	@Prop({type: Boolean, default: true})
	public voiceControl!:boolean;

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionPredictionData;

	public loading = false;

	public error = "";
	public title = "";
	public answers:string[] = ["", ""];
	public voteDuration:TwitchatDataTypes.ParameterData<number> = {value:10, type:"number", min:1, max:30};
	public param_title:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", maxLength:45, labelKey:"prediction.form.question", placeholderKey:"prediction.form.question_placeholder"};

	private voiceController!:FormVoiceControllHelper;

	public get classes():string[] {
		const res = ["predictionform"];
		if(this.triggerMode === false) res.push("sidePanel");
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
			super.open();
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
		super.close();
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
		super.close();
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

	.content > form {
		.card-item {
			.questionInput {
				flex-basis: unset;
				text-align: left;
			}
			&.answers {
				label {
					display: block;
					margin-bottom: .5em;
				}
				.answer {
					flex-grow: 1;
					display: flex;
					flex-direction: row;
					&:not(:last-child) {
						margin-bottom: 5px;
					}
					&.red {
						.inputHolder {
							input {
								@c:#f50e9b;
								color: @c;
								border-color: @c;
							}
						}
					}
					&.disabled {
						.inputHolder {
							input {
								@c:#727272;
								color: @c;
								border-color: @c;
							}
						}
					}
					.inputHolder {
						position: relative;
						flex-grow: 1;
						input {
							width: 100%;
							min-width: 0;
							border-width: 3px;
							text-align: left;
							@c:#3798ff;
							color: @c;
							border: 2px solid @c;
							text-shadow: 1px 1px 1px rgba(0, 0, 0, .5);
						}
						.len {
							font-size: .7em;
							position: absolute;
							right: .5em;
							top: 50%;
							transform: translateY(-50%);
						}
					}
					&:has(.deleteBt) {
						input {
							border-top-right-radius: 0;
							border-bottom-right-radius: 0;
						}
					}
				}
				.deleteBt {
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
					width: 2em;
				}
			}
		}
	}
}
</style>