<template>
	<div class="triggeractioncustomchatentry triggerActionForm">
		<ParamItem :paramData="param_icon" v-model="action.customMessage.icon" class="iconField" />

		<ParamItem :paramData="param_col" v-model="action.customMessage.col" class="colField" />

		<ParamItem :paramData="param_style" v-model="action.customMessage.style">
			<ParamItem :paramData="param_highlight" v-model="action.customMessage.highlightColor" v-if="action.customMessage.style == 'highlight'" noBackground class="child" />
		</ParamItem>

		<ParamItem :paramData="param_user" v-if="action.customMessage.user" v-model="action.customMessage.user!.name">
			<ParamItem :paramData="param_userColor" v-model="action.customMessage.user!.color" noBackground class="child" v-if="param_style.value != 'error'" />
		</ParamItem>

		<ParamItem :paramData="param_message" v-if="action.customMessage.user" v-model="action.customMessage.message" />

		<draggable
		class="actions"
		v-model="action.customMessage.actions"
		itemKey="id"
		group="ctas"
		ghost-class="ghost"
		direction="vertical"
		handle=".header"
		:animation="250">
			<template #item="{element, index}:{element:NonNullable<TwitchatDataTypes.MessageCustomData['actions']>[number], index:number}">
				<ToggleBlock :title="element.label || 'action'" :icons="element.icon? [element.icon] : []" :open="false" medium:open="false" class="actison">

					<template #left_actions>
						<div class="actionList">
							<Button small
								icon="dragZone"
								class="orderBt"
								v-tooltip="$t('triggers.reorder_tt')"
								@click.stop
							/>
						</div>
					</template>

					<template #right_actions>
						<div class="actionList">
							<Button small alert
								icon="trash"
								@click="deleteAction(index)"
								v-tooltip="$t('global.delete')"/>
						</div>
					</template>

					<div class="ctaForm">
						<ParamItem :paramData="actionParams[index].label" v-model="element.label" noBackground />
						<ParamItem :paramData="actionParams[index].icon" v-model="element.icon" noBackground />
						<ParamItem :paramData="actionParams[index].theme" v-model="element.theme" noBackground />
						<ParamItem :paramData="actionParams[index].actionType" v-model="element.actionType" noBackground>
							<ParamItem :paramData="actionParams[index].url" v-model="element.url" v-if="element.actionType == 'url'" noBackground class="child" />
							<ParamItem :paramData="actionParams[index].message" v-model="element.message" v-else-if="element.actionType == 'message'" noBackground class="child" />
							<SimpleTriggerList class="child list" v-else-if="!element.triggerId" @select="(id:string) => element.triggerId = id" />
							<SimpleTriggerList class="child" v-else :filteredItemId="element.triggerId" @click="element.triggerId = ''" />
						</ParamItem>
					</div>
				</ToggleBlock>
			</template>
		</draggable>
		<Button class="addBt" icon="add" @click="addAction()">{{ $t("triggers.actions.customChat.add_actionBt") }}</Button>

		<div class="message">
			<ChatCustomMessage :messageData="messageData" tabindex="-1" demo />
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ChatCustomMessage from '@/components/messages/ChatCustomMessage.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { ITriggerPlaceholder, TriggerActionCustomMessageData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { reactive } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import SimpleTriggerList from '../SimpleTriggerList.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import ToggleBlock from '@/components/ToggleBlock.vue';
import draggable from 'vuedraggable';
import Utils from '@/utils/Utils';

