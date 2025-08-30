<template >
	<div :class="classes" v-show="open || expand" @wheel.stop>
		<div class="cta" v-if="showCTA" @click="hideCTA()">
			<span class="label">{{ $t("chat.filters.cta") }}</span>
			<Icon name="right" />
		</div>

		<transition name="fade">
		<div class="hoverActions" v-if="!expand">
			<button class="openBt" @click="openFilters(true)" v-tooltip="{content:$t('global.tooltips.column_edit'), placement:'left' }"
			v-newflag="{id:'messagefilters_'+Math.max(...filters.map(v=>v.storage!.newFlag)), date:Math.max(...filters.map(v=>v.storage!.newFlag))}">
				<Icon name="filters" alt="open filters" class="icon" theme="light" />
			</button>
			<button class="addBt" @click="$emit('add')" v-tooltip="{content:$t('global.tooltips.column_add'), placement:'left' }"
			v-if="$store.params.chatColumnsConfig.length < $config.MAX_CHAT_COLUMNS">
				<Icon name="add" alt="add column" class="icon" theme="light" />
			</button>
			<button class="addBt" @click="moveColumn(-1)" v-tooltip="{content:$t('global.tooltips.column_move'), placement:'left' }"
			v-if="config.order > 0">
				<Icon name="left" alt="add column" class="icon" theme="light" />
			</button>
			<button class="addBt" @click="moveColumn(1)" v-tooltip="{content:$t('global.tooltips.column_move'), placement:'left' }"
			v-if="config.order < $store.params.chatColumnsConfig.length-1">
				<Icon name="right" alt="add column" class="icon" theme="light" />
			</button>
			<button class="deleteBt" @click="deleteColumn()" v-if="canDelete" v-tooltip="{content:$t('global.tooltips.column_delete'), placement:'left' }">
				<Icon name="trash" alt="delete column" class="icon" theme="light" />
			</button>
		</div>
		</transition>

		<transition name="fade">
		<div class="holder blured-background-window" v-if="expand">
			<div class="content">
				<ClearButton class="closeBt" @click="closeFilters()" />
				<div class="head">
					<h1 class="title">{{ $t('chat.filters.title') }}</h1>
				</div>

				<div class="info" v-if="expand">{{ $t('chat.filters.header') }}</div>

				<tooltip interactive
				theme="twitchat"
				trigger="click"
				:tag="null"
				:inlinePositioning='false'
				:maxWidth="'calc(100% - 10px)'"
				:interactiveDebounce="1000">
					<template #default>
						<TTButton class="presetsBt" icon="params" secondary small>Presets</TTButton>
					</template>
					<template #content="{ hide }">
						<div class="presets">
							<TTButton secondary light @click="hide(); preset('chat')" icon="whispers" small>{{ $t('chat.filters.preset_chat') }}</TTButton>
							<TTButton secondary light @click="hide(); preset('chatSafe')" icon="shield" small>{{ $t('chat.filters.preset_chatSafe') }}</TTButton>
							<TTButton secondary light @click="hide(); preset('moderation')" icon="mod" small>{{ $t('chat.filters.preset_moderation') }}</TTButton>
							<TTButton secondary light @click="hide(); preset('activities')" icon="stars" small>{{ $t('chat.filters.preset_activities') }}</TTButton>
							<TTButton secondary light @click="hide(); preset('moderation&activities')" icon="stars" small>{{ $t('chat.filters.preset_moderation_and_activities') }}</TTButton>
							<TTButton secondary light @click="hide(); preset('games')" icon="bingo" small>{{ $t('chat.filters.preset_games') }}</TTButton>
							<TTButton secondary light @click="hide(); preset('revenues')" icon="coin" small>{{ $t('chat.filters.preset_revenues') }}</TTButton>
						</div>
					</template>
				</tooltip>

				<div class="paramsList">

					<ParamItem class="toggleAll" noBackground :paramData="param_toggleAll" v-model="param_toggleAll.value" @change="toggleAll()" />

					<div class="item" v-for="filter in filters"
					:key="'filter_'+filter.storage">
						<Icon name="show" class="preview"
							v-if="filter.storage!.type != 'message'"
							@mouseleave="mouseLeaveItem()"
							@mouseenter="mouseEnterItem(filter.storage!)" />

						<ParamItem :paramData="filter" autoFade
						@change="saveData()"
						v-model="config.filters[filter.storage!.type as 'message']"
						v-newflag="filter.storage!.newFlag > 0? {date:filter.storage!.newFlag, id:'messagefilters_'+filter.storage!.type} : undefined">
							<template #child v-if="filter.storage?.type == whisperType && config.filters.whisper === true">
								<ToggleBlock class="whispersPermissions"
								:title="$t('chat.filters.whispers_permissions')"
								small
								:open="false">
									<PermissionsForm v-model="config.whispersPermissions" @update:modelValue="saveData()" />
								</ToggleBlock>
							</template>
							<template #child v-if="filter.storage?.type == messageType && config.filters.message === true">
								<div class="subFilters">
									<div class="item">
										<div class="preview"></div>

										<ParamItem
											v-if="config.filters.message === true"
											key="subfilter_blockUsers"
											:paramData="param_hideUsers"
											@change="saveData()"
											v-model="config.userBlockList" />
									</div>

									<div class="item" v-for="messageFilter in messageFilters">
										<Icon name="show" class="preview"
											v-if="messageFilter.storage!.hasPreview"
											@mouseleave="mouseLeaveItem()"
											@mouseenter="previewSubMessage(messageFilter.storage!)" />
										<div v-else class="preview"></div>

										<ParamItem autoFade
											v-if="config.filters.message === true"
											:key="'subfilter_'+messageFilter.storage"
											:paramData="messageFilter"
											@change="saveData()"
											v-model="config.messageFilters[messageFilter.storage!.type]" />
									</div>

									<template v-if="$store.users.customBadgeList.length > 0">
										<div class="item">
											<div class="preview"></div>
											<ParamItem
												key="subfilter_blockUsers"
												v-model="config.mandatoryBadges_flag"
												:paramData="param_showBadges"
												@change="saveData()">

												<div class="badgeList">
													<button v-for="badge in $store.users.customBadgeList"
													@click="onToggleBadge(badge.id, true)"
													:class="(config.mandatoryBadges || []).includes(badge.id)? 'selected' : ''"
													:key="badge.id+'_show'"
													:title="badge.name">
														<img :src="badge.img" :alt="badge.name">
													</button>
												</div>
											</ParamItem>
										</div>

										<div class="item" v-if="$store.users.customBadgeList.length > 0">
											<div class="preview"></div>
											<ParamItem
												key="subfilter_blockUsers"
												v-model="config.forbiddenBadges_flag"
												:paramData="param_hideBadges"
												@change="saveData()">

												<div class="badgeList">
													<button v-for="badge in $store.users.customBadgeList"
													@click="onToggleBadge(badge.id, false)"
													:class="(config.forbiddenBadges || []).includes(badge.id)? 'selected' : ''"
													:key="badge.id+'_show'"
													:title="badge.name">
														<img :src="badge.img" :alt="badge.name">
													</button>
												</div>
											</ParamItem>
										</div>
									</template>
								</div>
							</template>
						</ParamItem>

					</div>

				</div>

				<div class="card-item alert error" v-if="error" @click="error=false">{{ $t('chat.filters.no_selection') }}</div>

				<ParamItem class="showPanelsHere"
					:paramData="param_showPanelsHere"
					clearToggle
					@change="saveData()"
					v-model="config.showPanelsHere"
					v-if="$store.params.chatColumnsConfig.length > 1" />

				<ParamItem class="showGreetHere"
					:paramData="param_showGreetHere"
					clearToggle
					@change="saveData()"
					v-model="config.showGreetHere"
					v-if="$store.params.chatColumnsConfig.length > 1" />

				<div class="bgColor card-item">
					<Icon name="color" />
					<span class="title">{{ $t("chat.filters.background_color") }}</span>
					<button class="colorBt tranparent"
						:style="{color:'transparent'}"
						:data-selected="'transparent' == config.backgroundColor"
						@click="config.backgroundColor = 'transparent'"></button>

					<button class="colorBt"
						v-for="color in ['#ff00001A','#00ff001A','#0000ff1A','#ff00ff1A','#ffff001A','#00ffff1A']"
						:style="{color:color.replace(/(#[0-9a-f]{6}).*/i, '$177')}"
						:data-selected="color == config.backgroundColor"
						@click="config.backgroundColor = color"></button>

					<ParamItem class="colorBt picker"
						:paramData="param_backgroundColor"
						clearToggle
						noBackground
						@change="config.backgroundColor = param_backgroundColor.value; saveData()"
						@click="config.backgroundColor = param_backgroundColor.value; saveData()"
						v-model="param_backgroundColor.value"
						v-if="$store.params.chatColumnsConfig.length > 1" />
				</div>

				<div class="channelList card-item" v-if="channels.length > 1">
					<Icon name="user" />
					<span>{{ $t("chat.filters.channels") }}</span>

					<tooltip interactive
					theme="twitchat"
					trigger="click"
					:tag="null"
					:inlinePositioning='false'
					:interactiveDebounce="1000">
						<template #default>
							<TTButton secondary small>{{ $t("global.select_placeholder") }}</TTButton>
						</template>
						<template #content="{ hide }">
							<div class="entryList">
								<button v-for="entry in channels"
								class="entry"
								:class="Object.keys(config.channelIDs || {}).includes(entry.user.id)? 'selected' : ''"
								@click="clickChannel(entry)">
									<img class="avatar" v-if="entry.user.avatarPath"
										:src="entry.user.avatarPath"
										:style="{color:entry.color}"
										alt="avatar"
										referrerpolicy="no-referrer">
									<Icon :name="entry.platform" />
									<span class="pseudo">{{ entry.user.displayName }}</span>
									<Icon name="checkmark" v-if="Object.keys(config.channelIDs || []).includes(entry.user.id)" />
									<Icon name="cross" v-else />
								</button>
							</div>
						</template>
					</tooltip>
				</div>

				<div class="previewList" ref="previewList" v-if="loadingPreview || previewData.length > 0">
					<div class="preview" v-if="loadingPreview">
						<Icon name="loader" class="loader" />
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
		</transition>
	</div>
