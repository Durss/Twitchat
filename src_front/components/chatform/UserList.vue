<template>
	<div class="userlist blured-background-window" ref="rootEl">
		<div v-if="currentChan">
			<template v-for="(chan, key) in currentChan.users">
				<ToggleBlock
					v-if="currentChan.users[key].length > 0"
					:class="'userList ' + key"
					small
					:title="getRole(key)"
					:subtitle="'(' + currentChan.users[key].length + ')'"
					:open="key != 'broadcaster'"
				>
					<div class="list" v-if="currentChan.users[key].length > 0">
						<a
							:class="userClasses(u)"
							target="_blank"
							:href="'https://twitch.tv/' + u.login"
							@click.prevent="openUserCard(u)"
							v-for="u in currentChan.users[key]"
							:key="u.id"
						>
							<Icon
								name="unfollow"
								v-if="
									canListFollowers &&
									u.channelInfo[currentChanId!]?.is_following === false
								"
								theme="secondary"
							/>
							<div
								v-if="currentChanId && u.channelInfo[currentChanId]!.is_banned"
								class="icon"
							>
								<Icon
									v-if="currentChanId && u.channelInfo[currentChanId]!.banEndDate"
									name="timeout"
									v-tooltip="getBanDuration(u.channelInfo[currentChanId]!)"
								/>
								<Icon v-else name="ban" v-tooltip="t('userlist.banned_tt')" />
							</div>
							<span>{{ u.displayName }}</span>
						</a>
					</div>
				</ToggleBlock>
			</template>
		</div>

		<ToggleBlock
			class="infos"
			:open="false"
			small
			v-if="currentChanId == myChannelId"
			:title="t('userlist.infoBt')"
		>
			<p class="info" v-for="e in tm('userlist.infos')" v-html="e"></p>
		</ToggleBlock>

		<div class="users" v-if="userList.length > 1">
			<TabMenu
				v-model="currentChanId"
				:values="userList.map((v) => v.id)"
				:labels="userList.map((v) => v.displayName)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import StoreProxy from "@/store/StoreProxy";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import {
	computed,
	onBeforeMount,
	onBeforeUnmount,
	onMounted,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import { useI18n } from "vue-i18n";
import TabMenu from "../TabMenu.vue";
import ToggleBlock from "../ToggleBlock.vue";

interface ChannelUserList {
	channelId: string;
	platform: TwitchatDataTypes.ChatPlatform;
	users: {
		broadcaster: TwitchatDataTypes.TwitchatUser[];
		mods: TwitchatDataTypes.TwitchatUser[];
		vips: TwitchatDataTypes.TwitchatUser[];
		subs: TwitchatDataTypes.TwitchatUser[];
		viewers: TwitchatDataTypes.TwitchatUser[];
		bots: TwitchatDataTypes.TwitchatUser[];
	};
}

const emit = defineEmits<{
	close: [];
}>();

const { t, tm } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeStream = useStoreStream();
const storeUsers = useStoreUsers();
const rootEl = useTemplateRef("rootEl");
const infos = useTemplateRef("infos");

const showInfo = ref(false);
const myChannelId = ref("");
const channels = ref<{ [key: string]: ChannelUserList }>({});
const currentChanId = ref("");

let debounceTo: number = -1;
let clickHandler!: (e: MouseEvent) => void;

const currentChan = computed(() => {
	return channels.value[currentChanId.value]!;
});

const canListFollowers = computed(() => {
	return (
		storeParams.appearance.highlightNonFollowers.value === true &&
		TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])
	);
});

const userList = computed(() => {
	const list: TwitchatDataTypes.TwitchatUser[] = [];
	const validIds = storeStream.connectedTwitchChans.concat().map((v) => v.user.id);
	if (storeAuth.youtube?.user) validIds.push(storeAuth.youtube.user.id);
	validIds.push(storeAuth.twitch.user.id);

	for (const uid in channels.value) {
		const chan = channels.value[uid]!;

		//Not connected to chan anymore? Skip entry
		if (validIds.findIndex((v) => v == uid) == -1) continue;

		list.push(storeUsers.getUserFrom(chan.platform, chan.channelId, chan.channelId));
	}
	return list;
});

function getRole(key: string): string {
	return (tm("userlist.roles") as { [key: string]: string })[key]!;
}

function getBanDuration(chanInfo: TwitchatDataTypes.UserChannelInfo): string {
	const remaining = chanInfo.banEndDate! - Date.now();
	return Utils.formatDuration(remaining) + "s";
}

function userClasses(user: TwitchatDataTypes.TwitchatUser): string[] {
	let res = ["user"];
	if (canListFollowers.value && user.channelInfo[currentChanId.value!]?.is_following === false)
		res.push("noFollow");
	return res;
}

onBeforeMount(() => {
	myChannelId.value = StoreProxy.auth.twitch.user.id;
});

onMounted(() => {
	clickHandler = (e: MouseEvent) => onClick(e);
	document.addEventListener("mousedown", clickHandler);
	watch(
		() => storeUsers.users,
		() => {
			updateList();
		},
	);
	updateList();
	open();
});

