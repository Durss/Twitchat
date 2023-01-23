<template>
	<div class="paramscounters">
		<img src="@/assets/icons/count_purple.svg" alt="counter icon" class="icon">

		<div class="head">
			<i18n-t scope="global"  tag="p" keypath="counters.header">
				<template #LINK>
					<a @click="openTriggers()" target="_blank">{{ $t("counters.header_link") }}</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!showForm">
			<Button :title="$t('counters.addBt')" :icon="$image('icons/add.svg')" @click="showForm = true" />
		</section>

		<section v-if="showForm">
			<form @submit.prevent="createCounter()">
				<ParamItem class="item" :paramData="param_title" />
				<ParamItem class="item" :paramData="param_value" />
				<Button :title="$t('counters.addBt')" :icon="$image('icons/add.svg')" :disabled="(param_title.value as string).length == 0" />
			</form>
		</section>

	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
	},
	emits:["setContent"]
})
export default class ParamsCounters extends Vue {

	public showForm:boolean = false;
	public param_title:TwitchatDataTypes.ParameterData = {type:"text", value:"", maxLength:50, labelKey:"counters.form.name"};
	public param_value:TwitchatDataTypes.ParameterData = {type:"number", value:0, labelKey:"counters.form.value"};

	public openTriggers():void {
		this.$emit("setContent", TwitchatDataTypes.ParamsCategories.TRIGGERS);
	}

	public mounted(): void {
	}

	public createCounter(): void {
	}

}
</script>

<style scoped lang="less">
.paramscounters{
	.parameterContent();

	section, form {
		display: flex;
		flex-direction: column;
		gap: .5em;

		:deep(input) {
			flex-basis: 200px !important;
		}
	}
	
}
</style>