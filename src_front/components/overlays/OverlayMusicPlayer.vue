<template>
	<div :class="classes">
		<transition name="slide">
			<div class="content" v-if="isPlaying" id="music_holder">
				<div class="cover" id="music_cover" v-if="params?.showCover !== false">
					<img :src="cover" />
				</div>

				<div class="infos" id="music_content">
					<div id="music_infos" class="trackHolder">
						<Vue3Marquee
							:duration="duration"
							:animateOnOverflowOnly="true"
							:clone="noScroll === false"
							v-if="noScroll !== true && !resetScrolling"
						>
							<div class="track">
								<div
									class="custom"
									id="music_info_custom_template"
									v-if="customTrackInfo"
									v-html="customTrackInfo"
								></div>
								<div
									class="artist"
									id="music_artist"
									v-if="params?.showArtist !== false"
								>
									{{ artist }}
								</div>
								<div
									class="title"
									id="music_title"
									v-if="params?.showTitle !== false"
								>
									{{ title }}
								</div>
							</div>
						</Vue3Marquee>
						<div class="staticInfos">
							<div class="track" v-if="noScroll === true || resetScrolling">
								<div
									class="custom"
									id="music_info_custom_template"
									v-if="customTrackInfo"
									v-html="customTrackInfo"
								></div>
								<div
									class="artist"
									id="music_artist"
									v-if="params?.showArtist !== false"
								>
									{{ artist }}
								</div>
								<div
									class="title"
									id="music_title"
									v-if="params?.showTitle !== false"
								>
									{{ title }}
								</div>
							</div>
						</div>
					</div>
					<div
						class="progressbar"
						ref="progressbar"
						id="music_progress"
						@click="onSeek($event)"
						v-if="params?.showProgressbar !== false"
					>
						<div class="fill" id="music_progress_fill" :style="progressStyles"></div>
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script setup lang="ts">
import { asset } from "@/composables/useAsset";
import { useOverlayConnector } from "@/composables/useOverlayConnector";
import type TwitchatEvent from "@/events/TwitchatEvent";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useRoute } from "vue-router";
import { Vue3Marquee } from "vue3-marquee";
import { replacePlaceholders } from "@/utils/PlaceholderModifiers";
import DOMPurify from "isomorphic-dompurify";

const props = withDefaults(
	defineProps<{
		embed?: boolean;
		keepEmbedTransitions?: boolean;
		playbackPos?: number;
		staticTrackData?: TwitchatDataTypes.MusicTrackData;
		staticOverlayParams?: TwitchatDataTypes.MusicPlayerParamsData;
	}>(),
	{
		embed: false,
		keepEmbedTransitions: false,
	},
);

const emit = defineEmits<{
	seek: [percent: number];
}>();

const route = useRoute();
const { getAsset } = asset();

const progressbar = useTemplateRef("progressbar");

const artist = ref("");
const title = ref("");
const cover = ref<string | undefined>(undefined);
const skin = ref<string | undefined>(undefined);
const customTrackInfo = ref("");
const progress = ref(0);
const isPlaying = ref(false);
const resetScrolling = ref(false);
const params = ref<TwitchatDataTypes.MusicPlayerParamsData | null>(null);

const noScroll = computed(() => {
	if (Object.hasOwn(route.query, "noScroll")) return true;
	if (params.value) {
		if (params.value.noScroll === true) return true;
	}
	return false;
});

const classes = computed<string[]>(() => {
	let res = ["overlaymusicplayer"];
	if (props.embed !== false) res.push("embed");
	if (props.keepEmbedTransitions !== false) res.push("keepEmbedTransitions");
	if (params.value) {
		if (params.value.noScroll === true) res.push("noScroll");
		if (params.value.openFromLeft === true) res.push("left");
	}
	if (skin.value) res.push(skin.value);
	return res;
});

const duration = computed<number>(() => {
	return Math.max(artist.value.length, title.value.length, 20) / 2;
});

