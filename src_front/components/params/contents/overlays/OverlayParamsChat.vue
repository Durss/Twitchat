<template>
	<div class="overlayparamschat overlayParamsSection">
		<div class="header">{{ $t("overlay.chat.head") }}</div>

		<section>
			<TTButton @click="createOverlay" icon="add">{{ $t('overlay.chat.createOverlay_bt') }}</TTButton>
		</section>

		<VueDraggable class="overlayList"
			v-model="$store.chat.chatOverlayList"
			:group="{name:'chatOverlay'}"
			handle=".header"
			animation="250">
			<ToggleBlock v-for="entry in $store.chat.chatOverlayList" :title="entry.title || $t('overlay.chat.default_title', {num: getOverlayIndex(entry)})" :open="false" :key="entry.id">
				<template #right_actions>
					<TTButton class="actionBt" @click.stop :copy="entry.id" icon="id" v-tooltip="$t('global.copy_id')" small />
					<TTButton class="actionBt" @click.stop="deleteOverlay(entry)" icon="trash" v-tooltip="$t('global.delete')" small alert />
				</template>

				<div class="card-item">
					<ParamItem :paramData="getParam('title', entry)" v-model="entry.title" @change="save(entry)" />
				</div>

				<div class="card-item">
					<div class="header">
						<div class="title"><Icon name="obs" /> {{ $t('overlay.title_install') }}</div>
					</div>
					<OverlayInstaller type="chat" :sourceSuffix="entry.title" :id="entry.id" :sourceTransform="{width:400, height:600}" />

					<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
						<div class="cssHead">{{ $t("overlay.chat.css") }}</div>
						<ul class="cssStructure">
							<li>.overlaychat { ... }</li>
							<li class="sublist">
								<ul>
									<li>.messageList { ... }</li>
									<li class="sublist">
										<ul>
											<li>.messageItem { ... }</li>
											<li class="sublist">
												<ul>
													<li>.channelSource { ... }</li>
													<li class="sublist">
														<ul>
															<li>.channelAvatar { ... }</li>
															<li>.channelInitial { ... }</li>
														</ul>
													</li>
													<li>.platformLogo { ... }</li>
													<li>.avatar { ... }</li>
													<li>.content { ... }</li>
													<li class="sublist">
														<ul>
															<li>.badges { ... }</li>
															<li class="sublist">
																<ul>
																	<li>.badge { ... }</li>
																</ul>
															</li>
															<li>.login { ... }</li>
															<li>.eventText { ... }</li>
															<li class="sublist">
																<ul>
																	<li>.separator { ... }</li>
																	<li>.text { ... }</li>
																	<li>.eventLabel { ... }</li>
																	<li>.inlineAvatar { ... }</li>
																</ul>
															</li>
														</ul>
													</li>
												</ul>
											</li>
										</ul>
									</li>
								</ul>
							</li>
						</ul>
					</ToggleBlock>
				</div>

				<div class="card-item">
					<div class="header">
						<div class="title"><Icon name="params" /> {{ $t("overlay.title_settings") }}</div>
					</div>
					<div class="params">
						<div class="row3">
							<ParamItem :paramData="getParam('size', entry)" v-model="entry.size" @change="save(entry)" />
							<ParamItem :paramData="getParam('style', entry)" v-model="entry.style" @change="save(entry)" />
							<ParamItem :paramData="getParam('entranceAnimation', entry)" v-model="entry.entranceAnimation" @change="save(entry)" />
						</div>
						<div class="platformsSection">
							<label>{{ $t("overlay.chat.param_platforms") }}</label>
							<div class="platformsList">
								<ParamItem v-for="p in getPlatformParams(entry)" :key="entry.id + '_platform_' + p.platform"
									:paramData="p.param"
									v-model="entry.platformsFilter[p.platform]"
									@change="save(entry)"
									noBackground />
							</div>
						</div>
						<div class="row3">
							<ParamItem :paramData="getParam('messageDuration', entry)" v-model="entry.messageDuration" @change="save(entry)" />
							<ParamItem :paramData="getParam('messageDelay', entry)" v-model="entry.messageDelay" @change="save(entry)" />
							<ParamItem :paramData="getParam('direction', entry)" v-model="entry.direction" @change="save(entry)" />
						</div>
						<ParamItem :paramData="getParam('showPlatformLogo', entry)" v-model="entry.showPlatformLogo" @change="save(entry)" />
						<ParamItem :paramData="getParam('showAvatars', entry)" v-model="entry.showAvatars" @change="save(entry)" />
						<ParamItem :paramData="getParam('showBadges', entry)" v-model="entry.showBadges" @change="save(entry)" />
						<ParamItem :paramData="getParam('maxMessages', entry)" v-model="entry.maxMessages" @change="save(entry)" />
					</div>
				</div>

				<div class="card-item">
					<div class="header">
						<div class="title"><Icon name="filters" /> {{ $t("overlay.chat.filters_title") }}</div>
					</div>

					<div class="filtersSection">
						<ParamItem class="toggleAll" noBackground :paramData="getParam('toggleAll', entry)" v-model="toggleAllValues[entry.id]" @change="toggleAll(entry)" />

						<div class="filterList">
							<div class="item" v-for="filter in getFilters(entry)" :key="entry.id + '_filter_' + filter.storage?.type">
								<ParamItem :paramData="filter" autoFade
									@change="save(entry)"
									v-model="entry.filters[filter.storage!.type as 'message']">

									<template #child v-if="filter.storage?.type == messageType && entry.filters.message === true">
										<div class="subFilters">
											<div class="item">
												<ParamItem
													:key="entry.id + '_subfilter_blockUsers'"
													:paramData="getParam('hideUsers', entry)"
													@change="save(entry)"
													v-model="entry.userBlockList" />
											</div>

											<div class="item" v-for="messageFilter in getMessageFilters(entry)" :key="entry.id + '_subfilter_' + messageFilter.storage?.type">
												<ParamItem autoFade
													:paramData="messageFilter"
													@change="save(entry)"
													v-model="entry.messageFilters[messageFilter.storage!.type]" />
											</div>
										</div>
									</template>
								</ParamItem>
							</div>
						</div>
					</div>
				</div>
			</ToggleBlock>
		</VueDraggable>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import TTButton from '@/components/TTButton.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { VueDraggable } from 'vue-draggable-plus';
