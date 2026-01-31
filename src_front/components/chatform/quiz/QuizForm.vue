<template>
	<div class="quizform sidePanel">
		<div class="head">
			<div class="title">
				<Icon name="quiz" />
				<i18n-t scope="global" tag="h1" keypath="quiz.form.title">
				</i18n-t>
			</div>
			
			<i18n-t scope="global" class="description" tag="span" keypath="quiz.form.subtitle">
			</i18n-t>

			<ClearButton @click="close()" />
		</div>

		<div class="content" ref="content">
			<div class="createForm">
				<template v-if="!showQuizTypeForm">
					<TTButton class="addBt"
					v-if="$store.auth.isPremium || $store.quiz.quizList.length < $config.MAX_QUIZ"
					@click="showQuizTypeForm = true" icon="add">{{ $t("quiz.form.add_bt") }}</TTButton>
	
					<div class="card-item secondary" v-else-if="$store.auth.isPremium && $store.quiz.quizList.length > $config.MAX_QUIZ_PREMIUM">{{ $t("quiz.form.premium_limit") }}</div>
	
					<div class="premium" v-else>
						<div>{{ $t("quiz.form.non_premium_limit", {MAX:$config.MAX_QUIZ_PREMIUM}) }}</div>
						<TTButton icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</TTButton>
					</div>
				</template>

				<template v-if="showQuizTypeForm">
					<TTButton class="addBt"
					@click="showQuizTypeForm = false" icon="back">{{ $t("global.back") }}</TTButton>
		
					<div class="modeSelector">
						<div class="card-item">
							<div class="header">
								<icon class="normalSize" name="quiz_classic" />
								<span class="title">{{ $t("quiz.form.mode_classic.title") }}</span>
							</div>
							<div class="body">
								<div class="content">{{ $t("quiz.form.mode_classic.description") }}</div>
								<TTButton @click="addQuiz('classic')" icon="add" primary>{{ $t("quiz.form.createBt") }}</TTButton>
							</div>
						</div>
						<div class="card-item">
							<div class="header">
								<icon class="normalSize" name="quiz_freeAnswer" />
								<span class="title">{{ $t("quiz.form.mode_freeAnswer.title") }}</span>
							</div>
							<div class="body">
								<div class="content">{{ $t("quiz.form.mode_freeAnswer.description") }}</div>
								<TTButton @click="addQuiz('freeAnswer')" icon="add" primary>{{ $t("quiz.form.createBt") }}</TTButton>
							</div>
						</div>
						<div class="card-item">
							<div class="header">
								<icon class="normalSize" name="quiz_majority" />
								<span class="title">{{ $t("quiz.form.mode_majority.title") }}</span>
							</div>
							<div class="body">
								<div class="content">{{ $t("quiz.form.mode_majority.description") }}</div>
								<TTButton @click="addQuiz('majority')" icon="add" primary>{{ $t("quiz.form.createBt") }}</TTButton>
							</div>
						</div>
					</div>
				</template>
			</div>
			

			<VueDraggable v-if="!showQuizTypeForm" class="quizList"
			v-model="$store.quiz.quizList"
			:group="{name:'quiz'}"
			handle=".header"
			animation="250">
				<ToggleBlock v-for="quiz in $store.quiz.quizList"
				editableTitle
				v-model:title="quiz.title"
				:titleDefault="$t('quiz.form.default_title')"
				:titleMaxLengh="30"
				:open="autoOpenID === quiz.id"
				:key="quiz.id"
				@update:title="save(quiz)">

					<template #left_actions>
						<ToggleButton small v-model="quiz.enabled" @click.native.stop @change="save(quiz)" v-if="$store.auth.isPremium || quiz.enabled || $store.quiz.quizList.filter(v=>v.enabled).length < $config.MAX_QUIZ" />
						<icon class="modeIcon" :name="`quiz_${quiz.mode}`" v-tooltip="$t('quiz.form.mode_'+quiz.mode+'.title')" />
					</template>

					<template #right_actions>
						<TTButton @click.stop="duplicateQuiz(quiz.id)" icon="copy" v-tooltip="$t('global.duplicate')" v-if="!maxQuizReached" />
						<TTButton @click.stop :copy="quiz.id" icon="id" v-tooltip="$t('global.copy_id')" />
						<TTButton @click.stop="$store.quiz.removeQuiz(quiz.id)" icon="trash" alert />
					</template>

					<div class="form">
						<div class="card-item install">
							<label><Icon name="obs" />{{$t('quiz.form.install_title')}}</label>
							<OverlayInstaller type="quiz" :sourceSuffix="quiz.title" :id="quiz.id" :queryParams="{bid:quiz.id}" />
						</div>

						<ParamItem :paramData="param_duration[quiz.id]" v-model="quiz.durationPerQuestion_s" @change="save(quiz)" />
						<ParamItem :paramData="param_looseOnFail[quiz.id]" v-model="quiz.loosePointsOnFail" @change="save(quiz)" />
						<ParamItem :paramData="param_timeBasedScore[quiz.id]" v-model="quiz.timeBasedScoring" @change="save(quiz)" />
						<ParamItem v-if="quiz.mode == 'freeAnswer'" :paramData="param_tolerance[quiz.id]" v-model="quiz.toleranceLevel" @change="save(quiz)" />
						
						<Splitter><icon name="question" /> {{ $t("quiz.form.questionList") }}</Splitter>
						
						<VueDraggable v-if="!showQuizTypeForm" class="questionList"
						v-model="quiz.questionList"
						:group="{name:'questionList_'+quiz.id}"
						handle=".dragHandle"
						animation="250">
							<div class="card-item" v-for="question in quiz.questionList" :key="question.id">

								<Icon class="dragHandle" name="dragZone" />

								<TTButton @click.stop :copy="question.id" icon="id" v-tooltip="$t('global.copy_id')" class="copyIdBt" small />

								<div class="question">
									<div class="questionHolder">
										<ParamItem :paramData="param_question[question.id]" v-model="question.question" @blur="save(quiz)" noBackground />
										
										<div class="durationOverride" v-tooltip="$t('quiz.form.durationOverride_tt')">
											<TTButton v-if="!durationOverrideState[question.id]"
												icon="countdown"
												tabindex="-1"
												@click="setCustomDuration(quiz.id, question)"
												:primary="question.duration_s && question.duration_s > 0"
												:transparent="!question.duration_s">{{ question.duration_s? question.duration_s+'s' : '' }}</TTButton>
											<span v-else class="durationForm">
												<ContentEditable tag="span"
													v-model="question.duration_s"
													v-autofocus
													:min="5"
													:max="600"
													:contenteditable="true"
													numeric
													@blur="durationOverrideState[question.id] = false" />s
											</span>
										</div>
									</div>
									
									<div class="singleAnswer" v-if="quiz.mode == 'freeAnswer' && isFreeAnswerQuestion(quiz.mode, question)">
										<ParamItem :paramData="param_answer[question.id]" v-model="question.answer" @blur="save(quiz)" noBackground />
										
										<div class="toleranceOverride" v-tooltip="$t('quiz.form.toleranceOverride_tt')">
											<TTButton v-if="isFreeAnswerQuestion(quiz.mode, question)"
												icon="spelling"
												tabindex="-1"
												@click="(e:MouseEvent|TouchEvent) => selectCustomTolerance(e, quiz.id, question)"
												:primary="question.toleranceLevel !== undefined && question.toleranceLevel >= 0"
												:transparent="!question.toleranceLevel">{{ 
													question.toleranceLevel == undefined?
													'' :
													{
														"0": '😠',
														"1": '🧐',
														"2": '🤨',
														"3": '😉',
														"4": '🤪',
														"5": '🤡',
													}[question.toleranceLevel]
												}}</TTButton>
										</div>
									</div>

									<template v-else-if="isClassicOrMajorityQuizQuestion(quiz.mode, question)">
										<ToggleBlock
										:icons="quiz.mode =='classic'? ['quiz_answers'] : ['quiz_answers_wrong']"
										class="answersBlock"
										:subtitle="quiz.mode == 'majority'? $t('quiz.form.answers_majority_subtitle') : ''"
										:title="quiz.mode == 'classic'? $t('quiz.form.answers', {COUNT: question.answerList.length}) : $t('quiz.form.answers_majority', {COUNT: question.answerList.length}	)"
										noTitleColor
										small
										:open="autoOpenID === question.id">
											<div class="answerList">
												<div v-for="answer in question.answerList" class="answer" :key="'answer_'+answer.id">
													<TTButton v-if="isClassicQuizAnswer(quiz.mode, answer)" class="correctToggle"
														@click="tickAnswer(question.answerList, answer)"
														v-tooltip="answer.correct? $t('quiz.form.answer_correct') : $t('quiz.form.answer_wrong')"
														:icon="answer.correct? 'checkmark' : 'cross'"
														:primary="answer.correct"
														:disabled="isClassicQuizAnswer(quiz.mode, answer) && answer.correct && question.answerList.filter(a=> isClassicQuizAnswer(quiz.mode, a) && a.correct).length === 1"
														noBounce />
													<ParamItem :paramData="param_answer[answer.id]" v-model="answer.title" @blur="save(quiz)" noBackground />
													<TTButton v-if="question.answerList.length > 2" class="deleteBt" icon="trash" @click="deleteAnswer(quiz, question.id, answer.id)" alert />
												</div>
												
												<TTButton :sortable="false" :draggable="false" class="addBt" v-if="question.answerList.length < (quiz.mode == 'classic'? 6 : 4)"
													@click="addAnswer(quiz, question.id)"
													primary
													icon="add">{{ $t("quiz.form.addAnswer_bt") }}</TTButton>
											</div>
										</ToggleBlock>
									</template>
								</div>

								<TTButton class="deleteBt"
									v-if="quiz.mode != 'freeAnswer'"
									icon="trash"
									v-tooltip="$t('quiz.form.deleteQuestionbt_tt')"
									@click="deleteQuestion(quiz, question.id)"
									transparent />
							</div>
						</VueDraggable>

						<TTButton @click="addQuestion(quiz)" icon="add" primary>{{ $t("quiz.form.addQuestion_bt") }}</TTButton>

					</div>
				</ToggleBlock>
			</VueDraggable>
		</div>
	</div>
