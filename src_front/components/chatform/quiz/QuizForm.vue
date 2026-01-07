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

				<div class="card-item secondary" v-else-if="$store.auth.isPremium && $store.quiz.quizList.length > $config.MAX_QUIZ_PREMIUM">{{ $t("quiz.form.premium_limit") }}</div>

				<div class="premium" v-else>
					<div>{{ $t("quiz.form.non_premium_limit", {MAX:$config.MAX_QUIZ_PREMIUM}) }}</div>
					<TTButton icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</TTButton>
				</div>
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
				:open="false"
				:key="quiz.id"
				@update:title="save(quiz)">

					<template #left_actions>
						<div class="leftActions">
							<ToggleButton v-model="quiz.enabled" @click.native.stop @change="save(quiz)" v-if="$store.auth.isPremium || quiz.enabled || $store.quiz.quizList.filter(v=>v.enabled).length < $config.MAX_QUIZ" />
						</div>
					</template>

					<template #right_actions>
						<div class="rightActions">
							<TTButton @click.stop="duplicateQuiz(quiz.id)" icon="copy" v-tooltip="$t('global.duplicate')" v-if="!maxQuizReached" />
							<TTButton @click.stop="$store.quiz.removeQuiz(quiz.id)" icon="trash" alert />
						</div>
					</template>

					<div class="form">
						<div class="card-item install">
							<label><Icon name="obs" />{{$t('quiz.form.install_title')}}</label>
							<OverlayInstaller type="quiz" :sourceSuffix="quiz.title" :id="quiz.id" :queryParams="{bid:quiz.id}" />
						</div>

						<ParamItem :paramData="param_duration[quiz.id]" v-model="quiz.durationPerQuestion_s" @change="save(quiz)" />
						<ParamItem :paramData="param_looseOnFail[quiz.id]" v-model="quiz.loosePointsOnFail" @change="save(quiz)" />
						<ParamItem :paramData="param_timeBasedScore[quiz.id]" v-model="quiz.timeBasedScoring" @change="save(quiz)" />
					</div>
				</ToggleBlock>
			</VueDraggable>
		</div>
	</div>
</template>

<script lang="ts">
import AbstractSidePanel from '@/components/AbstractSidePanel';
import ClearButton from '@/components/ClearButton.vue';
import OverlayInstaller from '@/components/params/contents/overlays/OverlayInstaller.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { VueDraggable } from 'vue-draggable-plus';
import { Component, toNative } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
		ParamItem,
		ClearButton,
		ToggleBlock,
		ToggleButton,
		VueDraggable,
		OverlayInstaller,
	},
	emits:[],
})
class QuizForm extends AbstractSidePanel {

	public param_duration: Record<string, TwitchatDataTypes.ParameterData<number>> = {}
	public param_timeBasedScore: Record<string, TwitchatDataTypes.ParameterData<boolean>> = {}
	public param_looseOnFail: Record<string, TwitchatDataTypes.ParameterData<boolean>> = {}

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
	public addQuiz():void {
		this.$store.quiz.addQuiz();
		this.initParams();
	}

	/**
	 * Duplicate given quiz ID
		*/
	public duplicateQuiz(id:string):void {
		this.$store.quiz.duplicateQuiz(id)
		this.initParams();
	}

	/**
	 * Create parameters for a quiz entry
	 * @param id
	 */
	private initParams():void {
		this.$store.quiz.quizList.forEach(entry=> {
			const id = entry.id;
			if(this.param_duration[id]) return;

			this.param_duration[id] = {type:"number", value:30, min:5, max:600, labelKey:"quiz.form.param_duration", icon:"countdown"};
			this.param_timeBasedScore[id] = {type:"boolean", value:false, labelKey:"quiz.form.param_time_based_scoring", icon:"timer"};
			this.param_looseOnFail[id] = {type:"boolean", value:true, labelKey:"quiz.form.param_loose_on_fail", icon:"sad"};
		});
	}

	/**
	 * Opens the premium section
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}
}
export default toNative(QuizForm);
</script>

<style scoped lang="less">
.quizform{

	.form {
		gap: .5em;
	}

	.createForm {
		text-align: center;
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

		.rightActions, .leftActions {
			gap: .25em;
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-shrink: 0;
			.button {
				margin: -.5em 0;
				align-self: stretch;
				border-radius: 0;
				flex-shrink: 0;
				padding: 0 .5em;
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