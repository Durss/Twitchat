<template>
	<div class="quizform sidePanel" :class="{ embedMode }">
		<div class="head" v-if="embedMode === false">
			<div class="title">
				<Icon name="quiz" />
				<i18n-t scope="global" tag="h1" keypath="quiz.form.title"> </i18n-t>
			</div>

			<i18n-t scope="global" class="description" tag="span" keypath="quiz.form.subtitle">
			</i18n-t>

			<ClearButton @click="close()" />
		</div>

		<div class="content" ref="content">
			<div class="overlayInstallCard">
				<h1><Icon name="obs" />{{ $t("quiz.form.install_title") }}</h1>
				<OverlayInstaller type="quiz" sourceSuffix="Twitchat_Quiz" />
			</div>

			<VueDraggable
				class="quizList"
				v-model="$store.quiz.quizList"
				:group="{ name: 'quiz' }"
				handle=".header"
				animation="250"
			>
				<ToggleBlock
					v-for="quiz in $store.quiz.quizList"
					editableTitle
					v-model:title="quiz.title"
					:titleDefault="$t('quiz.form.default_title')"
					:titleMaxLengh="30"
					:open="autoOpenQuizID === quiz.id"
					:key="quiz.id"
					@update:title="save(quiz)"
				>
					<template #left_actions>
						<ToggleButton
							small
							v-model="quiz.enabled"
							@click.native.stop
							@change="save(quiz)"
							:disabled="!$store.auth.isPremium && $store.quiz.quizList.length > 1"
						/>
					</template>

					<template #right_actions>
						<TTButton
							@click.stop="duplicateQuiz(quiz.id)"
							data-close-popout
							icon="copy"
							v-tooltip="$t('global.duplicate')"
							v-if="!maxQuizReached"
						/>
						<TTButton
							@click.stop
							:copy="quiz.id"
							icon="id"
							v-tooltip="$t('global.copy_id')"
						/>
						<TTButton
							@click.stop="$store.quiz.removeQuiz(quiz.id)"
							icon="trash"
							alert
						/>
					</template>

					<div class="form">
						<ToggleBlock
							:icons="['params']"
							small
							:title="$t('global.settings')"
							:open="false"
						>
							<div class="settings">
								<ParamItem
									:paramData="param_duration[quiz.id]"
									v-model="quiz.durationPerQuestion_s"
									@change="save(quiz)"
								/>
								<ParamItem
									:paramData="param_looseOnFail[quiz.id]"
									v-model="quiz.loosePointsOnFail"
									@change="save(quiz)"
								/>
								<ParamItem
									:paramData="param_timeBasedScore[quiz.id]"
									v-model="quiz.timeBasedScoring"
									@change="save(quiz)"
								/>
								<ParamItem
									:paramData="param_tolerance[quiz.id]"
									v-model="quiz.toleranceLevel"
									@change="save(quiz)"
									class="toleranceParam"
								/>
							</div>
						</ToggleBlock>

						<QuizQuestionList :quiz="quiz" />
					</div>
				</ToggleBlock>
			</VueDraggable>

			<div class="createForm">
				<TTButton
					class="addBt"
					v-if="$store.auth.isPremium || $store.quiz.quizList.length < $config.MAX_QUIZ"
					@click="addQuiz()"
					icon="add"
					>{{ $t("quiz.form.add_bt") }}</TTButton
				>

				<PremiumLimitMessage
					v-else
					label="quiz.form.non_premium_limit"
					premiumLabel="quiz.form.premium_limit"
					:max="$config.MAX_QUIZ"
					:maxPremium="$config.MAX_QUIZ_PREMIUM"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import AbstractSidePanel from "@/components/AbstractSidePanel";
import ClearButton from "@/components/ClearButton.vue";
import OverlayInstaller from "@/components/params/contents/overlays/OverlayInstaller.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import PremiumLimitMessage from "@/components/params/PremiumLimitMessage.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import TTButton from "@/components/TTButton.vue";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { VueDraggable } from "vue-draggable-plus";
import { Component, Prop, toNative } from "vue-facing-decorator";
import QuizQuestionList from "./QuizQuestionList.vue";

