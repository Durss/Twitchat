<template>
	<div class="paramsalert">
		<img src="@/assets/icons/alert_purple.svg" alt="emergency icon" class="icon">
		
		<div class="header">Let your mods alert you if something's urgent</div>

		<Splitter class="item splitter">Chat command</Splitter>
		
		<div>
			<ParamItem class="item" :paramData="param_chatCommand" />
			<ToggleBlock title="Allowed users" :open="false" small class="item">
				<PermissionsForm v-model="chatCommandPerms" />
			</ToggleBlock>
		</div>

		<Splitter class="item splitter">Actions</Splitter>

		<ParamItem class="item" :paramData="param_message" />
		<ParamItem class="item" :paramData="param_shake" />
		<ParamItem class="item" :paramData="param_sound" />
		<ParamItem class="item" :paramData="param_blink" />

		<div class="item infos">Do more actions with the <a @click="$emit('setContent', contentTriggers)">Triggers</a> system.</div>

		<Button title="Test" :icon="$image('icons/test.svg')" class="item testBt" @click="testAlert()" />
	</div>
</template>

<script lang="ts">
import { type ParameterData, type PermissionsData, type AlertParamsData, type ParamsContentStringType, ParamsContentType } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../../ToggleBlock.vue';
import PermissionsForm from './obs/PermissionsForm.vue';
import ParamItem from '../ParamItem.vue';
import Splitter from '../../Splitter.vue';
import Button from '../../Button.vue';
import StoreProxy from '@/utils/StoreProxy';
import { watch } from 'vue';
import gsap from 'gsap';

@Options({
	props:{},
	components:{
		Button,
		Splitter,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class ParamsAlert extends Vue {
	
	public param_chatCommand:ParameterData = {type:"text", label:"Chat command", value:"!alert"};
	public param_message:ParameterData = {type:"toggle", label:"Show message on popin", value:true};
	public param_shake:ParameterData = {type:"toggle", label:"Shake Twitchat", value:true};
	public param_blink:ParameterData = {type:"toggle", label:"Blink Twitchat", value:false};
	public param_sound:ParameterData = {type:"toggle", label:"Play sound", value:true};
	public chatCommandPerms:PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:false,
		subs:false,
		all:false,
		users:"",
	};
	
	public get finalData():AlertParamsData {
		return {
			chatCmd: this.param_chatCommand.value as string,
			shake: this.param_shake.value as boolean,
			message: this.param_message.value as boolean,
			blink: this.param_blink.value as boolean,
			sound: this.param_sound.value as boolean,
			permissions: this.chatCommandPerms,
		};
	}
	
	public get contentTriggers():ParamsContentStringType { return ParamsContentType.TRIGGERS; } 

	public mounted():void {
		let params:AlertParamsData = JSON.parse(JSON.stringify(StoreProxy.store.state.chatAlertParams));
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
			StoreProxy.store.dispatch("setAlertParams", this.finalData);
		}, {deep:true});
	}

	public testAlert():void {
		// gsap.fromTo(document.body, {filter:"brightness(1)"}, {duration:0.2, filter:"brightness(10)", clearProps:"filter", repeat:10});
		const message = {
			"type": "message",
			"message": "ItsBoshyTime Read your chat !!! ItsBoshyTime",
			"tags": {
				"badge-info": {
					"subscriber": "16"
				},
				"badges": {
					"broadcaster": "1",
					"subscriber": "12"
				},
				"client-nonce": "f90438208ff604cfba00470d60f1bb5b",
				"color": "#9ACD32",
				"display-name": "Durss",
				"emotes": {
					"133468": [
						"0-11",
						"32-43"
					]
				},
				"first-msg": false,
				"flags": null,
				"id": "00000000-0000-0000-0000-000000000002",
				"mod": false,
				"returning-chatter": false,
				"room-id": "29961813",
				"subscriber": true,
				"tmi-sent-ts": "1658344567683",
				"turbo": false,
				"user-id": "29961813",
				"user-type": null,
				"emotes-raw": "133468:0-11,32-43",
				"badge-info-raw": "subscriber/16",
				"badges-raw": "broadcaster/1,subscriber/12",
				"username": "durss",
				"message-type": "chat"
			},
			"channel": "#durss",
			"self": false,
			"firstMessage": false,
			"hasMention": false
		}
		StoreProxy.store.dispatch("executeChatAlert", message);
	}

}
</script>

<style scoped lang="less">
.paramsalert{
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding-top: 0;

	&>.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.header {
		text-align: center;
		margin-bottom: .5em;
	}

	mark {
		font-weight: bold;
		padding: .25em .5em;
		border-radius: .5em;
		font-size: .8em;
		background: fade(@mainColor_normal, 15%);
	}

	.item {
		margin-top: .5em;

		&.splitter {
			margin-top: 1em;
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
			width: auto;
			max-width: 150px;
		}
	}

	img {
		max-width: 100%;
	}
}
</style>