import OverlayInstaller from './OverlayInstaller.vue';
import type { JsonObject } from 'type-fest';
import StoreProxy from '@/store/StoreProxy';

@Component({
	components: {
		Icon,
		TTButton,
		ParamItem,
		ToggleBlock,
		VueDraggable,
		OverlayInstaller,
	}
})
class OverlayParamsChat extends Vue {

	public toggleAllValues: { [id: string]: boolean } = {};

	private paramCache: { [key: string]: TwitchatDataTypes.ParameterData<unknown> } = {};
	private filtersCache: { [id: string]: TwitchatDataTypes.ParameterData<boolean, undefined, undefined, typeof TwitchatDataTypes.MessageListFilterTypes[number]>[] } = {};
	private messageFiltersCache: { [id: string]: TwitchatDataTypes.ParameterData<boolean, unknown, boolean, typeof TwitchatDataTypes.MessageListChatMessageFilterTypes[number]>[] } = {};

	public get messageType() { return TwitchatDataTypes.TwitchatMessageType.MESSAGE; }

	public beforeMount(): void {
		// Initialize toggleAll values for existing overlays
		for (const entry of this.$store.chat.chatOverlayList) {
			this.toggleAllValues[entry.id] = this.areAllFiltersEnabled(entry);
		}
	}

	public createOverlay(): void {
		const newOverlay = this.getDefaultOverlayParams();
		this.$store.chat.chatOverlayList.push(newOverlay);
		this.toggleAllValues[newOverlay.id] = true; // All filters are enabled by default
		this.saveAll();
	}

	private areAllFiltersEnabled(entry: TwitchatDataTypes.ChatOverlayParams): boolean {
		for (const f of TwitchatDataTypes.MessageListFilterTypes) {
			if (entry.filters[f.type] !== true) return false;
		}
		return true;
	}

	public deleteOverlay(entry: TwitchatDataTypes.ChatOverlayParams): void {
		const index = this.$store.chat.chatOverlayList.findIndex(o => o.id === entry.id);
		if (index > -1) {
			this.$store.chat.chatOverlayList.splice(index, 1);
			delete this.toggleAllValues[entry.id];
			delete this.filtersCache[entry.id];
			delete this.messageFiltersCache[entry.id];
			this.saveAll();
		}
	}

	public getOverlayIndex(entry: TwitchatDataTypes.ChatOverlayParams): number {
		return this.$store.chat.chatOverlayList.findIndex(o => o.id === entry.id) + 1;
	}

