<template>
	<component :is="tag" class="invoicelist card-item" v-if="invoiceList.length > 0">
		<div class="head">
			<Icon name="coin" class="icon" />
			<h2>{{ $t("account.invoices.title") }}</h2>
		</div>

		<table class="content">
			<thead>
				<tr>
					<th class="date">{{ $t("account.invoices.date") }}</th>
					<th class="id">{{ $t("account.invoices.id") }}</th>
					<th class="amount">{{ $t("account.invoices.amount") }}</th>
					<th class="action"></th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="invoice in invoiceList" :key="invoice.id" class="invoice">
					<td class="date">{{ formatDate(invoice.date) }}</td>
					<td class="id" v-tooltip="invoice.id">{{ invoice.id }}</td>
					<td class="amount">{{ formatAmount(invoice.amount, invoice.currency) }}</td>
					<td class="action">
						<TTButton
							transparent
							icon="download"
							:loading="downloading[invoice.id]"
							@click="downloadInvoice(invoice.id)"
						></TTButton>
					</td>
				</tr>
			</tbody>
		</table>
	</component>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import { ref } from "vue";

withDefaults(
	defineProps<{
		tag?: string;
	}>(),
	{
		tag: "div",
	},
);

const invoiceList = ref<{ id: string; date: string; amount: number; currency: string }[]>([]);
const downloading = ref<{ [orderId: string]: boolean }>({});

function formatDate(date: string): string {
	const d = new Date(date);
	if (isNaN(d.getTime())) return date;
	return Utils.formatDate(d, false, false, false);
}

function formatAmount(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
		}).format(amount);
	} catch (e) {
		return amount + " " + currency;
	}
}

async function downloadInvoice(orderId: string) {
	if (downloading.value[orderId]) return;
	downloading.value[orderId] = true;
	try {
		const { status, json } = await ApiHelper.call(
			"paypal/invoice/downloadToken",
			"GET",
			{ orderId },
			false,
		);
		if (status !== 200 || !json.success || !json.token) {
			throw new Error("Failed to issue download token (" + status + ")");
		}

		const url = new URL(Config.instance.API_PATH + "/paypal/invoice");
		url.searchParams.set("orderId", orderId);
		url.searchParams.set("token", json.token);
		window.open(url.toString(), "_blank");
	} catch (e) {
		console.error("Failed to download invoice", orderId, e);
	} finally {
		downloading.value[orderId] = false;
	}
}

ApiHelper.call("paypal/invoice/list", "GET").then((response) => {
	if (response.status == 200 && response.json.success) {
		invoiceList.value = response.json.data.invoices.map((invoice) => ({
			id: invoice.orderId,
			date: invoice.date,
			amount: invoice.amount,
			currency: invoice.currency,
		}));
	}
});
</script>

<style scoped lang="less">
.invoicelist {
	display: flex;
	flex-direction: column;
	gap: 0.5em;

	.head {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 0.5em;

		.icon {
			height: 1.25em;
		}

		h2 {
			margin: 0;
			font-size: 1.1em;
			font-weight: bold;
		}
	}

	.content {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0 2px;

		thead {
			th {
				text-align: left;
				font-size: 0.85em;
				font-weight: bold;
				text-transform: uppercase;
				letter-spacing: 0.05em;
				opacity: 0.6;
				padding: 0.25em 0.75em;

				&.amount {
					text-align: right;
				}
			}
		}

		tbody {
			.invoice {
				background-color: var(--background-color-fadest);
				transition: background-color 0.15s;

				td {
					padding: 0.5em 0.75em;
					vertical-align: middle;

					&.date {
						font-variant-numeric: tabular-nums;
						opacity: 0.75;
						white-space: nowrap;
						width: 1%;
						font-size: 0.7em;
					}

					&.id {
						font-family: Azeret, monospace;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
						max-width: 0;
						font-size: 0.7em;
					}

					&.amount {
						font-variant-numeric: tabular-nums;
						white-space: nowrap;
						text-align: right;
						width: 1%;
					}

					&.action {
						padding: 0.25em 0.5em;
						text-align: right;
					}
				}
			}
		}
	}
}
</style>

