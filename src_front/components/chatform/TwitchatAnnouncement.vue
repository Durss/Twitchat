<template>
	<div class="twitchatannouncement sidePanel" ref="rootEl">
		<div class="head">
			<div class="title">
				<Icon name="announcement" />
				<i18n-t scope="global" tag="h1" keypath="announcement.title"> </i18n-t>
			</div>

			<i18n-t scope="global" class="description" tag="span" keypath="announcement.subtitle">
			</i18n-t>

			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<form class="form" @submit.prevent="submitForm()">
				<ParamItem :paramData="param_dateStart" />
				<ParamItem :paramData="param_dateEnd" />
				<ParamItem v-for="title in param_title" :paramData="title" />
				<ParamItem v-for="text in param_text" :paramData="text" />
				<ParamItem :paramData="param_versionMax" />
				<ParamItem :paramData="param_important" />
				<ParamItem :paramData="param_donorsOnly" />
				<ParamItem :paramData="param_premiumOnly" />
				<ParamItem :paramData="param_patreonOnly" />
				<ParamItem :paramData="param_heatOnly" />
				<TTButton type="submit" :loading="submitting">{{
					t("announcement.postBt")
				}}</TTButton>
			</form>

			<Splitter>{{ t("announcement.list") }}</Splitter>

			<div class="list">
				<Icon class="loader" name="loader" v-if="loading" />
				<div class="card-item announcement" v-for="a in announcements" :key="a.id">
					<div class="ctas">
						<TTButton
							class="deleteBt"
							icon="trash"
							alert
							@click="deleteAnnounce(a.id)"
						></TTButton>
					</div>
					<div class="infos">
						<div class="title">
							<strong
								><ChatMessageChunksParser
									:chunks="getAnnouncementTitle(a)"
									:channel="storeAuth.twitch.user.id"
									platform="twitch"
							/></strong>
						</div>
						<div class="restrictions">
							<span v-if="a.versionMax" class="version"
								>version max v{{ a.versionMax }}</span
							>
							<Icon name="coin" v-if="a.donorsOnly" v-tooltip="'donors only'" />
							<Icon name="premium" v-if="a.premiumOnly" v-tooltip="'premium only'" />
							<Icon
								name="patreon"
								v-if="a.patreonOnly"
								v-tooltip="'patreon members only'"
							/>
							<Icon name="heat" v-if="a.heatOnly" v-tooltip="'heat users only'" />
						</div>
						<p class="date">
							<span>{{ formatDate(a.dateStart) }}</span>
							<span v-if="a.dateEnd" class="split">=&gt;</span>
							<span v-if="a.dateEnd">{{ formatDate(a.dateEnd) }}</span>
						</p>
						<p class="text">
							<ChatMessageChunksParser
								:chunks="getAnnouncementMessage(a)"
								:channel="storeAuth.twitch.user.id"
								platform="twitch"
							/>
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { ref, useTemplateRef, onBeforeMount } from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { useSidePanel } from "@/composables/useSidePanel";
import { useConfirm } from "@/composables/useConfirm";
import TTButton from "../TTButton.vue";
import ClearButton from "../ClearButton.vue";
import Icon from "../Icon.vue";
import Splitter from "../Splitter.vue";
import ChatMessageChunksParser from "../messages/components/ChatMessageChunksParser.vue";
import ParamItem from "../params/ParamItem.vue";

const emit = defineEmits<{ close: [] }>();

const { t, locale, availableLocales } = useI18n();
const storeAuth = useStoreAuth();
const { confirm } = useConfirm();
const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"));

const error = ref<boolean>(false);
const success = ref<boolean>(false);
const loading = ref<boolean>(false);
const submitting = ref<boolean>(false);
const announcements = ref<TwitchatDataTypes.TwitchatAnnouncementData[]>([]);
const param_title = ref<TwitchatDataTypes.ParameterData<string, unknown, unknown, string>[]>([]);
const param_text = ref<TwitchatDataTypes.ParameterData<string, unknown, unknown, string>[]>([]);
const param_important = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "announcement.param_important",
	icon: "alert",
});
const param_dateStart = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "datetime",
	value: new Date().toISOString().substring(0, 16),
	labelKey: "announcement.param_dateStart",
	icon: "date",
});
const param_dateEnd = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "datetime",
	value: "",
	labelKey: "announcement.param_dateEnd",
	icon: "date",
});
const param_versionMax = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	labelKey: "announcement.param_versionMax",
});
const param_donorsOnly = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "announcement.param_donorsOnly",
	icon: "coin",
});
const param_premiumOnly = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "announcement.param_premiumOnly",
	icon: "premium",
});
const param_patreonOnly = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "announcement.param_patreonOnly",
	icon: "patreon",
});
const param_heatOnly = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "announcement.param_heatOnly",
	icon: "heat",
});

function getAnnouncementTitle(
	a: TwitchatDataTypes.TwitchatAnnouncementData,
): TwitchatDataTypes.ParseMessageChunk[] {
	return TwitchUtils.parseMessageToChunks(a.title[locale.value]!, undefined, true);
}

