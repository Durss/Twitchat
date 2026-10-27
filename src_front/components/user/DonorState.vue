<template>
	<div class="donorstate">
		<DonorBadge class="donorBadge" :premium="storeAuth.isPremium" />
		<div class="badgesList">
			<DonorBadge class="badge" v-for="i in storeAuth.donorLevel + 1" :level="i - 1" light />
			<DonorBadge
				class="badge"
				v-if="storeAuth.isPremium"
				light
				:premium="storeAuth.isPremium"
			/>
			<Icon name="donor_placeholder" class="badge" v-for="i in 9 - storeAuth.donorLevel" />
			<button class="premiumDisabled" @click="openPremium">
				<Icon v-if="!storeAuth.isPremium" name="donor_placeholder" class="badge" />
				<Icon name="premium" class="premiumIcon" />
			</button>
		</div>

		<DonorPublicState class="card-item publicState" />
	</div>
</template>

<script setup lang="ts">
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Icon from "../Icon.vue";
import DonorBadge from "./DonorBadge.vue";
import DonorPublicState from "./DonorPublicState.vue";

const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}
</script>

<style scoped lang="less">
.donorstate {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 1em 0;
	.donorBadge {
		margin-bottom: 1em;
	}

	.badgesList {
		margin-top: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		width: 80%;
		.badge {
			margin: 0.25em;
			height: 3em;
		}
	}

	.premiumDisabled {
		cursor: pointer;
		position: relative;
		.badge {
			height: 3em;
		}
		.premiumIcon {
			height: 1.4em;
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -70%);
			transition: transform 0.2s;
			color: #808080;
		}
		&:hover {
			.premiumIcon {
				transform: translate(-50%, -70%) scale(1.2, 1.2);
			}
		}
	}

	.publicState {
		margin-top: 1em;
		max-width: 300px;
	}
}
</style>
