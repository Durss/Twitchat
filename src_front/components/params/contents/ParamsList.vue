<template>
	<div class="paramslist">
		<div
			v-for="(p, key, index) in params"
			:class="highlightId == p.id?.toString() ? 'row blinkBorder blink' : 'row blinkBorder'"
			:key="key"
			:ref="
				(el) => {
					if (el) entryRefs['entry_' + p.id] = [el as HTMLElement];
				}
			"
			v-newflag="p.storage && (p.storage as any).vnew ? (p.storage as any).vnew : null"
		>
			<div :class="getClasses(p, key as string)" v-if="buildIndex > index">
				<ParamItem
					:paramData="p"
					noBackground
					autoFade
					v-model="p.value"
					@change="storeParams.updateParams()"
				>
					<div
						v-if="
							p.id == 212 &&
							p.value === true &&
							!isOBSConnected &&
							!missingScopeStates[p.id!]
						"
						class="config"
					>
						<div class="card-item alert">
							<Icon name="alert" theme="light" />
							<i18n-t
								scope="global"
								class="label"
								tag="p"
								keypath="global.obs_connect"
							>
								<template #LINK>
									<a
										@click="
											storeParams.openParamsPage(
												contentConnexions,
												subcontentObs,
											)
										"
										>{{ t("global.obs_connect_link") }}</a
									>
								</template>
							</i18n-t>
						</div>
					</div>

					<div v-else-if="p.id == 201 && p.value === true" class="config">
						<Button small secondary icon="date" @click="resetGreetHistory()">{{
							t("greet.resetBt")
						}}</Button>
						<i18n-t
							class="greetThem"
							scope="global"
							tag="div"
							keypath="params.firstMessage_info"
						>
							<template #URL>
								<a href="https://chatters.alxios.com" target="_blank"
									>chatters.alxios.com</a
								>
							</template>
						</i18n-t>
					</div>

					<div v-else-if="p.id == 213 && p.value === true" class="config">
						<i18n-t
							class="pronouns"
							scope="global"
							tag="div"
							keypath="params.showUserPronouns_based_on"
						>
							<template #URL1>
								<a href="https://pronouns.alejo.io" target="_blank">Alejo.io</a>
							</template>
							<template #URL2>
								<a href="https://pronoundb.org/" target="_blank">PronounDB</a>
							</template>
						</i18n-t>
					</div>

					<div v-else-if="p.id == 215 && p.value === true" class="config">
						<PostOnChatParam
							class="item"
							botMessageKey="shoutout"
							noBackground
							:noToggle="true"
							titleKey="params.chatShoutout_info"
							:placeholders="soPlaceholders"
						/>
					</div>

					<div v-else-if="p.id == 216 && p.value === true" class="config">
						<Button
							small
							secondary
							@click="storeParams.openParamsPage(contentSpoiler)"
							>{{ t("global.configure") }}</Button
						>
					</div>

					<div v-else-if="p.id == 217 && p.value === true" class="config">
						<Button small secondary @click="storeParams.openParamsPage(contentAlert)">{{
							t("global.configure")
						}}</Button>
					</div>

					<div v-else-if="p.id == 224 && p.value === true" class="config">
						<Button
							small
							secondary
							v-newflag="{ date: 1695691108070, id: 'params_clearHistory' }"
							@click="storeChat.clearHistory()"
							icon="trash"
							>{{ t("params.clearHistory") }}</Button
						>
					</div>

					<div v-else-if="missingScopeStates[p.id!] && p.value == true" class="config">
						<div class="card-item alert">
							<Icon name="lock_fit" theme="light" />
							<p class="label">{{ t("params.scope_missing") }}</p>
							<Button
								small
								alert
								light
								class="grantBt"
								icon="unlock"
								@click.capture.stop="requestPermission(p.twitch_scopes!)"
								>{{ t("global.grant_scope") }}</Button
							>
						</div>
					</div>
				</ParamItem>

				<div v-if="p.id == 12 && fakeMessageData" class="config">
					<ChatMessage
						class="chatMessage"
						:messageData="fakeMessageData"
						contextMenuOff
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import ChatMessage from "@/components/messages/ChatMessage.vue";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import type { TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import TTButton from "../../TTButton.vue";
import ParamItem from "../ParamItem.vue";
import PostOnChatParam from "../PostOnChatParam.vue";
import type IParameterContent from "./IParameterContent";
import { computed, nextTick, onBeforeMount, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeParams as useStoreParams } from "@/store/params/storeParams";

const Button = TTButton;

const props = withDefaults(
	defineProps<{
		category?: TwitchatDataTypes.ParameterCategory;
		filteredParams?: TwitchatDataTypes.ParameterData<unknown>[];
	}>(),
	{},
);

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeChat = useStoreChat();
const storeDebug = useStoreDebug();
const storeMain = useStoreMain();
const storeParams = useStoreParams();

const buildIndex = ref<number>(0);
const highlightId = ref<string>("");
const fakeMessageData = ref<TwitchatDataTypes.MessageChatData | null>(null);
const soPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);

