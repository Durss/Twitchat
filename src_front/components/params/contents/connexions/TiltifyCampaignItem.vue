<template>
	<div class="tiltifycampaignitem" :class="{ retired: retiredDate }">
		<img
			v-if="campaign.avatar?.src"
			class="avatar"
			:src="campaign.avatar.src"
			:alt="campaign.avatar.alt || campaign.name"
		/>
		<Icon v-else name="tiltify" class="avatar" />

		<div class="details">
			<div class="title">
				<a class="name" :href="campaign.donate_url" target="_blank"
					><Icon name="newtab" />{{ campaign.name }}</a
				>
			</div>

			<template v-if="goal > 0">
				<div class="progress">
					<div class="fill" :style="{ width: percent + '%' }"></div>
				</div>
				<div class="amounts">
					<strong>{{ formatAmount(raised) }}</strong>
					<span>{{ formatAmount(goal) }}</span>
				</div>
			</template>
		</div>

		<TTButton
			class="copyBt"
			small
			transparent
			icon="id"
			v-tooltip="t('tiltify.copy_id_tt')"
			:copy="campaign.id"
		/>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import type { TiltifyCampaign } from "@/store/tiltify/storeTiltify";
import Utils from "@/utils/Utils";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	campaign: TiltifyCampaign;
}>();

const { t } = useI18n();

/**
 * Formatted date at which the campaign has been retired.
 * Empty string if the campaign is still running.
 */
const retiredDate = computed((): string => {
	if (!props.campaign.retired_at) return "";
	const date = new Date(props.campaign.retired_at);
	if (isNaN(date.getTime())) return "";
	return Utils.formatDate(date, false, false, false);
});

/**
 * Amount raised so far
 */
const raised = computed(() => parseFloat(props.campaign.total_amount_raised?.value) || 0);

/**
 * Fundraising goal
 */
const goal = computed(() => parseFloat(props.campaign.goal?.value) || 0);

/**
 * Completion percent of the goal
 */
const percent = computed(() => {
	if (goal.value <= 0) return 0;
	return Math.max(0, Math.min(100, (raised.value / goal.value) * 100));
});

/**
 * Formats an amount to the campaign's currency
 */
function formatAmount(amount: number): string {
	const currency = props.campaign.currency_code || props.campaign.amount_raised.currency;
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
		}).format(amount);
	} catch (e) {
		return amount + " " + (currency || "");
	}
}
</script>

<style scoped lang="less">
.tiltifycampaignitem {
	gap: 0.5em;
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 0.5em;
	border-radius: var(--border-radius);
	background-color: var(--background-color-fader);
	transition: background-color 0.2s;
	position: relative;
	&:hover {
		background-color: var(--background-color-fadest);
	}

	&.retired {
		opacity: 0.6;
		transition:
			background-color 0.2s,
			opacity 0.2s;
		.avatar {
			filter: saturate(0%);
		}
		.progress .fill {
			background-color: var(--color-text-fade);
		}
		&:hover {
			opacity: 1;
		}
	}

	.avatar {
		width: 2.5em;
		height: 2.5em;
		margin: 0;
		flex-shrink: 0;
		object-fit: cover;
		border-radius: var(--border-radius);
	}

	.details {
		gap: 0.25em;
		min-width: 0;
		flex-grow: 1;
		display: flex;
		flex-direction: column;

		.title {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
			padding-right: 1.5em;
			.tag {
				flex-shrink: 0;
			}
		}

		.name {
			font-weight: bold;
			line-height: 1.2em;
			overflow-wrap: anywhere;
			.icon {
				height: 1em;
				vertical-align: middle;
				margin-right: 0.25em;
			}
		}

		.progress {
			height: 4px;
			overflow: hidden;
			border-radius: 4px;
			background-color: var(--color-text-fadest);
			.fill {
				height: 100%;
				border-radius: 4px;
				background-color: var(--color-primary-light);
				transition: width 0.2s;
			}
		}

		.amounts {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			font-size: 0.8em;
			span {
				font-style: italic;
				color: var(--color-text-fade);
			}
		}
	}

	.copyBt {
		flex-shrink: 0;
		width: 2em;
		height: 2em;
		position: absolute;
		top: 0;
		right: 0;
	}
}
</style>