@Component({
	components:{
		Button: TTButton,
		draggable,
		ParamItem,
		ToggleBlock,
		SimpleTriggerList,
		ChatCustomMessage,
	},
	emits:[],
})
class TriggerActionCustomChatEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionCustomMessageData;
	@Prop
	declare triggerData:TriggerData;

	public actionParams:Key2ParamMap[] = [];

	public param_col:TwitchatDataTypes.ParameterData<number> = {type:"list", value:-1, labelKey:"triggers.actions.customChat.param_col"};
	public param_icon:TwitchatDataTypes.ParameterData<string> = {type:"imagelist", value:"", labelKey:"triggers.actions.customChat.param_icon"};
	public param_style:TwitchatDataTypes.ParameterData<TwitchatDataTypes.MessageCustomData["style"] | "",TwitchatDataTypes.MessageCustomData["style"] | ""> = {type:"list", value:"", labelKey:"triggers.actions.customChat.param_style"};
	public param_highlight:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"", labelKey:"triggers.actions.customChat.param_highlight_color"};
	public param_userColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"", labelKey:"triggers.actions.customChat.param_user_color"};
	public param_user:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:25, labelKey:"triggers.actions.customChat.param_user"};
	public param_message:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, maxLength:1000, labelKey:"triggers.actions.customChat.param_message"};

	private iconList:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
	private buttonThemes:TwitchatDataTypes.ParameterDataListValue<NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]["theme"]>[] = [];
	private actionTypes:TwitchatDataTypes.ParameterDataListValue<NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]["actionType"]>[] = [];

	public get messageData():TwitchatDataTypes.MessageCustomData {
		const chunks = TwitchUtils.parseMessageToChunks(this.action.customMessage.message || "", undefined, true);
		const actions = (JSON.parse(JSON.stringify(this.action.customMessage.actions)) || []) as NonNullable<typeof this.action.customMessage.actions>;
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			if(a.label) {
				a.label = a.label.replace(/\{.*?\}/gi, "***");
			}
			switch(a.actionType) {
				case "message":{
					a.message = (a.message || "").replace(/\{.*?\}/gi, "***");
					break;
				}
				case "url":{
					a.url = (a.url || "").replace(/\{.*?\}/gi, "***");
					break;
				}
			}
		}
		return  {
			id:"",
			col:-1,
			date:Date.now(),
			platform:"twitchat",
			type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
			highlightColor:this.action.customMessage.highlightColor,
			style:this.action.customMessage.style,
			user:this.action.customMessage.user,
			icon:this.action.customMessage.icon,
			actions,
			message: this.action.customMessage.message,
			message_chunks: chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
			channel_id:this.$store.auth.twitch.user.id,
		}
	}

	public makeReactive<U>(data:any):U {
		return reactive(data);
	}

	public beforeMount():void {
		if(!this.action.customMessage) {
			this.action.customMessage = {
				user:{
					name:"",
					color:"#e04e00"
				},
				highlightColor:"#000000",
				actions:[],
			}
		}
		if(!this.action.customMessage.actions) {
			this.action.customMessage.actions = [];
		}

		let iconList = import.meta.glob("@/assets/icons/*.svg");
		const validKeys = Object.keys(iconList).map(v=>v.replace(/.*\/(.*?).svg/, "$1"));
		const keys = ["ad","add","alert","animate","announcement","anon","api","automod","badge","ban","bingo","bingo_grid","bits","block","boost","bot","broadcast","broadcaster","change","channelPoints","chatCommand","chatPoll","checkmark","clearChat","click","clip","coffee","coin","color","commands","conversation","copy","count","countdown","credits","cross","date","debug","delete","dice","discord","donor","download","dragZone","easing","edit","elevated","elgato","emergency","emote","enter","filters","firstTime","fix","follow","follow_outline","font","fontSize","fullscreen","gift","github","goal","goxlr","goxlr_bleep","goxlr_fx","hand","heat","help","hide","highlight","history","hypeChat","idea","info","internet","kick","leave","list","live","loader","lock","loop","magnet","markRead","max","merge","microphone","microphone_mute","microphone_recording","min","minus","mod","move","music","mute","newtab","next","noMusic","notification","number","obs","offline","online","orderable","overlay","params","partner","patreon","pause","paypal","pin","pipette","placeholder","play","playability","poll","polygon","prediction","premium","presentation","press","prev","prime","pros","qna","raid","read","refresh","reply","returning","reward_highlight","rightClick","rotate","save","sammi","scale","scroll","scrollDown","scrollUp","search","shadow","shield","shieldMode","shoutout","show","skip","slow","spotify","stars","stop","streamlabs","streamelements","streamerbot","sub","test","thickness","ticket","tiktok","tiltify","timeout","timer","train","train_boost","translate","trash","tts","twitch","twitchat","twitter","ulule","unban","unblock","unfollow","unlock","unmod","unmute","unpin","unvip","update","upload","url","user","vibrate","vip","voice","voicemod","volume","watchStreak","whispers","youtube","kofi","tipeee"]
					.filter(v=> validKeys.includes(v));
		keys.unshift("");
		this.iconList = keys.map(v=> {return {value:v, icon:v, label:v}});
		this.param_icon.listValues = this.iconList.concat();

		const cols = this.$store.params.chatColumnsConfig.length;
		const params:TwitchatDataTypes.ParameterDataListValue<number>[] = [];
		params.push({value:-1, labelKey:"triggers.actions.customChat.param_col_all"})
		for (let i = 0; i < cols; i++) params.push({value:i, label:(i+1).toString()});
		this.param_col.listValues = params;

		this.param_style.listValues = [
			{value:"message", labelKey:"triggers.actions.customChat.param_style_message"},
			{value:"highlight", labelKey:"triggers.actions.customChat.param_style_highlight"},
			{value:"error", labelKey:"triggers.actions.customChat.param_style_error"},
		]

		this.buttonThemes = [
			{value:"default", labelKey:"triggers.actions.customChat.param_action_theme_default"},
			{value:"primary", labelKey:"triggers.actions.customChat.param_action_theme_primary"},
			{value:"secondary", labelKey:"triggers.actions.customChat.param_action_theme_secondary"},
			{value:"alert", labelKey:"triggers.actions.customChat.param_action_theme_alert"},
			{value:"light", labelKey:"triggers.actions.customChat.param_action_theme_light"},
		];

		this.actionTypes = [
			{value:"url", labelKey:"triggers.actions.customChat.param_action_type_url"},
			{value:"trigger", labelKey:"triggers.actions.customChat.param_action_type_trigger"},
			{value:"message", labelKey:"triggers.actions.customChat.param_action_type_chat"},
		];
		for (let i = 0; i < this.action.customMessage.actions.length; i++) {
			const a = this.action.customMessage.actions[i];
			this.addAction(a);
		}
	}

	/**
	 * Add a new action
	 * @param source
	 */
	public addAction(source?:NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]):void {
		if(!source) {
			source = {
				id:Utils.getUUID(),
				label:"",
				icon:"",
				theme:"",
				actionType:"url",
				url:"",
				triggerId:"",
			}
			if(!this.action.customMessage.actions) this.action.customMessage.actions = [];
			this.action.customMessage.actions.push(source);
		}

		const params:Key2ParamMap = {
			id:{type:"boolean", value:false},
			icon:{type:'imagelist', value:'', listValues:this.iconList.concat(), labelKey:'triggers.actions.customChat.param_action_icon'},
			actionType:{type:'list', value:'', listValues:this.actionTypes, labelKey:'triggers.actions.customChat.param_action_type'},
			url:{type:"string", value:"", maxLength: 1000, labelKey:"triggers.actions.customChat.param_action_url"},
			triggerId:{type:"string", value:""},
			label:{type:"string", value:"", maxLength:100, labelKey:"triggers.actions.customChat.param_action_label"},
			theme:{type:"list", value:'', listValues:this.buttonThemes, labelKey:"triggers.actions.customChat.param_action_theme"},
			message:{type:"string", value:'', maxLength:500, longText:true, placeholderList:this.placeholderList, labelKey:"triggers.actions.customChat.param_action_message"},
		}
		this.actionParams.push(params);
	}

	/**
	 * Delete an action by its index
	 * @param index
	 */
	public deleteAction(index:number):void {
		this.action.customMessage.actions!.splice(index, 1);
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_user.placeholderList = list;
		this.param_message.placeholderList = list;
		for (let i = 0; i < this.actionParams.length; i++) {
			this.actionParams[i].message.placeholderList = list;
		}
	}

}