function getAnnouncementMessage(
	a: TwitchatDataTypes.TwitchatAnnouncementData,
): TwitchatDataTypes.ParseMessageChunk[] {
	return TwitchUtils.parseMessageToChunks(a.text[locale.value]!, undefined, true);
}

onBeforeMount(() => {
	availableLocales.forEach((v) => {
		param_title.value.push({
			type: "string",
			value: "",
			storage: v,
			label: v.toUpperCase() + " " + t("announcement.param_title"),
		});
		param_text.value.push({
			type: "string",
			value: "",
			storage: v,
			longText: true,
			label: v.toUpperCase() + " " + t("announcement.param_text"),
		});
	});
	param_versionMax.value.value = import.meta.env.PACKAGE_VERSION;

	//Wait for emotes to be loaded to make sure they get parsed
	TwitchUtils.getEmotes().then(() => {
		loadAnnouncements();
	});
});

async function loadAnnouncements(): Promise<void> {
	loading.value = true;
	const options = {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + storeAuth.twitch.access_token,
			"App-Version": import.meta.env.PACKAGE_VERSION,
		},
	};
	const res = await fetch(Config.instance.API_PATH + "/announcements", options);
	if (res.status == 200) {
		const json: TwitchatDataTypes.TwitchatAnnouncementData[] = await res.json();
		announcements.value = json.reverse();
	} else {
		error.value = true;
	}
	loading.value = false;
}

async function submitForm(): Promise<void> {
	error.value = true;
	success.value = true;
	submitting.value = true;
	const title: { [key: string]: string } = {};
	const text: { [key: string]: string } = {};
	param_title.value.forEach((v) => (title[v.storage!] = v.value));
	param_text.value.forEach((v) => (text[v.storage!] = v.value));

	confirm(t("announcement.create_confirm.title"), t("announcement.create_confirm.description"))
		.then(async () => {
			const data: Omit<TwitchatDataTypes.TwitchatAnnouncementData, "id"> = {
				title,
				text,
				dateStart: new Date(param_dateStart.value.value).getTime(),
				dateEnd: new Date(param_dateEnd.value.value).getTime(),
				versionMax: param_versionMax.value.value,
				important: param_important.value.value,
				donorsOnly: param_donorsOnly.value.value,
				premiumOnly: param_premiumOnly.value.value,
				patreonOnly: param_patreonOnly.value.value,
				heatOnly: param_heatOnly.value.value,
			};
			const options = {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer " + storeAuth.twitch.access_token,
					"App-Version": import.meta.env.PACKAGE_VERSION,
				},
				body: JSON.stringify(data),
			};
			const res = await fetch(Config.instance.API_PATH + "/admin/announcements", options);
			if (res.status == 200) {
				const json = await res.json();
				if (json.success != true) {
					error.value = true;
				} else {
					success.value = true;
					loadAnnouncements();
				}
			} else {
				error.value = true;
			}
			submitting.value = false;
		})
		.catch(() => {
			submitting.value = false;
		});
}

function deleteAnnounce(id: string): void {
	confirm(t("announcement.delete_confirm.title"), t("announcement.delete_confirm.description"))
		.then(async () => {
			const options = {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer " + storeAuth.twitch.access_token,
					"App-Version": import.meta.env.PACKAGE_VERSION,
				},
				body: JSON.stringify({ id }),
			};
			const res = await fetch(Config.instance.API_PATH + "/admin/announcements", options);
			if (res.status == 200) {
				const json = await res.json();
				if (json.success != true) {
					error.value = true;
				} else {
					success.value = true;
					loadAnnouncements();
				}
			}
		})
		.catch(() => {});
}

function formatDate(timestamp: number): string {
	return Utils.formatDate(new Date(timestamp));
}
</script>

<style scoped lang="less">
.twitchatannouncement {
	.loader {
		display: block;
		width: 2em;
		margin: auto;
	}

	.splitter {
		margin-top: 2em;
	}

	.list {
		gap: 1em;
		display: flex;
		flex-direction: column;

		.announcement {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			.ctas {
				.deleteBt {
					width: 1.5em;
				}
			}
			.infos {
				line-height: 1.25em;
				.title {
					font-size: 1.25em;
				}

				.restrictions {
					gap: 0.25em;
					display: flex;
					flex-direction: row;
					align-items: center;
					margin: 0.25em 0;
					.icon {
						font-size: 1.25em;
						height: 1em;
						width: 1em;
						display: flex;
						padding: 0.15em;
						border-radius: 50%;
						border: 1px solid var(--color-text);
					}
					&:empty {
						display: none;
					}
				}

				.date {
					font-style: italic;
					font-size: 0.8em;
					.split {
						margin: 0 0.75em;
					}
				}
				.text {
					margin-top: 0.5em;
					white-space: pre-line;
				}
			}
		}
	}
}
</style>
