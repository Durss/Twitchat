<template >
	<div :class="classes" v-show="open || expand" @wheel.stop>
		<div class="hoverActions" v-if="!expand">
			<button class="openBt" @click="expand = true" :data-tooltip="$t('global.tooltips.column_edit')">
				<img src="@/assets/icons/filters.svg" alt="open filters" class="icon">
			</button>
			<button class="deleteBt" @click="deleteColumn()" v-if="canDelete" :data-tooltip="$t('global.tooltips.column_delete')">
				<img src="@/assets/icons/cross_white.svg" alt="delete column" class="icon">
			</button>
			<button class="addBt" @click="$emit('add')" :data-tooltip="$t('global.tooltips.column_add')">
				<img src="@/assets/icons/add.svg" alt="add column" class="icon">
			</button>
			<button class="addBt" @click="moveColumn(-1)" :data-tooltip="$t('global.tooltips.column_move')"
			v-if="config.order > 0">
				<img src="@/assets/icons/left.svg" alt="add column" class="icon">
			</button>
			<button class="addBt" @click="moveColumn(1)" :data-tooltip="$t('global.tooltips.column_move')"
			v-if="config.order < $store('params').chatColumnsConfig.length-1">
				<img src="@/assets/icons/right.svg" alt="add column" class="icon">
			</button>
		</div>

		<div class="holder" v-if="expand || forceConfig" @click="clickPreview($event)">
			<div class="content">
				<div class="head">
					<h1 class="title">{{ $t('chat.filters.title') }}</h1>
					<button :aria-label="$t('chat.filters.closeBt_aria')" class="closeBt" @click="expand = false" v-if="!forceConfig">
						<img src="@/assets/icons/cross_white.svg" :alt="$t('chat.filters.closeBt_aria')" class="icon">
					</button>
				</div>
				
				<div class="info" v-if="expand || forceConfig">{{ $t('chat.filters.header') }}</div>
				
				<div class="presets">
					<Button @click="preset('chat')" :title="$t('chat.filters.preset_chat')" :icon="$image('icons/whispers_purple.svg')" small white />
					<Button @click="preset('chatSafe')" :title="$t('chat.filters.preset_chatSafe')" :icon="$image('icons/shield_purple.svg')" small white />
					<Button @click="preset('moderation')" :title="$t('chat.filters.preset_moderation')" :icon="$image('icons/mod_purple.svg')" small white />
					<Button @click="preset('activities')" :title="$t('chat.filters.preset_activities')" :icon="$image('icons/stars_purple.svg')" small white />
					<Button @click="preset('games')" :title="$t('chat.filters.preset_games')" :icon="$image('icons/bingo_purple.svg')" small white />
					<Button @click="preset('revenues')" :title="$t('chat.filters.preset_revenues')" :icon="$image('icons/coin_purple.svg')" small white />
				</div>
				
				<div class="paramsList">

					<ToggleButton class="item toggleAll" v-model="toggleAll" clear />

					<div class="item" v-for="f in filters"
					:key="'filter_'+f.storage">
						<ParamItem
							:paramData="f"
							clearToggle
							@change="saveData()"
							@mouseleave="mouseLeaveItem"
							@mouseenter="mouseEnterItem"
							v-model="config.filters[f.storage as 'message']" />

						<ToggleBlock class="item whispersPermissions"
						:title="$t('chat.filters.whispers_permissions')"
						small
						:open="false"
						v-if="f.storage == whisperType && config.filters.whisper === true">
							<PermissionsForm clear v-model="config.whispersPermissions" @update:modelValue="saveData()" />
						</ToggleBlock>
					</div>
				
					<div class="subFilters">
						<ParamItem class="item child"
							v-if="config.filters.message === true"
							key="subfilter_blockUsers"
							:childLevel="1"
							:paramData="param_blockUsers"
							clearToggle
							@click.stop
							@change="saveData()"
							v-model="config.userBlockList" />
					
						<ParamItem class="item child" v-for="f in messageFilters"
							v-if="config.filters.message === true"
							:key="'subfilter_'+f.storage"
							:childLevel="1"
							:paramData="f"
							clearToggle
							@click.stop
							@change="saveData()"
							@mouseleave="mouseLeaveItem"
							@mouseenter="previewSubMessage(f.storage as 'bots'/* couldn't find a way to strongly cast storage type */)"
							v-model="config.messageFilters[f.storage as 'bots']" />
					</div>
						
				</div>

				<div class="error" v-if="error" @click="error=false">{{ $t('chat.filters.no_selection') }}</div>

				<div class="ctas">
					<Button :title="$t('global.cancel')" small :icon="$image('icons/cross_white.svg')" highlight v-if="forceConfig" @click="deleteColumn()" />
					<Button :title="$t('global.create')" small :icon="$image('icons/add_purple.svg')" white v-if="forceConfig" @click="submitForm()" />
				</div>
			</div>

			<div class="previewList" ref="previewList" v-if="loadingPreview || previewData.length > 0 || missingScope">
				<div class="preview missingScope" v-if="missingScope">
					<img src="@/assets/icons/unlock_dark.svg">
					<p>{{ $t("chat.filters.scope_missing") }}</p>
				</div>

				<div class="preview" v-if="loadingPreview">
					<img src="@/assets/loader/loader_white.svg" alt="loading" class="loader">
				</div>
	
				<div class="preview" v-for="m in previewData" :key="'preview_'+m.id" @click="clickPreview($event)">
					
					<ChatAd class="message"
						v-if="m.type == 'twitchat_ad'"
						:messageData="m" />
						
					<ChatNotice class="message"
						v-else-if="m.type == 'notice'"
						:messageData="m" />
	
					<ChatJoinLeave class="message"
						v-else-if="(m.type == 'join' || m.type == 'leave')"
						:messageData="m" />
	
					<ChatConnect class="message"
						v-else-if="(m.type == 'connect' || m.type == 'disconnect')"
						:messageData="m" />
	
					<ChatMessage class="message"
						v-else-if="m.type == 'message' || m.type == 'whisper'"
						:messageData="m" />
	
					<ChatPollResult class="message"
						v-else-if="m.type == 'poll'"
						:messageData="m" />
	
					<ChatPredictionResult class="message"
						v-else-if="m.type == 'prediction'"
						:messageData="m" />
	
					<ChatBingoResult class="message"
						v-else-if="m.type == 'bingo'"
						:messageData="m" />
	
					<ChatRaffleResult class="message"
						v-else-if="m.type == 'raffle'"
						:messageData="m" />
	
					<ChatCountdownResult class="message"
						v-else-if="m.type == 'countdown'"
						:messageData="m" />
	
					<ChatHypeTrainResult class="message"
						v-else-if="m.type == 'hype_train_summary'"
						:messageData="m" />
	
					<ChatFollowbotEvents class="message"
						v-else-if="m.type == 'followbot_list'"
						:messageData="m" />
	
					<ChatShoutout class="message"
						v-else-if="m.type == 'shoutout'"
						:messageData="m" />

					<ChatLowTrustTreatment class="message"
						v-else-if="m.type == 'low_trust_treatment'"
						:messageData="m" />

					<ChatPinNotice class="message"
						v-else-if="m.type == 'pinned' || m.type == 'unpinned'"
						:messageData="m" />

					<ChatBan class="message"
						v-else-if="m.type == 'ban'"
						:messageData="m" />

					<ChatUnban class="message"
						v-else-if="m.type == 'unban'"
						:messageData="m" />
	
					<ChatHighlight v-else class="message"
						lightMode
						:messageData="m" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ChatAd from '../ChatAd.vue';
