<template>
	<div :class="classes">
		<div class="head">
			<div class="title">
				<Icon name="qna" />
				<i18n-t scope="global" tag="h1" keypath="qna.form.title">
				</i18n-t>
			</div>
			
			<i18n-t scope="global" class="description" tag="span" keypath="qna.form.subtitle">
			</i18n-t>

			<CloseButton @click="close()" />
		</div>

		<div class="content">
			<form  @submit.prevent="submitForm()">
				<div class="card-item">
					<ParamItem noBackground :paramData="command" autofocus
					@change="conflict = false"
					:error="conflict" :errorMessage="$t('qna.form.conflict')" />
					<div class="example">
						<span>{{ $t("global.example") }}</span>: 
						<i18n-t scope="global" tag="mark" keypath="qna.form.example_command">
							<template #CMD>{{example}}</template>
							<template #QUESTION>{{$t("qna.form.example_question")}}</template>
						</i18n-t>
					</div>
				</div>
				<TTButton type="submit">{{ $t("global.start") }}</TTButton>
			</form>
			<PostOnChatParam botMessageKey="qnaStart"
				:placeholderEnabled="false"
				titleKey="qna.form.announce_start"
				:placeholders="startPlaceholders"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import CloseButton from '../CloseButton.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ParamItem from '../params/ParamItem.vue';
import TTButton from '../TTButton.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		CloseButton,
		PostOnChatParam,
	},
	emits:["close"],
})
export default class QnaForm extends AbstractSidePanel {
	
	public conflict:boolean = false;
	public command:TwitchatDataTypes.ParameterData<string>	= {type:"string", value:"!q", placeholder:"!sugg", maxLength:30, labelKey:"qna.form.param_command"};

	public get classes():string[] {
		const res = ["qnaform", "sidePanel"];
		// if(this.triggerMode !== false) res.push("embedMode");
		return res;
	}

	public get example():string {
		if(this.command.value) return this.command.value;
		return "!sugg";
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [
			{
				tag:"CMD", descKey:'qna.form.cmd_placeholder',
				example:this.command.value,
			}
		];
	}
	
	public mounted():void {
		super.open();
	}
	
	public submitForm():void {
		if(!this.$store.qna.createSession(this.command.value)) {
			this.conflict = true;
		}else{
			this.close();
		}
	}

	public changeValue():void {
		// if(this.triggerMode) {
		// 	this.action.suggData.command = this.command.value;
		// 	this.action.suggData.maxLength = this.maxLength.value;
		// 	this.action.suggData.duration = this.duration.value;
		// 	this.action.suggData.allowMultipleAnswers = this.multiAnswers.value;
		// }
	}

}
</script>

<style scoped lang="less">
.qnaform{
	.example {
		margin-left: auto;
		margin-top: 10px;
		border-radius: var(--border-radius);
		font-size: .8em;
		text-align: right;
	}
}
</style>