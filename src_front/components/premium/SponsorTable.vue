<template>
	<div class="sponsortable card-item">
		<table ref="list">
			<tr>
				<th
					v-for="(header, index) in headers"
					:class="'card-item ' + ['', 'primary', 'secondary', 'premium'][index]"
					v-tooltip="
						['', '', t('params.categories.donate'), t('premium.become_premiumBt')][
							index
						]
					"
					@click="clickHeader(index)"
				>
					<Icon name="twitchat" v-if="index == 1" />
					<Icon name="coin" v-if="index == 2" />
					<Icon name="premium" v-if="index == 3" />
					{{ header.replace(/\{COUNT\}/gi, entries.length.toString()) }}
				</th>
			</tr>
			<tr
				v-for="(line, index) in entries"
				:ref="
					(el) => {
						if (el) rowRefs[index] = el as HTMLTableRowElement;
					}
				"
			>
				<template v-if="line[1] == line[2]">
					<td>• {{ line[0] }}</td>
					<td colspan="2" class="half">
						<Icon name="checkmark" v-if="line[1] === 1" />
						<Icon name="cross" v-else-if="line[1] === 0" />
						<span
							class="tild"
							v-else-if="(Config.instance.getParamByKey(line[1]!) || line[1]) === '~'"
							>~</span
						>
						<template v-else>{{
							Config.instance.getParamByKey(line[1]!) || line[1]
						}}</template>
					</td>
					<td class="premium">
						<Icon name="checkmark" v-if="line[3] === 1" />
						<Icon name="cross" v-else-if="line[3] === 0" />
						<span
							class="tild"
							v-else-if="(Config.instance.getParamByKey(line[3]!) || line[3]) === '~'"
							>~</span
						>
						<template v-else>{{
							Config.instance.getParamByKey(line[3]!) || line[3]
						}}</template>
					</td>
				</template>
				<td v-else v-for="(item, index) in line">
					<template v-if="index == 0">• </template>
					<Icon name="checkmark" v-if="item === 1" />
					<Icon name="cross" v-else-if="item === 0" />
					<span
						class="tild"
						v-else-if="(Config.instance.getParamByKey(item) || item) === '~'"
						>~</span
					>
					<template v-else>{{ Config.instance.getParamByKey(item) || item }}</template>
					<i v-if="index == 0"
						><br />{{ t("premium.no_ad_info", { FOLLOWERS: adMinFollowers }) }}</i
					>
				</td>
			</tr>
		</table>
		<template v-if="props.expand === false">
			<button class="moreFeaturesBt" @click="expandRows(totalEntries - 1)" v-if="!expanded">
				▼
			</button>
			<button class="moreFeaturesBt" @click="expandRows(10)" v-else>▲</button>
		</template>
	</div>
</template>

<script setup lang="ts">
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { gsap } from "gsap";
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
const rowRefs = ref<HTMLTableRowElement[]>([]);
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		expand?: boolean;
	}>(),
	{ expand: false },
);

const emit = defineEmits<{ scrollBy: [added: number] }>();

const { t, tm } = useI18n();
const storeParams = useStoreParams();

const list = useTemplateRef<HTMLTableElement>("list");

const currentRowIndex = ref<number>(0);
const dispose = ref<boolean>(false);

const expanded = computed(() => currentRowIndex.value == entries.value.length - 1);
const adMinFollowers = computed(() => Config.instance.AD_MIN_FOLLOWERS_COUNT);

const headers = computed(() => {
	return tm("premium.supportTable.headers") as string[];
});

const entries = computed(() => {
	return tm("premium.supportTable.features") as (string | number)[][];
});

const totalEntries = computed(() => {
	return (tm("premium.supportTable.features") as string[][]).length;
});

function clickHeader(index: number): void {
	if (index == 2) {
		storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.DONATE);
	}
	if (index == 3) {
		storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}
}

onMounted(() => {
	expandRows(props.expand !== false ? entries.value.length : 10, false);
});

