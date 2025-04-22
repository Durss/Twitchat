<template>
	<div class="chatpollform sidePanel" :class="{embedMode: triggerMode !== false}">
		<div class="head" v-if="triggerMode === false">
			<h1 class="title"><Icon name="poll" class="icon" />{{ $t("chatPoll.form.title") }}</h1>
			<span class="description">{{ $t("chatPoll.form.header") }}</span>
			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<form @submit.prevent="submitForm()">
				<ParamItem :paramData="param_title"
					v-model="title"
					:autofocus="title == ''"
					:tabindex="1"
					@change="onValueChange()" />

				<div class="card-item answers">
					<label for="poll_answer">{{ $t("chatPoll.form.answers") }}</label>

					<div class="field" v-for="(a, index) in choices.length" :key="index">
						<input type="text" id="poll_answer" v-model="choices[index].label" maxlength="50" v-autofocus="index == 0 && title != ''" :tabindex="index+2" @change="onValueChange()">
						<div class="len">{{choices[index].label.length}}/50</div>
					</div>

					<div class="card-item premium" v-if="showPremiumLimit">
						<div>{{ $t("overlay.chatPoll.non_premium_limit", {MAX:$config.MAX_CHAT_POLL_ENTRIES_PREMIUM}) }}</div>
						<TTButton icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</TTButton>
					</div>

					<PlaceholderSelector class="child placeholders" v-if="placeholderList.length > 0"
						copyMode
						:placeholders="placeholderList"
					/>
				</div>

				<ParamItem :paramData="param_duration" @change="onValueChange()" />
				<ParamItem :paramData="param_allowMultiVote" @change="onValueChange()" />

				<ToggleBlock :title="$t('chatPoll.form.permissions')" :open="false" :icons="['lock_fit']">
					<PermissionsForm v-model="permissions" @change="onValueChange()" />
				</ToggleBlock>

				<TTButton type="submit" v-if="triggerMode === false"
					:disabled="choices.filter(v=> v.label.trim().length > 0).length < 2">{{ $t('global.start') }}</TTButton>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import { TriggerEventPlaceholders, type ITriggerPlaceholder, type TriggerActionChatPollData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import ParamItem from '../params/ParamItem.vue';
import PlaceholderSelector from '../params/PlaceholderSelector.vue';
import PermissionsForm from '../PermissionsForm.vue';
import { ToggleBlock } from '../ToggleBlock.vue';
import TTButton from '../TTButton.vue';
import VoiceGlobalCommandsHelper from '../voice/VoiceGlobalCommandsHelper.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
		ClearButton,
		PermissionsForm,
		PlaceholderSelector,
		VoiceGlobalCommandsHelper,
	},
	emits:['close']
})
class ChatPollForm extends AbstractSidePanel {

	@Prop({type: Boolean, default: false})
	public voiceControl!:boolean;

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionChatPollData;

	@Prop
	public triggerData!:TriggerData;

