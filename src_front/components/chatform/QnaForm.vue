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

			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<form  @submit.prevent="submitForm()">
				<div class="card-item">
					<ParamItem noBackground :paramData="param_command" autofocus
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

				<ParamItem :paramData="param_upvote" v-model="param_upvote.value" premium />

				<ParamItem :paramData="param_shareWithMods" v-model="param_shareWithMods.value" premium />

				<PostOnChatParam botMessageKey="qnaStart"
					icon="announcement"
					:placeholderEnabled="false"
					titleKey="qna.form.announce_start"
					:placeholders="startPlaceholders"
				/>
				<TTButton type="submit">{{ $t("global.start") }}</TTButton>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ParamItem from '../params/ParamItem.vue';
import TTButton from '../TTButton.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ClearButton,
		PostOnChatParam,
	},
	emits:["close"],
})
class QnaForm extends AbstractSidePanel {
	
	public conflict:boolean = false;
	public param_command:TwitchatDataTypes.ParameterData<string>		= {type:"string", value:"!q", placeholder:"!sugg", maxLength:30, labelKey:"qna.form.param_command", icon:"commands"};
	public param_upvote:TwitchatDataTypes.ParameterData<boolean>		= {type:"boolean", value:false, labelKey:"qna.form.param_upvote", icon:"add"};
	public param_shareWithMods:TwitchatDataTypes.ParameterData<boolean>	= {type:"boolean", value:false, labelKey:"qna.form.param_shareWithMods", icon:"mod"};

	public get classes():string[] {
		const res = ["qnaform", "sidePanel"];
		// if(this.triggerMode !== false) res.push("embedMode");
		return res;
	}

	public get example():string {
		if(this.param_command.value) return this.param_command.value;
		return "!sugg";
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [
			{
				tag:"CMD", descKey:'qna.form.cmd_placeholder',
				example:this.param_command.value,
			}
		];
	}
	
	public mounted():void {
		super.open();
	}
	
	public submitForm():void {
		if(!this.$store.qna.createSession(this.param_command.value, this.param_upvote.value, this.param_shareWithMods.value)) {
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
export default toNative(QnaForm);
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