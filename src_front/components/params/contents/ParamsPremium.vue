<template>
	<div class="paramspremium parameterContent">
		<Icon name="premium" class="icon" />

		<div class="head">{{ $t("premium.header") }}</div>

		<div class="card-item userInfo" v-if="$store.patreon.connected">
			<div class="title"><Icon name="patreon" /> {{ $t("patreon.connected_as") }}</div>
			<div class="info">
				<img class="avatar" :src="$store.patreon.userAvatar" alt="Avatar" />
				<span class="name">{{ $store.patreon.userName }}</span>
			</div>
			<TTButton @click="$store.patreon.disconnect()" alert icon="offline">{{
				$t("global.disconnect")
			}}</TTButton>
		</div>

		<ParamsAccountPatreon />

		<div class="card-item premium lifetimePremiumProgress" v-if="showProgress">
			<div class="info">{{ $t("premium.progress") }}</div>
			<div
				class="card-item progressBar"
				:style="{ backgroundSize: lifetimePercent + '% 100%' }"
			>
				<div class="label">
					{{ Math.round((lifetimePercent / 100) * $config.LIFETIME_DONOR_VALUE) }}€ /
					{{ $config.LIFETIME_DONOR_VALUE }}€
				</div>
				<div class="labelOver" ref="label">
					{{ Math.round((lifetimePercent / 100) * $config.LIFETIME_DONOR_VALUE) }}€ /
					{{ $config.LIFETIME_DONOR_VALUE }}€
				</div>
			</div>
			<TTButton class="donateBt" @click="openDonate()" light premium icon="coin">{{
				$t("params.categories.sponsor")
			}}</TTButton>
		</div>

		<InvoiceList />

		<SponsorTable />

		<div class="footer">
			<a :href="$router.resolve({ name: 'privacypolicy' }).href" target="_blank">{{
				$t("global.privacy")
			}}</a>
			<a :href="$router.resolve({ name: 'termsofuse' }).href" target="_blank">{{
				$t("global.terms")
			}}</a>
			<a :href="'mailto:' + $config.CONTACT_MAIL">{{
				$t("global.contact", { MAIL: $config.CONTACT_MAIL })
			}}</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import SponsorTable from "@/components/premium/SponsorTable.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useAuthStore } from "@/store/auth/storeAuth";
import { storeParams as useParamsStore } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import ParamsAccountPatreon from "./account/ParamsAccountPatreon.vue";
import InvoiceList from "./InvoiceList.vue";

const storeAuth = useAuthStore();
const storeParams = useParamsStore();

const labelRef = useTemplateRef("label");
const lifetimePercent = ref(0);
const showProgress = computed(() => {
	return (
		storeAuth.premiumType != "lifetime" &&
		// storeAuth.premiumType != "gifted" &&
		lifetimePercent.value > 0 &&
		lifetimePercent.value < 100
	);
});

function openDonate(): void {
	storeParams.openParamsPage("donate", TwitchatDataTypes.ParamDeepSections.PREMIUM_REMAINING);
}

onMounted(async () => {
	const lifetime = storeAuth.lifetimePremiumPercent * 100;
	lifetimePercent.value = lifetime;
	if (showProgress.value) {
		await nextTick(); //wait for the progress bar to build
		lifetimePercent.value = 0.0001;
		gsap.to(lifetimePercent, {
			value: lifetime,
			duration: Math.max(0.5, (lifetime / 100) * 2),
			ease: "sine.out",
			onUpdate: () => {
				if (!labelRef.value) return;
				labelRef.value.style.clipPath = `polygon(0 0, ${lifetimePercent.value}% 0, ${lifetimePercent.value}% 100%, 0 100%)`;
			},
		});
	}
});

onBeforeUnmount(() => {
	gsap.killTweensOf(lifetimePercent);
});
</script>

<style scoped lang="less">
.paramspremium {
	.userInfo {
		margin: auto;
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		.info {
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
			gap: 0.5em;
			padding: 0.25em 0.5em;
			.avatar {
				width: 1.75em;
				height: 1.75em;
				border-radius: 50%;
			}
			.name {
				font-weight: bold;
				flex-grow: 1;
			}
		}
		.icon {
			height: 1em;
		}
	}

	.description {
		line-height: 1.25em;
		.icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}
	}

	.premium {
		color: var(--color-text);
		background-color: var(--color-premium-fadest);
		strong {
			display: block;
			font-size: 1.2em;
			text-align: center;
			margin-bottom: 0.5em;
		}
	}
	.footer {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.lifetimePremiumProgress {
		width: 100%;
		margin: 1em 0;
		background-color: var(--color-premium);
		font-weight: bold;
		.info {
			text-align: center;
			margin-bottom: 0.5em;
		}
		.progressBar {
			position: relative;
			margin: auto;
			width: calc(100% - 1em);
			padding: 1em;
			@scale: 2px;
			box-shadow:
				inset -@scale -@scale @scale rgba(255, 255, 255, 0.1),
				inset @scale @scale @scale rgba(0, 0, 0, 0.3);
			background-color: var(--color-light-fade);
			background-image: linear-gradient(
				90deg,
				var(--color-light) 0%,
				var(--color-light) 100%
			);
			background-repeat: no-repeat;
			background-size: 0% 100%;
			.label,
			.labelOver {
				.center();
				color: #ffffff;
				position: absolute;
				font-size: 1.5em;
				font-weight: bold;
				font-variant-numeric: tabular-nums;
				width: 100%;
				text-align: center;
			}

			.labelOver {
				color: var(--color-premium);
				text-shadow: 1px 1px 2px #000000a0;
			}
		}
		.donateBt {
			display: flex;
			margin: 0.5em auto 0 auto;
		}
	}
}
</style>