</template>

<script lang="ts">
import AbstractSidePanel from '@/components/AbstractSidePanel';
import Checkbox from '@/components/Checkbox.vue';
import ClearButton from '@/components/ClearButton.vue';
import ContentEditable from '@/components/ContentEditable.vue';
import OverlayInstaller from '@/components/params/contents/overlays/OverlayInstaller.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import Splitter from '@/components/Splitter.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import ContextMenu, { type MenuOptions } from "@imengyu/vue3-context-menu";
import { VueDraggable } from 'vue-draggable-plus';
import { Component, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		Splitter,
		Checkbox,
		ParamItem,
		ClearButton,
		ToggleBlock,
		ToggleButton,
		VueDraggable,
		ContentEditable,
		OverlayInstaller,
	},
	emits:[],
})
class QuizForm extends AbstractSidePanel {

	public param_duration: Record<string, TwitchatDataTypes.ParameterData<number>> = {}
	public param_timeBasedScore: Record<string, TwitchatDataTypes.ParameterData<boolean>> = {}
	public param_looseOnFail: Record<string, TwitchatDataTypes.ParameterData<boolean>> = {}
	public param_tolerance: Record<string, TwitchatDataTypes.ParameterData<number>> = {}
	public param_question: Record<string, TwitchatDataTypes.ParameterData<string>> = {}
	public param_answer: Record<string, TwitchatDataTypes.ParameterData<string>> = {}
	public param_answerDuration: Record<string, TwitchatDataTypes.ParameterData<number>> = {}
	public durationOverrideState: Record<string, boolean> = {}
	public toleranceOverrideState: Record<string, boolean> = {}

