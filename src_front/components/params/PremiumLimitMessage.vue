<template>
	<div
		class="parampremiumlimitmessage card-item premiumLimit"
		@click="onClick"
		:class="{ premium: !isPremium, secondary: isPremium }"
	>
		<template v-if="isPremium">
			<span>{{ t(premiumLabel, { MAX: max, MAX_PREMIUM: maxPremium }) }}</span>
		</template>
		<template v-else>
			<span>{{ t(label, { MAX: max, MAX_PREMIUM: maxPremium }) }}</span>
			<TTButton icon="premium" premium light @click="openPremium()">{{
				t("premium.become_premiumBt")
			}}</TTButton>
		</template>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = defineProps<{
	label: string;
	premiumLabel: string;
	max: number;
	maxPremium: number;
}>();
const isPremium = ref(StoreProxy.auth.isPremium);

/**
 * Opens the premium page
 */
const openPremium = (): void => {
	StoreProxy.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
};

/**
 * Just debug stuff to toggle premium state when ctrl+clicking the message
 */
function onClick(e: MouseEvent): void {
	if (!Config.instance.IS_PROD && e.ctrlKey) {
		isPremium.value = !isPremium.value;
		e.preventDefault();
	}
}

watch(
	() => StoreProxy.auth.isPremium,
	(newVal) => {
		isPremium.value = newVal;
	},
);
</script>

<style scoped lang="less">
.parampremiumlimitmessage {
	text-align: center;
	.button {
		display: flex;
		margin: auto;
		margin-top: 0.5em;
	}
}
</style>
