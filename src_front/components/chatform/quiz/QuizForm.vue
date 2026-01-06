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
			<!-- Quiz form content goes here -->
		</div>
	</div>
</template>

<script lang="ts">
import AbstractSidePanel from '@/components/AbstractSidePanel';
import ClearButton from '@/components/ClearButton.vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ClearButton,
	},
	emits:[],
})
class QuizForm extends AbstractSidePanel {

	public mounted():void {
		super.open();
	}
}
export default toNative(QuizForm);
</script>

<style scoped lang="less">
.quizform{
	
}
</style>