	public showQuizTypeForm:boolean = false;
	public autoOpenID:string|null = null;

	public get maxQuizReached():boolean {
		if(this.$store.auth.isPremium) {
			return this.$store.quiz.quizList.length >= this.$config.MAX_QUIZ_PREMIUM;
		}else{
			return this.$store.quiz.quizList.length >= this.$config.MAX_QUIZ;
		}
	}

	public async beforeMount():Promise<void> {
		this.initParams();
	}

	public mounted():void {
		super.open();
	}

	/**
	 * Save data to storage
	 */
	public save(quiz:TwitchatDataTypes.QuizParams):void {
		this.$store.quiz.saveData(quiz.id);
	}

	/**
	 * Create a new quiz
	 */
	public addQuiz(type: TwitchatDataTypes.QuizParams["mode"]):void {
		const quiz = this.$store.quiz.addQuiz(type);
		this.autoOpenID = quiz.id;
		this.initParams();
		this.showQuizTypeForm = false;
	}

	/**
	 * Duplicate given quiz ID
		*/
	public duplicateQuiz(id:string):void {
		const quiz = this.$store.quiz.duplicateQuiz(id)
		this.autoOpenID = quiz?.id ?? null;
		this.initParams();
	}

	/**
	 * Opens the premium section
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Adds a question to given quiz
	 */
	public addQuestion(quiz:TwitchatDataTypes.QuizParams):void {
		if(quiz.mode == "classic") {
			const question:TwitchatDataTypes.QuizParams<"classic">["questionList"][number] = {
				id: Utils.getUUID(),
				question: "",
				answerList: [
					{id:Utils.getUUID(), title:"", correct:true},
					{id:Utils.getUUID(), title:""},
				],
			};
			this.autoOpenID = question.id;
			quiz.questionList.push(question);

		}else if(quiz.mode == "majority") {
			const question:TwitchatDataTypes.QuizParams<"majority">["questionList"][number] = {
				id: Utils.getUUID(),
				question: "",
				answerList: [
					{id:Utils.getUUID(), title:""},
					{id:Utils.getUUID(), title:""},
				],
			};
			this.autoOpenID = question.id;
			quiz.questionList.push(question);

		}else if(quiz.mode == "freeAnswer") {
			const question:TwitchatDataTypes.QuizParams<"freeAnswer">["questionList"][number] = {
				id: Utils.getUUID(),
				question: "",
				answer:"",
			};
			this.autoOpenID = question.id;
			quiz.questionList.push(question);
		}
		this.initParams();
		this.save(quiz);
	}

