<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<ClearButton @click="close()" />
			<h1><Icon name="prediction" class="icon" />{{ $t("prediction.form.title") }}</h1>
		</div>
		<div class="content">
			<VoiceGlobalCommandsHelper v-if="voiceControl !== false" class="voiceHelper" />

			<div class="presets" v-if="predictionHistory.length > 0">
				<TTButton @click="selectPreset(item)" v-for="item in predictionHistory" v-tooltip="'•'+item.options.join('\n•')+'\n('+item.duration+'s)'">{{item.title}}</TTButton>
			</div>

			<form  @submit.prevent="submitForm()">
				<div class="card-item">
					<ParamItem :paramData="param_title"
						noBackground
						v-model="title"
						:autofocus="title == ''"
						:tabindex="1"
						@change="onValueChange()" />
				</div>

				<div class="card-item answers">
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
						<TTButton :aria-label="$t('prediction.form.outcome_delete_aria')" class="deleteBt"
							icon="cross"
							type="button"
							alert small
							v-if="answers.length > 2 && (index < answers.length-1 || answers.length == 10)"
							@click="deleteAnswer(index)"
						/>

					</div>
					<PlaceholderSelector class="child placeholders" v-if="placeholderList.length > 0"
						copyMode
						:placeholders="placeholderList"
					/>
				</div>

				<div class="card-item">
					<ParamItem noBackground :paramData="param_duration" @change="onValueChange()" />
				</div>

				<TTButton type="submit" v-if="triggerMode === false" :loading="loading" :disabled="!canSubmit">{{ $t('global.start') }}</TTButton>
				<div class="errorCard" v-if="error" @click="error = ''">{{error}}</div>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionPredictionData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import ParamItem from '../params/ParamItem.vue';
import FormVoiceControllHelper from '../voice/FormVoiceControllHelper';
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
class PredictionForm extends AbstractSidePanel {

	@Prop({type: Boolean, default: false})
	public voiceControl!:boolean;

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionPredictionData;

	@Prop
	public triggerData!:TriggerData;

	public loading = false;
	public error = "";
	public title = "";
	public answers:string[] = ["", ""];
	public placeholderList:ITriggerPlaceholder<any>[] = [];
	public param_duration:TwitchatDataTypes.ParameterData<number> = {value:10*60, type:"duration", min:30, max:1800, labelKey:"prediction.form.vote_duration"};
	public param_title:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", maxLength:45, labelKey:"prediction.form.question", placeholderKey:"prediction.form.question_placeholder"};
	public predictionHistory:{title:string, duration:number, options:string[]}[] = [];

	private voiceController!:FormVoiceControllHelper;

	public get classes():string[] {
		const res = ["predictionform", "sidePanel"];
		if(this.triggerMode !== false) res.push("embedMode");
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
		if(this.$store.main.tempStoreValue) {
			const titlePrefill = this.$store.main.tempStoreValue as string;
			if(titlePrefill) this.title = titlePrefill;
			this.$store.main.tempStoreValue = null;
		}

		if(this.triggerMode != false) {
			this.placeholderList =
			this.param_title.placeholderList = TriggerEventPlaceholders(this.triggerData.type);

			if(this.action.predictionData) {
				this.param_duration.value = this.action.predictionData.voteDuration;
				this.title = this.action.predictionData.title;
				for (let i = 0; i < this.action.predictionData.answers.length; i++) {
					this.answers[i] = this.action.predictionData.answers[i];
				}
			}else{
				this.onValueChange();
			}
		}else{
			this.param_duration.value = parseInt(DataStore.get(DataStore.PREDICTION_DEFAULT_DURATION)) || 10*60;

			TwitchUtils.getPredictions().then(pred=>{
				const done:{[key:string]:boolean} = {};
				this.predictionHistory = pred.map(v => {
					const options = v.outcomes.map(c=>c.title);
					let key = v.title+v.prediction_window+options.join(",");
					if(done[key]) return null;
					done[key] = true;
					return {title:v.title, duration:v.prediction_window, options};
				}).filter(v=> v != null) as typeof this.predictionHistory;
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

	public async submitForm():Promise<void> {
		this.loading = true;
		this.error = "";

		const answers = this.answers.filter(v => v.length > 0);

		try {
			await TwitchUtils.createPrediction(StoreProxy.auth.twitch.user.id, this.title, answers, this.param_duration.value);
		}catch(error:unknown) {
			this.loading = false;
			this.error = (error as {message:string}).message;
			return;
		}
		this.loading = false;
		DataStore.set(DataStore.PREDICTION_DEFAULT_DURATION, this.param_duration.value);
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
				voteDuration:this.param_duration.value,
			};
		}
	}

	/**
	 * Selects a poll's preset
	 * @param params
	 */
	public selectPreset(params:typeof this.predictionHistory[number]):void {
		this.param_title.value = params.title;
		this.param_duration.value = params.duration;
		this.answers = params.options.concat();
		while(this.answers.length < 5) {
			this.answers.push("");
		}
	}

}
export default toNative(PredictionForm);
</script>

<style scoped lang="less">
.predictionform{

	.content {
		.presets {
			row-gap: .5em;
			column-gap: .2em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			max-height: 5em;
			min-height: 2em;
			overflow-y: auto;
		}
		form{
			.card-item {
				.questionInput {
					flex-basis: unset;
					text-align: left;
				}
				&.answers {
					gap:5px;
					display: flex;
					flex-direction: column;
					label {
						display: block;
						margin-bottom: .5em;
					}
					.answer {
						flex-grow: 1;
						display: flex;
						flex-direction: row;
						&.red {
							.inputHolder {
								input {
									@c:#f50e9b;
									// color: @c;
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
								// color: @c;
								color: var(--color-text);
								border: 2px solid @c;
								text-shadow: var(--text-shadow-contrast);
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
}
</style>