	public title = "";
	public showPremiumLimit = false;
	public choices:TwitchatDataTypes.ChatPollData["choices"] = [];
	public param_title:TwitchatDataTypes.ParameterData<string> = {value:"", type:"string", maxLength:100, labelKey:"chatPoll.form.question", placeholderKey:"prediction.form.question_placeholder"};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {value:2*60, type:"duration", min:5, max:3600, labelKey:"chatPoll.form.voteDuration", icon:"timer"};
	public param_allowMultiVote:TwitchatDataTypes.ParameterData<number> = {value:1, type:"number", min:1, max:2, labelKey:"chatPoll.form.allowMultiVote", icon:"user"};
	public placeholderList:ITriggerPlaceholder<any>[] = [];
	public permissions:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:true,
		subs:true,
		follower:true,
		follower_duration_ms:0,
		all:true,
		usersAllowed:[],
		usersRefused:[],
	};

	public async beforeMount():Promise<void> {

		if(this.$store.main.tempStoreValue) {
			const titlePrefill = this.$store.main.tempStoreValue as string;
			if(titlePrefill) this.title = titlePrefill;
			this.$store.main.tempStoreValue = null;
		}

		if(this.triggerMode !== false) {
			this.placeholderList =
			this.param_title.placeholderList = TriggerEventPlaceholders(this.triggerData.type);
			if(this.action.chatPollData) {
				this.title = this.action.chatPollData.title;
				this.param_duration.value = this.action.chatPollData.duration_s;
				this.permissions = this.action.chatPollData.permissions;
				for (let i = 0; i < this.action.chatPollData.choices.length; i++) {
					this.choices[i] = {...this.action.chatPollData.choices[i]};
				}
			}else{
				this.onValueChange();
			}
		}

		// Add 2 empty choices if less than 2 choices exist
		for (let i = this.choices.length; i < 2; i++) {
			this.choices.push({
				id:Utils.getUUID(),
				label:"",
				votes:0,
			});
		}

	}

	public async mounted():Promise<void> {
		if(this.triggerMode === false) {
			super.open();
		}

		watch(()=>this.choices, ()=> {
			let emptyCount = 0;
			for (let i = 0; i < this.choices.length; i++) {
				if(this.choices[i].label.length === 0) emptyCount++;
			}
			const maxEntries = this.$store.auth.isPremium? Config.instance.MAX_CHAT_POLL_ENTRIES_PREMIUM : Config.instance.MAX_CHAT_POLL_ENTRIES;
			if(emptyCount == 0 && this.choices.length < maxEntries) {
				this.choices.push({
					id:Utils.getUUID(),
					label:"",
					votes:0,
				});
			}else if(emptyCount > 1 && this.choices.length > 2) {
				while(emptyCount > 1) {
					for (let i = 0; i < this.choices.length; i++) {
						if(this.choices[i].label.length === 0) {
							this.choices.splice(i, 1);
							emptyCount--;
							break;
						}
					}
				}
			}

			this.showPremiumLimit = (this.choices.length-emptyCount) == maxEntries && maxEntries < Config.instance.MAX_CHAT_POLL_ENTRIES_PREMIUM;
			this.param_allowMultiVote.max = this.choices.length
		}, {deep:true});
	}

	public async submitForm():Promise<void> {
		this.$store.chatPoll.setCurrentPoll({
			title:this.title,
			choices:this.choices.filter(v=>v.label.trim().length > 0).map(v=> {return {...v}}),
			permissions:this.permissions,
			duration_s:this.param_duration.value,
			started_at:Date.now(),
			votes:{},
			maxVotePerUser:this.param_allowMultiVote.value,
		})
		this.close();
	}

	/**
	 * Called when any value is changed
	 */
	public onValueChange():void {
		if(this.action) {
			this.action.chatPollData = {
				title:this.title,
				choices:this.choices.filter(v=>v.label.trim().length > 0).map(v=> {return {...v}}),
				duration_s:this.param_duration.value,
				started_at:Date.now(),
				permissions:this.permissions,
				maxVotePerUser:this.param_allowMultiVote.value,
				votes:{},
			};
		}
	}

	/**
	 * Opens the premium section
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

}
export default toNative(ChatPollForm);
</script>

<style scoped lang="less">
.chatpollform{
	.content{
		form > .card-item {
			.field {
				flex-grow: 1;
				position: relative;
				input {
					width: 100%;
					padding-right: 3em;
				}
				.len {
					font-size: .7em;
					position: absolute;
					right: .5em;
					top: 50%;
					transform: translateY(-50%);
				}
			}
			&.answers{
				gap:5px;
				display: flex;
				flex-direction: column;
				label {
					display: block;
					margin-bottom: .5em;
				}
			}
		}
	}

	.premium {
		white-space: pre-line;
		.button {
			display: flex;
			margin: auto;
			margin-top: .5em;
		}
	}
}
</style>