@Component({
	components: {
		TTButton,
		ParamItem,
		ClearButton,
		ToggleBlock,
		ToggleButton,
		VueDraggable,
		OverlayInstaller,
		PremiumLimitMessage,
		QuizQuestionList,
	},
	emits: [],
})
class QuizForm extends AbstractSidePanel {
	@Prop({ type: Boolean, default: false })
	public embedMode!: boolean;

	public param_duration: Record<string, TwitchatDataTypes.ParameterData<number>> = {};
	public param_timeBasedScore: Record<string, TwitchatDataTypes.ParameterData<boolean>> = {};
	public param_looseOnFail: Record<string, TwitchatDataTypes.ParameterData<boolean>> = {};
	public param_tolerance: Record<string, TwitchatDataTypes.ParameterData<number>> = {};

	public autoOpenQuizID: string | null = null;

	public get maxQuizReached(): boolean {
		if (this.$store.auth.isPremium) {
			return this.$store.quiz.quizList.length >= this.$config.MAX_QUIZ_PREMIUM;
		} else {
			return this.$store.quiz.quizList.length >= this.$config.MAX_QUIZ;
		}
	}

	public async beforeMount(): Promise<void> {
		this.initParams();
		if (
			!this.$store.auth.isPremium &&
			this.$store.quiz.quizList.filter((v) => v.enabled).length === 0
		) {
			this.$store.quiz.quizList[0]!.enabled = true;
			console.log("OKOKO");
		}
	}

	public mounted(): void {
		if (this.embedMode == false) {
			super.open();
		}
	}

	/**
	 * Save data to storage
	 */
	public save(quiz: TwitchatDataTypes.QuizParams): void {
		this.$store.quiz.saveData(quiz.id);
	}

	/**
	 * Create a new quiz
	 */
	public addQuiz(): void {
		const quiz = this.$store.quiz.addQuiz();
		this.autoOpenQuizID = quiz.id;
		this.initParams();
	}

	/**
	 * Duplicate given quiz ID
	 */
	public duplicateQuiz(id: string): void {
		const quiz = this.$store.quiz.duplicateQuiz(id);
		this.autoOpenQuizID = quiz?.id ?? null;
		this.initParams();
	}

	/**
	 * Opens the premium section
	 */
	public openPremium(): void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Initialize quiz-level parameters
	 */
	private initParams(): void {
		const spellingOptions = [
			{ value: 0, labelKey: "quiz.form.tolerances.none" },
			{ value: 1, labelKey: "quiz.form.tolerances.very_low" },
			{ value: 2, labelKey: "quiz.form.tolerances.low" },
			{ value: 3, labelKey: "quiz.form.tolerances.medium" },
			{ value: 4, labelKey: "quiz.form.tolerances.high" },
			{ value: 5, labelKey: "quiz.form.tolerances.very_high" },
		];
		this.$store.quiz.quizList.forEach((quiz) => {
			const id = quiz.id;
			if (!this.param_duration[id]) {
				this.param_duration[id] = {
					type: "number",
					value: 30,
					min: 5,
					max: 600,
					labelKey: "quiz.form.param_duration",
					icon: "countdown",
				};
				this.param_timeBasedScore[id] = {
					type: "boolean",
					value: false,
					labelKey: "quiz.form.param_time_based_scoring",
					icon: "timer",
				};
				this.param_looseOnFail[id] = {
					type: "boolean",
					value: true,
					labelKey: "quiz.form.param_loose_on_fail",
					icon: "sad",
				};
			}

			if (!this.param_tolerance[id]) {
				this.param_tolerance[id] = {
					type: "list",
					value: 1,
					listValues: spellingOptions,
					labelKey: "quiz.form.param_tolerance",
					icon: "spelling",
				};
			}
		});
	}
}
export default toNative(QuizForm);
</script>

<style scoped lang="less">
.quizform {
	.form {
		gap: 0.5em;
	}

	.settings {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
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
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