const disabledStates = ref<{ [key: number]: boolean }>({});
const missingScopeStates = ref<{ [key: number]: boolean }>({});

const entryRefs: { [key: string]: HTMLElement[] } = {};

let buildInterval: number = -1;
const buildBatch: number = 15;

const isOBSConnected = computed<boolean>(() => {
	return OBSWebsocket.instance.connected.value;
});

const params = computed<{ [key: string]: TwitchatDataTypes.ParameterData<unknown> }>(() => {
	let res: { [key: string]: TwitchatDataTypes.ParameterData<unknown> } = {};
	if (props.filteredParams && props.filteredParams.length > 0) {
		for (const p of props.filteredParams) {
			res[(p.id as number)?.toString()] = p;
		}
	} else {
		if (!props.category) return {};

		for (const key in storeParams.$state[props.category]) {
			const cat = storeParams.$state[props.category];
			if (props.category == "appearance" || props.category == "features") {
				const param = cat[
					key as keyof typeof cat
				] as TwitchatDataTypes.ParameterData<unknown>;
				if (param.parent) continue;
				res[key] = param;
			}
		}
	}
	if (!storeAuth.featureFlags.includes("auto_translate")) {
		delete res["autoTranslate"];
	}
	return res;
});

const subcontentObs = computed<TwitchatDataTypes.ParamDeepSectionsStringType>(() => {
	return TwitchatDataTypes.ParamDeepSections.OBS;
});
const contentConnexions = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.CONNECTIONS;
});
const contentSpoiler = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.SPOILER;
});
const contentAlert = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.ALERT;
});

onBeforeMount(async () => {
	buildIndex.value = 0;
	new Promise((resolve) => {
		storeDebug.simulateMessage(
			TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			(data) => {
				fakeMessageData.value = data as TwitchatDataTypes.MessageChatData;
				resolve(null);
			},
			false,
			false,
		);
	});

	const me = storeAuth.twitch.user;
	soPlaceholders.value = [
		{
			tag: "USER",
			descKey: "params.chatShoutout_placeholders.user",
			example: me.displayNameOriginal,
		},
		{
			tag: "URL",
			descKey: "params.chatShoutout_placeholders.user_link",
			example: "twitch.tv/" + me.login,
		},
		{
			tag: "TITLE",
			descKey: "params.chatShoutout_placeholders.stream_title",
			example: "Lorem ipsum",
		},
		{
			tag: "CATEGORY",
			descKey: "params.chatShoutout_placeholders.stream_category",
			example: "Just chatting",
		},
	];

	watch(
		() => props.category,
		() => {
			startSequentialBuild();
			computeMissingScopeStates();
		},
	);
	watch(
		() => props.filteredParams,
		() => {
			startSequentialBuild();
			computeMissingScopeStates();
		},
	);
	watch(
		() => storeAuth.twitch.scopes,
		() => computeMissingScopeStates(),
	);

	computeMissingScopeStates();
	startSequentialBuild();
});

onBeforeUnmount(() => {
	clearInterval(buildInterval);
});

function requestPermission(scopes: TwitchScopesString[]): void {
	storeAuth.requestTwitchScopes(scopes);
}