import ChatBingoResult from '../ChatBingoResult.vue';
import ChatConnect from '../ChatConnect.vue';
import ChatCountdownResult from '../ChatCountdownResult.vue';
import ChatFollowbotEvents from '../ChatFollowbotEvents.vue';
import ChatHighlight from '../ChatHighlight.vue';
import ChatHypeTrainResult from '../ChatHypeTrainResult.vue';
import ChatJoinLeave from '../ChatJoinLeave.vue';
import ChatMessage from '../ChatMessage.vue';
import ChatNotice from '../ChatNotice.vue';
import ChatPollResult from '../ChatPollResult.vue';
import ChatPredictionResult from '../ChatPredictionResult.vue';
import ChatRaffleResult from '../ChatRaffleResult.vue';
import ChatShoutout from '../ChatShoutout.vue';
import ChatLowTrustTreatment from '../ChatLowTrustTreatment.vue';
import ChatPinNotice from '../ChatPinNotice.vue';
import ChatBan from '../ChatBan.vue';
import ChatUnban from '../ChatUnban.vue';
import { TwitchScopes, type TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import PermissionsForm from '@/components/PermissionsForm.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';

@Options({
	props:{
		modelValue:{type:Object, default: {}},
		open:{type:Boolean, default: false},
		forceConfig:{type:Boolean, default: false},
		config:Object,
	},
	components:{
		Button,
		ParamItem,
		ToggleButton,
		ChatAd,
		ChatBan,
		ChatUnban,
		ChatConnect,
		ChatShoutout,
		ChatBingoResult,
		ChatCountdownResult,
		ChatFollowbotEvents,
		ChatHighlight,
		ChatHypeTrainResult,
		ChatJoinLeave,
		ChatMessage,
		ChatNotice,
		ChatPollResult,
		ChatPredictionResult,
		ChatLowTrustTreatment,
		ChatRaffleResult,
		ChatPinNotice,
		PermissionsForm,
		ToggleBlock,
	},
	emits: ['update:modelValue', 'submit', 'add', 'change'],
})
export default class MessageListFilter extends Vue {
	
	public open!:boolean;
	public forceConfig!:boolean;
	public config!:TwitchatDataTypes.ChatColumnsConfig;
	
	public error:boolean = false;
	public expand:boolean = false;
	public toggleAll:boolean = false;
	public typeToLabel!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:string};
	public typeToIcon!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:string};
	public typeToScope!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:TwitchScopesString};
	public filters:TwitchatDataTypes.ParameterData[] = [];
	public messageFilters:TwitchatDataTypes.ParameterData[] = [];
	public previewData:TwitchatDataTypes.ChatMessageTypes[] = [];
	public mouseOverToggle:boolean = false;
	public loadingPreview:boolean = false;
	public missingScope:boolean = false;
	public previewIndex:number = 0;
	public param_blockUsers:TwitchatDataTypes.ParameterData = {type:"editablelist", value:"", labelKey:"chat.filters.hide_users", placeholderKey:"chat.filters.hide_users_placeholder", icon:"hide.svg", maxLength:1000000};
	public messageKeyToScope:{[key in keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters]:TwitchScopesString[]}|null = null;
	
	private mouseY = 0;
	private disposed = false;
	private touchMode = false;
	private clickHandler!:(e:MouseEvent|TouchEvent) => void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private messagesCache:Partial<{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:TwitchatDataTypes.ChatMessageTypes[]}> = {}
	private subMessagesCache:Partial<{[key in keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters]:TwitchatDataTypes.ChatMessageTypes[]}> = {}

	public get whisperType() { return TwitchatDataTypes.TwitchatMessageType.WHISPER; }

	public get classes():string[] {
		const res = ["messagelistfilter"];
		if(this.$store("params").appearance.splitViewVertical.value === true) res.push("verticalSplitMode");
		if(this.expand || this.forceConfig) res.push("expand");
		if(this.forceConfig) res.push("fullSize");
		return res;
	}

	public get canDelete():boolean {
		return this.$store('params').chatColumnsConfig.length > 1;
	}

	public beforeMount(): void {
		type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;

		if(!this.config.whispersPermissions) {
			this.config.whispersPermissions = {
				broadcaster:true,
				follower:true,
				mods:true,
				subs:true,
				vips:true,
				all:true,
				follower_duration_ms:0,
				usersAllowed:[],
				usersRefused:[],
			}
		}

		//@ts-ignore
		this.typeToLabel = {};
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD] = "chat.filters.message_types.twitchat_ad";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.BAN] = "chat.filters.message_types.ban";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.RAID] = "chat.filters.message_types.raid";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.POLL] = "chat.filters.message_types.poll";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.JOIN] = "chat.filters.message_types.join";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.UNBAN] = "chat.filters.message_types.unban";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.LEAVE] = "chat.filters.message_types.leave";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.CHEER] = "chat.filters.message_types.cheer";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.BINGO] = "chat.filters.message_types.bingo";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.RAFFLE] = "chat.filters.message_types.raffle";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.PINNED] = "chat.filters.message_types.pinned";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.REWARD] = "chat.filters.message_types.reward";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.NOTICE] = "chat.filters.message_types.notice";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.MESSAGE] = "chat.filters.message_types.message";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.WHISPER] = "chat.filters.message_types.whisper";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.SHOUTOUT] = "chat.filters.message_types.shoutout";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.FOLLOWING] = "chat.filters.message_types.following";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COUNTDOWN] = "chat.filters.message_types.countdown";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.PREDICTION] = "chat.filters.message_types.prediction";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION] = "chat.filters.message_types.subscription";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY] = "chat.filters.message_types.hype_train_summary";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN] = "chat.filters.message_types.hype_train_cooled_down";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE] = "chat.filters.message_types.community_boost_complete";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION] = "chat.filters.message_types.community_challenge_contribution";
		
		//@ts-ignore
		this.typeToIcon = {};
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD] = "twitchat.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.BAN] = "ban.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.UNBAN] = "unban.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.RAID] = "raid.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.POLL] = "poll.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.JOIN] = "enter_white.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.LEAVE] = "leave_white.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.CHEER] = "bits.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.BINGO] = "bingo.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.RAFFLE] = "ticket.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.PINNED] = "pin.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.REWARD] = "channelPoints.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.NOTICE] = "info.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.MESSAGE] = "user.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.WHISPER] = "whispers.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.SHOUTOUT] = "shoutout.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.FOLLOWING] = "follow.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COUNTDOWN] = "countdown.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.PREDICTION] = "prediction.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION] = "sub.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY] = "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN] = "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE] = "boost.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION] = "channelPoints.svg";
		
		//@ts-ignore
		this.typeToScope = {};
		this.typeToScope[TwitchatDataTypes.TwitchatMessageType.BAN] = TwitchScopes.MODERATE;
		this.typeToScope[TwitchatDataTypes.TwitchatMessageType.UNBAN] = TwitchScopes.MODERATE;
		this.typeToScope[TwitchatDataTypes.TwitchatMessageType.REWARD] = TwitchScopes.LIST_REWARDS;
		this.typeToScope[TwitchatDataTypes.TwitchatMessageType.WHISPER] = TwitchScopes.WHISPER_READ;
		this.typeToScope[TwitchatDataTypes.TwitchatMessageType.PREDICTION] = TwitchScopes.MANAGE_PREDICTIONS;
		this.typeToScope[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION] = TwitchScopes.LIST_SUBS;
		this.typeToScope[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY] = TwitchScopes.READ_HYPE_TRAIN;
		this.typeToScope[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN] = TwitchScopes.READ_HYPE_TRAIN;

		const sortedFilters:typeof TwitchatDataTypes.MessageListFilterTypes[number][] = [
			TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
			TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
			TwitchatDataTypes.TwitchatMessageType.CHEER,
			TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY,
			TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN,
			TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE,
			TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION,
			TwitchatDataTypes.TwitchatMessageType.RAID,
			TwitchatDataTypes.TwitchatMessageType.PINNED,
			TwitchatDataTypes.TwitchatMessageType.SHOUTOUT,
			TwitchatDataTypes.TwitchatMessageType.BAN,
			TwitchatDataTypes.TwitchatMessageType.UNBAN,
			TwitchatDataTypes.TwitchatMessageType.REWARD,
			TwitchatDataTypes.TwitchatMessageType.POLL,
			TwitchatDataTypes.TwitchatMessageType.PREDICTION,
			TwitchatDataTypes.TwitchatMessageType.BINGO,
			TwitchatDataTypes.TwitchatMessageType.RAFFLE,
			TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
			TwitchatDataTypes.TwitchatMessageType.JOIN,
			TwitchatDataTypes.TwitchatMessageType.LEAVE,
			TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
			TwitchatDataTypes.TwitchatMessageType.WHISPER,
			TwitchatDataTypes.TwitchatMessageType.NOTICE,
			TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		];

		this.filters = [];
		for (let i = 0; i < sortedFilters.length; i++) {
			const f = sortedFilters[i];
			const children:TwitchatDataTypes.ParameterData[] = [];

			this.filters.push({type:"toggle",
								value:this.config.filters[f],
								labelKey:this.typeToLabel[f] ?? f,
								icon:this.typeToIcon[f],
								twitch_scope:this.typeToScope[f],
								storage:f,
							});

			//Add sub-filters to the message types so we can filter mods, new users, automod, etc...
			if(f === TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				const keyToLabel = this.$tm("chat.filters.message_filters") as {[key in messageFilterTypes]:string}
				const keyToIcon:{[key in messageFilterTypes]:string} = {
					viewers:"user.svg",
					vips:"vip.svg",
					subs:"sub.svg",
					moderators:"mod.svg",
					partners:"partner.svg",
					bots:"bot.svg",
					deleted:"delete.svg",
					automod:"shield.svg",
					suspiciousUsers:"shield.svg",
					commands:"commands.svg",
					short:"",
					tracked:"magnet.svg",
					pinned:"pin.svg",
				};
				this.messageKeyToScope = {
					viewers:[],
					vips:[],
					subs:[],
					moderators:[],
					partners:[],
					bots:[],
					deleted:[],
					automod:[TwitchScopes.AUTOMOD,TwitchScopes.MODERATE],
					suspiciousUsers:[TwitchScopes.AUTOMOD,TwitchScopes.MODERATE],
					commands:[],
					short:[],
					tracked:[],
					pinned:[],
				};
				//Create parent toggle
				if(!this.config.messageFilters) {
					this.config.messageFilters = {
						bots:true,
						automod:true,
						commands:true,
						deleted:true,
						suspiciousUsers:true,
						viewers:true,
						vips:true,
						subs:true,
						moderators:true,
						partners:true,
						short:true,
						tracked:true,
						pinned:true,
					};
				}
				for (const key in keyToLabel) {
					const k = key as messageFilterTypes;
					if(this.config.messageFilters[k] == undefined) {
						this.config.messageFilters[k] = true;
					}
					const param:TwitchatDataTypes.ParameterData = {type:"toggle",
						value:this.config.messageFilters[k],
						labelKey:"chat.filters.message_filters."+k,
						storage:key,
						icon:keyToIcon[k],
					};
					if(this.messageKeyToScope[k] && this.messageKeyToScope[k].length > 0) {
						param.twitch_scope = this.messageKeyToScope[k];
					}
					if(k == 'commands') {
						const subParam:TwitchatDataTypes.ParameterData = {
								type:"editablelist",
								longText:true,
								value:this.config.commandsBlockList,
								labelKey:'chat.filters.commands',
								placeholderKey:"chat.filters.commands_placeholder",
								icon:"hide.svg",
								maxLength:1000000,
								editCallback:(data:string[])=> {
									this.config.commandsBlockList = data;
									this.saveData();
								}};
						param.children = [subParam];
					}
					if(k == "short") {
						param.tooltipKey = 'chat.filters.short_tt';
					}
					if(k == "tracked") {
						param.tooltipKey = 'chat.filters.tracked_tt';
					}
					children.push(param);
				}
				this.messageFilters = children;
			}
		}
		
		this.clickHandler		= (e:MouseEvent|TouchEvent) => this.onMouseDown(e);
		this.mouseMoveHandler	= (e:MouseEvent|TouchEvent) => this.onMouseMove(e);
		document.addEventListener("touchstart", this.clickHandler);
		document.addEventListener("mousedown", this.clickHandler);
		document.addEventListener("mousemove", this.mouseMoveHandler);
		document.addEventListener("touchmove", this.mouseMoveHandler);
		
		//Force focus out of input when rolling out
		watch(()=>this.open, ()=>{
			//This makes sure any data written on a text input is saved.
			//<ParamItem> uses a "lazy" update that is triggered only when input
			//looses focus. THis is why we remove the focus of the current
			//element here, just in case.
			let root = document.activeElement as HTMLElement;
			while(root && root != this.$el && root != document.body) {
				root = root.parentElement as HTMLElement;
			}
			if(!this.open && root == this.$el) {
				const el = document.activeElement as HTMLElement
				//Do not blur if it's a <vue-select> component
				if(!el.classList.contains("vs__search")) {
					el.blur();
				}
			}
		});
		watch(()=>this.toggleAll, ()=>{
			for (let i = 0; i < this.filters.length; i++) {
				this.filters[i].value = this.toggleAll;
			}
			for (const key in this.config.messageFilters) {
				const k = key as messageFilterTypes;
				this.config.messageFilters[k] = this.toggleAll;
			}
		});
		requestAnimationFrame(()=>this.renderFrame());
	}

	public beforeUnmount():void {
		this.disposed = true;
		document.removeEventListener("touchstart", this.clickHandler);
		document.removeEventListener("mousedown", this.clickHandler);
		document.removeEventListener("mousemove", this.mouseMoveHandler);
		document.removeEventListener("touchmove", this.mouseMoveHandler);
	}

	public mouseEnterItem(event:MouseEvent, data:TwitchatDataTypes.ParameterData):void {
		this.mouseOverToggle = true;
		this.previewMessage(data.storage as typeof TwitchatDataTypes.MessageListFilterTypes[number]);
	}
	
	public mouseLeaveItem(event:MouseEvent):void {
		if(this.touchMode) return;
		this.mouseOverToggle = false;
		this.missingScope = false;
		this.previewData = [];
	}

	public async previewMessage(type:typeof TwitchatDataTypes.MessageListFilterTypes[number]):Promise<void> {
		this.previewData = [];
		this.loadingPreview = true;
		this.missingScope = this.typeToScope[type] && !TwitchUtils.hasScope(this.typeToScope[type]);
		this.previewIndex ++;
		const previewIndexLoc = this.previewIndex;
		const cached = this.messagesCache[type];
		if(cached && cached.length > 0) {
			this.previewData = cached;
			this.loadingPreview = false;
			return;
		}

		await this.$nextTick();

		this.messagesCache[type] = [];
		if(type == TwitchatDataTypes.TwitchatMessageType.NOTICE) {
			this.$store('debug').simulateNotice(TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store('debug').simulateNotice(TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store('debug').simulateNotice(TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.CONNECT, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.loadingPreview = false;

		}else
			if(type == TwitchatDataTypes.TwitchatMessageType.SHOUTOUT) {
				this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.SHOUTOUT, (data:TwitchatDataTypes.ChatMessageTypes)=> {
					if(!data || !this.mouseOverToggle) return;
					const dataCast = data as TwitchatDataTypes.MessageShoutoutData;
					dataCast.received = false;
					this.messagesCache[type]?.push(data);
					if(previewIndexLoc != this.previewIndex) return;
					this.previewData.push(data);
				}, false);
				this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.SHOUTOUT, (data:TwitchatDataTypes.ChatMessageTypes)=> {
					if(!data || !this.mouseOverToggle) return;
					const dataCast = data as TwitchatDataTypes.MessageShoutoutData;
					dataCast.received = true;
					this.messagesCache[type]?.push(data);
					if(previewIndexLoc != this.previewIndex) return;
					this.previewData.push(dataCast);
				}, false);
				this.loadingPreview = false;

			}else{

			this.$store('debug').simulateMessage(type, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				this.loadingPreview = false;
	
				if(!data || !this.mouseOverToggle) return;

				this.messagesCache[type] = [data];
	
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData = [data];
			}, false);
		}
	}

	public async previewSubMessage(type:keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters):Promise<void> {
		this.previewData = [];
		this.loadingPreview = true;
		this.previewIndex ++;
		this.missingScope = this.messageKeyToScope != null && this.messageKeyToScope[type] && !TwitchUtils.hasScope(this.messageKeyToScope[type]);
		this.mouseOverToggle = true;
		const previewIndexLoc = this.previewIndex;
		const cached = this.subMessagesCache[type];
		if(cached && cached.length > 0) {
			this.previewData = cached;
			this.loadingPreview = false;
			return;
		}

		await this.$nextTick();

		this.subMessagesCache[type] = [];
		this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
			this.loadingPreview = false;
			if(!data || !this.mouseOverToggle) return;
			
			const dataCast = data as TwitchatDataTypes.MessageChatData;

			if(type == "automod") {
				let words:string[] = [];
				do {
					words.push( Utils.pickRand(dataCast.message.split(" ")) );
				}while(Math.random() > .5)

				dataCast.twitch_automod = { reasons:["bullying"], words };
			}else if(type == "deleted") {
				dataCast.deleted = true;
			}else if(type == "suspiciousUsers") {
				dataCast.twitch_isSuspicious = true;
			}else {
				return;
			}

			if(previewIndexLoc != this.previewIndex) return;

			this.previewData.push(data);
			this.subMessagesCache[type] = this.previewData;

		}, false);
		
		if(type == "automod") {
			this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data || !this.mouseOverToggle) return;

				const dataCast = data as TwitchatDataTypes.MessageChatData;
				dataCast.twitch_isRestricted = true;
				const users:TwitchatDataTypes.TwitchatUser[] = [];
				const list = this.$store("users").users;
				for (let i = 0; i < list.length; i++) {
					users.push(list[i]);
					if(Math.random() > .3) break;
				}

				dataCast.twitch_sharedBanChannels = users.map(v=> { return {id:v.id, login:v.login}; })

				if(previewIndexLoc != this.previewIndex) return;

				this.previewData.push(data);
				this.subMessagesCache[type] = this.previewData;
			}, false);
		}
	}

	/**
	 * Called when preview message is clicked.
	 * ONly usefull for touch interface so we can close it by clicking it
	 */
	public clickPreview(e:MouseEvent):void {
		e.stopPropagation();
		e.preventDefault();
		this.previewData = [];
	}

	/**
	 * Called when submitting form.
	 * This button is only here when creating anew column.
	 * In such case user is prompted for filters selection and has
	 * to select some in order to see the matching messages
	 */
	public submitForm():void {
		this.error = false;
		let noSelection = true;
		for (const key in this.config.filters) {
			if(this.config.filters[key as typeof TwitchatDataTypes.MessageListFilterTypes[number]] === true) {
				noSelection = false;
				break;
			}
		}
		if(noSelection) {
			this.error = true;
		}else{
			this.$emit("submit");
		}
	}

	/**
	 * Force data save
	 */
	public saveData():void {
		this.$emit("change");
		this.$store("params").saveChatColumnConfs();
	}

	/**
	 * Called when clicking a preset
	 */
	public preset(id:"chat"|"chatSafe"|"moderation"|"activities"|"games"|"revenues"):void {
		this.toggleAll = false;
		//Unselect all
		for (let i = 0; i < this.filters.length; i++) {
			this.filters[i].value = false;
		}
		type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;
		const ids:typeof TwitchatDataTypes.MessageListFilterTypes[number][] = [];
		switch(id) {
			case "chat": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.NOTICE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.MESSAGE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.WHISPER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD );
				// ids.push( TwitchatDataTypes.TwitchatMessageType.JOIN );
				// ids.push( TwitchatDataTypes.TwitchatMessageType.LEAVE );
				for (const key in this.config.messageFilters) {
					const k = key as messageFilterTypes;
					this.config.messageFilters[k] = true;
				}
				break;
			}
			case "chatSafe": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.NOTICE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.MESSAGE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.WHISPER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD );
				for (const key in this.config.messageFilters) {
					const k = key as messageFilterTypes;
					this.config.messageFilters[k] = k != "automod"
												 && k != "deleted"
												 && k != "suspiciousUsers";
				}
				break;
			}
			case "moderation": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.BAN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.UNBAN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.NOTICE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAID );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SHOUTOUT );
				ids.push( TwitchatDataTypes.TwitchatMessageType.MESSAGE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.WHISPER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PINNED );
				for (const key in this.config.messageFilters) {
					const k = key as messageFilterTypes;
					this.config.messageFilters[k] = k == "automod"
												 || k == "deleted"
												 || k == "tracked"
												 || k == "pinned"
												 || k == "suspiciousUsers"
												 || k == "moderators";
				}
				break;
			}
			case "activities": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.BAN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAID );
				ids.push( TwitchatDataTypes.TwitchatMessageType.POLL );
				ids.push( TwitchatDataTypes.TwitchatMessageType.CHEER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.UNBAN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.BINGO );
				ids.push( TwitchatDataTypes.TwitchatMessageType.NOTICE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAFFLE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.REWARD );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PINNED );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SHOUTOUT );
				ids.push( TwitchatDataTypes.TwitchatMessageType.FOLLOWING );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COUNTDOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PREDICTION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION );
				break;
			}
			case "games": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.POLL );
				ids.push( TwitchatDataTypes.TwitchatMessageType.BINGO );
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAFFLE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.REWARD );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COUNTDOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PREDICTION );
				break;
			}
			case "revenues": {
				ids.push( TwitchatDataTypes.TwitchatMessageType.CHEER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE );
				break;
			}
		}

		for (let i = 0; i < ids.length; i++) {
			const filter = this.filters.find(v => (v.storage as typeof TwitchatDataTypes.MessageListFilterTypes[number]) === ids[i]);
			if(filter) filter.value = true;
		}

		this.saveData();
	}

	/**
	 * Called when requesting to delete the current column
	 */
	public deleteColumn():void {
		this.$store("main")
		.confirm(this.$t("chat.delete_col_confirm_title"), this.$t("chat.delete_col_confirm_desc"))
		.then(()=> {
			this.$store("params").delChatColumn(this.config);
		})
	}

	/**
	 * Called when requesting to move a column
	 */
	public moveColumn(direction:number):void {
		this.$store("params").moveChatColumn(this.config, direction);
	}

	/**
	 * Called when the mouse moves
	 */
	private async onMouseMove(e:MouseEvent|TouchEvent):Promise<void> {
		if(!this.open) return;

		this.touchMode = e.type != "mousemove";
		if(!this.touchMode) {
			this.mouseY = (e as MouseEvent).clientY;
		}else{
			this.mouseY = (e as TouchEvent).touches[0].clientY;
		}
	}

	private onMouseDown(e:MouseEvent|TouchEvent):void {
		if(!this.open) return;
		
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		this.touchMode = e.type == "touchstart";
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.expand = false;
		}
	}

	/**
	 * Move message previews
	 */
	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		
		if(!this.open) return;
		
		const holder = this.$refs.previewList as HTMLDivElement;
		if(!holder) return;
		
		const parentBounds = (this.$el as HTMLDivElement).getBoundingClientRect()
		const bounds = holder.getBoundingClientRect();
		const margin = 50;
		let py = this.mouseY - parentBounds.top + margin;
		if(py + bounds.height > (this.$el as HTMLDivElement).offsetHeight) {
			py = this.mouseY - parentBounds.top - bounds.height - margin;
		}

		holder.style.top = py+"px";
	}

}
</script>

