<template >
	<div :class="classes" v-show="open || expand" @wheel.stop>
		<div class="cta" v-if="showCTA" @click="hideCTA()">
			<span class="label">{{ $t("chat.filters.cta") }}</span>
			<img src="@/assets/icons/right.svg">
		</div>

		<div class="hoverActions" v-if="!expand">
			<button class="openBt" @click="openFilters(true)" v-tooltip="{content:$t('global.tooltips.column_edit'), placement:'left' }">
				<img src="@/assets/icons/filters.svg" alt="open filters" class="icon">
			</button>
			<button class="deleteBt" @click="deleteColumn()" v-if="canDelete" v-tooltip="{content:$t('global.tooltips.column_delete'), placement:'left' }">
				<img src="@/assets/icons/cross.svg" alt="delete column" class="icon">
			</button>
			<button class="addBt" @click="$emit('add')" v-tooltip="{content:$t('global.tooltips.column_add'), placement:'left' }">
				<img src="@/assets/icons/add.svg" alt="add column" class="icon">
			</button>
			<button class="addBt" @click="moveColumn(-1)" v-tooltip="{content:$t('global.tooltips.column_move'), placement:'left' }"
			v-if="config.order > 0">
				<img src="@/assets/icons/left.svg" alt="add column" class="icon">
			</button>
			<button class="addBt" @click="moveColumn(1)" v-tooltip="{content:$t('global.tooltips.column_move'), placement:'left' }"
			v-if="config.order < $store('params').chatColumnsConfig.length-1">
				<img src="@/assets/icons/right.svg" alt="add column" class="icon">
			</button>
		</div>

		<div class="holder" v-if="expand || forceConfig" @click="clickPreview($event)">
			<div class="content">
				<div class="head">
					<h1 class="title">{{ $t('chat.filters.title') }}</h1>
					<button :aria-label="$t('chat.filters.closeBt_aria')" class="closeBt" @click="closeFilters()" v-if="!forceConfig">
						<img src="@/assets/icons/cross.svg" :alt="$t('chat.filters.closeBt_aria')" class="icon">
					</button>
				</div>
				
				<div class="info" v-if="expand || forceConfig">{{ $t('chat.filters.header') }}</div>
				
				<div class="presets">
					<Button @click="preset('chat')" icon="whispers" small>{{ $t('chat.filters.preset_chat') }}</Button>
					<Button @click="preset('chatSafe')" icon="shield" small>{{ $t('chat.filters.preset_chatSafe') }}</Button>
					<Button @click="preset('moderation')" icon="mod" small>{{ $t('chat.filters.preset_moderation') }}</Button>
					<Button @click="preset('activities')" icon="stars" small>{{ $t('chat.filters.preset_activities') }}</Button>
					<Button @click="preset('moderation&activities')" icon="stars" small>{{ $t('chat.filters.preset_moderation_and_activities') }}</Button>
					<Button @click="preset('games')" icon="bingo" small>{{ $t('chat.filters.preset_games') }}</Button>
					<Button @click="preset('revenues')" icon="coin" small>{{ $t('chat.filters.preset_revenues') }}</Button>
				</div>
				
				<div class="paramsList">

					<ParamItem class="toggleAll" noBackground :paramData="param_toggleAll" @click.native="toggleAll()" />

					<div class="item" v-for="f in filters"
					:key="'filter_'+f.storage">
						<ParamItem :paramData="f"
						@change="saveData()"
						@mouseleave="mouseLeaveItem"
						@mouseenter="mouseEnterItem"
						v-model="config.filters[f.storage as 'message']">
							<template #child v-if="f.storage == whisperType && config.filters.whisper === true">
								<ToggleBlock class="whispersPermissions"
								:title="$t('chat.filters.whispers_permissions')"
								small
								:open="false">
									<PermissionsForm v-model="config.whispersPermissions" @update:modelValue="saveData()" />
								</ToggleBlock>
							</template>
							<template #child v-if="f.storage == messageType && config.filters.message === true">
								<div class="subFilters">
									<ParamItem class="item"
										v-if="config.filters.message === true"
										key="subfilter_blockUsers"
										:childLevel="1"
										:paramData="param_hideUsers"
										@click.stop
										@change="saveData()"
										v-model="config.userBlockList" />
								
									<ParamItem class="item" v-for="f in messageFilters"
										v-if="config.filters.message === true"
										:key="'subfilter_'+f.storage"
										:childLevel="1"
										:paramData="f"
										@click.stop
										@change="saveData()"
										@mouseleave="mouseLeaveItem"
										@mouseenter="previewSubMessage(f.storage as 'bots'/* couldn't find a way to strongly cast storage type */)"
										v-model="config.messageFilters[f.storage as 'bots']" />
								</div>
							</template>
						</ParamItem>

					</div>
						
				</div>

				<div class="error" v-if="error" @click="error=false">{{ $t('chat.filters.no_selection') }}</div>

				<div class="ctas">
					<Button small icon="cross" alert v-if="forceConfig" @click="deleteColumn()" >{{ $t('global.cancel') }}</Button>
					<Button small icon="add" secondary v-if="forceConfig" @click="submitForm()" >{{ $t('global.create') }}</Button>
				</div>

				<ParamItem class="showPanelsHere"
					:paramData="param_showPanelsHere"
					clearToggle
					@change="saveData()"
					v-model="config.showPanelsHere"
					v-if="$store('params').chatColumnsConfig.length > 1" />
			</div>

			<div class="previewList" ref="previewList" v-if="loadingPreview || previewData.length > 0 || missingScope">
				<div class="preview missingScope" v-if="missingScope">
					<img src="@/assets/icons/unlock.svg">
					<p>{{ $t("chat.filters.scope_missing") }}</p>
				</div>

				<div class="preview" v-if="loadingPreview">
					<img src="@/assets/loader/loader.svg" alt="loading" class="loader">
				</div>
	
				<div class="preview" v-for="m in previewData" :key="'preview_'+m.id" @click="clickPreview($event)">
					<MessageItem :messageData="m"
						lightMode
						disableConversation
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import PermissionsForm from '@/components/PermissionsForm.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { TwitchScopes, type TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import MessageItem from '../MessageItem.vue';

