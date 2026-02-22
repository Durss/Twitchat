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
				<TTButton class="addBt"
				v-if="$store.auth.isPremium || $store.quiz.quizList.length < $config.MAX_QUIZ"
				@click="addQuiz()" icon="add">{{ $t("quiz.form.add_bt") }}</TTButton>

				<PremiumLimitMessage v-else
					label="quiz.form.non_premium_limit"
					premiumLabel="quiz.form.premium_limit"
					:max="$config.MAX_QUIZ"
					:maxPremium="$config.MAX_QUIZ_PREMIUM" />
			</div>
			
			<VueDraggable class="quizList"
			v-model="$store.quiz.quizList"
			:group="{name:'quiz'}"
			handle=".header"
			animation="250">
				<ToggleBlock v-for="quiz in $store.quiz.quizList"
				editableTitle
				v-model:title="quiz.title"
				:titleDefault="$t('quiz.form.default_title')"
				:titleMaxLengh="30"
				:open="autoOpenQuizID === quiz.id"
				:key="quiz.id"
				@update:title="save(quiz)">

					<template #left_actions>
						<ToggleButton small v-model="quiz.enabled" @click.native.stop @change="save(quiz)" :disabled="!$store.auth.isPremium && $store.quiz.quizList.length > 1" />
					</template>

					<template #right_actions>
						<TTButton @click.stop="duplicateQuiz(quiz.id)" data-close-popout icon="copy" v-tooltip="$t('global.duplicate')" v-if="!maxQuizReached" />
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
						<ParamItem :paramData="param_tolerance[quiz.id]" v-model="quiz.toleranceLevel" @change="save(quiz)" class="toleranceParam" />
						
						<Splitter><icon name="question" /> {{ $t("quiz.form.questionList") }}</Splitter>

						<div class="noQuestion" v-if="quiz.questionList.length === 0">{{ $t("quiz.form.no_question") }}</div>

						<SearchForm v-if="quiz.questionList.length > 0" v-model="searches[quiz.id]" :debounceDelay="0" noAutoFocus />

						<VueDraggable class="questionList"
						v-model="quiz.questionList"
						:group="{name:'questionList_'+quiz.id}"
						handle=".dragHandle"
						animation="250">
							<div class="card-item" v-for="question in filteredQuestions(quiz)" :key="question.id">

								<div class="actions">
									<Icon class="dragHandle" name="dragZone" />

									<div class="innerGroup">
										<TTButton class="modeSelector"
											:icon="`quiz_${question.mode}`"
											transparent
											@click="(e:MouseEvent) => selectQuestionMode(e, quiz, question)"
											v-tooltip="$t('quiz.form.mode_'+question.mode+'.title')" />
										
										<div class="durationOverride" v-tooltip="$t('quiz.form.durationOverride_tt')">
											<TTButton v-if="!durationOverrideState[question.id]"
												icon="countdown"
												tabindex="-1"
												@click="setCustomDuration(quiz.id, question)"
												:secondary="question.duration_s && question.duration_s > 0"
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
	
										<div class="toleranceOverride" v-if="question.mode == 'freeAnswer'" v-tooltip="$t('quiz.form.toleranceOverride_tt')">
											<TTButton
											icon="spelling"
											tabindex="-1"
											@click="(e:MouseEvent|TouchEvent) => selectCustomTolerance(e, quiz.id, question)"
											:secondary="question.toleranceLevel !== undefined && question.toleranceLevel >= 0"
											:transparent="question.toleranceLevel === undefined || question.toleranceLevel < 0">{{ 
												question.toleranceLevel == undefined?
												'' :
												{
													"0": $t('quiz.form.tolerances.none').split(' ')[0],
													"1": $t('quiz.form.tolerances.very_low').split(' ')[0],
													"2": $t('quiz.form.tolerances.low').split(' ')[0],
													"3": $t('quiz.form.tolerances.medium').split(' ')[0],
													"4": $t('quiz.form.tolerances.high').split(' ')[0],
													"5": $t('quiz.form.tolerances.very_high').split(' ')[0],
												}[question.toleranceLevel]
											}}</TTButton>
										</div>
									</div>
										
									<TTButton class="deleteBt"
										icon="trash"
										alert
										v-tooltip="$t('quiz.form.deleteQuestionbt_tt')"
										@click="deleteQuestion(quiz, question.id)" />
								</div>

								<TTButton @click.stop :copy="question.id" icon="id" v-tooltip="$t('global.copy_id')" class="copyIdBt" small />
								
								<div class="question">
									<div class="questionHolder">
										<ParamItem :paramData="param_question[question.id]" v-model="question.question" @blur="save(quiz)" noBackground :autofocus="autoOpenQuestionID === question.id" />
									</div>
									
									<div class="singleAnswer" v-if="question.mode == 'freeAnswer'">
										<ParamItem :paramData="param_answer[question.id]" v-model="question.answer" @blur="save(quiz)" noBackground />
									</div>

									<template v-else>
										<ToggleBlock
										:icons="question.mode =='classic'? ['quiz_answers'] : ['quiz_answers_wrong']"
										class="answersBlock"
										:subtitle="question.mode == 'majority'? $t('quiz.form.answers_majority_subtitle') : ''"
										:title="question.mode == 'classic'? $t('quiz.form.answers', {COUNT: question.answerList.length}) : $t('quiz.form.answers_majority', {COUNT: question.answerList.length}	)"
										noTitleColor
										small
										:open="autoOpenQuestionID === question.id">
											<div class="answerList">
												<div v-for="answer in question.answerList" class="answer" :key="'answer_'+answer.id">
													<TTButton v-if="$utils.isClassicQuizAnswer(question.mode, answer)" class="correctToggle"
														@click="tickAnswer(question.answerList, answer)"
														v-tooltip="answer.correct? $t('quiz.form.answer_correct') : $t('quiz.form.answer_wrong')"
														:icon="answer.correct? 'checkmark' : 'cross'"
														:primary="answer.correct"
														:disabled="$utils.isClassicQuizAnswer(question.mode, answer) && answer.correct && question.answerList.filter(a=> $utils.isClassicQuizAnswer(question.mode, a) && a.correct).length === 1"
														noBounce />
													<ParamItem :paramData="param_answer[answer.id]" v-model="answer.title" @blur="save(quiz)" noBackground />
													<TTButton v-if="question.answerList.length > 2" class="deleteBt" icon="trash" @click="deleteAnswer(quiz, question.id, answer.id)" alert />
												</div>
												
												<TTButton :sortable="false" :draggable="false" class="addBt"
													v-if="question.answerList.length < (question.mode == 'classic'? 6 : 4)"
													@click="addAnswer(quiz, question.id)"
													primary
													icon="add">{{ $t("quiz.form.addAnswer_bt") }}</TTButton>
											</div>
										</ToggleBlock>
									</template>
								</div>
							</div>
						</VueDraggable>

						<div class="card-item addQuestionBtns" v-if="quiz.questionList.length < maxQuestionCount">
							<div>{{ $t("quiz.form.add_question_title") }}</div>
							<div class="importForm">
								<TTButton icon="download" type="file" accept=".csv" @update:file="(file:File) => onCSVImport(quiz, file)">{{ $t("quiz.form.import_bt") }}</TTButton>
								<Icon class="icon" name="info" v-tooltip="$t('quiz.form.import_tt')" />
							</div>
							<TTButton @click="addQuestion(quiz, 'classic')" icon="quiz_classic" primary v-tooltip="$t('quiz.form.mode_classic.description')">{{ $t("quiz.form.mode_classic.title") }}</TTButton>
							<TTButton @click="addQuestion(quiz, 'freeAnswer')" icon="quiz_freeAnswer" primary v-tooltip="$t('quiz.form.mode_freeAnswer.description')">{{ $t("quiz.form.mode_freeAnswer.title") }}</TTButton>
							<TTButton @click="addQuestion(quiz, 'majority')" icon="quiz_majority" primary v-tooltip="$t('quiz.form.mode_majority.description')">{{ $t("quiz.form.mode_majority.title") }}</TTButton>
						</div>
						
						<PremiumLimitMessage v-else
							label="quiz.form.nonpremium_question_limit"
							premiumLabel="quiz.form.premium_question_limit"
							:max="$config.MAX_QUESTIONS_PER_QUIZ"
							:maxPremium="$config.MAX_QUESTIONS_PER_QUIZ_PREMIUM" />

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
import SearchForm from '@/components/params/contents/SearchForm.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import PremiumLimitMessage from '@/components/params/PremiumLimitMessage.vue';
import Splitter from '@/components/Splitter.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import ContextMenu, { type MenuOptions } from "@imengyu/vue3-context-menu";
import { h, type RendererElement, type RendererNode, type VNode } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { Component, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		Splitter,
		Checkbox,
		ParamItem,
		SearchForm,
		ClearButton,
		ToggleBlock,
		ToggleButton,
		VueDraggable,
		ContentEditable,
		OverlayInstaller,
		PremiumLimitMessage,
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
	public searches: Record<string, string> = {};

	public autoOpenQuizID:string|null = null;
	public autoOpenQuestionID:string|null = null;

	public get maxQuizReached():boolean {
		if(this.$store.auth.isPremium) {
			return this.$store.quiz.quizList.length >= this.$config.MAX_QUIZ_PREMIUM;
		}else{
			return this.$store.quiz.quizList.length >= this.$config.MAX_QUIZ;
		}
	}

	public get maxQuestionCount():number {
		return this.$store.auth.isPremium ? this.$config.MAX_QUESTIONS_PER_QUIZ_PREMIUM : this.$config.MAX_QUESTIONS_PER_QUIZ;
	}

	/**
	 * Returns questions filtered by the current search query for a given quiz
	 */
	public filteredQuestions(quiz:TwitchatDataTypes.QuizParams):TwitchatDataTypes.QuizParams["questionList"] {
		const search = (this.searches[quiz.id] || "").trim().toLowerCase();
		if(!search) return quiz.questionList;
		return quiz.questionList.filter(q => {
			if(q.question.toLowerCase().includes(search)) return true;
			if(q.mode === "freeAnswer") {
				return (q.answer || "").toLowerCase().includes(search);
			} else {
				return q.answerList.some(a => a.title.toLowerCase().includes(search));
			}
		}) as TwitchatDataTypes.QuizParams["questionList"];
	}

	public async beforeMount():Promise<void> {
		this.initParams();
		if(!this.$store.auth.isPremium && this.$store.quiz.quizList.filter(v=>v.enabled).length === 0) {
			this.$store.quiz.quizList[0]!.enabled = true;
			console.log("OKOKO")
		}
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
	public addQuiz():void {
		const quiz = this.$store.quiz.addQuiz();
		this.autoOpenQuizID = quiz.id;
		this.initParams();
	}

	/**
	 * Duplicate given quiz ID
		*/
	public duplicateQuiz(id:string):void {
		const quiz = this.$store.quiz.duplicateQuiz(id)
		this.autoOpenQuizID = quiz?.id ?? null;
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
	public addQuestion(quiz:TwitchatDataTypes.QuizParams, mode:"classic"|"majority"|"freeAnswer"):void {
		if(mode == "classic") {
			const question:TwitchatDataTypes.QuizParams["questionList"][number] = {
				id: Utils.getUUID(),
				mode: "classic",
				question: "",
				answerList: [
					{id:Utils.getUUID(), title:"", correct:true},
					{id:Utils.getUUID(), title:""},
				],
			};
			this.autoOpenQuestionID = question.id;
			quiz.questionList.push(question);

		}else if(mode == "majority") {
			const question:TwitchatDataTypes.QuizParams["questionList"][number] = {
				id: Utils.getUUID(),
				mode: "majority",
				question: "",
				answerList: [
					{id:Utils.getUUID(), title:""},
					{id:Utils.getUUID(), title:""},
				],
			};
			this.autoOpenQuestionID = question.id;
			quiz.questionList.push(question);

		}else if(mode == "freeAnswer") {
			const question:TwitchatDataTypes.QuizParams["questionList"][number] = {
				id: Utils.getUUID(),
				mode: "freeAnswer",
				question: "",
				answer:"",
			};
			this.autoOpenQuestionID = question.id;
			quiz.questionList.push(question);
		}
		this.initParams();
		this.save(quiz);
	}

	public deleteQuestion(quiz:TwitchatDataTypes.QuizParams, questionId:string):void {
		quiz.questionList = quiz.questionList.filter(v=>v.id != questionId) as typeof quiz.questionList;
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
		if(!question || question.mode === "freeAnswer") return;

		question.answerList.push({id:Utils.getUUID(), title:""});
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
		if(!question || question.mode === "freeAnswer") return;

		question.answerList = question.answerList.filter(v=>v.id != answerId);
		this.initParams();
		this.save(quiz);
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
	public tickAnswer(answerList: Extract<TwitchatDataTypes.QuizParams["questionList"][number], {mode: "classic"}>["answerList"],
	answer:Extract<TwitchatDataTypes.QuizParams["questionList"][number], {mode: "classic"}>["answerList"][number]): void {
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
	public selectCustomTolerance(event: MouseEvent|TouchEvent, quizId:string, question: Extract<TwitchatDataTypes.QuizParams["questionList"][number], {mode: "freeAnswer"}>): void {
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
				customClass: (key == "undefined" && question.toleranceLevel === undefined) || question.toleranceLevel === index-1? 'selected' : '',
				label: this.$t("quiz.form.tolerances."+key),
				preserveIconWidth: false,
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
	 * Opens a context menu to select the question mode
	 * @param event 
	 * @param quiz 
	 * @param question 
	 */
	public selectQuestionMode(event: MouseEvent, quiz:TwitchatDataTypes.QuizParams, question: TwitchatDataTypes.QuizParams["questionList"][number]):void {
		const menu:MenuOptions = {
			theme: 'mac '+this.$store.common.theme,
			x: event.x,
			y: event.y,
			items: [
				{ icon:this.getIcon("icons/quiz_classic.svg"), customClass: question.mode === "classic"? 'selected': '', label: this.$t("quiz.form.mode_classic.title"), onClick: () => this.changeQuestionMode(quiz, question, "classic") },
				{ icon:this.getIcon("icons/quiz_freeAnswer.svg"), customClass: question.mode === "freeAnswer"? 'selected': '', label: this.$t("quiz.form.mode_freeAnswer.title"), onClick: () => this.changeQuestionMode(quiz, question, "freeAnswer") },
				{ icon:this.getIcon("icons/quiz_majority.svg"), customClass: question.mode === "majority"? 'selected': '', label: this.$t("quiz.form.mode_majority.title"), onClick: () => this.changeQuestionMode(quiz, question, "majority") },
			],
			mouseScroll:true,
			closeWhenScroll:false,
			updownButtonSpaceholder:false,
		}
		ContextMenu.showContextMenu(menu);
	}

	private getIcon(icon:string):VNode<RendererNode, RendererElement> {
		const image = this.$store.asset;
		return h('img', {
			src: image(icon),
			style: {
			width: '1em',
			height: '1em',
			}
		})
	}

	/**
	 * Changes the mode of a question, resetting mode-specific data
	 * @param quiz 
	 * @param question 
	 * @param newMode 
	 */
	public changeQuestionMode(quiz:TwitchatDataTypes.QuizParams, question: TwitchatDataTypes.QuizParams["questionList"][number], newMode: "classic"|"majority"|"freeAnswer"):void {
		if(question.mode === newMode) return;
		const index = quiz.questionList.findIndex(q => q.id === question.id);
		if(index === -1) return;

		const hasAnswerList = question.mode === "classic" || question.mode === "majority";

		let newQuestion: TwitchatDataTypes.QuizParams["questionList"][number];
		if(newMode === "classic") {
			const answerList = hasAnswerList
				? question.answerList.map(a => ({ id: a.id, title: a.title, correct: false }))
				: [{id:Utils.getUUID(), title:"", correct:true}, {id:Utils.getUUID(), title:"", correct:false}];
			newQuestion = { id: question.id, mode: "classic", question: question.question, duration_s: question.duration_s, answerList };
		}else if(newMode === "majority") {
			const answerList = hasAnswerList
				? question.answerList.map(a => ({ id: a.id, title: a.title }))
				: [{id:Utils.getUUID(), title:""}, {id:Utils.getUUID(), title:""}];
			newQuestion = { id: question.id, mode: "majority", question: question.question, duration_s: question.duration_s, answerList };
		}else{
			newQuestion = { id: question.id, mode: "freeAnswer", question: question.question, duration_s: question.duration_s, answer: "" };
		}
		quiz.questionList.splice(index, 1, newQuestion);
		this.initParams();
		this.save(quiz);
	}

	/**
	 * Called when importing a CSV file
	 * @param file 
	 */
	public onCSVImport(quiz: TwitchatDataTypes.QuizParams, file: File):void {
		if(file.type != "text/csv" && !file.name.endsWith(".csv")) {
			this.$store.common.alert(this.$t("quiz.form.import_invalid_file"));
			return;
		}
		
		file.text().then(content=> {
			const questions = content.split("\n").map(line=> line.split(";")).filter(line=> line.length > 0);
			questions.forEach(line=> {
				const questionText = line[0]!.trim();
				if(!questionText) return;
				const answersText = line.slice(1).filter(a => a.trim());

				if(answersText.length === 1) {
					// 2 columns: question + answer → freeAnswer
					quiz.questionList.push({
						id: Utils.getUUID(),
						mode: "freeAnswer",
						question: questionText,
						answer: answersText[0]!.trim(),
					});
				}else if(answersText.length >= 2) {
					// 3+ columns: question + answers → classic (first answer is correct)
					quiz.questionList.push({
						id: Utils.getUUID(),
						mode: "classic",
						question: questionText,
						answerList: answersText.map((a, index) => ({
							id: Utils.getUUID(),
							title: a.trim(),
							correct: index === 0,
						})),
					});
				}
			});
			this.initParams();
			this.save(quiz);
		});
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

			if(!this.param_tolerance[id])  {
				this.param_tolerance[id] = {type:"list", value:1, listValues:spellingOptions, labelKey:"quiz.form.param_tolerance", icon:"spelling"};
			}

			quiz.questionList.forEach(question=> {
				const id = question.id;
				if(!this.param_question[id]) {
					this.param_question[id] = {type:"string", value:"", maxLength:300, placeholderKey:"quiz.form.question_placeholder"};
					this.param_answerDuration[id] = {type:"number", value:0, labelKey:"quiz.form.param_answer_duration", icon:"timer"};
					this.durationOverrideState[id] = false;
				}

				if(question.mode !== "freeAnswer") {
					question.answerList.forEach(answer=> {
						const id = answer.id;
						if(!this.param_answer[id]) {
							this.param_answer[id] = {type:"string", value:"", maxLength:130, placeholderKey:"quiz.form.answer_placeholder"};
						}
					});
				} else {
					const id = question.id;
					if(!this.param_answer[id]) {
						this.param_answer[id] = {type:"string", value:"", maxLength:130, placeholderKey:"quiz.form.answer_placeholder"};
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

	.addQuestionBtns {
		gap: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		&>:first-child {
			flex: 1 1 100%;
			text-align: center;
			font-weight: bold;
		}
		.button {
			min-width: 120px;
		}

		.importForm {
			display: flex;
			flex-direction: row;
			justify-content: center;
			.button {
				flex-wrap: nowrap;
			}

			&>* {
				border-radius: 0;
			}
			&>*:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			&>*:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}

			&>.icon {
				padding: .25em;
				background-color: var(--color-primary);
				height: auto;
				max-width: 1.5em;
			}

			&>.icon:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			&>.icon:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
		}
	}

	.form {
		gap: .5em;
	}

	.toleranceParam {
		:deep(.holder) {
			flex-direction: column;
			select {
				flex-basis: unset;
			}
		}
	}

	.createForm {
		text-align: center;
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
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

		.noQuestion {
			text-align: center;
			font-style: italic;
		}

		.questionList {
			gap: .5em;
			display: flex;
			flex-direction: column;
			.card-item {
				gap: .5em;
				display: flex;
				flex-direction: column;
				position: relative;
				overflow: visible;

				.actions {
					gap: 3px;
					display: flex;
					flex-direction: row;
					align-items: center;
					justify-content: space-between;

					.innerGroup {
						gap: .25em;
						display: flex;
						flex-direction: row;
						align-items: center;
						flex-grow: 1;
						flex-wrap: wrap;
						justify-content: flex-start;
					}

					.dragHandle {
						flex-shrink: 0;
						padding: .25em;
						height: 1.25em;
						cursor: grab;
						margin-right: 1em;
					}
	
					.modeSelector {
						flex-shrink: 0;
						align-self: flex-start;
						:deep(.icon) {
							max-width: 1.25em;
						}
					}

					.durationOverride,
					.toleranceOverride {
						display: flex;
						.button {
							height: 100%;
							min-height: 100%;
							padding-left: .5em;
							padding-right: .5em;
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

						&.toleranceOverride {
							::v-deep(.label) {
								font-size: 1em;
								margin-top: -.5em;
								margin-bottom: -.5em;
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
				
				.deleteBt {
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
						.correctToggle {
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