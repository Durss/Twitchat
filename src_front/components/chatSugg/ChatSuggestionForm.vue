<template>
	<div class="chatpollform">
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">{{ $t('suggestion.title') }}</span>
				<Button :aria-label="$t('suggestion.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<div class="description">
					<p>{{ $t('suggestion.info') }}</p>
					<div class="example">
						<span>{{ $t("global.example") }}</span>: 
						<i18n-t scope="global" tag="mark" keypath="suggestion.example">
							<template #CMD>{{example}}</template>
							<template #SUGG><strong>{{$t("suggestion.example_sugg")}}</strong></template>
						</i18n-t>
					</div>
				</div>
				<form  @submit.prevent="submitChatPoll()">
					<div class="row">
						<ParamItem :paramData="command" autofocus />
					</div>
					<div class="row">
						<ParamItem :paramData="maxLength" />
					</div>

					<div class="row">
						<ParamItem :paramData="duration" />
					</div>

					<div class="row">
						<ParamItem :paramData="multiAnswers" />
					</div>

					<!-- <ToggleBlock small title="Permissions" :open="false" class="row permissions">
						<PermissionsForm v-model="permissions" />
					</ToggleBlock> -->

					<div class="row">
						<Button :title="$t('global.submit')" type="submit" />
					</div>
				</form>

				<ToggleBlock :title="$t('global.configs')" class="configs" :open="false" small>
					<PostOnChatParam class="row" botMessageKey="chatSuggStart"
						:placeholderEnabled="false"
						titleKey="suggestion.announce_start"
						:placeholders="startPlaceholders"
					/>
				</ToggleBlock>
				<i18n-t scope="global" tag="div" keypath="suggestion.alternative_tool" class="alternativeTool">
					<template #LINK>
						<a href="https://www.janvier.tv/sondage" target="_blank">{{ $t("suggestion.alternative_tool_link") }}</a>
					</template>
				</i18n-t>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import PermissionsForm from '../PermissionsForm.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
		PostOnChatParam,
	}
})
export default class ChatSuggestionForm extends Vue {
	
	public command:TwitchatDataTypes.ParameterData = {type:"string", value:"!sugg", placeholder:"!sugg", maxLength:31};
	public duration:TwitchatDataTypes.ParameterData = {value:2, type:"number", min:1, max:30};
	public multiAnswers:TwitchatDataTypes.ParameterData = {value:false, type:"boolean"};
	public maxLength:TwitchatDataTypes.ParameterData = {value:100, type:"number", min:1, max:500};
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
		if(this.command.value) return this.command.value as string;
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
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public submitChatPoll():void {
		const data:TwitchatDataTypes.ChatSuggestionData = {
			startTime:Date.now(),
			command:(this.command.value as string).trim(),
			maxLength:this.maxLength.value as number,
			duration:this.duration.value as number,
			allowMultipleAnswers:this.multiAnswers.value as boolean,
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
	.modal();

	.content {
		.description {
			text-align: center;
			font-size: .8em;
			margin-bottom: 1em;
			.example {
				margin-top: .5em;
				font-style: italic;
				:deep(mark) {
					border: 1px dashed @mainColor_normal;
					background-color: fade(@mainColor_normal, 15%);
					padding: 2px;
					border-radius: .5em;
				}
			}
		}
		form {
			display: flex;
			flex-direction: column;
			.row {
				margin-top: 10px;
				display: flex;
				flex-direction: column;
				background-color: fade(@mainColor_normal_extralight, 30%);
				padding: .5em;
				border-radius: .5em;
				&.permissions {
					margin: auto;
					// max-width: 500px;
				}
				.error {
					margin-top: 5px;
					color: @mainColor_light;
					padding: 5px 10px;
					border-radius: 5px;
					text-align: center;
					background-color: @mainColor_alert;
				}
				:deep(input) {
					flex-basis: 200px;
					text-align: center;
				}
				:deep(input[type="number"]) {
					flex-basis: 80px;
				}
			}
		}

		.alternativeTool {
			margin-top: 1em;
			text-align: center;
			font-size: .95em;
		}

		.configs {
			margin: 1em 0;
			font-size: 1em;
			:deep(.header) {
				font-size: .8em;
			}
		}
	}
}
</style>