onBeforeUnmount(() => {
	dispose.value = true;
	let scrollableHolder = document.getElementById("paramContentScrollableHolder") as HTMLElement;
	if (scrollableHolder) gsap.killTweensOf(scrollableHolder);
	if (list.value) gsap.killTweensOf(list.value);
});

function expandRows(rowIndex: number, animate: boolean = true): void {
	if (dispose.value) return;

	currentRowIndex.value = Math.max(29, Math.min(entries.value.length - 1, rowIndex));
	const listEl = list.value;
	const item = rowRefs.value[currentRowIndex.value];
	if (!item || !listEl) return;
	const boundsList = listEl.getBoundingClientRect();
	const boundsItem = item.getBoundingClientRect();
	const height = boundsItem.bottom - boundsList.top;
	const added = height - boundsList.height;
	//depending on the context the holder's height my not be ready.
	//try again until it is
	if (boundsList.height == 0) {
		window.setTimeout(() => expandRows(rowIndex, animate), 30);
		return;
	}
	const duration = animate ? Math.min(1, Math.abs(added) / 400) : 0;
	gsap.to(listEl, { duration, ease: "sine.inout", height });
	emit("scrollBy", added);
	if (added > 0 && animate) {
		//Dunno which parent is the scrollable one. Try 2 levels upward.
		//Too lazy to handle this on every parent integrating this component but there's the "@scrollBy"
		//event fired just in case..
		let scrollableHolder = document.getElementById(
			"paramContentScrollableHolder",
		) as HTMLElement;
		if (!scrollableHolder) scrollableHolder = listEl.parentElement!;
		gsap.killTweensOf(scrollableHolder);
		gsap.to(scrollableHolder, { duration, scrollTop: scrollableHolder.scrollTop + added });
	}
}
</script>

<style scoped lang="less">
.sponsortable {
	padding: 0;
	.title {
		font-size: 1.5em;
		text-align: center;
		font-weight: bold;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}
	table {
		display: block;
		height: 200px;
		width: 100%;
		min-width: 100%;
		overflow: hidden;
		tr {
			width: 100%;
			th {
				width: 100%;
				border-radius: 0;
				vertical-align: middle;
				color: var(--color-text);
				text-align: center;
				&:nth-child(2) {
					color: var(--color-light);
					background-color: var(--color-primary-fade);
				}
				&:nth-child(3) {
					color: var(--color-light);
					cursor: pointer;
					&:hover {
						background-color: var(--color-secondary-light);
					}
				}
				&:nth-child(4) {
					color: var(--color-light);
					cursor: pointer;
					&:hover {
						background-color: var(--color-premium-light);
					}
				}
				.icon {
					height: 1em;
					margin-bottom: 0.25em;
					display: inline-block;
				}
			}

			td {
				padding: 0.5em;
				text-align: center;
				vertical-align: middle;
				&:nth-child(1) {
					text-align: left;
				}
				&:nth-child(2) {
					font-weight: 400;
					&:not(.half) {
						background-color: var(--color-primary-fadest);
					}
				}
				&:nth-child(3) {
					background-color: var(--color-secondary-fader);
				}
				&:nth-child(4),
				&.premium {
					font-weight: 400;
					background-color: var(--color-premium-fader);
				}
				&.half {
					background-image: linear-gradient(
						90deg,
						var(--color-primary-fadest) 30%,
						var(--color-secondary-fader) 70%
					);
				}
				.icon {
					height: 1em;
				}
				.tild {
					font-size: 2em;
					line-height: 0.5em;
				}
				i {
					line-height: 1.5em;
					font-size: 0.85em;
					opacity: 0.7;
				}
			}
			&:not(:first-child):hover {
				background-color: var(--color-text-fadest);
			}
		}
	}

	.moreFeaturesBt {
		width: 100%;
		color: var(--color-text-inverse);
		background-color: var(--color-text);
		font-weight: bold;
	}
}
</style>

