<template>
	<div class="postonchatparam">

		<ParamItem class="parameter" ref="paramItem"
			:clearToggle="clearToggle"
			:paramData="enabledParam"
			:error="error != ''"
		/>

		<div v-if="error" class="errorMessage">{{error}}</div>
		
		<PlaceholderSelector class="placeholders"
			v-if="placeholderTarget && placeholders && enabledParam.value===true"
			v-model="textParam.value"
			:target="placeholderTarget"
			:placeholders="placeholders"
			@change="saveParams()"
		/>

		<div class="preview" ref="preview" v-if="enabledParam.value === true">
			<ChatMessage class="message"
				v-if="adPreview"
				lightMode
				contextMenuOff
				:messageData="adPreview" />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ChatMessage from '../messages/ChatMessage.vue';
import ParamItem from './ParamItem.vue';
import PlaceholderSelector from './PlaceholderSelector.vue';

@Component({
	components:{
		ParamItem,
		ChatMessage,
		PlaceholderSelector,
	}
})
export default class PostOnChatParam extends Vue {
	
	@Prop
	public icon!:string;
	@Prop({
			type:String,
			default:"",
		})
	public titleKey!:string;
	@Prop({
			type:Boolean,
			default:false,
		})
	public noToggle!:boolean;
	@Prop({
			type:Boolean,
			default:false,
		})
	public clearToggle!:boolean;
	@Prop
	public botMessageKey!:TwitchatDataTypes.BotMessageField;
	@Prop
	public placeholders!:TwitchatDataTypes.PlaceholderEntry[];
	
	public adPreview:TwitchatDataTypes.MessageChatData | null = null;

	public error:string = "";
	public enabledParam:TwitchatDataTypes.ParameterData<boolean> = { value:false, type:"boolean", maxLength:500};
	public textParam:TwitchatDataTypes.ParameterData<string> = { value:"", type:"string", longText:true};

	public placeholderTarget:HTMLTextAreaElement|null = null;

	private isFirstRender:boolean = true;

	public async mounted():Promise<void> {
		const data					= this.$store("chat").botMessages[ this.botMessageKey ];
		this.textParam.value		= data.message;
		this.enabledParam.labelKey	= this.titleKey;
		this.enabledParam.value		= data.enabled || this.noToggle !== false;
		this.enabledParam.children	= [this.textParam];
		this.enabledParam.noInput	= this.noToggle;
		if(this.icon) {
			this.enabledParam.icon	= this.icon;
		}

		watch(()=>this.textParam.value, ()=> this.saveParams())
		watch(()=>this.enabledParam.value, ()=> this.saveParams())
		watch(()=>this.placeholders, ()=> this.updatePreview(), {deep:true})

		await this.$nextTick();
		this.saveParams(false);
	}

	public async saveParams(saveToStore = true):Promise<void> {
		//Avoid useless save on mount
		if(saveToStore){
			this.$store("chat").updateBotMessage({
											key:this.botMessageKey,
											enabled:this.enabledParam.value,
											message:this.textParam.value
										});
		}

		this.error = ""
		if(this.botMessageKey == "twitchatAd") {
			if(!/(^|\s|\.|,|!|\:|;|\*|https?:\/\/)twitchat\.fr($|\s|\.|,|!|\:|;|\*)/gi.test(this.textParam.value)) {
				this.error = this.$t("error.ad_url_required");
			}
		}

		if(this.enabledParam.value && this.isFirstRender) {
			this.isFirstRender = false;
			await this.$nextTick();
			this.placeholderTarget = (this.$refs.paramItem as ParamItem).$el.getElementsByTagName("textarea")[0];
			const holder = this.$refs.preview as HTMLDivElement;
			gsap.from(holder, {duration:.25, height:0, margin:0, paddingTop:0, paddingBottom:0, clearProps:"all"});
		}
		this.updatePreview();
	}

	public async updatePreview():Promise<void> {
		this.adPreview = null;
		await this.$nextTick();

		const me = this.$store("auth").twitch.user;
		let rawMessage = this.textParam.value;

		if(this.placeholders) {
			for (let i = 0; i < this.placeholders.length; i++) {
				const p = this.placeholders[i];
				if(p.example) {
					rawMessage = rawMessage.replace(new RegExp("\{"+p.tag+"\}", "gi"), p.example);
				}
			}
		}


		let announcementColor:"primary" | "purple" | "blue" | "green" | "orange" | undefined = undefined;
		if(rawMessage.indexOf("/announce") == 0) {
			announcementColor = rawMessage.replace(/\/announce([a-z]+)?\s.*/i, "$1") as "primary" | "purple" | "blue" | "green" | "orange";
			rawMessage = rawMessage.replace(/\/announce([a-z]+)?\s(.*)/i, "$2");
		}
		
		const message = TwitchUtils.parseMessageToChunks(rawMessage, undefined, true);
		const message_html = TwitchUtils.messageChunksToHTML(message);
		this.adPreview = {
			id:Utils.getUUID(),
			date:Date.now(),
			channel_id:me.id,
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			answers:[],
			user:me,
			twitch_announcementColor:announcementColor,
			is_short:false,
			message:rawMessage,
			message_chunks:message,
			message_html,
		};
	}
}
</script>

<style scoped lang="less">
.postonchatparam{
	.placeholders {
		margin-top: .5em;
	}

	.message {
		position: relative;
	}

	&>.errorMessage {
		background-color: @mainColor_alert;
		color:@mainColor_light;
		padding: .5em;
		font-size: .8em;
		border-radius: 0 0 .5em .5em;
		text-align: center;
		cursor: pointer;
	}
	.preview {
		max-width: 400px;
		margin:1em auto;
		padding: .25em .5em;
		border-radius: .5em;
		background-color: @mainColor_dark;
		overflow: hidden;
	}
}
</style>