onBeforeUnmount(() => {
	channels.value = {};
	document.removeEventListener("mousedown", clickHandler);
});

function openUserCard(user: TwitchatDataTypes.TwitchatUser): void {
	storeUsers.openUserCard(user, currentChanId.value!);
}

function open(): void {
	const ref = rootEl.value!;
	gsap.killTweensOf(ref);
	gsap.from(ref, { duration: 0.3, scaleY: 0, clearProps: "scaleY", ease: "back.out" });
}

function close(): void {
	const ref = rootEl.value!;
	gsap.killTweensOf(ref);
	gsap.to(ref, {
		duration: 0.2,
		scaleY: 0,
		delay: 0.1,
		clearProps: "scaleY",
		ease: "back.in",
		onComplete: () => {
			emit("close");
		},
	});
}

function onClick(e: MouseEvent): void {
	let target = e.target as HTMLDivElement;
	const ref = rootEl.value!;
	while (target != document.body && target != ref && target) {
		target = target.parentElement as HTMLDivElement;
	}
	if (target != ref) {
		close();
	}
}

function updateList(): void {
	clearTimeout(debounceTo);
	const isInit = Object.keys(channels.value).length == 0;

	debounceTo = window.setTimeout(
		() => {
			// const s = Date.now();
			const userList = storeUsers.users;

			const channelsList: { [key: string]: ChannelUserList } = {};
			for (const user of userList) {
				for (const chan in user.channelInfo) {
					const chanInfo = user.channelInfo[chan];
					if (
						chanInfo &&
						chanInfo.online &&
						user.temporary !== true &&
						user.errored !== true
					) {
						if (!channelsList[chan]) {
							channelsList[chan] = {
								channelId: chan,
								platform: user.platform,
								users: {
									broadcaster: [],
									mods: [],
									vips: [],
									subs: [],
									viewers: [],
									bots: [],
								},
							};
						}
						const chanData = channelsList[chan];
						if (chanInfo && chanInfo.is_broadcaster)
							chanData.users.broadcaster = [user];
						else if (user.is_bot) chanData.users.bots.push(user);
						else if (chanInfo && chanInfo.is_moderator) chanData.users.mods.push(user);
						else if (chanInfo && chanInfo.is_vip) chanData.users.vips.push(user);
						//Removed because not accurate as I don't load subscriber state everytime.
						//To date, the subscriber state is only given when user talks on chat
						// else if(user.channelInfo[chan].is_subscriber) chanData.users.subs.push(user);
						else chanData.users.viewers.push(user);
					}
				}
			}

			for (const chan in channelsList) {
				//Sort users by their names
				const chanData = channelsList[chan]!.users;
				type keys = keyof typeof chanData;
				for (const cat in chanData) {
					chanData[cat as keys].sort((a, b) => {
						const n1 = a.displayName.toLowerCase();
						const n2 = b.displayName.toLowerCase();
						if (n1 > n2) return 1;
						if (n1 < n2) return -1;
						return 0;
					});
				}
			}

			channels.value = channelsList;
			if (isInit) {
				currentChanId.value = myChannelId.value;
			}
		},
		isInit ? 0 : 500,
	);
}
</script>

<style scoped lang="less">
.userlist {
	max-width: 600px;
	max-height: 500px;
	width: 100%;

	.users {
		position: sticky;
		bottom: 0;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding-top: 1em;
		padding-bottom: 0.5em;

		:deep(i) {
			font-size: 0.8em;
			font-style: italic;
		}
	}

	.infos {
		font-size: 0.8em;
		max-width: 600px;
		margin-top: 1em;
		.info {
			line-height: 1.5em;
		}
	}

	.userList {
		&:not(:last-child) {
			margin-bottom: 20px;
		}

		.list {
			width: calc(100% - 2em);
			margin: auto;
			padding: 0.25em;
			border-bottom-left-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);

			@itemWidth: 150px;
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));

			.user {
				display: inline-flex;
				text-overflow: ellipsis;
				overflow: hidden;
				width: @itemWidth;
				text-decoration: none;
				white-space: nowrap;
				line-height: 1.2em;
				width: 100%;
				padding: 0.25em;
				color: var(--color-text);
				align-items: center;
				&:hover {
					text-decoration: underline;
				}
				// box-shadow: 2px 2px 2px black;
				&:nth-child(odd) {
					background-color: fade(white, 2%);
				}
				&:nth-child(even) {
					background-color: fade(black, 10%);
				}

				&.noFollow {
					color: var(--color-secondary);
					&:hover {
						color: var(--color-secondary-light);
					}

					.icon {
						height: 0.75em;
						vertical-align: top;
					}
				}

				.icon {
					display: block;
					vertical-align: middle;
					margin-right: 0.25em;
					height: 1em;
				}
			}
		}
	}
}

@media only screen and (max-width: 450px) {
	.userlist {
		max-height: unset;
	}
}
</style>