@Component({
	components:{
		Button,
		ParamItem,
		MessageItem,
		ToggleBlock,
		ToggleButton,
		PermissionsForm,
	},
	emits: ['submit', 'add', 'change'],
})
export default class MessageListFilter extends Vue {
	
	@Prop({type:Boolean, default: false})
	public open!:boolean;
	@Prop({type:Boolean, default: false})
	public forceConfig!:boolean;
	@Prop
	public config!:TwitchatDataTypes.ChatColumnsConfig;
	
	public error:boolean = false;
	public expand:boolean = false;
	public showCTA:boolean = false;
	public typeToLabel!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:string};
	public typeToIcon!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:string};
	public typeToScopes!:{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:TwitchScopesString[]};
	public filters:TwitchatDataTypes.ParameterData<boolean>[] = [];
	public messageFilters:TwitchatDataTypes.ParameterData<boolean, unknown, boolean>[] = [];
	public previewData:TwitchatDataTypes.ChatMessageTypes[] = [];
	public mouseOverToggle:boolean = false;
	public loadingPreview:boolean = false;
	public missingScope:boolean = false;
	public previewIndex:number = 0;
	public param_toggleAll:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.select_all" };
	public param_hideUsers:TwitchatDataTypes.ParameterData<string, string> = {type:"editablelist", value:"", labelKey:"chat.filters.hide_users", placeholderKey:"chat.filters.hide_users_placeholder", icon:"hide.svg", maxLength:1000000};
	public param_showPanelsHere:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.show_panels_here"};
	public messageKeyToScope:{[key in keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters]:TwitchScopesString[]}|null = null;
	
	private mouseY = 0;
	private disposed = false;
	private touchMode = false;
	private clickHandler!:(e:MouseEvent|TouchEvent) => void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private messagesCache:Partial<{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]]:TwitchatDataTypes.ChatMessageTypes[]|null}> = {}
	private subMessagesCache:Partial<{[key in keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters]:TwitchatDataTypes.ChatMessageTypes[]|null}> = {}

	public get whisperType() { return TwitchatDataTypes.TwitchatMessageType.WHISPER; }
	public get messageType() { return TwitchatDataTypes.TwitchatMessageType.MESSAGE; }

	public get classes():string[] {
		const res = ["messagelistfilter"];
		if(this.$store("params").appearance.splitViewVertical.value === true) res.push("verticalSplitMode");
		if(this.expand || this.forceConfig) res.push("expand");
		if(this.forceConfig) res.push("fullSize");
		if(this.showCTA) res.push("ctaMode");
		return res;
	}

	public get canDelete():boolean {
		return this.$store('params').chatColumnsConfig.length > 1;
	}

	public beforeMount(): void {
		type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;

		this.showCTA = DataStore.get(DataStore.CHAT_COL_CTA) !== "true" && this.config.order == 0;

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
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD]							= "chat.filters.message_types.twitchat_ad";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.BAN]									= "chat.filters.message_types.ban";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.RAID]								= "chat.filters.message_types.raid";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.POLL]								= "chat.filters.message_types.poll";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.JOIN]								= "chat.filters.message_types.join";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.UNBAN]								= "chat.filters.message_types.unban";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.LEAVE]								= "chat.filters.message_types.leave";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.CHEER]								= "chat.filters.message_types.cheer";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.BINGO]								= "chat.filters.message_types.bingo";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.RAFFLE]								= "chat.filters.message_types.raffle";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.PINNED]								= "chat.filters.message_types.pinned";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.REWARD]								= "chat.filters.message_types.reward";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.NOTICE]								= "chat.filters.message_types.notice";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.MESSAGE]								= "chat.filters.message_types.message";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.WHISPER]								= "chat.filters.message_types.whisper";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.SHOUTOUT]							= "chat.filters.message_types.shoutout";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.FOLLOWING]							= "chat.filters.message_types.following";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COUNTDOWN]							= "chat.filters.message_types.countdown";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.PREDICTION]							= "chat.filters.message_types.prediction";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION]						= "chat.filters.message_types.subscription";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE]						= "chat.filters.message_types.stream_online";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK]					= "chat.filters.message_types.user_watch_streak";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY]					= "chat.filters.message_types.hype_train_summary";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN]				= "chat.filters.message_types.hype_train_cooled_down";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE]			= "chat.filters.message_types.community_boost_complete";
		this.typeToLabel[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION]	= "chat.filters.message_types.community_challenge_contribution";
		
		//@ts-ignore
		this.typeToIcon = {};
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD]							= "twitchat.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.BAN]									= "ban.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.UNBAN]								= "unban.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.RAID]									= "raid.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.POLL]									= "poll.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.JOIN]									= "enter.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.LEAVE]								= "leave.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.CHEER]								= "bits.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.BINGO]								= "bingo.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.RAFFLE]								= "ticket.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.PINNED]								= "pin.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.REWARD]								= "channelPoints.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.NOTICE]								= "info.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.MESSAGE]								= "user.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.WHISPER]								= "whispers.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.SHOUTOUT]								= "shoutout.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.FOLLOWING]							= "follow.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COUNTDOWN]							= "countdown.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.PREDICTION]							= "prediction.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION]							= "sub.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE]						= "online.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK]					= "watchStreak.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY]					= "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN]				= "train.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE]				= "boost.svg";
		this.typeToIcon[TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION]		= "channelPoints.svg";
		
		//@ts-ignore
		this.typeToScopes = {};
		this.typeToScopes[TwitchatDataTypes.TwitchatMessageType.BAN]								= [TwitchScopes.MODERATION_EVENTS];
		this.typeToScopes[TwitchatDataTypes.TwitchatMessageType.UNBAN]								= [TwitchScopes.MODERATION_EVENTS];
		this.typeToScopes[TwitchatDataTypes.TwitchatMessageType.REWARD]								= [TwitchScopes.LIST_REWARDS];
		this.typeToScopes[TwitchatDataTypes.TwitchatMessageType.WHISPER]							= [TwitchScopes.WHISPER_READ];
		this.typeToScopes[TwitchatDataTypes.TwitchatMessageType.POLL]								= [TwitchScopes.MANAGE_POLLS];
		this.typeToScopes[TwitchatDataTypes.TwitchatMessageType.PREDICTION]							= [TwitchScopes.MANAGE_PREDICTIONS];
		this.typeToScopes[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY]					= [TwitchScopes.READ_HYPE_TRAIN];
		this.typeToScopes[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN]				= [TwitchScopes.READ_HYPE_TRAIN];
		this.typeToScopes[TwitchatDataTypes.TwitchatMessageType.FOLLOWING]							= [TwitchScopes.LIST_FOLLOWERS];

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
			TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE,
			TwitchatDataTypes.TwitchatMessageType.JOIN,
			TwitchatDataTypes.TwitchatMessageType.LEAVE,
			TwitchatDataTypes.TwitchatMessageType.NOTICE,
			TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK,
			TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
			TwitchatDataTypes.TwitchatMessageType.WHISPER,
			TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		];

		this.filters = [];
		for (let i = 0; i < sortedFilters.length; i++) {
			const f = sortedFilters[i];
			const children:TwitchatDataTypes.ParameterData<boolean, unknown, boolean>[] = [];
			const paramData:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean",
								value:this.config.filters[f],
								labelKey:this.typeToLabel[f] ?? f,
								icon:this.typeToIcon[f],
								twitch_scopes:this.typeToScopes[f],
								storage:f,
							}

			this.filters.push(paramData);

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
					automod:[TwitchScopes.AUTOMOD,TwitchScopes.MODERATION_EVENTS],
					suspiciousUsers:[TwitchScopes.AUTOMOD,TwitchScopes.MODERATION_EVENTS],
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

					const paramData:TwitchatDataTypes.ParameterData<boolean, unknown, string[]> = {type:"boolean",
						value:this.config.messageFilters[k],
						labelKey:"chat.filters.message_filters."+k,
						storage:key,
						icon:keyToIcon[k],
					};
					
					if(this.messageKeyToScope[k] && this.messageKeyToScope[k].length > 0) {
						paramData.twitch_scopes = this.messageKeyToScope[k];
					}

					if(k == 'commands') {
						const subParam:TwitchatDataTypes.ParameterData<string[]> = {
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
						paramData.children = [subParam];
					}
					if(k == "short") {
						paramData.tooltipKey = 'chat.filters.short_tt';
					}
					if(k == "tracked") {
						paramData.tooltipKey = 'chat.filters.tracked_tt';
					}
					children.push(paramData);
				}
				this.messageFilters = children;
			}
		}

		this.checkForMissingScopes();
		
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

		watch(()=>this.config.showPanelsHere, ()=> {
			const cols = this.$store("params").chatColumnsConfig;
			if(this.config.showPanelsHere) {
				cols.forEach(v=> {
					if(v.showPanelsHere && v.id != this.config.id) {
						v.showPanelsHere = false;
					}
				})
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

	public mouseEnterItem(event:MouseEvent, data:TwitchatDataTypes.ParameterData<boolean>):void {
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
		this.missingScope = this.typeToScopes[type] && !TwitchUtils.hasScopes(this.typeToScopes[type]);
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

		}else
		if(type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE) {
			this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data || !this.mouseOverToggle) return;
				const dataCast = data as TwitchatDataTypes.MessageShoutoutData;
				dataCast.received = false;
				this.messagesCache[type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store('debug').simulateMessage(TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
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
			}, false, false);
		}
	}

	/**
	 * Called when clicking "all" toggle
	 */
	public toggleAll():void {
		type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;
		for (let i = 0; i < this.filters.length; i++) {
			this.filters[i].value = this.param_toggleAll.value;
		}

		for (const key in this.config.messageFilters) {
			const k = key as messageFilterTypes;
			this.config.messageFilters[k] = this.param_toggleAll.value;
		}
	}

	public async previewSubMessage(type:keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters):Promise<void> {
		this.previewData = [];
		this.loadingPreview = true;
		this.previewIndex ++;
		this.missingScope = this.messageKeyToScope != null && this.messageKeyToScope[type] && !TwitchUtils.hasScopes(this.messageKeyToScope[type]);
		this.mouseOverToggle = true;
		const previewIndexLoc = this.previewIndex;
		const cached = this.subMessagesCache[type];
		if(cached === null) {
			this.previewData = [];
			this.loadingPreview = false;
			return;//No preview for this message
		}
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
				this.subMessagesCache[type] = null;
				return;
			}

			if(previewIndexLoc != this.previewIndex) return;

			this.previewData.push(data);
			this.subMessagesCache[type] = this.previewData;

		}, false, false);
		
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
			}, false, false);
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
		this.$nextTick(()=> {
			let selectedIndex = -1;
			const cols = this.$store("params").chatColumnsConfig;
			for (let i = 0; i < cols.length; i++) {
				const col = cols[i];
				if(col.showPanelsHere === true) selectedIndex = i;
			}
			if(selectedIndex == -1) {
				selectedIndex = (this.config.order == cols.length-1)? 0 : cols.length-1;
				cols[selectedIndex].showPanelsHere = true;
			}
		});

		this.$emit("change");
		this.$store("params").saveChatColumnConfs();
	}

	/**
	 * Called when clicking a preset
	 */
	public async preset(id:"chat"|"chatSafe"|"moderation"|"activities"|"games"|"revenues"|"moderation&activities"):Promise<void> {
		this.param_toggleAll.value = false;

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
			case "moderation&activities": 
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
				if(id == "moderation") break;
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
				ids.push( TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK );
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
	public moveColumn(direction:-1|1):void {
		this.$store("params").moveChatColumn(this.config, direction);
	}

	/**
	 * Called when CTA is clicked
	 */
	public hideCTA():void {
		DataStore.set(DataStore.CHAT_COL_CTA, true);
		this.showCTA = false;
	}

	/**
	 * Called when opening filters
	 */
	public openFilters(viaButton:boolean = false):void {
		this.expand = true;
		if(viaButton) this.hideCTA();
	}

	/**
	 * Called when opening filters
	 */
	public closeFilters(viaButton:boolean = false):void {
		this.expand = false
		this.checkForMissingScopes();
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

	/**
	 * Called when something is clicked.
	 * Closes the panel when clicking outside
	 */
	private onMouseDown(e:MouseEvent|TouchEvent):void {
		if(!this.open) return;
		
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		this.touchMode = e.type == "touchstart";
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref && this.expand) {
			this.closeFilters();
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

	/**
	 * Check if a filter that requires a missing scope is enabled
	 * If so, it will be highlighted and a message will be posted
	 * on chat to warn the user
	 */
	private checkForMissingScopes():void {
		let missingScopes:TwitchScopesString[] = [];
		for (let i = 0; i < this.filters.length; i++) {
			const f = this.filters[i];
			//Keep missing scopes
			if(f.twitch_scopes && f.value === true && !TwitchUtils.hasScopes(f.twitch_scopes)) {
				missingScopes = missingScopes.concat(f.twitch_scopes);
				f.error = true;
			}
		}

		//If "messages" filter is selected, check for sub filters
		if(this.filters.find(v=>{
			return v.storage == TwitchatDataTypes.TwitchatMessageType.MESSAGE;
		})?.value=== true) {
			for (let i = 0; i < this.messageFilters.length; i++) {
				const f = this.messageFilters[i];
				//Keep missing scopes
				if(f.twitch_scopes && f.value === true && !TwitchUtils.hasScopes(f.twitch_scopes)) {
					missingScopes = missingScopes.concat(f.twitch_scopes);
					f.error = true;
				}
			}
		}

		//Send a message on this column to warn for missing scopes
		if(!this.forceConfig && missingScopes.length > 0) {
			const prevMessage = this.$store("chat").messages.find(v=> v.type == TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST);
			if(prevMessage) {
				//Remove previous scope request, if any, to avoid spamming feed
				this.$store("chat").deleteMessageByID(prevMessage.id);
			}

			const dedupeDict:{[key:string]:boolean} = {};
			this.$store("chat").addMessage({
				type:TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST,
				date:Date.now(),
				col:this.config.order,
				id:Utils.getUUID(),
				platform:"twitchat",
				twitch_scopes:missingScopes.filter(v=> {
					//Dedupe scopes
					if(dedupeDict[v] === true) return false;
					dedupeDict[v] = true;
					return true;
				})
			});
		}else{
			//Search if a "missing scopes" message exists and delete it as
			//no scope is missing anymore
			const list = this.$store("chat").messages;
			//Only check within the last 100 messages, not a big deal if it
			//remains in the list in such case and low risks this happens
			for (let i = list.length-1; i > Math.max(0, list.length - 100); i--) {
				const m = list[i];
				if(m.col == this.config.order && m.type == TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST) {
					//Message found, delete it
					this.$store("chat").deleteMessage(m);
					return;
				}
			}
		}
	}

}
</script>

<style scoped lang="less">
.messagelistfilter{
	padding: 0;
	color: var(--color-light);
	background: var(--color-primary-fade);
	max-height: 100%;
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: row;
	border-bottom-left-radius: .5em;
	transform: translateX(100%);
	transition: transform .25s;
	position: relative;
	pointer-events: none;
	max-width: 400px;
	backdrop-filter: blur(5px);

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
					margin: unset;

					.item{
						width: 300px;
					}
					.toggleAll {
						width: 300px;
						padding: .25em;
						// margin-right: 2.25em;
					}
					.subFilters {
						flex-basis: 100%;
						&>.item {
							margin-left: auto;
							margin-right: auto;
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

	@actionSizes: 26px;
	@actionPadding: 5px;
	.hoverActions {
		margin-left: -@actionSizes - @actionPadding * 2;
		width: @actionSizes + @actionPadding * 2;
		display: flex;
		flex-direction: column;
		background: var(--color-primary);
		gap: 1px;
		top:50%;
		padding: @actionPadding;
		border-bottom-left-radius: .25em;
		height: fit-content;
		pointer-events: painted;
		button {
			display: flex;
			align-items: center;
			pointer-events: all;
			padding: calc(@actionSizes/4);
			width: @actionSizes;
			height: @actionSizes;
			min-width: @actionSizes;
			min-height: @actionSizes;
			border-radius: .25em;
			.icon {
				height: 100%;
				width: 100%;
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
		}
	}

	&.ctaMode {
		.hoverActions {
			button:first-child {
				position: relative;
				&::before {
					content: "";
					position: absolute;
					width: 100%;
					height: 100%;
					left: 50%;
					top: 50%;
					border-radius: .25em;
					background-color: var(--color-light);

					transform: translate(-50%, -50%) scale(.8);
					animation: glow 1s;
					animation-iteration-count: infinite;
					animation-timing-function: linear;
					animation-delay: .5s;
					@keyframes glow {
						from {
							opacity: 1;
							transform: translate(-50%, -50%) scale(.9);
						}
						to {
							opacity: 0;
							transform: translate(-50%, -50%) scale(1.2);
						}
					}
				}
			}
		}
	}

	.cta {
		position: absolute;
		left: .5em;
		top: .5em;
		cursor: pointer;
		transform: translateX(calc(-100% - @actionSizes - @actionPadding * 2));
		background-color: var(--color-secondary);
		padding: .25em .5em;
		border-radius: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		animation: bounce 0.5s;
		animation-direction: alternate;
		animation-timing-function: cubic-bezier(.5, 0.05, 1, .5);
		animation-iteration-count: infinite;
		pointer-events: all;
		.label {
			font-size: .8em;
		}
		img {
			height: .8em;
			margin-left: .5em;
		}
		@keyframes bounce {
			from {
				left: -1em;
			}
			to {
				left: .5em;
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
			gap: .5em;

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
				text-align: center;
			}
			.showPanelsHere {
				font-size: .9em;
			}
			.presets {
				display: flex;
				gap: .25em;
				flex-direction: row;
				justify-content: space-around;
				flex-wrap: wrap;
				justify-content: center;
			}

			.paramsList {
				flex: 1;
				overflow: auto;
				margin: auto;
				padding: 0 .25em;
				gap: 2px;
				display: flex;
				flex-direction: column;

				.toggleAll {
					padding: 0 .5em;
					font-size: .9em;
					margin-bottom: 2px;
					:deep(label) {
						text-align: right;
					}
				}
				.item{
					flex-shrink: 0;
					font-size: .9em;
					&.whispersPermissions {
						border-left: 1px solid white;
						padding-left: .75em;
						margin-left: .5em;
						margin-bottom: 1em;
					}
					:deep(.child) {
						font-size: .9rem;
						width: calc(100% - .5em);
					}
				}
				.subFilters {
					gap: 2px;
					display: flex;
					flex-direction: column;
					&>.item {
						margin-top: 0;
					}
				}
				&::-webkit-scrollbar-thumb {
					background-color: var(--color-light);
				}
			}
			&>.error {
				padding: .5em;
				border-radius: .5em;
				margin-top: .5em;
				text-align: center;
				font-size: .8em;
				font-weight: bold;
				cursor: pointer;
				color:var(--mainColor_alert);
				background: var(--mainColor_light);
				
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
				background-color: var(--color-dark);
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
					background-color: var(--color-alert);
					color: var(--mainColor_dark);
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