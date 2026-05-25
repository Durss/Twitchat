<template>
	<span
		v-for="chunk in spoiledChunks"
		:class="{
			chunk: true,
			spoilerFrag: chunk.spoiler === true,
			spoilerTag: chunk.spoilerTag === true,
		}"
	>
		<template v-if="chunk.type == 'text'">{{ chunk.value }}</template>

		<template v-if="chunk.type == 'user'">
			<a
				class="login"
				v-if="storeParams.appearance.highlightusernames.value == true"
				@click.stop="openProfile(chunk.username!)"
				:style="getUserClasses(chunk.username!)"
				target="_blank"
				>{{ chunk.value }}</a
			>
			<mark
				v-else-if="new RegExp('@?' + storeAuth.twitch.user?.login, 'gi').test(chunk.value)"
				>{{ chunk.value }}</mark
			>
			<template v-else>{{ chunk.value }}</template>
		</template>

		<tooltip
			:class="chunk.type"
			v-else-if="
				(chunk.type == 'emote' || chunk.type == 'cheermote') &&
				storeParams.appearance.showEmotes.value !== false
			"
			:content="
				chunk.emoteHD
					? '<center><img src=' +
						chunk.emoteHD +
						' width=\'' +
						(largeEmote ? 150 : 112) +
						'\' class=\'emote\'><br>' +
						chunk.value +
						'</center>'
					: ''
			"
		>
			<img
				:src="largeEmote ? chunk.emoteHD : chunk.emote"
				:alt="chunk.value"
				loading="lazy"
			/>
		</tooltip>

		<template v-else-if="chunk.type == 'url'">
			<Icon
				name="copy"
				theme="secondary"
				class="copyBt"
				v-tooltip="t('global.copy')"
				@click.stop="copyLink($event, chunk)"
			/>
			<a @click.stop="" :href="chunk.href" target="_blank">{{ chunk.value }}</a>
		</template>

		<mark v-else-if="chunk.type == 'highlight'">{{ chunk.value }}</mark>
	</span>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { gsap } from "gsap";
import { computed, type CSSProperties } from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";

const props = defineProps<{
	chunks: TwitchatDataTypes.ParseMessageChunk[];
	channel?: string;
	platform?: TwitchatDataTypes.ChatPlatform;
	largeEmote?: boolean;
	forceSpoiler?: boolean;
	containsSpoiler?: boolean;
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeCommon = useStoreCommon();
const storeParams = useStoreParams();
const storeUsers = useStoreUsers();

const colorDarken = computed<string>(() => {
	return storeCommon.theme == "dark" ? "none" : "brightness(0.8)";
});

const spoiledChunks = computed<TwitchatDataTypes.ParseMessageChunk[]>(() => {
	if (
		(!props.forceSpoiler && !props.containsSpoiler) ||
		storeParams.features.spoilersEnabled.value !== true
	)
		return props.chunks;

	const chunks: TwitchatDataTypes.ParseMessageChunk[] = [];

	for (let i = 0; i < props.chunks.length; i++) {
		const chunk = JSON.parse(JSON.stringify(props.chunks[i]));
		if (chunk.type == "text" && chunk.value.indexOf("||") > -1) {
			const spoilChunks = chunk.value.split("||");
			for (let j = 0; j < spoilChunks.length; j++) {
				const spoilChunk = spoilChunks[j];
				if (spoilChunk != "") chunks.push({ type: "text", value: spoilChunk });
				if (j < spoilChunks.length - 1) {
					chunks.push({ type: "text", value: "||" });
				}
			}
		} else {
			chunks.push(chunk);
		}
	}

	let isSpoiler = false;
	for (const chunk of chunks) {
		if (chunk.type == "text" && chunk.value == "||") {
			isSpoiler = !isSpoiler;
			chunk.spoilerTag = true;
		} else if (isSpoiler) {
			chunk.spoiler = true;
		}
		if (props.forceSpoiler === true) chunk.spoiler = true;
	}

	return chunks;
});

function copyLink(e: MouseEvent, chunk: TwitchatDataTypes.ParseMessageChunk): void {
	Utils.copyToClipboard(chunk.value);
	e.stopPropagation();
	gsap.fromTo(
		e.currentTarget,
		{ scale: 1.5, filter: "brightness(4)" },
		{ scale: 1, filter: "brightness(1)", duration: 0.2, clearProps: "all" },
	);
}

function openProfile(username: string): void {
	const channelId = props.channel || storeAuth.twitch.user.id;
	const user = storeUsers.getUserFrom(props.platform || "twitch", channelId, undefined, username);
	storeUsers.openUserCard(user, channelId, props.platform);
}

function getUserClasses(username: string): CSSProperties {
	if (!storeAuth.twitch.user) return { color: "#c400da" };
	const color = storeUsers.getUserColorFromLogin(username, props.platform || "twitch");
	if (color) {
		return {
			color: color,
		};
	}
	return {};
}
</script>

<style scoped lang="less">
.login {
	filter: v-bind(colorDarken);
	&:hover {
		background-color: var(--background-color-fader);
		border-radius: 3px;

		.copyBt {
			width: 1em;
		}
	}
}

.emote {
	img {
		height: 100%;
	}
}
</style>