<style scoped lang="less">
.messagelistfilter{
	padding: 0;
	color: @mainColor_light;
	background: @mainColor_normal;
	max-height: 100%;//min(100%, 300px);
	height: 100%;//min(100%, 300px);
	width: 100%;//min(100%, 300px);
	display: flex;
	flex-direction: row;
	border-bottom-left-radius: .5em;
	transform: translateX(100%);
	transition: transform .25s;
	position: relative;
	opacity: .95;
	// opacity: .4;
	pointer-events: none;
	max-width: 400px;

	&.expand {
		transform: translateX(0);
	}

	&.verticalSplitMode {
		max-width: 700px;
		.holder {
			.content {
				width: 100%;
				max-width: 100%;
				.paramsList {
					display: flex;
					flex-direction: row;
					align-items: flex-start;
					justify-content: center;
					flex-wrap: wrap;
					flex-grow: 0;
					margin: unset;
					.item {
						margin: unset;
					}
					.item:not(.toggleAll) {
						margin-right: 1em;
						width: 300px;
						max-width: 300px;
					}
					.item.toggleAll {
						margin-left: 268px;
						margin-right: 1em;
						width: 32px;
					}
					.subFilters {
						flex-basis: 100%;
						// margin: 0 auto;
						// justify-self: center;
						// margin-right: 0;
						// margin-left: auto;
						&>.item {
							margin-left: auto;
							margin-right: auto;
							max-width: 280px;
							&:deep(.holder)::before{
								display: none;
							}
						}
					}
				}
			}
		}
	}

	&.fullSize {
		max-width: 100%;
	}

	.hoverActions {
		@size: 1.25em;
		@padding: .25em;
		margin-left: -@size - @padding * 2;
		width: @size + @padding * 2;
		display: flex;
		flex-direction: column;
		background: @mainColor_light;
		gap: 1px;
		top:50%;
		padding: @padding;
		border-bottom-left-radius: .25em;
		height: fit-content;
		button {
			display: flex;
			align-items: center;
			pointer-events: all;
			padding: calc(@size/4);
			width: @size;
			height: @size;
			min-width: @size;
			min-height: @size;
			background-color: @mainColor_normal;
			border-radius: .25em;
			.icon {
				height: 100%;
				width: 100%;
			}
		}
	}

	.holder {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 1em;
		padding-top: .5em;
		pointer-events: all;
		.content {

			flex-grow: 1;
			display: flex;
			flex-direction: column;
			height: 100%;
			margin: auto;

			.head {
				display: flex;
				flex-direction: row;
				width: 100%;
				align-items: center;
				.title {
					flex-grow: 1;
					text-align: center;
				}
				.closeBt {
					background: none;
					border: none;
					padding: 0;
					width: 1em;
					height: 1em;
					cursor: pointer;
					.icon {
						height: 100%;
						width: 100%;
					}
				}
			}

			.info {
				margin: .5em 0;
				text-align: center;
			}
			.presets {
				display: flex;
				flex-direction: row;
				justify-content: space-around;
				flex-wrap: wrap;
				justify-content: center;
				button {
					margin-bottom: .5em;
					&:not(:first-child) {
						margin-left: .5em;
					}
				}
			}

			.paramsList {
				flex-grow: 1;
				overflow: auto;
				margin: auto;
				padding: 0 .25em;
				.item{
					margin: auto;
					font-size: .8em;
					&:not(:first-child) {
						margin-top: .25em;
					}
					&:hover {
						background-color: fade(@mainColor_light, 10%);
					}
					&.disabled {
						opacity: .75;
						font-style: italic;
						color: #ccc;
						cursor: not-allowed;
						cursor: help;
					}

					&.toggleAll {
						margin-right: 0;
					}
					&.child {
						font-size: .8em;
						@offset:1.25em;
						margin-left: @offset;
						width: calc(100% - @offset);
						:deep(textarea), :deep(.listField) {
							position: relative;
							font-size: .9em;
							//Offset to the left to give it a bit more space
							left: -2em;
							width: calc(100% + 2em);
							min-width: calc(100% + 2em);
							max-width: calc(100% + 2em);
						}
					}
	
					&.whispersPermissions {
						border-left: 1px solid white;
						padding-left: .75em;
						margin-left: .5em;
						margin-bottom: 1em;
					}
				}
			}
			.error {
				padding: .5em;
				border-radius: .5em;
				margin-top: .5em;
				text-align: center;
				font-size: .8em;
				font-weight: bold;
				cursor: pointer;
				color:@mainColor_alert;
				background: @mainColor_light;
				
			}
			.ctas {
				margin-top: .5em;
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
			}
		}

		.previewList {
			position: absolute;
			width: calc(100% - 1em*2);
			max-width: 500px;
			transform: translateX(-50%);
			left: 50%;
			top: 99999px;
			z-index: 1;
			.preview {
				background-color: @mainColor_dark;
				padding: .25em .5em;
				border-radius: .5em;
				cursor: pointer;
				.message {
					pointer-events: none;
				}
				.loader {
					text-align: center;
					margin: auto;
					display: block;
				}
	
				&:not(:last-child) {
					margin-bottom: .25em;
				}
				&.missingScope {
					font-size: .8em;
					padding: .75em;
					text-align: center;
					background-color: @mainColor_warn;
					color: @mainColor_dark;
					font-weight: bold;
					img {
						height: 1.5em;
					}
				}
			}
		}
	}
}
</style>