	public deleteQuestion(quiz:TwitchatDataTypes.QuizParams<"classic"|"majority">, questionId:string):void {
		quiz.questionList = quiz.questionList.filter(v=>v.id != questionId);
		this.initParams();
		this.save(quiz);
	}

	/**
	 * Adds an answer to given question of given quiz
	 * @param quiz 
	 * @param questionId 
	 */
	public addAnswer(quiz:TwitchatDataTypes.QuizParams, questionId:string):void {
		const question = quiz.questionList.find(v=>v.id == questionId);
		if(!question) return;

		if(quiz.mode == "classic") {
			const typedQuestion = question as TwitchatDataTypes.QuizParams<"classic">["questionList"][number];
			typedQuestion.answerList.push({id:Utils.getUUID(), title:""});
		}else{
			const typedQuestion = question as TwitchatDataTypes.QuizParams<"majority">["questionList"][number];
			typedQuestion.answerList.push({id:Utils.getUUID(), title:""});
		}
		this.initParams();
		this.save(quiz);
	}

	/**
	 * Deletes an answer from given question of given quiz
	 * @param quiz 
	 * @param questionId 
	 * @param answerId 
	 */
	public deleteAnswer(quiz:TwitchatDataTypes.QuizParams, questionId:string, answerId:string):void {
		const question = quiz.questionList.find(v=>v.id == questionId);
		if(!question) return;

		if(quiz.mode == "classic") {
			const typedQuestion = question as TwitchatDataTypes.QuizParams<"classic">["questionList"][number];
			typedQuestion.answerList = typedQuestion.answerList.filter(v=>v.id != answerId);
		}else{
			const typedQuestion = question as TwitchatDataTypes.QuizParams<"majority">["questionList"][number];
			typedQuestion.answerList = typedQuestion.answerList.filter(v=>v.id != answerId);
		}
		this.initParams();
		this.save(quiz);
	}

