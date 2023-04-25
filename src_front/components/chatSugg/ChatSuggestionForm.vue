<template>
	<div class="chatpollform sidePanel">
		<div class="head">
			<CloseButton @click="close()" />

			<h1>{{ $t('suggestion.title') }}</h1>

			<div class="description">{{ $t('suggestion.info') }}</div>
		</div>
		<div class="content">

			<form  @submit.prevent="submitChatPoll()">
				<div class="card-item primary">
					<ParamItem :paramData="command" autofocus />
					<div class="example">
						<span>{{ $t("global.example") }}</span>: 
						<i18n-t scope="global" tag="mark" keypath="suggestion.example">
							<template #CMD>{{example}}</template>
							<template #SUGG>{{$t("suggestion.example_sugg")}}</template>
						</i18n-t>
					</div>
				</div>
			

				<div class="card-item primary">
					<ParamItem :paramData="maxLength" />
				</div>

				<div class="card-item primary">
					<ParamItem :paramData="duration" />
				</div>

				<div class="card-item primary">
					<ParamItem :paramData="multiAnswers" />
				</div>

				<!-- <ToggleBlock small title="Permissions" :open="false" class="card-item primary permissions">
					<PermissionsForm v-model="permissions" />
				</ToggleBlock> -->

				<Button type="submit">{{ $t('global.submit') }}</Button>
			</form>

			<i18n-t scope="global" tag="div" keypath="suggestion.alternative_tool" class="card-item alternativeTool">
				<template #LINK>
					<a href="https://www.janvier.tv/sondage" target="_blank">{{ $t("suggestion.alternative_tool_link") }}</a>
				</template>
			</i18n-t>

			<ToggleBlock :title="$t('global.configs')" class="configs" :open="false" small>
				<PostOnChatParam class="card-item primary" botMessageKey="chatSuggStart"
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
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import PermissionsForm from '../PermissionsForm.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';

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

	public beforeMount(): void {
		this.command.labelKey		= "suggestion.command";
		this.maxLength.labelKey		= "suggestion.maxLength";
		this.duration.labelKey		= "suggestion.duration";
		this.multiAnswers.labelKey	= "suggestion.multiAnswers";
	}

	public async mounted():Promise<void> {
		super.open();
	}

	public submitChatPoll():void {
		const data:TwitchatDataTypes.ChatSuggestionData = {
			startTime:Date.now(),
			command:this.command.value.trim(),
			maxLength:this.maxLength.value,
			duration:this.duration.value,
			allowMultipleAnswers:this.multiAnswers.value,
			choices:[],
			winners:[],
		}
		this.$store("chatSuggestion").setChatSuggestion(data);
		this.close();
	}
}
</script>

<style scoped lang="less">
.chatpollform{

	.example {
		// .bevel();
		// padding: .8em;
		margin-left: auto;
		margin-top: 5px;
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