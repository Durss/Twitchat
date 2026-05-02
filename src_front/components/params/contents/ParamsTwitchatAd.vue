<template>
	<div
		:class="classes"
		@click="open()"
		v-if="storeAuth.donorLevel == -1 || storeAuth.isPremium || !storeAuth.noAd"
	>
		<ClearButton
			v-if="!collapse"
			:aria-label="t('params.ad_collapse_aria')"
			@click.stop="close()"
			theme="light"
		/>

		<Icon name="twitchat" alt="twitchat" theme="light" class="icon" />

		<div class="content" ref="content" v-if="!collapse">
			<PostOnChatParam
				class="param"
				botMessageKey="twitchatAd"
				:noToggle="!isDonor"
				clearToggle
				noBackground
				prefix="/announcepurple "
				titleKey="params.ad_info"
			/>

			<template v-if="!isDonor">
				<ToggleBlock
					class="tip"
					noTitleColor
					:open="false"
					:title="t('params.ad_bot_info_title')"
					small
				>
					<div class="tipContent" v-html="t('params.ad_bot_info_content')"></div>
				</ToggleBlock>

				<div class="card-item dark disableinstructions">
					<p v-html="t('params.ad_disable_info')"></p>
					<TTButton @click="openDonate()" light secondary icon="coin">{{
						t("params.ad_disableBt")
					}}</TTButton>
					<TTButton @click="openPremium()" light premium icon="premium">{{
						t("premium.become_premiumBt")
					}}</TTButton>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import DataStore from "@/store/DataStore";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { computed, nextTick, onBeforeMount, ref, watch } from "vue";
import PostOnChatParam from "../PostOnChatParam.vue";
import ClearButton from "@/components/ClearButton.vue";
import { gsap } from "gsap";
import Icon from "@/components/Icon.vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		expand?: boolean;
	}>(),
	{
		expand: false,
	},
);

const emit = defineEmits<{
	collapse: [];
	expand: [];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();

const collapse = ref<boolean>(true);
const blink = ref<boolean>(false);
const content = ref<HTMLDivElement>();

const isDonor = computed<boolean>(() => {
	return storeAuth.donorLevel > -1 || storeAuth.isPremium;
});
const adMinFollowersCount = computed<number>(() => {
	return Config.instance.AD_MIN_FOLLOWERS_COUNT;
});

const classes = computed<string[]>(() => {
	let res = ["paramstwitchatad", "card-item", "secondary"];
	if (collapse.value) res.push("collapse");
	if (blink.value) res.push("blink");
	return res;
});

onBeforeMount(() => {
	const subContent = storeParams.currentPageSubContent;
	if (subContent == "ad") {
		blink.value = true;
		window.setTimeout(() => {
			blink.value = false;
			storeParams.currentPageSubContent = "";
		}, 3000);
	}
	collapse.value =
		DataStore.get(DataStore.COLLAPSE_PARAM_AD_INFO) === "true" &&
		props.expand === false &&
		subContent != "ad";
});

watch(
	() => props.expand,
	() => {
		if (props.expand !== false) collapse.value = false;
	},
);
watch(
	() => storeParams.currentPageSubContent,
	() => {
		if (storeParams.currentPageSubContent === "ad") {
			collapse.value = false;
			blink.value = true;
			window.setTimeout(() => {
				blink.value = false;
				storeParams.currentPageSubContent = "";
			}, 3000);
		}
	},
);

async function open(): Promise<void> {
	if (!collapse.value) return;
	collapse.value = false;
	await nextTick();
	await nextTick();
	await nextTick();
	await nextTick();
	await nextTick();
	await nextTick();
	const el = content.value as HTMLDivElement;
	DataStore.set(DataStore.COLLAPSE_PARAM_AD_INFO, false);
	gsap.from(el, {
		padding: 0,
		width: 0,
		height: 0,
		duration: 0.35,
		ease: "quad.inOut",
		clearProps: "all",
		onComplete: () => {
			emit("expand");
		},
	});
}

function close(): void {
	if (collapse.value) return;
	const el = content.value as HTMLDivElement;
	DataStore.set(DataStore.COLLAPSE_PARAM_AD_INFO, true);
	gsap.to(el, {
		padding: 0,
		width: 0,
		height: 0,
		duration: 0.35,
		ease: "quad.inOut",
		clearProps: "all",
		onComplete: () => {
			collapse.value = true;
			emit("collapse");
		},
	});
}

function openDonate(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.DONATE);
}

function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}
</script>

<style scoped lang="less">
.paramstwitchatad {
	position: relative;
	width: fit-content;
	border: 5px solid transparent;

	.content {
		max-width: 600px;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	&.collapse {
		overflow: hidden;
		width: min-content;
		cursor: pointer;
		.content {
			padding: 0.5em;
		}
		&:hover {
			background-color: var(--color-secondary-light);
		}
	}

	&.blink {
		animation: blinkAnimation 0.5s 3 forwards;
		animation-delay: 1s;
		@keyframes blinkAnimation {
			0% {
				border-color: var(--color-light);
			}
			50% {
				border-color: transparent;
			}
			100% {
				border-color: var(--color-light);
			}
		}
	}
	.param {
		margin-top: 0.5em;
	}

	.icon {
		display: block;
		margin: auto;
		width: 2em;
		height: 2em;
	}

	.disableinstructions {
		text-align: center;
		line-height: 1.25em;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-wrap: balance;
	}

	.tip {
		width: 100%;
	}
}
</style>