	/**
	 * Check if answer is from a classic quiz
	 */
	public isClassicQuizAnswer(mode: TwitchatDataTypes.QuizParams["mode"], _answer: any): _answer is TwitchatDataTypes.QuizParams<"classic">["questionList"][number]["answerList"][number] {
		return mode === "classic";
	}

	/**
	 * Check if question is from a classic or majority quiz
	 */
	public isClassicOrMajorityQuizQuestion(mode: TwitchatDataTypes.QuizParams["mode"], _question: any): _question is TwitchatDataTypes.QuizParams<"classic"|"majority">["questionList"][number] {
		return mode === "classic" || mode === "majority";
	}

	/**
	 * Check if question is from a free answer quiz
	 */
	public isFreeAnswerQuestion(mode: TwitchatDataTypes.QuizParams["mode"], _question: any): _question is TwitchatDataTypes.QuizParams<"freeAnswer">["questionList"][number] {
		return mode === "freeAnswer";
	}

	/**
	 * Clears custom duration for question or sets it to default value
	 * @param question 
	 */
	public setCustomDuration(quizId:string, question: TwitchatDataTypes.QuizParams["questionList"][number]): void {
		if(question.duration_s) {
			delete question.duration_s;
		} else {
			question.duration_s = 30;
			this.durationOverrideState[question.id] = true;
		}
		this.save(this.$store.quiz.quizList.find(q=> q.id === quizId)!);
	}

	/**
	 * Ticks/Unticks answer correctness
	 * If trying to untick the only correct answer, ignore and keep it ticked
	 * @param answerList 
	 */
	public tickAnswer(answerList: TwitchatDataTypes.QuizParams<"classic">["questionList"][number]["answerList"],
	answer:TwitchatDataTypes.QuizParams<"classic">["questionList"][number]["answerList"][number]): void {
		if(answer.correct) {
			//Untick
			const correctAnswers = answerList.filter(a=> a.correct);
			if(correctAnswers.length > 1) {
				answer.correct = !answer.correct;
			}
		}else{
			answer.correct = !answer.correct;
		}
	}

	/**
	 * Opens custom tolerance selection for free answer question
	 * @param quiz 
	 * @param id 
	 * @param question 
	 */
	public selectCustomTolerance(event: MouseEvent|TouchEvent, quizId:string, question: TwitchatDataTypes.QuizParams<"freeAnswer">["questionList"][number]): void {
		const list:{[key:string]:string} = this.$tm("quiz.form.tolerances") as {[key:string]:string};
		const px = event.type == "touchstart"? (event as TouchEvent).touches[0]!.clientX : (event as MouseEvent).x;
		const py = event.type == "touchstart"? (event as TouchEvent).touches[0]!.clientY : (event as MouseEvent).y;
		const menu:MenuOptions= {
			theme: 'mac '+this.$store.common.theme,
			x:px,
			y:py,
			items: [],
			mouseScroll:true,
			closeWhenScroll:false,
			updownButtonSpaceholder:false,
		}

		let index:0|1|2|3|4|5 = 0;
		for (const key in list) {
			if (!Object.hasOwn(list, key)) continue;
			
			menu.items!.push({
				checked: (key == "undefined" && question.toleranceLevel === undefined) || question.toleranceLevel === index-1,
				label: this.$t("quiz.form.tolerances."+key),
				onClick: ((index)=> {
					return () => {
						if(key == "undefined") {
							delete question.toleranceLevel;
						} else {
							question.toleranceLevel = index -1 as 0|1|2|3|4|5;
						}
					}
				})(index)
			});

			index ++;
		}
		ContextMenu.showContextMenu(menu)
	}

