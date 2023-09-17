<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<CloseButton @click="close()" />

			<h1><Icon name="chatPoll" class="icon" />{{ $t('suggestion.title') }}</h1>

			<div class="description">{{ $t('suggestion.info') }}</div>
		</div>

		<div class="content">
			<form  @submit.prevent="submitChatPoll()">
				<div class="card-item">
					<ParamItem noBackground :paramData="command" autofocus @change="changeValue()" />
					<div class="example">
						<span>{{ $t("global.example") }}</span>: 
						<i18n-t scope="global" tag="mark" keypath="suggestion.example">
							<template #CMD>{{example}}</template>
							<template #SUGG>[{{$t("suggestion.example_sugg")}}]</template>
						</i18n-t>
					</div>
				</div>
			
				<ParamItem :paramData="maxLength" @change="changeValue()" />

				<ParamItem :paramData="duration" @change="changeValue()" />

				<ParamItem :paramData="multiAnswers" @change="changeValue()" />

				<!-- <ToggleBlock small title="Permissions" :open="false" class="card-item permissions">
					<PermissionsForm v-model="permissions" />
				</ToggleBlock> -->

				<Button v-if="triggerMode === false" type="submit">{{ $t('global.submit') }}</Button>
			</form>

			<i18n-t v-if="triggerMode === false" scope="global" tag="div" keypath="suggestion.alternative_tool" class="card-item alternativeTool">
				<template #LINK>
					<a href="https://www.janvier.tv/sondage" target="_blank">{{ $t("suggestion.alternative_tool_link") }}</a>
				</template>
			</i18n-t>

			<ToggleBlock v-if="triggerMode === false" :title="$t('global.configs')" class="configs" :open="false" small>
				<PostOnChatParam botMessageKey="chatSuggStart"
					:placeholderEnabled="false"
					titleKey="suggestion.announce_start"
					:placeholders="startPlaceholders"
				/>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import PermissionsForm from '../PermissionsForm.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import type { TriggerActionChatSuggestionsData, TriggerData } from '@/types/TriggerActionDataTypes';

@Component({
	components:{
		Button,
		ParamItem,
		CloseButton,
		ToggleBlock,
		PermissionsForm,
		PostOnChatParam,
	},
	emits:["close"]
})
export default class ChatSuggestionForm extends AbstractSidePanel {

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;
	
	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionChatSuggestionsData;

	@Prop
	public triggerData!:TriggerData;
	
	public command:TwitchatDataTypes.ParameterData<string>			= {type:"string", value:"!sugg", placeholder:"!sugg", maxLength:30};
	public duration:TwitchatDataTypes.ParameterData<number>			= {value:2, type:"number", min:1, max:60 * 24};
	public multiAnswers:TwitchatDataTypes.ParameterData<boolean>	= {value:false, type:"boolean"};
	public maxLength:TwitchatDataTypes.ParameterData<number>		= {value:100, type:"number", min:1, max:500};
	public permissions:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:true,
		subs:true,
		all:true,
		follower:true,
		follower_duration_ms:0,
		usersAllowed:[],
		usersRefused:[],
	}

	public get classes():string[] {
		const res = ["chatpollform", "sidePanel"];
		if(this.triggerMode !== false) res.push("embedMode");
		return res;
	}

	public get example():string {
		if(this.command.value) return this.command.value;
		return "!sugg";
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [
			{
				tag:"CMD", descKey:'suggestion.placeholder_cmd',
			},
			{
				tag:"LENGTH", descKey:'suggestion.placeholder_length',
			}
		];
	}

	public get dataObject():TwitchatDataTypes.ChatSuggestionData {
		return {
			startTime:Date.now(),
			command:this.command.value.trim(),
			maxLength:this.maxLength.value,
			duration:this.duration.value,
			allowMultipleAnswers:this.multiAnswers.value,
			choices:[],
			winners:[],
		}
	}

	public beforeMount(): void {
		this.command.labelKey		= "suggestion.command";
		this.maxLength.labelKey		= "suggestion.maxLength";
		this.duration.labelKey		= "suggestion.duration";
		this.multiAnswers.labelKey	= "suggestion.multiAnswers";

		if(this.triggerMode) {
			if(this.action.suggData) {
				this.command.value = this.action.suggData.command;
				this.maxLength.value = this.action.suggData.maxLength;
				this.duration.value = this.action.suggData.duration;
				this.multiAnswers.value = this.action.suggData.allowMultipleAnswers;
			}else{
				this.action.suggData = this.dataObject;
			}
		}
	}

	public async mounted():Promise<void> {
		if(!this.triggerMode) {
			super.open();
		}
	}

	public submitChatPoll():void {
		this.$store("chatSuggestion").setChatSuggestion(this.dataObject);
		this.close();
	}

	public changeValue():void {
		if(this.triggerMode) {
			this.action.suggData.command = this.command.value;
			this.action.suggData.maxLength = this.maxLength.value;
			this.action.suggData.duration = this.duration.value;
			this.action.suggData.allowMultipleAnswers = this.multiAnswers.value;
		}
	}
}
</script>

<style scoped lang="less">
.chatpollform{
	.example {
		// .bevel();
		// padding: .8em;
		margin-left: auto;
		margin-top: 10px;
		border-radius: var(--border-radius);
		font-size: .8em;
		text-align: right;
	}
	.alternativeTool {
		text-align: center;
		font-size: .8em;
	}
}
</style>