	public save(entry: TwitchatDataTypes.ChatOverlayParams): void {
		this.saveAll();
		this.broadcastParams(entry);
	}

	public toggleAll(entry: TwitchatDataTypes.ChatOverlayParams): void {
		const enabled = this.toggleAllValues[entry.id];
		for (const filter of this.getFilters(entry)) {
			entry.filters[filter.storage!.type as keyof typeof entry.filters] = enabled;
		}
		this.save(entry);
	}

	public getParam(paramName: string, entry: TwitchatDataTypes.ChatOverlayParams): TwitchatDataTypes.ParameterData<unknown> {
		const cacheKey = `${entry.id}_${paramName}`;
		if (!this.paramCache[cacheKey]) {
			switch (paramName) {
				case 'title':
					this.paramCache[cacheKey] = { type: "string", value: "", labelKey: "overlay.chat.param_title", maxLength: 50 };
					break;
				case 'maxMessages':
					this.paramCache[cacheKey] = { type: "number", value: 30, min: 1, max: 100, labelKey: "overlay.chat.param_maxMessages" };
					break;
				case 'messageDuration':
					this.paramCache[cacheKey] = { type: "duration", value: 0, min: 0, max: 300000, labelKey: "overlay.chat.param_messageDuration" };
					break;
				case 'showAvatars':
					this.paramCache[cacheKey] = { type: "boolean", value: true, labelKey: "overlay.chat.param_showAvatars" };
					break;
				case 'showBadges':
					this.paramCache[cacheKey] = { type: "boolean", value: true, labelKey: "overlay.chat.param_showBadges" };
					break;
				case 'direction':
					this.paramCache[cacheKey] = {
						type: "list",
						value: "bottom_to_top",
						labelKey: "overlay.chat.param_direction",
						listValues: [
							{ value: "bottom_to_top", labelKey: "overlay.chat.param_direction_btt" },
							{ value: "top_to_bottom", labelKey: "overlay.chat.param_direction_ttb" },
						]
					};
					break;
				case 'toggleAll':
					this.paramCache[cacheKey] = { type: "boolean", value: false, labelKey: "chat.filters.select_all" };
					break;
				case 'hideUsers':
					this.paramCache[cacheKey] = { type: "editablelist", value: "", labelKey: "chat.filters.hide_users", placeholderKey: "chat.filters.hide_users_placeholder", icon: "hide", maxLength: 25, max: 1000000 };
					break;
				case 'size':
					this.paramCache[cacheKey] = {
						type: "list",
						value: "m",
						labelKey: "overlay.chat.param_size",
						listValues: [
							{ value: "xs", labelKey: "overlay.chat.param_size_xs" },
							{ value: "s", labelKey: "overlay.chat.param_size_s" },
							{ value: "m", labelKey: "overlay.chat.param_size_m" },
							{ value: "l", labelKey: "overlay.chat.param_size_l" },
							{ value: "xl", labelKey: "overlay.chat.param_size_xl" },
							{ value: "xxl", labelKey: "overlay.chat.param_size_xxl" },
						]
					};
					break;
				case 'style':
					this.paramCache[cacheKey] = {
						type: "list",
						value: "default",
						labelKey: "overlay.chat.param_style",
						listValues: [
							{ value: "default", labelKey: "overlay.chat.param_style_default" },
							{ value: "twitch", labelKey: "overlay.chat.param_style_twitch" },
							{ value: "bubbles", labelKey: "overlay.chat.param_style_bubbles" },
							{ value: "gradient", labelKey: "overlay.chat.param_style_gradient" },
							{ value: "neon", labelKey: "overlay.chat.param_style_neon" },
							{ value: "minimal", labelKey: "overlay.chat.param_style_minimal" },
							{ value: "glass", labelKey: "overlay.chat.param_style_glass" },
						]
					};
					break;
				case 'entranceAnimation':
					this.paramCache[cacheKey] = {
						type: "list",
						value: "fade",
						labelKey: "overlay.chat.param_entranceAnimation",
						listValues: [
							{ value: "none", labelKey: "overlay.chat.param_entranceAnimation_none" },
							{ value: "wipe", labelKey: "overlay.chat.param_entranceAnimation_wipe" },
							{ value: "elastic", labelKey: "overlay.chat.param_entranceAnimation_elastic" },
							{ value: "flip", labelKey: "overlay.chat.param_entranceAnimation_flip" },
							{ value: "glitch", labelKey: "overlay.chat.param_entranceAnimation_glitch" },
							{ value: "slide", labelKey: "overlay.chat.param_entranceAnimation_slide" },
							{ value: "fade", labelKey: "overlay.chat.param_entranceAnimation_fade" },
						]
					};
					break;
				case 'messageDelay':
					this.paramCache[cacheKey] = { type: "number", value: 0, min: 0, max: 10000, labelKey: "overlay.chat.param_messageDelay" };
					break;
				case 'showPlatformLogo':
					this.paramCache[cacheKey] = { type: "boolean", value: true, labelKey: "overlay.chat.param_showPlatformLogo" };
					break;
			}
		}
		return this.paramCache[cacheKey];
	}

