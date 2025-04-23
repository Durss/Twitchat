<template>
	<div class="paramsalert parameterContent">
		<Icon name="alert" class="icon" />

		<div class="head">{{ $t("alert.header") }}</div>

		<Splitter class="splitter">{{$t('alert.command_title') }}</Splitter>
		<section class="card-item">

			<div>
				<ParamItem :paramData="param_chatCommand" />
				<ToggleBlock :title="$t('global.allowed_users')" :open="false" small>
					<PermissionsForm v-model="chatCommandPerms" />
				</ToggleBlock>
			</div>
		</section>

		<Splitter class="splitter">{{ $t('alert.actions') }}</Splitter>
		<section class="card-item">

			<ParamItem :paramData="param_message" v-model="param_message.value" />
			<ParamItem :paramData="param_shake" v-model="param_shake.value" />
			<ParamItem :paramData="param_sound" v-model="param_sound.value" />
			<ParamItem :paramData="param_blink" v-model="param_blink.value" />
			<ParamItem :paramData="param_vibrate" v-model="param_vibrate.value" />

			<i18n-t scope="global" tag="div" class="infos" keypath="alert.actions_triggers">
				<template #LINK>
					<a @click="$store.params.openParamsPage(contentTriggers)">{{ $t("alert.actions_triggers_link") }}</a>
				</template>
			</i18n-t>

			<Button class="testBt" icon="test" @click="testAlert()">{{ $t('alert.testBt') }}</Button>
		</section>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../../TTButton.vue';
import PermissionsForm from '../../PermissionsForm.vue';
import Splitter from '../../Splitter.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button: TTButton,
		Splitter,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
class ParamsAlert extends Vue implements IParameterContent {

	public param_chatCommand:TwitchatDataTypes.ParameterData<string> = {type:"string", labelKey:"alert.command", value:"!alert"};
	public param_message:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"alert.option_popin", value:true};
	public param_shake:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"alert.option_shake", value:true};
	public param_blink:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"alert.option_blink", value:false};
	public param_sound:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"alert.option_sound", value:true};
	public param_vibrate:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"alert.option_vibrate", value:true};
	public chatCommandPerms:TwitchatDataTypes.PermissionsData = Utils.getDefaultPermissions(true, true, false, false, false, false);

	public get finalData():TwitchatDataTypes.AlertParamsData {
		return {
			chatCmd: this.param_chatCommand.value,
			shake: this.param_shake.value,
			message: this.param_message.value,
			blink: this.param_blink.value,
			sound: this.param_sound.value,
			vibrate: this.param_vibrate.value,
			permissions: this.chatCommandPerms,
		};
	}

	public get contentTriggers():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TRIGGERS; }

	public beforeMount():void {
		let params:TwitchatDataTypes.AlertParamsData = JSON.parse(JSON.stringify(this.$store.main.chatAlertParams));
		if(params) {
			//Prefill forms from storage
			this.param_chatCommand.value = params.chatCmd;
			this.param_shake.value = params.shake;
			this.param_message.value = params.message;
			this.param_blink.value = params.blink;
			this.param_sound.value = params.sound;
			this.param_vibrate.value = params.vibrate;
			this.chatCommandPerms = params.permissions;
		}

		watch(()=>this.finalData, ()=> {
			this.$store.main.setChatAlertParams(this.finalData);
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
			user: this.$store.users.getUserFrom("twitch", uid, uid),
			answers: [],
			channel_id:uid,
			message: str,
			message_chunks: chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
			message_size: TwitchUtils.computeMessageSize(chunks),
			is_short:false,
		}
		this.$store.main.executeChatAlert(message);
	}

}
export default toNative(ParamsAlert);
</script>

<style scoped lang="less">
.paramsalert{

	.testBt {
		align-self: center;
	}
	section {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