	/**
	 * Create parameters for a quiz entry
	 * @param id
	 */
	private initParams():void {
		const spellingOptions = [
			{value:0, labelKey:"quiz.form.tolerances.none"},
			{value:1, labelKey:"quiz.form.tolerances.very_low"},
			{value:2, labelKey:"quiz.form.tolerances.low"},
			{value:3, labelKey:"quiz.form.tolerances.medium"},
			{value:4, labelKey:"quiz.form.tolerances.high"},
			{value:5, labelKey:"quiz.form.tolerances.very_high"},
		]
		this.$store.quiz.quizList.forEach(quiz=> {
			const id = quiz.id;
			if(!this.param_duration[id])  {
				this.param_duration[id] = {type:"number", value:30, min:5, max:600, labelKey:"quiz.form.param_duration", icon:"countdown"};
				this.param_timeBasedScore[id] = {type:"boolean", value:false, labelKey:"quiz.form.param_time_based_scoring", icon:"timer"};
				this.param_looseOnFail[id] = {type:"boolean", value:true, labelKey:"quiz.form.param_loose_on_fail", icon:"sad"};
			}

			if(quiz.mode == "freeAnswer") {
				if(!this.param_tolerance[id])  {
					this.param_tolerance[id] = {type:"list", value:1, listValues:spellingOptions, labelKey:"quiz.form.param_tolerance", icon:"spelling"};
				}
			}

			quiz.questionList.forEach(question=> {
				const id = question.id;
				if(!this.param_question[id]) {
					this.param_question[id] = {type:"string", value:"", placeholderKey:"quiz.form.question_placeholder"};
					this.param_answerDuration[id] = {type:"number", value:0, labelKey:"quiz.form.param_answer_duration", icon:"timer"};
					this.durationOverrideState[id] = false;
				}

				if(this.isClassicOrMajorityQuizQuestion(quiz.mode, question)) {
					question.answerList.forEach(answer=> {
						const id = answer.id;
						if(!this.param_answer[id]) {
							this.param_answer[id] = {type:"string", value:"", placeholderKey:"quiz.form.answer_placeholder"};
						}
					});
				}

				if(this.isFreeAnswerQuestion(quiz.mode, question)) {
					const id = question.id;
					if(!this.param_answer[id]) {
						this.param_answer[id] = {type:"string", value:"", placeholderKey:"quiz.form.answer_placeholder"};
					}
				}
			});

		});
	}
}
export default toNative(QuizForm);
</script>

