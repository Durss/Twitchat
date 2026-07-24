<template>
	<div class="obsbrowsersources">
		<Button
			icon="refresh"
			class="refreshAllBt"
			@click="refreshAllSource()"
			:loading="refreshingAll"
			>{{ t("obs.browser_sources_refresh_all") }}</Button
		>

		<SearchForm v-model="search" :debounce-delay="0" :auto-focus="false" v-if="sources.length > 0" />

		<div
			class="card-item row"
			v-for="entry in filteredSources"
			ref="row"
			:key="entry.source.inputName">
			<div class="infos">
				<p class="name">{{ entry.source.inputName }}</p>
				<p class="url" v-if="entry.localFile">{{ entry.url }}</p>
				<a v-else class="url" :href="entry.url" target="_blank">{{ entry.url }}</a>
			</div>
			<Button
				:icon="entry.success ? 'checkmark' : 'refresh'"
				@click="refreshSource(entry)"
				:primary="entry.success"
				:loading="entry.loading"
				>{{ t("obs.browser_sources_refresh") }}</Button
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import SearchForm from "@/components/params/contents/SearchForm.vue";
import Button from "@/components/TTButton.vue";
import OBSWebsocket, { type OBSInputItem } from "@/utils/OBSWebsocket";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

interface BrowserSourceEntry {
	loading: boolean;
	success: boolean;
	source: OBSInputItem;
	url: string;
	localFile: boolean;
}

const { t } = useI18n();

const row = useTemplateRef<HTMLDivElement[]>("row");

const refreshingAll = ref(false);
const sources = ref<BrowserSourceEntry[]>([]);
const search = ref("");

const filteredSources = computed(() => {
	const query = search.value.trim().toLowerCase();
	if (!query) return sources.value;
	return sources.value.filter(
		(entry) =>
			entry.source.inputName.toLowerCase().includes(query) ||
			entry.url.toLowerCase().includes(query),
	);
});

onMounted(async () => {
	const res = await OBSWebsocket.instance.socket.call("GetInputList", {
		inputKind: "browser_source",
	});
	const inputs = res.inputs as unknown as OBSInputItem[];
	sources.value = inputs
		.filter((v) => v.inputKind == "browser_source")
		.map((v) => {
			return { loading: false, success: false, source: v, url: "", localFile: false };
		});

	sources.value.forEach((v) => {
		OBSWebsocket.instance
			.getSourceSettings<{
				is_local_file: boolean;
				url: string;
				local_file: string;
			}>(v.source.inputName)
			.then((res) => {
				v.localFile = res.inputSettings.is_local_file === true;
				if (v.localFile) {
					v.url = (res.inputSettings.local_file as string) || "";
				} else {
					v.url = (res.inputSettings.url as string) || "";
				}
			});
	});

	await nextTick();

	const items = row.value ?? [];
	gsap.from(items, {
		height: 0,
		scaleY: 0,
		paddingTop: 0,
		marginTop: 0,
		duration: 0.25,
		stagger: 0.025,
		delay: 0.25,
		clearProps: "all",
	});
});

async function refreshSource(entry: BrowserSourceEntry): Promise<void> {
	entry.loading = true;
	await OBSWebsocket.instance.socket.call("PressInputPropertiesButton", {
		inputName: entry.source.inputName,
		propertyName: "refreshnocache",
	});
	await Utils.promisedTimeout(200);
	entry.loading = false;
	entry.success = true;
	Utils.promisedTimeout(1000).then(() => {
		entry.success = false;
	});
}

async function refreshAllSource(): Promise<void> {
	refreshingAll.value = true;
	for (const source of sources.value) {
		await refreshSource(source);
	}
	refreshingAll.value = false;
}
</script>

<style scoped lang="less">
.obsbrowsersources {
	gap: 0.5em;
	display: flex;
	flex-direction: column;
	.refreshAllBt {
		align-self: center;
	}
	.row {
		gap: 1em;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		overflow: hidden;

		.infos {
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			flex-shrink: 1;
			.name {
				font-weight: bold;
			}
			.url {
				word-break: break-all;
				font-size: 0.75em;
			}
		}
		.button {
			flex-shrink: 0;
		}
	}
}
</style>