const progressStyles = computed<{ [key: string]: string }>(() => {
	return {
		width: `${progress.value * 100}%`,
	};
});

if (!props.staticOverlayParams && props.staticTrackData) {
	useOverlayConnector(requestInfo);
}

onMounted(() => {
	if (!props.staticTrackData) {
		PublicAPI.instance.addEventListener("ON_CURRENT_TRACK", onTrack);
	} else {
		onTrackChangeLocal();
		progress.value = 50;
	}
	if (props.staticOverlayParams) {
		params.value = props.staticOverlayParams;
	}
	if (props.staticOverlayParams || props.staticTrackData) {
		onTrackChangeLocal();
	}
});

onBeforeUnmount(() => {
	PublicAPI.instance.removeEventListener("ON_CURRENT_TRACK", onTrack);
	gsap.killTweensOf(progress);
});

function requestInfo(): void {
	PublicAPI.instance.broadcast("GET_CURRENT_TRACK");
}

function onSeek(e: MouseEvent): void {
	const bounds = progressbar.value!.getBoundingClientRect();
	const percent = e.offsetX / bounds.width;
	emit("seek", percent);
}

async function onTrack(e: TwitchatEvent<"ON_CURRENT_TRACK">): Promise<void> {
	if (e.data && e.data.params) {
		params.value = e.data.params;
	}
	if (e.data.trackName && e.data.artistName) {
		const prevArtist = artist.value;
		const prevTitle = title.value;
		artist.value = e.data.artistName;
		title.value = e.data.trackName;
		cover.value = e.data.cover;
		skin.value = e.data.skin;
		isPlaying.value = true;
		let trackInfo = params.value?.customInfoTemplate || "";
		if (trackInfo)
			trackInfo = replacePlaceholders(trackInfo, {
				ARTIST: artist.value || "no music",
				TITLE: title.value || "no music",
				COVER: cover.value || "",
			});
		customTrackInfo.value = DOMPurify.sanitize(trackInfo);

		const newProgress = e.data.trackPlaybackPos! / e.data.trackDuration!;
		progress.value = newProgress;
		const duration = (e.data.trackDuration! * (1 - newProgress)) / 1000;
		gsap.killTweensOf(progress);
		gsap.to(progress, { duration, value: 1, ease: "linear" });

		if (params.value?.noScroll !== true) {
			//If it's a new track, reset the scrolling
			if (prevArtist != artist.value && prevTitle != title.value) {
				resetScrolling.value = true;
				await nextTick();
				resetScrolling.value = false;
			}
		}
	} else {
		isPlaying.value = params.value?.autoHide !== false;
		if (params.value?.erase === true) {
			artist.value = "no music";
			title.value = "no music";
			cover.value = getAsset("img/defaultCover.svg");
		}
		gsap.killTweensOf(progress);
		if (params.value) {
			params.value.showProgressbar = false;
		}
	}
	if (!/http?s:\/\/.{5,}/.test(cover.value || "")) {
		cover.value = getAsset("img/defaultCover.svg");
	}
}

function onTrackChangeLocal(): void {
	if (props.staticTrackData) {
		artist.value = props.staticTrackData.artist;
		title.value = props.staticTrackData.title;
		cover.value = props.staticTrackData.cover;
		if (!cover.value) {
			cover.value = getAsset("img/default_music_cover.png");
		}
		isPlaying.value = true;
		let trackInfo = props.staticOverlayParams?.customInfoTemplate || "";
		if (trackInfo) {
			trackInfo = replacePlaceholders(trackInfo, {
				ARTIST: artist.value || "no music",
				TITLE: title.value || "no music",
				COVER: cover.value,
			});
			customTrackInfo.value = DOMPurify.sanitize(trackInfo);
		} else {
			customTrackInfo.value = "";
		}

		const newProgress = 600 / props.staticTrackData.duration;
		progress.value = newProgress;
		const duration = props.staticTrackData.duration * (1 - newProgress);
		gsap.killTweensOf(progress);
		gsap.to(progress, { duration, value: 1, ease: "linear" });
	} else {
		isPlaying.value = false;
	}
}

