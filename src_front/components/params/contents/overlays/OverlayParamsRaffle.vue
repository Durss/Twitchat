<template>
	<div class="overlayparamsraffle overlayParamsSection">
		<a
			href="https://www.youtube.com/watch?v=VB4FDqB5kMo"
			target="_blank"
			class="youtubeTutorialBt"
		>
			<Icon name="youtube" theme="light" />
			<span>{{ t("overlay.youtube_demo_tt") }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<div class="header">{{ t("overlay.raffle.head") }}</div>

		<section class="overlayInstallCard">
			<h1><Icon name="obs" />{{ t("overlay.title_install") }}</h1>
			<OverlayInstaller type="wheel" @obsSourceCreated="getOverlayPresence(true)" />
			<ToggleBlock
				class="shrink"
				small
				:title="t('overlay.css_customization')"
				:open="false"
			>
				<div class="cssHead">{{ t("overlay.raffle.css") }}</div>
				<ul class="cssStructure">
					<li>#wheel-item { ... }</li>
					<li>#wheel-item.selected { ... }</li>
				</ul>
			</ToggleBlock>
		</section>

		<section>
			<Icon class="center loader card-item" name="loader" v-if="checkingOverlayPresence" />

			<TTButton
				class="center"
				v-else-if="overlayExists"
				:loading="loading"
				@click="testWheel()"
				icon="test"
				>{{ t("overlay.raffle.testBt") }}</TTButton
			>

			<div class="center card-item alert" v-else-if="!overlayExists">
				{{ t("overlay.overlay_not_configured") }}
			</div>
		</section>

		<div class="card-item footer">
			<Icon name="info" />
			<i18n-t scope="global" tag="span" keypath="overlay.raffle.start">
				<template #MENU><Icon name="commands" class="icon" /></template>
				<template #CMD><strong>/raffle</strong></template>
			</i18n-t>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../../../TTButton.vue";
import ToggleBlock from "../../../ToggleBlock.vue";
import OverlayInstaller from "./OverlayInstaller.vue";

const { t } = useI18n();

const loading = ref(false);
const overlayExists = ref(false);
const checkingOverlayPresence = ref(true);

let checkInterval: number = -1;
let subcheckTimeout: number = -1;

const overlayPresenceHandler = () => {
	overlayExists.value = true;
	checkingOverlayPresence.value = false;
	clearTimeout(subcheckTimeout);
};

onMounted(() => {
	PublicAPI.instance.addEventListener(
		"ON_WHEEL_OVERLAY_PRESENCE",
		overlayPresenceHandler,
	);

	//Regularly check if the overlay exists
	checkInterval = window.setInterval(() => getOverlayPresence(), 2000);
});

onBeforeUnmount(() => {
	clearInterval(checkInterval);
	clearTimeout(subcheckTimeout);
	PublicAPI.instance.removeEventListener(
		"ON_WHEEL_OVERLAY_PRESENCE",
		overlayPresenceHandler,
	);
});

/**
 * Checks if overlay exists
 */
function getOverlayPresence(showLoader: boolean = false): void {
	if (showLoader) checkingOverlayPresence.value = true;
	PublicAPI.instance.broadcast("GET_WHEEL_OVERLAY_PRESENCE");
	clearTimeout(subcheckTimeout);
	//If after 1,5s the overlay didn't answer, assume it doesn't exist
	subcheckTimeout = window.setTimeout(() => {
		overlayExists.value = false;
		checkingOverlayPresence.value = false;
	}, 1500);
}

async function testWheel(): Promise<void> {
	checkingOverlayPresence.value = true;
	let items: TwitchatDataTypes.EntryItem[] = [];
	if (TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) {
		const followers = await TwitchUtils.getFollowers(null, 500);
		items = followers.list.map((v) => {
			return { id: v.user_id, label: v.user_name, data: v };
		});
	}
	if (items.length === 0) {
		const fakeNames = [
			"GamerPro97",
			"StreamKing87",
			"TechGuru",
			"GamingLegend87",
			"TheRealStreamer",
			"ProGamingMaster",
			"EliteGamer24",
			"DigitalWarrior",
			"TwitchWarrior",
			"TheStreamingPro",
			"GamingGod_24",
			"StreamMaster",
			"the_gamer",
			"CyberPunkGaming",
			"TwitchKiller87",
			"ProStreamGaming",
			"GamingGuru",
			"streamerNation",
			"GamingBeast",
			"TwitchFrenzy",
			"digital_gamer",
			"StreamingLegend87",
			"CyberGamingPro",
			"TechStreamMaster",
			"GamerNation",
			"ProTwitchGaming",
			"TwitchGamer",
			"StreamingGod_24",
			"TheGamingNation",
			"DigitalGaming",
			"StreamerElite87",
			"CyberNationGaming",
			"GamingPro",
			"TwitchElite",
			"StreamingBeast87",
			"TechGaming",
			"GamerFrenzy",
			"ProStreamNation",
			"TwitchMaster",
			"GamingKing",
			"StreamingGod87",
			"CyberProGamer",
			"TechTwitchNation",
			"GamerElite",
			"TwitchNation",
			"StreamingPro",
			"DigitalNationGaming",
			"ProGamer",
			"TwitchGaming",
			"StreamingLegend",
		];
		for (let i = 0; i < fakeNames.length; i++) {
			items.push({ id: i.toString(), label: fakeNames[i]! });
		}
	}
	const data: TwitchatDataTypes.WheelData = {
		items,
		sessionId: Utils.getUUID(),
		winner: Utils.pickRand(items)!.id,
		skin: Config.instance.GET_CURRENT_AUTO_SKIN_CONFIG()?.skin || "default",
	};
	PublicAPI.instance.broadcast("SET_WHEEL_OVERLAY_START", data);
	await Utils.promisedTimeout(100);
	loading.value = false;
}
</script>

<style scoped lang="less">
.overlayparamsraffle {
}
</style>
