<template>
	<div class="pinslist blured-background-window" ref="rootEl">
		<div class="scrollable">
			<button
				v-for="pin in pinList"
				v-tooltip="pin.label || $t(pin.labelKey)"
				:class="{ pinned: pin.pinned }"
				@click="togglePin(pin.id)"
			>
				<img
					class="icon"
					v-if="pin.trigger?.icon && pin.trigger.icon.startsWith('http')"
					:src="pin.trigger.icon"
				/>
				<span
					class="icon emoji"
					v-else-if="pin.trigger?.icon && !pin.trigger.icon.startsWith('http')"
					>{{ pin.trigger.icon }}</span
				>
				<icon v-else :name="pin.icon" class="icon" />
				<span class="label">{{ pin.label || $t(pin.labelKey) }}</span>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { TriggerTypes, type TriggerData } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TriggerUtils from "@/utils/TriggerUtils";
import { gsap } from "gsap/gsap-core";
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { Component, toNative, Vue } from "vue-facing-decorator";
import { useI18n } from "vue-i18n";

const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeTriggers = useStoreTriggers();
const rootEl = useTemplateRef("rootEl");
const clickHandler = (e: MouseEvent) => onClick(e);

onMounted(() => {
	document.addEventListener("mousedown", clickHandler);
	open();
});

onBeforeUnmount(() => {
	document.removeEventListener("mousedown", clickHandler);
});

const hasChannelPoints = computed(() => {
	return storeAuth.twitch.user.is_affiliate || storeAuth.twitch.user.is_partner;
});

const pinList = computed(() => {
	const pins: {
		id: (typeof TwitchatDataTypes.PinnableMenuItems)[0]["id"] | `trigger:${string}`;
		icon: string;
		labelKey: string;
		label?: string;
		pinned: boolean;
		trigger?: TriggerData;
	}[] = TwitchatDataTypes.PinnableMenuItems.filter((v) => {
		if (v.id == "rewards" || v.id == "poll" || v.id == "prediction") return hasChannelPoints;
		if (v.id == "bingo_grid") return storeAuth.featureFlags.includes("bingo_grid");
		if (v.id == "quiz") return storeAuth.featureFlags.includes("quiz");
		return true;
	}).map((v) => {
		return {
			id: v.id,
			icon: v.icon,
			label: "",
			labelKey: v.labelKey,
			pinned: storeParams.pinnedMenuItems.includes(v.id),
		};
	});
	const triggerPins: (typeof pins)[0][] = [];
	storeTriggers.triggerList
		.filter((v) => v.type == TriggerTypes.SLASH_COMMAND)
		.forEach((trigger) => {
			const triggerInfo = TriggerUtils.getTriggerDisplayInfo(trigger);
			triggerPins.push({
				id: `trigger:${trigger.id}`,
				icon: "broadcast",
				label: triggerInfo.label,
				labelKey: triggerInfo.labelKey || "",
				pinned: storeParams.pinnedMenuItems.includes(`trigger:${trigger.id}`),
				trigger,
			});
		});
	return [...pins, ...triggerPins];
});

function togglePin(id: (typeof TwitchatDataTypes.PinnableMenuItems)[number]["id"]): void {
	storeParams.toggleChatMenuPin(id);
}

function open(): void {
	gsap.killTweensOf(rootEl.value!);
	gsap.from(rootEl.value!, { duration: 0.3, scaleY: 0, clearProps: "scaleY", ease: "back.out" });
}

function close(): void {
	gsap.killTweensOf(rootEl.value!);
	gsap.to(rootEl.value!, {
		duration: 0.2,
		scaleY: 0,
		delay: 0.1,
		clearProps: "scaleY",
		ease: "back.in",
		onComplete: () => {
			emit("close");
		},
	});
}

function onClick(e: MouseEvent): void {
	let target = e.target as HTMLDivElement;
	while (target != document.body && target != rootEl.value && target) {
		target = target.parentElement as HTMLDivElement;
	}
	if (target != rootEl.value) {
		close();
	}
}
</script>

<style scoped lang="less">
.pinslist {
	max-width: 500px;
	max-height: 300px;

	.scrollable {
		max-width: 500px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5em, 1fr));
		align-items: stretch;
		align-content: flex-end;
		gap: 5px;
	}

	button {
		padding: 0.5em;
		gap: 4px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-text);
		border-radius: var(--border-radius);
		user-select: none;

		&:hover {
			background-color: var(--color-primary-fader);
		}
		&.pinned {
			color: var(--color-light);
			background-color: var(--color-primary);
		}

		.icon {
			max-width: 1.75em;
			height: 1.5em;
			&.emoji {
				height: auto;
				font-size: 1.5em;
			}
		}
		.label {
			font-size: 0.8em;
			font-weight: 300;
			word-break: break-word;
		}
	}
}

@media only screen and (max-width: 450px) {
	.pinslist {
		max-width: 100%;
		max-height: unset;
		.scrollable {
			max-width: 100%;
		}
	}
}
</style>
