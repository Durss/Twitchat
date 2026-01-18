<template>
	<div class="postonchatparam"
	@focus.native="showMessage = true"
	@blur.native="showMessage = false">
		<ParamItem class="parameter" ref="paramItem"
			:clearToggle="clearToggle"
			:paramData="enabledParam"
			:error="error != ''"
			:errorMessage="error"
			:secondary="secondary"
			:alert="alert"
			:noBackground="noBackground"
			v-model="enabledParam.value"
		>
		
			<PlaceholderSelector class="placeholders"
				v-if="placeholderTarget && placeholders"
				v-model="textParam.value"
				:target="placeholderTarget"
				:placeholders="placeholders"
				@change="saveParams()"
			/>

			<div class="preview" ref="preview" v-if="adPreview && showMessage">
				<ChatMessage class="message"
					lightMode
					contextMenuOff
					:messageData="adPreview" />
			</div>
		
			<slot></slot>
		</ParamItem>

	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ChatMessage from '../messages/ChatMessage.vue';
import ParamItem, {ParamItem as ParamItemClass} from './ParamItem.vue';
import PlaceholderSelector from './PlaceholderSelector.vue';

@Component({
	components:{
		ParamItem,
		ChatMessage,
		PlaceholderSelector,
	},
	emits:["change", "update:text", "update:enabled"]
})
class PostOnChatParam extends Vue {
	
	@Prop
	public icon!:string;
	
	@Prop({type:String, default:""})
	public titleKey!:string;

	@Prop({type:Boolean, default:false})
	public noToggle!:boolean;
	
	@Prop({type:Boolean, default:false})
	public clearToggle!:boolean;

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Boolean, default: false})
	public noBackground!:boolean;
	
	@Prop
	public botMessageKey!:TwitchatDataTypes.BotMessageField;
	
	@Prop
	public placeholders!:TwitchatDataTypes.PlaceholderEntry[];
	
	@Prop({type:String, default: ""})
	public text!:string;
	
	@Prop({type:Boolean, default: false})
	public enabled!:boolean;
	
	public adPreview:TwitchatDataTypes.MessageChatData | null = null;

	public error:string = "";
	public showMessage:boolean = false;
	public enabledParam:TwitchatDataTypes.ParameterData<boolean, unknown, string> = { value:false, type:"boolean"};
	public textParam:TwitchatDataTypes.ParameterData<string> = { value:"", type:"string", longText:true, maxLength:500};

	public placeholderTarget:HTMLTextAreaElement|null = null;

	private isFirstRender:boolean = true;
	private focusHandler!:(e:FocusEvent) => void;

	public async beforeMount():Promise<void> {
		if(this.botMessageKey) {
			const data					= this.$store.chat.botMessages[ this.botMessageKey ];
			this.textParam.value		= data.message;
			this.enabledParam.value		= data.enabled || this.noToggle !== false;
		}else{
			this.textParam.value		= this.text;
			this.enabledParam.value		= this.enabled || this.noToggle !== false;
		}

		this.enabledParam.labelKey	= this.titleKey;
		this.enabledParam.children	= [this.textParam];
		this.enabledParam.noInput	= this.noToggle;
		if(this.icon) {
			this.enabledParam.icon	= this.icon;
		}

		watch(()=>this.textParam.value, ()=> this.saveParams());
		watch(()=>this.enabledParam.value, ()=> this.saveParams());
		watch(()=>this.placeholders, ()=> this.updatePreview(), {deep:true});

		this.focusHandler = (e:FocusEvent) => this.onFocus(e);
		document.addEventListener("mouseup", this.focusHandler);

		await this.$nextTick();
		this.saveParams(false);
	}

	public beforeUnmount():void {
		document.removeEventListener("mouseup", this.focusHandler);
	}
	
	public onFocus(e:FocusEvent):void {
		let target = document.activeElement as HTMLElement;
		while(target != this.$el && target != document.body) {
			target = (target as HTMLElement).parentElement!;
		}
		this.showMessage = (target == this.$el);
	}
	
	public onBlur(e:FocusEvent):void {
		this.showMessage = false;
	}
	
	public async saveParams(saveToStore = true):Promise<void> {
		if(this.botMessageKey) {
			//Avoid useless save on mount
			if(saveToStore){
				this.$store.chat.updateBotMessage({
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
		}else if(saveToStore){
			this.$emit("update:text", this.textParam.value);
			this.$emit("update:enabled", this.enabledParam.value);
			this.$emit("change");
		}

		if(this.enabledParam.value && this.isFirstRender) {
			this.isFirstRender = false;
			await this.$nextTick();
			this.placeholderTarget = (this.$refs.paramItem as ParamItemClass).$el.getElementsByTagName("textarea")[0];
		}
		this.updatePreview();
	}

	public async updatePreview():Promise<void> {
		this.adPreview = null;
		await this.$nextTick();

		const me = this.$store.auth.twitch.user;
		let rawMessage = this.textParam.value.normalize("NFC");

		if(this.placeholders) {
			for (const p of this.placeholders) {
				if(p.private === true) continue;
				if(p.example != undefined) {
					rawMessage = rawMessage.replace(new RegExp("\{"+p.tag+"\}", "gi"), p.example);
				}
			}
		}

		let announcementColor:"primary" | "purple" | "blue" | "green" | "orange" | undefined = undefined;
		if(rawMessage.indexOf("/announce") == 0) {
			announcementColor = rawMessage.replace(/\/announce([a-z]+)?\s.*/i, "$1") as "primary" | "purple" | "blue" | "green" | "orange";
			rawMessage = rawMessage.replace(/\/announce([a-z]+)?\s(.*)/i, "$2");
		}
		
		const chunks = TwitchUtils.parseMessageToChunks(rawMessage, undefined, true);
		const message_html = TwitchUtils.messageChunksToHTML(chunks);
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
			message_chunks:chunks,
			message_html,
			message_size: TwitchUtils.computeMessageSize(chunks),
		};
	}
}
export default toNative(PostOnChatParam);
</script>

<style scoped lang="less">
.postonchatparam{
	display: flex;
	flex-direction: column;
	gap: .5em;

	.placeholders {
		align-self: stretch;
	}

	.message {
		position: relative;
		font-size: 1em;
	}
	
	.preview {
		padding: .25em .5em;
		border-radius: .5em;
		box-sizing: border-box;
		background-color: var(--background-color-primary);
		overflow: hidden;
	}

	:deep(.errorMessage) {
		font-weight: normal;
		color: var(--color-alert);
		background-color: var(--color-light);
	}
}
</style>