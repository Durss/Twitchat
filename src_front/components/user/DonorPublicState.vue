<template>
	<div class="donorpublicstate" v-if="isDonor">
		<Icon class="loader" name="loader" v-if="!publicDonation_loaded" />
		<ParamItem
			class="param toggle"
			v-if="publicDonation_loaded"
			:paramData="storeAccount.publicDonation"
			v-model="publicDonation"
			noBackground
		/>
		<i18n-t
			scope="global"
			class="infos"
			tag="div"
			v-if="publicDonation_loaded && noInfos === false"
			keypath="account.donation_public"
		>
			<template #LINK>
				<a @click="storeParams.openParamsPage(contentDonate)"
					>{{ t("account.about_link") }}.</a
				>
			</template>
		</i18n-t>
	</div>
</template>

<script setup lang="ts">
import DataStore from "@/store/DataStore";
import { storeAccount as useStoreAccount } from "@/store/account/storeAccount";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import { computed, onMounted, ref, watch } from "vue";
import ParamItem from "../params/ParamItem.vue";
import Icon from "../Icon.vue";
import { useI18n } from "vue-i18n";

withDefaults(defineProps<{ noInfos?: boolean }>(), { noInfos: false });

const emit = defineEmits<{ change: [] }>();

const { t } = useI18n();
const storeAccount = useStoreAccount();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();

const publicDonation = ref(false);
const publicDonation_loaded = ref(false);

const isDonor = computed<boolean>(() => storeAuth.donorLevel > -1);
const contentDonate = computed<TwitchatDataTypes.ParameterPagesStringType>(
	() => TwitchatDataTypes.ParameterPages.DONATE,
);

onMounted(async () => {
	publicDonation.value = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == "true";

	if (isDonor.value) {
		//Load current anon state of the user's donation
		try {
			const { json } = await ApiHelper.call("user/donor/anon", "GET");
			if (json.success === true) {
				publicDonation.value = json.data.public === true;
			}
		} catch (error) {}
		publicDonation_loaded.value = true;

		watch(
			() => publicDonation.value,
			async () => updateDonationState(),
		);
	}
});

async function updateDonationState(): Promise<void> {
	try {
		await ApiHelper.call("user/donor/anon", "POST", { public: publicDonation.value });
		emit("change");
	} catch (error) {}
}
</script>

<style scoped lang="less">
.donorpublicstate {
	.loader {
		height: 2em;
		display: block;
		margin: auto;
	}
	.infos {
		margin-top: 0.25em;
		// max-width: 300px;
		font-size: 0.8em;
	}
}
</style>
