<template>
	<div class="card-item tipplatformselector">
		<strong v-if="label">{{ label }}</strong>
		<div class="platformsList">
			<TTButton
				v-for="item in items"
				:key="item.id"
				class="platform"
				small
				v-tooltip="item.connected ? '' : item.tooltip"
				:class="{ disabled: !item.connected && item.url }"
				:disabled="!item.connected && !item.url"
				:primary="item.connected && modelValue[item.id] === true"
				:type="!item.connected && item.url ? 'link' : 'button'"
				:to="!item.connected && item.url ? item.url : undefined"
				:target="!item.connected && item.url ? '_blank' : undefined"
				@click.capture="onClick(item)"
				:icon="item.icon"
				>{{ item.label }}</TTButton
			>
		</div>
	</div>
</template>

<script setup lang="ts" generic="T extends Partial<Record<TwitchatDataTypes.TipPlatform, boolean>>">
import { storeKofi as useStoreKofi } from "@/store/kofi/storeKofi";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storePatreon as useStorePatreon } from "@/store/patreon/storePatreon";
import { storeStreamelements as useStoreStreamelements } from "@/store/streamelements/storeStreamelements";
import { storeStreamlabs as useStoreStreamlabs } from "@/store/streamlabs/storeStreamlabs";
import { storeTiltify as useStoreTiltify } from "@/store/tiltify/storeTiltify";
import { storeTipeee as useStoreTipeee } from "@/store/tipeee/storeTipeee";
import { storeTwitchCharity as useStoreTwitchCharity } from "@/store/twitch_charity/storeTwitchCharity";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../../../TTButton.vue";

interface PlatformItem {
	id: TwitchatDataTypes.TipPlatform;
	label: string;
	icon: string;
	connected: boolean;
	tooltip: string;
	/**
	 * Connection parameter section to open if platform isn't connected
	 */
	connectSection?: TwitchatDataTypes.ParamDeepSectionsStringType;
	/**
	 * External URL to open if platform isn't connected
	 */
	url?: string;
}

const props = withDefaults(
	defineProps<{
		modelValue: T;
		/**
		 * Label displayed above the platforms list
		 */
		label?: string;
		/**
		 * Platforms to display, in display order
		 */
		platforms?: TwitchatDataTypes.TipPlatform[];
	}>(),
	{
		label: "",
		platforms: () => [
			"streamlabs",
			"streamelements",
			"tipeee",
			"kofi",
			"patreon",
			"tiltify",
			"streamlabs_charity",
			"twitch_charity",
		],
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: T];
	change: [value: T];
}>();

const { t } = useI18n();
const storeParams = useStoreParams();
const storeStreamlabs = useStoreStreamlabs();
const storeStreamelements = useStoreStreamelements();
const storeTipeee = useStoreTipeee();
const storeKofi = useStoreKofi();
const storePatreon = useStorePatreon();
const storeTiltify = useStoreTiltify();
const storeTwitchCharity = useStoreTwitchCharity();

const items = computed<PlatformItem[]>(() => {
	const connectTT = t("overlay.tipPlatforms.connect_tt");
	const all: Record<TwitchatDataTypes.TipPlatform, PlatformItem> = {
		streamlabs: {
			id: "streamlabs",
			label: "Streamlabs",
			icon: "streamlabs",
			connected: storeStreamlabs.connected,
			tooltip: connectTT,
			connectSection: TwitchatDataTypes.ParamDeepSections.STREAMLABS,
		},
		streamelements: {
			id: "streamelements",
			label: "Stream\nElements",
			icon: "streamelements",
			connected: storeStreamelements.connected,
			tooltip: connectTT,
			connectSection: TwitchatDataTypes.ParamDeepSections.STREAMELEMENTS,
		},
		tipeee: {
			id: "tipeee",
			label: "Tipeee",
			icon: "tipeee",
			connected: storeTipeee.connected,
			tooltip: connectTT,
			connectSection: TwitchatDataTypes.ParamDeepSections.TIPEEE,
		},
		kofi: {
			id: "kofi",
			label: "Ko-Fi",
			icon: "kofi",
			connected: storeKofi.connected,
			tooltip: connectTT,
			connectSection: TwitchatDataTypes.ParamDeepSections.KO_FI,
		},
		patreon: {
			id: "patreon",
			label: "Patreon",
			icon: "patreon",
			connected: storePatreon.connected,
			tooltip: connectTT,
			connectSection: TwitchatDataTypes.ParamDeepSections.PATREON,
		},
		tiltify: {
			id: "tiltify",
			label: "Tiltify",
			icon: "tiltify",
			connected: storeTiltify.connected,
			tooltip: connectTT,
			connectSection: TwitchatDataTypes.ParamDeepSections.TILTIFY,
		},
		streamlabs_charity: {
			id: "streamlabs_charity",
			label: "Streamlabs\ncharity",
			icon: "streamlabs",
			connected: storeStreamlabs.charityTeam != null,
			tooltip: connectTT,
			connectSection: TwitchatDataTypes.ParamDeepSections.STREAMLABS,
		},
		twitch_charity: {
			id: "twitch_charity",
			label: "Twitch Charity",
			icon: "twitch_charity",
			connected: storeTwitchCharity.currentCharity != null,
			tooltip: t("overlay.tipPlatforms.connect_twitchCharity_tt"),
			url: "https://dashboard.twitch.tv/charity/",
		},
	};
	return props.platforms.map((id) => all[id]);
});

/**
 * Toggles the platform or opens its connection page if it's not connected yet
 */
function onClick(item: PlatformItem): void {
	if (!item.connected) {
		if (item.connectSection) {
			storeParams.openParamsPage(
				TwitchatDataTypes.ParameterPages.CONNECTIONS,
				item.connectSection,
			);
		}
		return;
	}
	const value = { ...props.modelValue, [item.id]: props.modelValue[item.id] !== true } as T;
	emit("update:modelValue", value);
	emit("change", value);
}
</script>

<style scoped lang="less">
.tipplatformselector {
	gap: 0.5em;
	display: flex;
	flex-direction: column;
	.platformsList {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;

		.platform {
			min-width: 7em;
			flex-direction: column;
			gap: 0.5em;
			white-space: pre-line;
			:deep(.icon) {
				font-size: 4em;
			}

			&.disabled {
				@c1: rgba(128, 128, 128, 0.5);
				@c2: rgba(128, 128, 128, 0.3);
				background-color: transparent;
				background-image: repeating-linear-gradient(
					-45deg,
					@c1,
					@c1 7px,
					@c2 7px,
					@c2 15px
				) !important;
				:deep(.background) {
					opacity: 0;
				}
			}
		}
	}
}
</style>
