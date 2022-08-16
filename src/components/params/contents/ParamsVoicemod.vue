<template>
	<div class="paramsvoicemod">
		<img src="@/assets/icons/voicemod_purple.svg" alt="voicemod icon" class="icon">
		<div class="title">Control <strong>Voicemod</strong> from Twitchat</div>
		<ParamItem class="item enableBt" :paramData="param_enabled" @change="toggleState()" />


		<div class="fadeHolder" :style="holderStyles">
			<section v-if="connecting">
				<img class="item center" src="@/assets/loader/loader.svg" alt="loader">
				<div class="item center">connecting to Voicemod...</div>
			</section>

			<section class="error" v-if="connectionFailed && !connected" @click="connectionFailed = false">
				<div class="item">Unable to connect to Voicemod</div>
			</section>

			<section v-if="connected">
				<div class="item center">Let your viewers control your voice from chat commands</div>
				<div class="item small">For more control over your voice effects you can create <mark>Chat Commands</mark> on the <a @click="$emit('setContent', contentTriggers)">triggers section</a>.</div>
				<ParamItem class="item param shrinkInput" v-for="p in voiceParams" :paramData="p" @change="saveData()" />
			</section>
		</div>

	</div>
</template>

<script lang="ts">
import { ParamsContentType, type ParameterData, type ParamsContentStringType } from '@/types/TwitchatDataTypes';
import VoicemodWebSocket, {type VoicemodTypes} from '@/utils/VoicemodWebSocket';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';
import type { VoicemodParamsData } from '../../../types/TwitchatDataTypes';

@Options({
	props:{},
	components:{
		ParamItem,
	},
	emits:["setContent"]
})
export default class ParamsVoicemod extends Vue {

	public connected:boolean = false;
	public connecting:boolean = false;
	public connectionFailed:boolean = false;
	public voices:VoicemodTypes.Voice[] = [];
	public voiceParams:ParameterData[] = [];
	public param_enabled:ParameterData = {type:"toggle", label:"Enabled", value:false};
	
	public get contentTriggers():ParamsContentStringType { return ParamsContentType.TRIGGERS; } 

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enabled.value === true? 1 : .5,
			pointerEvents:this.param_enabled.value === true? "all" : "none",
		};
	}

	public mounted():void {
		// this.connecting = true;
	}

	public toggleState():void {
		if(this.param_enabled.value === true) {
			this.connect();
		} else {
			this.connected = false;
			this.saveData();
			VoicemodWebSocket.instance.disconnect();
		}
	}

	public async connect():Promise<void> {
		this.connected = false;
		this.connecting = true;
		this.connectionFailed = false;
		let res = false;
		try {
			await VoicemodWebSocket.instance.connect();
			res = true;
		}catch(error) {}

		if(res) {
			this.populate();
		}
		this.connecting = false;
		this.connected = res;
		if(!res) {
			this.connectionFailed = true;
		}
	}

	public async populate():Promise<void> {
		this.voices = VoicemodWebSocket.instance.voices;
		for (let i = 0; i < this.voices.length; i++) {
			const v = this.voices[i];
			VoicemodWebSocket.instance.getBitmapForVoice(v.voiceID).then((img:string)=>{
				const data:ParameterData = {
					type: "text",
					storage: v,
					label: v.friendlyName,
					value: "",
					placeholder: "!command",
					maxLength: 100,
					iconURL: "data:image/png;base64," + img
				};
				this.voiceParams.push( data );
			})
		}
		this.saveData();
	}
	
	public saveData():void {
		const voiceIdToCommand:{[key:string]:string} = {};

		for (let i = 0; i < this.voiceParams.length; i++) {
			const p = this.voiceParams[i];
			const cmd = (p.value as string).trim().toLowerCase();
			if(cmd.length > 0) {
				voiceIdToCommand[(p.storage as VoicemodTypes.Voice).voiceID] = cmd;
			}
		}

		const data:VoicemodParamsData = {
			enabled: this.param_enabled.value as boolean,
			voiceIdToCommand,
		}
	}
}
</script>

<style scoped lang="less">
.paramsvoicemod{
	.icon {
		height: 5em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}

	.title {
		text-align: center;
		margin-bottom: 1em;
	}

	.enableBt {
		max-width: 200px;
		margin: auto;
		margin-top: 1.5em;
		border: 1px solid @mainColor_normal;
		border-radius: 1em;
		padding: .5em 1em !important;
		background-color: fade(@mainColor_normal_extralight, 30%);
	}

	.fadeHolder {
		transition: opacity .2s;

		section {
			overflow: hidden;
			border-radius: .5em;
			background-color: fade(@mainColor_normal_extralight, 30%);
			padding: .5em;
			margin-top: 2em;
			
			.item {
				&:not(:first-child) {
					margin-top: .5em;
				}
				&.splitter {
					margin: .5em 0 1em 0;
				}
				&.label {
					i {
						font-size: .8em;
					}
					.icon {
						width: 1.2em;
						max-height: 1.2em;
						margin-right: .5em;
						margin-bottom: 2px;
						display: inline;
						vertical-align: middle;
					}
					p {
						display: inline;
					}
				}
				&.small {
					font-size: .8em;
				}
				&.center {
					display: block;
					margin-left: auto;
					margin-right: auto;
					text-align: center;
				}
				&.shrinkInput {
					:deep(input) {
						width: auto;
						max-width: 150px;
					}
				}
				&.param {
					margin-top: 0;
					:deep(.icon) {
						width: 2em;
						height: 2em;
					}
				}
			}

			&.error {
				color: @mainColor_light;
				text-align: center;
				background-color: @mainColor_alert;
			}
		}
	}
	
}
</style>