	public getPlatformParams(entry: TwitchatDataTypes.ChatOverlayParams): {platform: string, param: TwitchatDataTypes.ParameterData<boolean>}[] {
		const platforms = [
			{ id: "twitch", label: "Twitch", icon: "twitch" },
			{ id: "youtube", label: "YouTube", icon: "youtube" },
			{ id: "kick", label: "Kick", icon: "kick" },
			{ id: "tiktok", label: "TikTok", icon: "tiktok" },
			{ id: "facebook", label: "Facebook", icon: "live" },
			{ id: "instagram", label: "Instagram", icon: "live" },
		];

		// Initialize platformsFilter if not exists
		if (!entry.platformsFilter) {
			entry.platformsFilter = {};
		}

		return platforms.map(p => {
			// Default to true if not set
			if (entry.platformsFilter[p.id] === undefined) {
				entry.platformsFilter[p.id] = true;
			}
			return {
				platform: p.id,
				param: {
					type: "boolean",
					value: entry.platformsFilter[p.id],
					label: p.label,
					icon: p.icon,
				}
			};
		});
	}

	public getFilters(entry: TwitchatDataTypes.ChatOverlayParams): TwitchatDataTypes.ParameterData<boolean, undefined, undefined, typeof TwitchatDataTypes.MessageListFilterTypes[number]>[] {
		if (!this.filtersCache[entry.id]) {
			this.filtersCache[entry.id] = [];
			const filterList = TwitchatDataTypes.MessageListFilterTypes;
			for (let i = 0; i < filterList.length; i++) {
				const f = filterList[i];
				const paramData: TwitchatDataTypes.ParameterData<boolean, undefined, undefined, typeof TwitchatDataTypes.MessageListFilterTypes[number]> = {
					type: "boolean",
					value: entry.filters[f.type] ?? true,
					labelKey: f.labelKey,
					icon: f.icon,
					twitch_scopes: f.scopes,
					storage: f,
				};

				// Default new filter to true
				if (entry.filters[f.type] === undefined) {
					entry.filters[f.type] = true;
				}

				this.filtersCache[entry.id].push(paramData);
			}
		}
		return this.filtersCache[entry.id];
	}

	public getMessageFilters(entry: TwitchatDataTypes.ChatOverlayParams): TwitchatDataTypes.ParameterData<boolean, unknown, boolean, typeof TwitchatDataTypes.MessageListChatMessageFilterTypes[number]>[] {
		if (!this.messageFiltersCache[entry.id]) {
			this.messageFiltersCache[entry.id] = [];
			const entries = TwitchatDataTypes.MessageListChatMessageFilterTypes;
			for (let j = 0; j < entries.length; j++) {
				const messageEntry = entries[j];
				const type = messageEntry.type;

				if (entry.messageFilters[type] === undefined) {
					entry.messageFilters[type] = true;
				}

				const messageFilterParam: TwitchatDataTypes.ParameterData<boolean, unknown, boolean, typeof TwitchatDataTypes.MessageListChatMessageFilterTypes[number]> = {
					type: "boolean",
					value: entry.messageFilters[type] ?? true,
					labelKey: messageEntry.labelKey,
					icon: messageEntry.icon,
					twitch_scopes: messageEntry.scopes,
					storage: messageEntry,
				};
				this.messageFiltersCache[entry.id].push(messageFilterParam);
			}
		}
		return this.messageFiltersCache[entry.id];
	}

