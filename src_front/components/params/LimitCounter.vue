<template>
	<span class="limitcounter">
		<span class="count">{{ count }} / {{ maxValue }}</span>
		<template v-if="showPremium">
			<span class="separator" aria-hidden="true">·</span>
			<button
				type="button"
				class="premium"
				v-tooltip="premiumLabel"
				:aria-label="premiumLabel"
				@click="openPremium()"
			>
				<Icon name="premium" />{{ maxPremium }}
			</button>
		</template>
	</span>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	count: number;
	max: number;
	maxPremium?: number;
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();

const maxValue = computed(() => {
	return storeAuth.isPremium && props.maxPremium != undefined ? props.maxPremium : props.max;
});

const showPremium = computed(() => {
	return !storeAuth.isPremium && props.maxPremium != undefined && props.maxPremium > props.max;
});

const premiumLabel = computed(() => {
	return t("premium.limit_counter_tt", { MAX_PREMIUM: props.maxPremium });
});

function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}
</script>

<style scoped lang="less">
.limitcounter {
	display: flex;
	align-items: center;
	gap: 0.35em;
	width: fit-content;
	margin-left: auto;
	font-size: 0.85em;
	font-variant-numeric: tabular-nums;

	.count,
	.separator {
		opacity: 0.6;
	}

	.premium {
		display: flex;
		align-items: center;
		gap: 0.2em;
		color: var(--color-premium-light);
		transition: color 0.2s;
		&:hover {
			color: var(--color-premium-extralight);
		}
		body.light & {
			color: var(--color-premium);
			&:hover {
				color: var(--color-premium-dark);
			}
		}
		.icon {
			height: 1em;
			width: 1em;
		}
	}
}
</style>