<style scoped lang="less">
.quizform{

	.modeSelector {
		gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		.card-item {
			flex-grow: 1;
			flex-basis: calc(50% - 1em);
			min-width: 195px;
			display: flex;
			flex-direction: column;
			.body {
				gap: 1em;
				display: flex;
				flex-direction: column;
				line-height: 1.25em;
				flex: 1;
	
				.content {
					flex: 1;
					white-space: pre-line;
				}
			}
		}
	}

	.form {
		gap: .5em;
	}

	.createForm {
		text-align: center;
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.premium {
			background-color: var(--color-premium);
			border-radius: var(--border-radius);
			padding: .5em;
			.button {
				margin-top: .5em;
			}
		}
	}

	.quizList {
		gap: .5em;
		display: flex;
		flex-direction: column;

		.splitter {
			margin: 1em 0;
			.icon {
				height: 1em;
				margin-right: .25em;
				vertical-align: middle;
			}
		}

		.modeIcon {
			height: 1.5em;
			max-width: 2em;
			margin-left: .5em;
		}

		.questionList {
			gap: .5em;
			display: flex;
			flex-direction: column;
			.card-item {
				gap: .5em;
				display: flex;
				flex-direction: row;
				align-items: flex-start;
				position: relative;
				overflow: visible;

				&>.dragHandle {
					flex-shrink: 0;
					padding: .25em;
					width: 1em;
					cursor: grab;
				}
				&>.deleteBt {
					flex-shrink: 0;
					height: 100%;
				}

				.copyIdBt {
					position: absolute;
					top: -.5em;
					left: -.5em;
					z-index: 1;
					border-radius: var(--border-radius);
					opacity: 0;
				}

				&:hover {
					background-color: var(--background-color-secondary);
					.copyIdBt {
						opacity: 1;
					}
				}
			}
			.question {
				gap: .5em;
				display: flex;
				flex-direction: column;
				flex: 1;

				.questionHolder {
					display: flex;
					flex-direction: row;
					align-items: stretch;
					background-color: var(--background-color-fader);
					border-radius: var(--border-radius);

					.paramitem {
						flex-grow: 1;
						::v-deep(input),
						::v-deep(textarea) {
							background: transparent;
						}
					}

					.durationOverride {
						display: flex;
						.button {
							height: 100%;
							min-height: 100%;
							padding-left: .5em;
							padding-right: .5em;
							border-top-left-radius: 0;
							border-bottom-left-radius: 0;
							gap: .25em;
							flex-wrap: nowrap;
							flex-shrink: 0;
							::v-deep(.icon) {
								flex-shrink: 0;
							}
							::v-deep(.label) {
								font-size: .7em;
								flex-shrink: 0;
							}
						}
	
						.durationForm {
							margin-top: .1em;
							padding: .25em .5em;
							font-size: .8em;
							align-self: center;
						}
					}
				}

				.answersBlock {
					::v-deep(.header) {
						.title {
							font-size: 1rem;
						}
						&>.icon {
							width: 2em;
							height: 2em;
							flex-shrink: 0;
						}
					}
				}

				.singleAnswer {
					display: flex;
					flex-direction: row;
					align-items: stretch;
					background-color: var(--background-color-fader);
					border-radius: var(--border-radius);

					.paramitem {
						flex-grow: 1;
						::v-deep(input),
						::v-deep(textarea) {
							background: transparent;
						}
					}
					.toleranceOverride {
						.button {
							height: 100%;
							min-height: 100%;
							padding-left: .5em;
							padding-right: .5em;
							border-top-left-radius: 0;
							border-bottom-left-radius: 0;
							gap: .25em;
							flex-wrap: nowrap;
							flex-shrink: 0;
							::v-deep(.icon) {
								flex-shrink: 0;
							}
							::v-deep(.label) {
								// font-size: 1.25em;
								flex-shrink: 0;
							}
						}
					}
				}
				
				.answerList {
					gap: .5em;
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					&>* {
						flex-grow: 1;
						flex-basis: calc(50% - .5em);
						min-width: 170px;
					}
					.answer {
						display: flex;
						position: relative;
						flex-direction: row;
						.correctToggle, .deleteBt {
							flex-shrink: 0;
						}
						&>.paramitem {
							flex-grow: 1;
						}
						&>* {
							border-radius: 0;
							&.paramitem::v-deep(.content) {
								flex-grow: 1;
								.holder {
									flex-grow: 1;
									height: 100%;
									.inputHolder {
										flex-grow: 1;
										height: 100%;
										border-radius: 0;
										textarea, input {
											border-radius: 0;
											flex-grow: 1;
											height: 100%;
											resize: none;
										}
									}
								}
							}
						}
						&>*:first-child {
							border-top-left-radius: var(--border-radius);
							border-bottom-left-radius: var(--border-radius);
							&.paramitem::v-deep(.content) {
								.holder {
									.inputHolder, textarea, input {
										border-top-left-radius: var(--border-radius);
										border-bottom-left-radius: var(--border-radius);
									}
								}
							}
						}
						&>*:last-child {
							border-top-right-radius: var(--border-radius);
							border-bottom-right-radius: var(--border-radius);
							&.paramitem::v-deep(.content) {
								.holder {
									.inputHolder, textarea, input {
										border-top-right-radius: var(--border-radius);
										border-bottom-right-radius: var(--border-radius);
									}
								}
							}
						}

					}
				}
			}
		}
	}

	.install {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		.icon {
			height: 1em;
		}
		label {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
	}
	
}
</style>