function resetGreetHistory(): void {
	confirm(t("greet.reset_confirm_title"), t("greet.reset_confirm_description"), undefined)
		.then(() => {
			storeChat.resetGreetingHistory();
		})
		.catch(() => {});
}

function startSequentialBuild(): void {
	buildIndex.value = buildBatch;
	clearInterval(buildInterval);
	buildInterval = window.setInterval(() => {
		buildIndex.value++;
		if (buildIndex.value >= Object.keys(params.value).length) {
			clearInterval(buildInterval);

			//If redirecting to a specific params, highlight it
			const param = storeMain.tempStoreValue || storeParams.currentPageSubContent;
			if (param) {
				nextTick().then(() => {
					const holders = entryRefs["entry_" + param];
					if (holders) {
						highlightId.value = param as string;
						const holder = holders[0];
						if (holder) {
							const interval = window.setInterval(() => {
								holder.scrollIntoView({ behavior: "auto", block: "center" });
							}, 30);
							window.setTimeout(() => {
								clearInterval(interval);
							}, 1000);
						}
					}
					storeMain.tempStoreValue = "";
					storeParams.currentPageSubContent = "";
				});
			}
		}
	}, 30);
}

function getClasses(p: TwitchatDataTypes.ParameterData<unknown>, key: string): string[] {
	const id = p.id!;
	let res = ["item", key];
	if (p.icon) res.push("hasIcon");
	if (p.value === false) res.push("off");
	if (p.premiumOnly === true) res.push("premium");
	if (disabledStates.value[id]) res.push("disabled");
	return res;
}

function computeMissingScopeStates(): void {
	for (const key in params.value) {
		const p = params.value[key]!;
		const id = params.value[key]!.id!;
		if (p.twitch_scopes) {
			missingScopeStates.value[id] = !TwitchUtils.hasScopes(p.twitch_scopes);
		} else {
			missingScopeStates.value[id] = false;
		}
		disabledStates.value[id] =
			(p.id == 212 && !isOBSConnected.value) || missingScopeStates.value[id]!;
	}
}

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});
</script>

<style scoped lang="less">
.paramslist {
	padding-top: 0.25em;
	.row {
		position: relative;
		@iconSize: 1em;

		& > .item {
			padding: 0.25em;
			position: relative;
			border-radius: 0.5em;
			background-color: var(--background-color-fader);
			&:not(:first-of-type) {
				margin-top: 10px;
			}
			:deep(.child) {
				width: calc(100% - @iconSize - 0.5em);
				.holder::before {
					left: -@iconSize - 0.25em;
				}
			}
			&.hasIcon::before {
				content: "";
				position: absolute;
				left: 0;
				top: 0;
				width: @iconSize + 0.5em;
				height: 100%;
				z-index: 0;
				border-top-left-radius: 0.5em;
				border-bottom-left-radius: 0.5em;
				background-color: var(--background-color-fadest);
			}

			&.off:not(.premium) {
				background-color: var(--background-color-fadest);
			}

			.chatMessage {
				background-color: var(--background-color-primary);
				padding: 0.5em;
				border-radius: 0.5em;
				transition: font-size 0.25s;
			}
			&.premium {
				background-color: var(--color-premium-fadest);
			}
		}

		&:not(:last-child) {
			margin-bottom: 10px;
		}

		.config {
			overflow: hidden;
			padding: 0.5em 0 0 0;
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			img {
				height: 1em;
				vertical-align: middle;
			}

			.label {
				display: inline;
				strong {
					padding: 0.25em 0.5em;
					border-radius: 0.5em;
					font-size: 0.8em;
				}
			}

			.alert {
				margin-left: calc(@iconSize + 0.5em);
				text-align: center;
				align-self: stretch;
				p {
					font-size: 0.8em;
				}
				.icon {
					height: 0.8em;
					margin-right: 0.25em;
					vertical-align: middle;
				}
				.grantBt {
					display: flex;
					margin: 0.5em auto;
				}
			}
			.pronouns,
			.spoiler,
			.greetThem {
				font-size: 0.8em;
				opacity: 0.9;
			}
		}

		.hasIcon {
			.config {
				padding-left: @iconSize + 0.5em;
			}
		}
	}
}
</style>