if (props.staticOverlayParams) {
	watch(
		() => props.staticOverlayParams,
		() => onTrackChangeLocal(),
		{ deep: true },
	);
}
</script>

<style scoped lang="less">
.overlaymusicplayer {
	&.embed {
		width: 100%;
		aspect-ratio: 300 / 54;
		margin: auto;
		margin-top: 0.5em;
		margin-bottom: 0.5em;

		.content {
			width: 100%;
			height: 100%;
			max-width: unset;
			max-height: unset;

			.cover {
				width: 20%;
				height: 100%;
			}
			.infos {
				font-size: 1em;
			}
		}

		&:not(.keepEmbedTransitions) {
			.slide-enter-active {
				transition: unset;
			}

			.slide-leave-active {
				transition: unset;
			}
		}
	}

	&.noScroll {
		.content {
			.infos {
				.trackHolder {
					.track {
						.custom {
							padding-right: 0 !important;
						}
					}
				}
			}
		}
	}

	.content {
		@maxHeight: ~"min(100vh, 25vw)";
		display: flex;
		flex-direction: row;
		background-color: var(--color-dark);
		max-height: @maxHeight;
		max-width: 100%;
		border-radius: var(--border-radius);
		overflow: hidden;

		.cover {
			width: @maxHeight;
			height: @maxHeight;
			object-fit: cover;
			overflow: hidden;
			img {
				width: 100%;
				height: 100%;
			}
		}

		.infos {
			color: var(--color-light);
			@minFontSize: calc(@maxHeight / 3);
			font-size: ~"min(@{minFontSize}, 50vh)";
			flex: 1;
			padding: 0 0.25em;
			min-width: 0px; //Tell flexbox it's ok to shrink it
			display: flex;
			flex-direction: column;
			justify-content: stretch;
			align-items: stretch;
			justify-items: stretch;

			:deep(.vue3-marquee) {
				overflow-y: hidden;
				align-items: center;
			}

			.trackHolder {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
				justify-content: center;
				.track {
					display: flex;
					flex-direction: column-reverse;

					.custom {
						padding-right: 1rem;
					}

					.artist,
					.title {
						padding-right: 1rem;
						display: flex;
						line-height: 1.2em;
					}
					.artist {
						font-weight: bold;
						font-size: 0.8em;
						align-items: flex-end;
					}
					.title {
						font-weight: bold;
						align-items: flex-start;
					}
				}

				.staticInfos {
					width: 100%;
					.track {
						// font-size: .8em;
						.artist,
						.title {
							width: 100%;
							padding-right: 0 !important;
							display: block;
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
						}
					}
				}
			}
		}
		.progressbar {
			height: 0.24em;
			max-width: 100%;
			.fill {
				background-color: var(--color-primary);
				height: 100%;
			}
		}
	}

	.slide-enter-active {
		transition: all 0.5s ease-out;
	}

	.slide-leave-active {
		transition: all 0.5s ease-out;
	}

	.slide-enter-from,
	.slide-leave-to {
		transform: translateX(100%);
	}

	&.left {
		.slide-enter-from,
		.slide-leave-to {
			transform: translateX(-100%);
		}
	}

	&.etc {
		@maxHeight: ~"min(calc(100vh - 5vw), 25vw)";
		max-height: @maxHeight;
		max-width: calc(100% - 1.5vw);

		.cover {
			width: @maxHeight;
			height: @maxHeight;
		}

		.content {
			font-weight: bold;
			border: 1.5vw solid #000000;
			background-color: #aa45e5;
			border-radius: 5vw;
			filter: drop-shadow(1vw 1vw 0px #6bf9ff);
			.infos {
				color: #000;
			}
		}
		.progressbar {
			.fill {
				background-color: #6bf9ff;
			}
		}
	}
}
</style>
