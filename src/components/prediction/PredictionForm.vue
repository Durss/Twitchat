<template>
	<div class="predictionform">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Create prediction</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<form  @submit.prevent="submitPoll()">
					<div class="row">
						<label for="prediction_title">Question</label>
						<input type="text" id="prediction_title" v-model="title" maxlength="45">
					</div>
					<div class="row answers">
						<label for="prediction_answer">Answers</label>
						<input type="text" id="prediction_answer" v-model="answer1" maxlength="25">
						<input type="text" v-model="answer2" maxlength="25">
					</div>
					<div class="row">
						<ParamItem :paramData="voteDuration" />
					</div>
					<div class="row">
						<Button title="Submit" type="submit" :loading="loading" :disabled="title.length < 1 || answers.length != 2" />
						<div class="error" v-if="error" @click="error = ''">{{error}}</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { ParameterData } from '@/store';
import TwitchUtils from '@/utils/TwitchUtils';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
	},
	emits:['close']
})
export default class PredictionForm extends Vue {

	public loading:boolean = false;

	public error:string = "";
	public title:string = "";
	public answer1:string = "";
	public answer2:string = "";
	public voteDuration:ParameterData = {label:"Vote duration (minutes)", value:10, type:"number", min:1, max:30};

	public get answers():string[] {
		let res = [];
		if(this.answer1) res.push(this.answer1);
		if(this.answer2) res.push(this.answer2);
		return res;
	}

	public async mounted():Promise<void> {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public async submitPoll():Promise<void> {
		this.loading = true;
		this.error = "";

		try {
			await TwitchUtils.createPrediction(this.title, this.answers, this.voteDuration.value as number * 60);
		}catch(error:unknown) {
			this.loading = false;
			this.error = (error as {message:string}).message;
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
					input {
						flex-grow: 1;
						border-width: 3px;
						@c:#f50e9b;
						color: @c;
						border-color: @c;
						background-color: lighten(@c, 40%);
					}
					input:first-of-type {
						@c:#387aff;
						color: @c;
						border-color: @c;
						background-color: lighten(@c, 30%);
						margin-bottom: 5px;
					}
				}
			}
		}
	}
}
</style>