</template>

<script lang="ts">
import ClearButton from '@/components/ClearButton.vue';
import PermissionsForm from '@/components/PermissionsForm.vue';
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import type { TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from 'vue';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import MessageItem from '../MessageItem.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		MessageItem,
		ToggleBlock,
		ToggleButton,
		PermissionsForm,
		ClearButton,
	},
	emits: ['submit', 'add', 'change'],
})
export class MessageListFilter extends Vue {

	@Prop({type:Boolean, default: false})
	public open!:boolean;
	@Prop
	public config!:TwitchatDataTypes.ChatColumnsConfig;

	public previewIndex:number = 0;
	public error:boolean = false;
	public expand:boolean = false;
	public showCTA:boolean = false;
	public loadingPreview:boolean = false;
	public mouseOverToggle:boolean = false;
	public previewData:TwitchatDataTypes.ChatMessageTypes[] = [];
	public filters:TwitchatDataTypes.ParameterData<boolean, undefined, undefined, typeof TwitchatDataTypes.MessageListFilterTypes[number]>[] = [];
	public messageFilters:TwitchatDataTypes.ParameterData<boolean, unknown, boolean, typeof TwitchatDataTypes.MessageListChatMessageFilterTypes[number]>[] = [];
	public param_toggleAll:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.select_all" };
	public param_showBadges:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.show_user_badges", icon:"show"};
	public param_hideBadges:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.hide_user_badges", icon:"hide"};
	public param_hideUsers:TwitchatDataTypes.ParameterData<string, string> = {type:"editablelist", value:"", labelKey:"chat.filters.hide_users", placeholderKey:"chat.filters.hide_users_placeholder", icon:"hide", maxLength:25, max:1000000};
	public param_showPanelsHere:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.show_panels_here"};
	public param_showGreetHere:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"chat.filters.show_greet_here"};
	public param_backgroundColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:""};
	public messageKeyToScope:{[key in keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters]:TwitchScopesString[]}|null = null;

	private mouseY = 0;
	private disposed = false;
	private touchMode = false;
	private clickHandler!:(e:MouseEvent|TouchEvent) => void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private messagesCache:Partial<{[key in typeof TwitchatDataTypes.MessageListFilterTypes[number]["type"]]:TwitchatDataTypes.ChatMessageTypes[]|null}> = {}
	private subMessagesCache:Partial<{[key in keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters]:TwitchatDataTypes.ChatMessageTypes[]|null}> = {}

	public get whisperType() { return TwitchatDataTypes.TwitchatMessageType.WHISPER; }
	public get messageType() { return TwitchatDataTypes.TwitchatMessageType.MESSAGE; }

	public get classes():string[] {
		const res = ["messagelistfilter"];
		if(this.$store.params.appearance.splitViewVertical.value === true) res.push("verticalSplitMode");
		if(this.expand) res.push("expand");
		// if(this.forceConfig) res.push("fullSize");
		if(this.showCTA) res.push("ctaMode");
		return res;
	}

	public get canDelete():boolean {
		return this.$store.params.chatColumnsConfig.length > 1;
	}

	public get channels() {
		let chans:{platform:TwitchatDataTypes.ChatPlatform, user:TwitchatDataTypes.TwitchatUser, color:string, isRemoteChan:boolean}[] = [];

		chans.push({platform:"twitch", user:this.$store.auth.twitch.user, isRemoteChan:false, color:"transparent"});
		if(this.$store.auth.youtube.user) {
			chans.push({platform:"youtube", user:this.$store.auth.youtube.user, isRemoteChan:false, color:"transparent"});
		}

		if(this.$store.tiktok.connected) {
			const user:TwitchatDataTypes.TwitchatUser = JSON.parse(JSON.stringify(this.$store.auth.twitch.user));
			user.id = "tiktok";
			chans.push({platform:"tiktok", user, isRemoteChan:false, color:"transparent"});
		}

		this.$store.stream.connectedTwitchChans.forEach(entry=> {
			chans.push({platform:"twitch", user:entry.user, isRemoteChan:true, color:entry.color});
		})

		return chans;
	}

	public beforeMount(): void {
		let noConfig = true;
		for (const key in this.config.filters) {
			if(this.config.filters[key as typeof TwitchatDataTypes.MessageListFilterTypes[number]["type"]] === true) {
				noConfig = false;
				break;
			}
		}
		if(this.config.showGreetHere || this.config.showPanelsHere) noConfig = false;
		this.expand = noConfig;

		this.showCTA = DataStore.get(DataStore.CHAT_COL_CTA) !== "true" && this.config.order == 0;

		if(!this.config.whispersPermissions) {
			this.config.whispersPermissions = Utils.getDefaultPermissions()
		}

		this.filters = [];
		const filterList = TwitchatDataTypes.MessageListFilterTypes;
		for (let i = 0; i < filterList.length; i++) {
			const f = filterList[i];
			const children:TwitchatDataTypes.ParameterData<boolean, unknown, boolean>[] = [];
			const paramData:TwitchatDataTypes.ParameterData<boolean, undefined, undefined, typeof TwitchatDataTypes.MessageListFilterTypes[number]> = {type:"boolean",
								value:this.config.filters[f.type] ?? true,
								labelKey:f.labelKey,
								icon:f.icon,
								twitch_scopes:f.scopes,
								storage:f,
							};

			//Force new filter to true
			if(this.config.filters[f.type] == undefined) {
				this.config.filters[f.type] = true;
			}

			this.filters.push(paramData);

			//Add sub-filters to the message types so we can filter mods, new users, automod, etc...
			if(f.type === TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				const entries = TwitchatDataTypes.MessageListChatMessageFilterTypes;
				for (let i = 0; i < entries.length; i++) {
					const entry = entries[i];
					let type = entry.type;
					if(this.config.messageFilters[type] == undefined) {
						this.config.messageFilters[type] = true;
					}

					const paramData:TwitchatDataTypes.ParameterData<boolean, unknown, string[]> = {
						type:"boolean",
						value:this.config.messageFilters[type],
						labelKey:entry.labelKey,
						storage:entry,
						icon:entry.icon,
					};

					if(entry.scopes.length > 0) paramData.twitch_scopes = entry.scopes;

					if(type == 'commands') {
						const subParam:TwitchatDataTypes.ParameterData<string[]> = {
								type:"editablelist",
								longText:true,
								value:this.config.commandsBlockList,
								labelKey:'chat.filters.commands',
								placeholderKey:"chat.filters.commands_placeholder",
								icon:"hide",
								maxLength:1000000,
								editCallback:(data)=> {
									this.config.commandsBlockList = data.value;
									this.saveData();
								}};
						paramData.children = [subParam];
					}
					if(type == "short") {
						paramData.tooltipKey = 'chat.filters.short_tt';
					}
					if(type == "tracked") {
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
			const cols = this.$store.params.chatColumnsConfig;
			if(this.config.showPanelsHere) {
				cols.forEach(v=> {
					if(v.showPanelsHere && v.id != this.config.id) {
						v.showPanelsHere = false;
					}
				})
			}
		});

		watch(()=>this.config.showGreetHere, ()=> {
			const cols = this.$store.params.chatColumnsConfig;
			if(this.config.showGreetHere) {
				cols.forEach(v=> {
					if(v.showGreetHere && v.id != this.config.id) {
						v.showGreetHere = false;
					}
				})
			}
		});
	}

	public beforeUnmount():void {
		this.disposed = true;
		document.removeEventListener("touchstart", this.clickHandler);
		document.removeEventListener("mousedown", this.clickHandler);
		document.removeEventListener("mousemove", this.mouseMoveHandler);
		document.removeEventListener("touchmove", this.mouseMoveHandler);
	}

	public mouseEnterItem(data:typeof TwitchatDataTypes.MessageListFilterTypes[number]):void {
		this.mouseOverToggle = true;
		this.previewMessage(data);
	}

	public mouseLeaveItem():void {
		if(this.touchMode) return;
		this.mouseOverToggle = false;
		this.previewData = [];
	}

	public async previewMessage(filter:typeof TwitchatDataTypes.MessageListFilterTypes[number]):Promise<void> {
		this.previewData = [];
		this.loadingPreview = true;
		this.previewIndex ++;
		const previewIndexLoc = this.previewIndex;
		const cached = this.messagesCache[filter.type];
		if(cached && cached.length > 0) {
			this.previewData = cached;
			this.loadingPreview = false;
			return;
		}

		await this.$nextTick();

		this.messagesCache[filter.type] = [];
		if(filter.type == TwitchatDataTypes.TwitchatMessageType.NOTICE) {
			this.$store.debug.simulateNotice<TwitchatDataTypes.MessageNoticeData>(TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateNotice<TwitchatDataTypes.MessageNoticeData>(TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateNotice<TwitchatDataTypes.MessageNoticeData>(TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(TwitchatDataTypes.TwitchatMessageType.CONNECT, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(TwitchatDataTypes.TwitchatMessageType.BLOCKED_TERMS, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(TwitchatDataTypes.TwitchatMessageType.WARN_CHATTER, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageNoticeData>(TwitchatDataTypes.TwitchatMessageType.WARN_ACKNOWLEDGE, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.loadingPreview = false;

		}else
		if(filter.type == TwitchatDataTypes.TwitchatMessageType.SHOUTOUT) {
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageShoutoutData>(TwitchatDataTypes.TwitchatMessageType.SHOUTOUT, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.received = false;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageShoutoutData>(TwitchatDataTypes.TwitchatMessageType.SHOUTOUT, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.received = true;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.loadingPreview = false;

		}else
		if(filter.type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE) {
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageStreamOnlineData>(TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageStreamOfflineData>(TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.loadingPreview = false;

		}else
		if(filter.type == TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST) {
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageUnbanRequestData>(TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.isResolve = false;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageUnbanRequestData>(TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.isResolve = true;
				data.accepted = false;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageUnbanRequestData>(TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.isResolve = true;
				data.accepted = true;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.loadingPreview = false;

		}else
		if(filter.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
			await this.$store.debug.simulateMessage<TwitchatDataTypes.MessageSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.is_gift = false;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			await this.$store.debug.simulateMessage<TwitchatDataTypes.MessageSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.is_gift = true;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageYoutubeSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageYoutubeSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.loadingPreview = false;

		}else
		if(filter.type == TwitchatDataTypes.TwitchatMessageType.CHEER) {
			await this.$store.debug.simulateMessage<TwitchatDataTypes.MessageCheerData>(TwitchatDataTypes.TwitchatMessageType.CHEER, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			await this.$store.debug.simulateMessage<TwitchatDataTypes.MessageCheerData>(TwitchatDataTypes.TwitchatMessageType.CHEER, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.pinned = true;
				data.pinLevel = 6;
				data.pinDuration_ms = 60000;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageYoutubeSuperChatData>(TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessageYoutubeSuperStickerData>(TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.loadingPreview = false;

		}else
		if(filter.type == TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE) {
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessagePrivateModeratorData>(TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.action = "dm";
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessagePrivateModeratorData>(TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE, (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.action = "question";
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.$store.debug.simulateMessage<TwitchatDataTypes.MessagePrivateModeratorData>(TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE, async (data)=> {
				if(!data || !this.mouseOverToggle) return;
				data.action = "dm";
				const replyTo = await this.$store.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, false);
				data.parentMessage = replyTo;
				this.messagesCache[filter.type]?.push(data);
				if(previewIndexLoc != this.previewIndex) return;
				this.previewData.push(data);
			}, false);
			this.loadingPreview = false;

		}else{

			this.$store.debug.simulateMessage<TwitchatDataTypes.ChatMessageTypes>(filter.type, (data)=> {
				this.loadingPreview = false;

				if(!data || !this.mouseOverToggle) return;

				this.messagesCache[filter.type] = [data];

				if(previewIndexLoc != this.previewIndex) return;
				this.previewData = [data];
			}, false, false);
		}
	}

	/**
	 * Called when clicking "all" toggle
	 */
	public toggleAll():void {
		const select = this.param_toggleAll.value;
		type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;
		for (let i = 0; i < this.filters.length; i++) {
			const type = this.filters[i].storage?.type;
			// Avoid enabling join/leave messages from "all" toggle
			if(select && (type === "join" || type === "leave"))	continue;
			this.filters[i].value = select;
		}

		for (const key in this.config.messageFilters) {
			const k = key as messageFilterTypes;
			this.config.messageFilters[k] = select;
		}
	}

	public async previewSubMessage(entry:typeof TwitchatDataTypes.MessageListChatMessageFilterTypes[number]):Promise<void> {
		this.previewData = [];
		this.loadingPreview = true;
		this.previewIndex ++;
		this.mouseOverToggle = true;
		const previewIndexLoc = this.previewIndex;
		const cached = this.subMessagesCache[entry.type];
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

		this.subMessagesCache[entry.type] = [];
		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
			this.loadingPreview = false;
			if(!data || !this.mouseOverToggle) return;

			const dataCast = data as TwitchatDataTypes.MessageChatData;

			if(entry.type == "automod") {
				let words:string[] = [];
				do {
					words.push( Utils.pickRand(dataCast.message.split(" ")) );
				}while(Math.random() > .5)

				dataCast.twitch_automod = { reasons:["bullying"], words };
			}else if(entry.type == "deleted") {
				dataCast.deleted = true;
			}else if(entry.type == "suspiciousUsers") {
				dataCast.twitch_isSuspicious = true;
			}else {
				this.subMessagesCache[entry.type] = null;
				return;
			}

			if(previewIndexLoc != this.previewIndex) return;

			this.previewData.push(data);
			this.subMessagesCache[entry.type] = this.previewData;

		}, false, false);

		if(entry.type == "automod") {
			this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (data:TwitchatDataTypes.ChatMessageTypes)=> {
				if(!data || !this.mouseOverToggle) return;

				const dataCast = data as TwitchatDataTypes.MessageChatData;
				dataCast.twitch_isRestricted = true;
				const users:TwitchatDataTypes.TwitchatUser[] = [];
				const list = this.$store.users.users;
				for (let i = 0; i < list.length; i++) {
					users.push(list[i]);
					if(Math.random() > .3) break;
				}

				dataCast.twitch_sharedBanChannels = users.map(v=> { return {id:v.id, login:v.login}; })

				if(previewIndexLoc != this.previewIndex) return;

				this.previewData.push(data);
				this.subMessagesCache[entry.type] = this.previewData;
			}, false, false);
		}
	}

	/**
	 * Called when preview message is clicked.
	 * Only usefull for touch interface so we can close it by clicking it
	 */
	public clickPreview(e:MouseEvent):void {
		e.stopPropagation();
		e.preventDefault();
		this.previewData = [];
	}

	/**
	 * Called when a channel is clicked on the channel filter selector.
	 * Only available if connected to more chans then just our Twitch channel.
	 * Ex: Youtube channel or other external Twitch channels
	 */
	public clickChannel(entry:typeof this.channels[number]):void {
		//Toggle channel's state
		if(!this.config.channelIDs) this.config.channelIDs = {};
		if(this.config.channelIDs[entry.user.id]) {
			delete this.config.channelIDs[entry.user.id];
		}else{
			this.config.channelIDs[entry.user.id] = {platform:entry.platform, date:Date.now()};
		}

		//Limit history size
		if(Object.keys(this.config.channelIDs).length > 100) {
			let olderDate:number = 0;
			let olderKey:string | null = null;
			for (const key in this.config.channelIDs) {
				const entry = this.config.channelIDs[key];
				if(entry.date > olderDate) {
					olderKey = key;
					olderDate = entry.date;
				}
			}
			if(olderKey) delete this.config.channelIDs[olderKey]
		}
		this.saveData();
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
			const typedKey = key as typeof TwitchatDataTypes.MessageListFilterTypes[number]["type"];
			if(this.config.filters[typedKey] === true) {
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
		//Make sure the "show panels here" option is enabled in at
		//least 1 column
		this.$nextTick(()=> {
			let selectedPanelIndex = -1;
			let selectedGreetIndex = -1;
			const cols = this.$store.params.chatColumnsConfig;
			for (let i = 0; i < cols.length; i++) {
				const col = cols[i];
				if(col.showPanelsHere === true) selectedPanelIndex = i;
				if(col.showGreetHere === true) selectedGreetIndex = i;
			}
			if(selectedPanelIndex == -1) {
				selectedPanelIndex = (this.config.order == cols.length-1)? 0 : cols.length-1;
				cols[selectedPanelIndex].showPanelsHere = true;
			}
			if(selectedGreetIndex == -1) cols[selectedGreetIndex].showGreetHere = true;
		});

		//Delay save to avoid UI lag during toggle
		window.setTimeout(()=>{
			this.$emit("change");
			this.$store.params.saveChatColumnConfs();
		}, 300);
	}

	/**
	 * Called when clicking a badge
	 */
	public onToggleBadge(badgeId:string, mandatory:boolean):void {
		let list:string[] = [];
		if(mandatory) {
			if(!this.config.mandatoryBadges) this.config.mandatoryBadges = [];
			list = this.config.mandatoryBadges;
		}else{
			if(!this.config.forbiddenBadges) this.config.forbiddenBadges = [];
			list = this.config.forbiddenBadges;
		}
		if(list.includes(badgeId)) {
			list.splice(list.findIndex(id=>id == badgeId), 1);
		}else{
			list.push(badgeId);
		}
		this.saveData();
	}

	/**
	 * Called when clicking a preset
	 */
	public async preset(id:"chat"|"chatSafe"|"moderation"|"activities"|"games"|"revenues"|"moderation&activities"):Promise<void> {
		this.param_toggleAll.value = false;

		//Updating the "param_toggleAll" value triggers an update on all entries.
		//We need to wait for it to complete before selecting presets to avoid
		//both processes from conflicting with each other
		await this.$nextTick();

		//Unselect all
		for (let i = 0; i < this.filters.length; i++) {
			this.filters[i].value = false;
		}
		type messageFilterTypes = keyof TwitchatDataTypes.ChatColumnsConfigMessageFilters;
		const ids:typeof TwitchatDataTypes.MessageListFilterTypes[number]["type"][] = [];
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
				ids.push( TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST );
				ids.push( TwitchatDataTypes.TwitchatMessageType.NOTICE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAID );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SHOUTOUT );
				ids.push( TwitchatDataTypes.TwitchatMessageType.MESSAGE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.WHISPER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PINNED );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE );
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
				ids.push( TwitchatDataTypes.TwitchatMessageType.KOFI );
				ids.push( TwitchatDataTypes.TwitchatMessageType.CHEER );
				ids.push( TwitchatDataTypes.TwitchatMessageType.UNBAN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.BINGO );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TIPEEE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.NOTICE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.RAFFLE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.REWARD );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PINNED );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TILTIFY );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PATREON );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SHOUTOUT );
				ids.push( TwitchatDataTypes.TwitchatMessageType.FOLLOWING );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COUNTDOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PREDICTION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.STREAMLABS );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST );
				ids.push( TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS );
				ids.push( TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY );
				ids.push( TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START_CHAT );
				ids.push( TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION );
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
				ids.push( TwitchatDataTypes.TwitchatMessageType.KOFI );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TIPEEE );
				ids.push( TwitchatDataTypes.TwitchatMessageType.PATREON );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TILTIFY );
				ids.push( TwitchatDataTypes.TwitchatMessageType.STREAMLABS );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT );
				ids.push( TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY );
				ids.push( TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN );
				ids.push( TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION );
				ids.push( TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE );
				break;
			}
		}

		for (let i = 0; i < ids.length; i++) {
			const filter = this.filters.find(v => v.storage!.type === ids[i]);
			if(filter) filter.value = true;
		}

		this.saveData();
	}

	/**
	 * Called when requesting to delete the current column
	 */
	public deleteColumn():void {
		this.$store.main
		.confirm(this.$t("chat.delete_col_confirm_title"), this.$t("chat.delete_col_confirm_desc"))
		.then(()=> {
			this.$store.params.delChatColumn(this.config);
		}).catch(error => {
			//ignore
		});
	}

	/**
	 * Called when requesting to move a column
	 */
	public moveColumn(direction:-1|1):void {
		this.$store.params.moveChatColumn(this.config, direction);
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

		requestAnimationFrame(()=>this.renderFrame());
	}

	/**
	 * Called when opening filters
	 */
	public closeFilters(viaButton:boolean = false):void {
		this.expand = false;
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
		if(this.disposed || !this.expand) return;
		requestAnimationFrame(()=>this.renderFrame());

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
			if(f.twitch_scopes && f.value === true) {
				f.twitch_scopes.forEach(s => {
					if(!TwitchUtils.hasScopes([s])) {
						missingScopes = missingScopes.concat(s);
						f.error = true;
					}
				});
			}
		}

		//If "messages" filter is selected, check for sub filters
		if(this.filters.find(v=>{
			return v.storage?.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE;
		})?.value=== true) {
			for (let i = 0; i < this.messageFilters.length; i++) {
				const f = this.messageFilters[i];
				//Keep missing scopes
				if(f.twitch_scopes && f.value === true) {
					f.twitch_scopes.forEach(s => {
						if(!TwitchUtils.hasScopes([s])) {
							missingScopes = missingScopes.concat(s);
							f.error = true;
						}
					});
				}
			}
		}

		//Search if a "missing scopes" message exists and delete it
		//A new one will be created after if necessary
		const list = this.$store.chat.messages;
		//Only check within the last 100 messages, not a big deal if it
		//remains in the list in such case and low risks this happens
		for (let i = list.length-1; i > Math.max(0, list.length - 100); i--) {
			const m = list[i];
			if(m.col == this.config.order && m.type == TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST) {
				//Message found, delete it
				this.$store.chat.deleteMessage(m);
				break;
			}
		}

		//Send a message on this column to warn for missing scopes
		if(missingScopes.length > 0) {
			const dedupeDict:{[key:string]:boolean} = {};
			this.$store.chat.addMessage({
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
				}),
				channel_id:this.$store.auth.twitch.user.id,
			});
		}
	}

}
export default toNative(MessageListFilter);
</script>

<style scoped lang="less">
.messagelistfilter{
	padding: 0;
	color: var(--color-text);
	max-height: 100%;
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: row;
	border-bottom-left-radius: .5em;
	transform: translateX(100%);
	transition: transform .25s, opacity .25s;
	pointer-events: none;
	max-width: 400px;
	backdrop-filter: blur(5px);

	.content {
		opacity: 1;
		transition: opacity .25s;

		&.fade-enter-from,
		&.fade-leave-to {
			opacity: 0;
		}
	}

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
	@actionPadding: 0px;
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
		overflow: hidden;
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
				margin: auto;
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
			&.deleteBt {
				background-color: var(--color-alert);
				border-radius: 0;
				&:hover {
					background-color: var(--color-alert-light);
				}
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
		color: var(--color-text-light);
		transform: translateX(calc(-100% - @actionSizes - @actionPadding * 2));
		.label {
			font-size: .8em;
		}
		&>.icon {
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
		padding: .5em;
		pointer-events: all;
		position: relative;
		overflow-x: hidden;
		.content {
			.closeBt {
				margin: -.25em;
			}

			flex-grow: 1;
			display: flex;
			flex-direction: column;
			height: 100%;
			margin: auto;
			gap: .5em;

			&>.head {
				display: flex;
				flex-direction: row;
				width: 100%;
				align-items: center;
				.title {
					flex-grow: 1;
					text-align: center;
				}
			}

			.info {
				text-align: center;
			}
			.showPanelsHere, .showGreetHere, .bgColor {
				font-size: .9em;
			}
			.channelList, .bgColor {
				gap: .5em;
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				flex-shrink: 0;
				.title {
					align-self: flex-start;
					flex-grow: 1;
					width: calc(100% - 1em - 30px);
				}
				.icon {
					flex-grow: 0;
					flex-shrink: 0;
					width: 1em;
					height: 1em;
					vertical-align: middle;
				}
			}
			.channelList {
				gap: .5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				.entryList {
					gap: .25em;
					display: flex;
					flex-direction: column;
					.entry {
						gap: .5em;
						display: flex;
						flex-direction: row;
						align-items: center;
						cursor: pointer;
						padding: 2px;
						padding-right: 5px;
						border-radius: var(--border-radius);
						color: #444;
						background: #ccc;
						text-align: left;
						opacity: .8;
						transition: all .2s;
						filter: grayscale();
						&.selected {
							filter: none;
							opacity: 1;
							background: #fff;
							color: var(--color-secondary);
						}
						.avatar {
							width: 1.5em;
							height: 1.5em;
							border-radius: 50%;
							border: 2px solid currentColor;
						}

						.icon {
							height: 1em;
							max-width: 1em;
							align-self: center;
						}
						.pseudo {
							text-wrap: nowrap;
							flex-grow: 1;
							overflow: hidden;
							text-overflow: ellipsis;
						}
						&:hover {
							background-color: #ffffffE0;
						}
					}
				}
			}
			.bgColor {

				.colorBt {
					width: 30px;
					height: 30px;
					border-radius: var(--border-radius);
					border: 1px solid var(--color-text-fader);
					background-color: currentColor;
					&.picker {
						background-color: transparent;
						border-color: var(--color-text);
						position: relative;
						&::before {
							content: '';
							position: absolute;
							.center();
							width: 1em;
							height: 1em;
							z-index: 1;
							pointer-events: none;
							mix-blend-mode: difference;
							background-image: url(../../../assets/icons/pipette.svg);
						}
					}
					:deep(.inputHolder ){
						height: 28px;
					}

					&.tranparent {
						overflow: hidden;
						position: relative;
						border: 1px solid var(--color-text);
						&::before {
							content: '';
							position: absolute;
							top: 0;
							left: 0;
							width: 150%;
							height: 150%;
							border-left: 1px solid var(--color-text);
							transform-origin: top left;
							transform: rotate(-45deg);
						}
					}

					&[data-selected="true"] {
						border: 2px solid var(--color-text) !important;
					}
				}
			}
				.presetsBt {
					margin: auto;
				}
				.presets {
					display: flex;
					gap: .25em;
					flex-direction: row;
					justify-content: space-around;
					flex-wrap: wrap;
					justify-content: center;
					padding: .25em;
				}

			.paramsList {
				flex: 1;
				overflow: auto;
				margin: auto;
				padding: 0 .25em;
				gap: 2px;
				display: flex;
				flex-direction: column;
				flex-shrink: 0;
				min-height: 100px;

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
					display: flex;
					flex-direction: row;
					align-items: center;
					:deep(.child) {
						font-size: .9rem;
						width: calc(100% - .5em);
					}
					.paramitem {
						flex-grow: 1;
					}
					.preview {
						height: 1em;
						width: 1em;
						margin-right: .5em;
						flex-shrink: 0;
					}
				}
				.subFilters {
					gap: 2px;
					display: flex;
					flex-direction: column;
					&>.item {
						flex-shrink: 0;
						font-size: .9em;
						display: flex;
						flex-direction: row;
						align-items: center;
						margin-top: 0;
					}
					.badgeList {
						margin-top: .5em;
						gap: 2px;
						display: flex;
						flex-direction: row;
						flex-wrap: wrap;
						justify-content: center;
						img {
							display: block;
						}
						button {
							opacity: .25;
							&.selected {
								opacity: 1;
								outline: 1px solid var(--color-text);
							}
						}
					}
				}
				&::-webkit-scrollbar-thumb {
					background-color: var(--color-light);
				}
			}
			&>.error {
				margin-top: .5em;
				text-align: center;
				font-size: .8em;
				font-weight: bold;
				cursor: pointer;

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
			width: 100%;
			max-width: min(100%, 500px);
			margin:auto;
			max-height: 500px;
			overflow: hidden;
			transform: translateX(-50%);
			left: 50%;
			top: 99999px;
			z-index: 100;
			padding: .5em;
			background-color: var(--color-text);
			filter: drop-shadow(0 0 .5em var(--color-text));
			.preview {
				background-color: var(--background-color-primary);
				border-radius: var(--border-radius);
				cursor: pointer;
				&>* {
					padding: 0;
					pointer-events: none;
				}
				.loader {
					text-align: center;
					margin: auto;
					display: block;
					height: 2em;
				}

				&:not(:last-child) {
					margin-bottom: .25em;
				}
				&.missingScope {
					font-size: .8em;
					padding: .75em;
					text-align: center;
					font-weight: bold;
					img {
						height: 1.5em;
					}
				}
			}
			.missingScope{
				margin-bottom: .5em;
				text-align: center;
				.lockicon {
					height: 1.5em;
					margin-bottom: .25em;
				}
			}
		}
	}
}
</style>