	private getDefaultOverlayParams(): TwitchatDataTypes.ChatOverlayParams {
		const id = Utils.getUUID();
		const overlayNumber = this.$store.chat.chatOverlayList.length + 1;

		// Initialize filters - some disabled by default like in columns
		const filters = {} as TwitchatDataTypes.ChatOverlayParams['filters'];
		const disabledByDefault: string[] = [
			TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
		];
		for (const f of TwitchatDataTypes.MessageListFilterTypes) {
			filters[f.type] = !disabledByDefault.includes(f.type);
		}

		// Initialize message filters with all enabled by default
		const messageFilters = {} as TwitchatDataTypes.ChatColumnsConfigMessageFilters;
		for (const f of TwitchatDataTypes.MessageListChatMessageFilterTypes) {
			messageFilters[f.type] = true;
		}

		return {
			id,
			title: StoreProxy.i18n.t('overlay.chat.default_title', { num: overlayNumber }),
			filters,
			messageFilters,
			commandsBlockList: [],
			userBlockList: [],
			whispersPermissions: Utils.getDefaultPermissions(),
			maxMessages: 30,
			messageDuration: 60,
			messageDelay: 0,
			showAvatars: true,
			showBadges: true,
			showPlatformLogo: true,
			direction: 'bottom_to_top',
			size: 'm',
			style: 'default',
			platformsFilter: {
				twitch: true,
				youtube: true,
				kick: true,
				tiktok: true,
				facebook: true,
				instagram: true,
			},
			entranceAnimation: 'fade',
		};
	}

	private saveAll(): void {
		DataStore.set(DataStore.CHAT_OVERLAY_PARAMS, this.$store.chat.chatOverlayList);
	}

	private broadcastParams(entry: TwitchatDataTypes.ChatOverlayParams): void {
		// Add localized labels for the overlay
		const labels: TwitchatDataTypes.ChatOverlayLabels = {
			event_follow: this.$t('overlay.chat.event_follow'),
			event_sub_gift: this.$t('overlay.chat.event_sub_gift'),
			event_sub_resub: this.$t('overlay.chat.event_sub_resub'),
			event_sub_new: this.$t('overlay.chat.event_sub_new'),
			event_cheer: this.$t('overlay.chat.event_cheer'),
			event_raid: this.$t('overlay.chat.event_raid'),
			event_reward: this.$t('overlay.chat.event_reward'),
			event_ban: this.$t('overlay.chat.event_ban'),
			event_ban_duration: this.$t('overlay.chat.event_ban_duration'),
			event_unban: this.$t('overlay.chat.event_unban'),
			event_shoutout: this.$t('overlay.chat.event_shoutout'),
			event_join: this.$t('overlay.chat.event_join'),
			event_join_multiple: this.$t('overlay.chat.event_join_multiple'),
			event_leave: this.$t('overlay.chat.event_leave'),
			event_leave_multiple: this.$t('overlay.chat.event_leave_multiple'),
			event_kofi: this.$t('overlay.chat.event_kofi'),
			event_streamlabs: this.$t('overlay.chat.event_streamlabs'),
			event_streamelements: this.$t('overlay.chat.event_streamelements'),
			event_tipeee: this.$t('overlay.chat.event_tipeee'),
			event_tiltify: this.$t('overlay.chat.event_tiltify'),
			event_patreon: this.$t('overlay.chat.event_patreon'),
			event_connect: this.$t('overlay.chat.event_connect'),
			event_disconnect: this.$t('overlay.chat.event_disconnect'),
		};
		const paramsWithLabels = { ...entry, labels };
		PublicAPI.instance.broadcast(TwitchatEvent.CHAT_OVERLAY_PARAMETERS, { parameters: paramsWithLabels, overlayId: entry.id } as unknown as JsonObject);
	}
}

export default toNative(OverlayParamsChat);
</script>

<style scoped lang="less">
.overlayparamschat {
	.overlayList {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		margin-top: 0.5em;
	}

	.actionBt {
		margin-left: 0.25em;
	}

	.params {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		margin-top: 0.5em;

		.row3 {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 0.5em;
		}

		.platformsSection {
			display: flex;
			flex-direction: column;
			gap: 0.5em;

			>label {
				font-size: .9em;
				font-style: italic;
				color: var(--color-text-fade);
			}

			.platformsList {
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				gap: 0.5em;
			}
		}
	}

	.filtersSection {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		margin-top: 0.5em;

		.toggleAll {
			margin-bottom: 0.5em;
		}

		.filterList {
			display: flex;
			flex-direction: column;
			gap: 0.25em;

			.item {
				display: flex;
				flex-direction: column;
			}

			.subFilters {
				margin-left: 1.5em;
				padding-left: 0.5em;
				border-left: 2px solid var(--color-light-fade);
				display: flex;
				flex-direction: column;
				gap: 0.25em;
			}
		}
	}
}
</style>
