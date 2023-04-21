<template>
	<div class="paramsalert">
		<img src="@/assets/icons/alert.svg" alt="emergency icon" class="icon">
		
		<div class="header">{{ $t("alert.header") }}</div>

		<section>
			<Splitter class="item splitter">{{$t('alert.command_title') }}</Splitter>
			
			<div>
				<ParamItem class="item" :paramData="param_chatCommand" />
				<ToggleBlock :title="$t('global.allowed_users')" :open="false" small class="item">
					<PermissionsForm v-model="chatCommandPerms" />
				</ToggleBlock>
			</div>
		</section>

		<section>
			<Splitter class="item splitter">{{ $t('alert.actions') }}</Splitter>
	
			<ParamItem class="item" :paramData="param_message" />
			<ParamItem class="item" :paramData="param_shake" />
			<ParamItem class="item" :paramData="param_sound" />
			<ParamItem class="item" :paramData="param_blink" />
	
			<i18n-t scope="global" tag="div" class="item infos" keypath="alert.actions_triggers">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentTriggers)">{{ $t("alert.actions_triggers_link") }}</a>
				</template>
			</i18n-t>
	
			<Button :title="$t('alert.testBt')" icon="test" class="item testBt" @click="testAlert()" />
		</section>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../../Button.vue';
import PermissionsForm from '../../PermissionsForm.vue';
import Splitter from '../../Splitter.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button,
		Splitter,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class ParamsAlert extends Vue implements IParameterContent {
	
	public param_chatCommand:TwitchatDataTypes.ParameterData<string> = {type:"string", labelKey:"alert.command", value:"!alert"};
	public param_message:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"alert.option_popin", value:true};
	public param_shake:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"alert.option_shake", value:true};
	public param_blink:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"alert.option_blink", value:false};
	public param_sound:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"alert.option_sound", value:true};
	public chatCommandPerms:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:false,
		subs:false,
		all:false,
		follower:true,
		follower_duration_ms:0,
		usersAllowed:[],
		usersRefused:[],
	};
	
	public get finalData():TwitchatDataTypes.AlertParamsData {
		return {
			chatCmd: this.param_chatCommand.value,
			shake: this.param_shake.value,
			message: this.param_message.value,
			blink: this.param_blink.value,
			sound: this.param_sound.value,
			permissions: this.chatCommandPerms,
		};
	}
	
	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; } 

	public beforeMount():void {
		let params:TwitchatDataTypes.AlertParamsData = JSON.parse(JSON.stringify(this.$store("main").chatAlertParams));
		if(params) {
			//Prefill forms from storage
			this.param_chatCommand.value = params.chatCmd;
			this.param_shake.value = params.shake;
			this.param_message.value = params.message;
			this.param_blink.value = params.blink;
			this.param_sound.value = params.sound;
			this.chatCommandPerms = params.permissions;
		}

		watch(()=>this.finalData, ()=> {
			this.$store("main").setChatAlertParams(this.finalData);
		}, {deep:true});
	}

	public onNavigateBack(): boolean { return false; }

	public testAlert():void {
		const uid = StoreProxy.auth.twitch.user.id;
		const str = "GivePLZ  Read your chat !!! TakeNRG ";
		const chunks = TwitchUtils.parseMessageToChunks(str, undefined, true);
		const message:TwitchatDataTypes.MessageChatData = {
			id:Utils.getUUID(),
			platform:"twitch",
			date: Date.now(),
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			user: this.$store("users").getUserFrom("twitch", uid, uid),
			answers: [],
			channel_id:uid,
			message: str,
			message_chunks: chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
			is_short:false,
		}
		this.$store("main").executeChatAlert(message);
	}

}
</script>

<style scoped lang="less">
.paramsalert{
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding-top: 0;
	
	section {
		border-radius: .5em;
		background-color: fade(@mainColor_normal_extralight, 30%);
		padding: .5em;
		margin-top: 2em;
		.splitter {
			margin: .25em 0 1em 0;
		}
	}

	&>.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.header {
		text-align: center;
	}

	.item {
		&:not(:nth-child(2)) {
			margin-top: .5em;
		}

		&.testBt {
			display: block;
			margin:auto;
			margin-top: 1em;
		}

		&.infos {
			text-align: center;
			margin-top: 1em;
		}

		:deep(input) {
			max-width: 150px;
		}
	}
}
</style>