type keys = keyof NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number];
type Key2ParamMap = Omit<{
	[K in keys]: TwitchatDataTypes.ParameterData<unknown>;
}, "urlTarget"|"data">;
export default toNative(TriggerActionCustomChatEntry);
</script>

<style scoped lang="less">
.triggeractioncustomchatentry{

	.message {
		.bevel();
		background-color: var(--grayout);
		padding: .5em;
		border-radius: var(--border-radius);
		* > {
			min-height: 2.2em;
			flex-grow: 1;
			position: relative;
		}
	}
	.iconField {
		:deep(.listField) {
			max-width: 100px;
		}
	}
	.colField {
		:deep(select) {
			max-width: 100px;
		}
	}
	.addBt {
		margin: auto;
	}

	.actions {
		gap: .25em;
		display: flex;
		flex-direction: column;
		.action {
			gap: .5em;
			display: flex;
			flex-direction: column;

			.child::before {
				position: absolute;
				left: -1em;
				top: 0.1em;
				font-size: 1rem;
				content: "⤷";
				display: block;
			}
			.deleteBt {
				align-self: center;
			}
		}
		.ctaForm {
			gap: .25em;
			display: flex;
			flex-direction: column;
		}
	}
	.actionList {
		align-self: stretch;
		margin: -.5em 0;
		justify-self: stretch;
		flex-shrink: 0;
		button {
			height: 100%;
			border-radius: 0;
			padding: 0 .5em;
		}
		.orderBt {
			box-shadow: unset;
			margin-left: -.5em;
		}
	}
}
</style>
