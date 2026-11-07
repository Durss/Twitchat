<template>
	<div class="paramssponsor">
		<header class="card-item" ref="head">
			<Icon name="info" class="icon" />
			<p v-for="i in <string[]>tm('sponsor.head')" v-html="i"></p>
		</header>

		<div class="card-item secondary important" ref="instructions">
			<i18n-t scope="global" keypath="sponsor.important_content1">
				<template #LINK>
					<a class="link" href="https://twitch.tv/durss" target="_blaink" type="link">{{
						t("sponsor.important_content1_link")
					}}</a>
				</template>
				<template #STRONG>
					<strong>{{ t("sponsor.important_content1_strong") }}</strong>
				</template>
			</i18n-t>
			<p v-html="t('sponsor.important_content2')"></p>
			<ParamItem class="readToggle" :paramData="checkbox" secondary />
		</div>

		<img src="@/assets/img/eating.gif" alt="eating" class="patrick" ref="patrick" />

		<div class="buttons">
			<TTButton
				type="link"
				ref="premium"
				big
				premium
				icon="premium"
				v-if="!standaloneMode"
				@click="clickPremium()"
			>
				<div class="labelHolder">
					<span v-html="t('sponsor.premium')"></span>
					<i>{{ t("sponsor.premium_details") }}</i>
				</div>
			</TTButton>

			<ToggleBlock
				class="premium"
				ref="premium"
				v-else
				premium
				:open="false"
				:icons="['premium']"
				:title="t('sponsor.premium')"
				:subtitle="t('sponsor.premium_subtitle')"
			>
				<p>{{ t("sponsor.premium_details") }}</p>
				<SponsorTable class="sponsorTable" />
				<Button
					icon="patreon"
					class="patreonBt"
					href="https://www.patreon.com/join/durss"
					target="_blank"
					type="link"
					premium
					>{{ t("sponsor.donate_patreonBt") }}</Button
				>
			</ToggleBlock>

			<TTButton
				v-for="link in links"
				type="link"
				ref="button"
				:href="link.url"
				target="_blank"
				big
				secondary
				:icon="link.icon + ''"
				:disabled="!checkbox.value"
				@click.native.capture="clickItem()"
			>
				<div class="labelHolder">
					<span v-html="t('sponsor.donate_option.' + link.key)"></span>
					<i v-tooltip="t('sponsor.donate_rate')"
						>({{ t("sponsor.donate_option." + link.key + "_rate") }})</i
					>
				</div>
			</TTButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { gsap } from "gsap/gsap-core";
import { computed, onMounted, ref, useTemplateRef, type ComponentPublicInstance } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import ParamItem from "../ParamItem.vue";
import type IParameterContent from "./IParameterContent";
import ToggleBlock from "@/components/ToggleBlock.vue";
import SponsorTable from "@/components/premium/SponsorTable.vue";
import { storeParams as useStoreParams } from "@/store/params/storeParams";

const props = withDefaults(
	defineProps<{
		animate?: boolean;
	}>(),
	{
		animate: false,
	},
);

const { t, tm } = useI18n();
const route = useRoute();
const storeParams = useStoreParams();

const checkbox = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "sponsor.checkbox",
});

const links: { url: string; icon: string; key: string }[] = [
	{ url: "https://paypal.me/durss", icon: "paypal", key: "paypal" },
	{ url: "https://www.patreon.com/join/durss", icon: "patreon", key: "patreon" },
	{ url: "https://ko-fi.com/durss", icon: "kofi", key: "kofi" },
	{ url: "https://www.buymeacoffee.com/durss", icon: "coffee", key: "coffee" },
	{ url: "https://github.com/sponsors/Durss", icon: "github", key: "github" },
];

const head = useTemplateRef<HTMLElement>("head");
const instructions = useTemplateRef<HTMLDivElement>("instructions");
const patrick = useTemplateRef<HTMLElement>("patrick");
const premium = useTemplateRef<unknown>("premium");
const button = useTemplateRef<unknown>("button");

const standaloneMode = computed<boolean>(() => {
	return route.name == "sponsor";
});

onMounted(() => {
	if (props.animate !== false) {
		const refsMap: { [key: string]: unknown } = {
			head: head.value,
			instructions: instructions.value,
			patrick: patrick.value,
			premium: premium.value,
			button: button.value,
		};
		const refs = ["head", "instructions", "patrick", "premium", "button"];
		for (let i = 0; i < refs.length; i++) {
			let el = refsMap[refs[i]!];
			let list: unknown[] = [];
			if (!Array.isArray(el)) {
				list = [el];
			} else {
				list = el;
			}
			for (let j = 0; j < list.length; j++) {
				let item = list[j];
				if ((item as ComponentPublicInstance).$el)
					item = (item as ComponentPublicInstance).$el as HTMLElement;
				const delay = (i + j) * 0.1;
				gsap.set(item as HTMLElement, { opacity: 0, y: -20, scale: 0.85 });
				gsap.to(item as HTMLElement, {
					duration: 0.5,
					scale: 1,
					opacity: 1,
					y: 0,
					clearProps: "all",
					ease: "back.out",
					delay,
				});
			}
		}
	}
});

function clickPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

function clickItem(): void {
	if (checkbox.value.value === false) {
		const target = instructions.value as HTMLDivElement;
		//@ts-ignore
		if (target.scrollIntoViewIfNeeded) {
			//@ts-ignore
			target.scrollIntoViewIfNeeded(); //Works everywhere but firefox
		} else {
			target.scrollIntoView(false);
		}
		gsap.fromTo(
			target,
			{ scale: 1.15, filter: "brightness(2)" },
			{ scale: 1, filter: "brightness(1)", duration: 0.5 },
		);
	}
}

function onNavigateBack(): boolean {
	return false;
}

defineExpose<IParameterContent>({ onNavigateBack });
</script>

<style scoped lang="less">
.paramssponsor {
	display: flex;
	flex-direction: column;
	gap: 1em;

	header {
		line-height: 1.5em;
		p:first-of-type {
			display: inline;
		}
		.icon {
			height: 1.3em;
			margin-right: 0.25em;
			vertical-align: middle;
		}
	}

	.patrick {
		margin: auto;
		display: block;
		height: 100px;
	}
	.buttons {
		display: flex;
		flex-direction: column;
		margin-top: -1em;
		gap: 0.5em;

		& > .premium {
			width: 100%;
			:deep(.header) {
				padding: 0.75em 1em;
				.icon {
					height: 1.4em;
					width: 1.4em;
				}
				h2 {
					font-weight: normal;
				}
				h3 {
					font-size: 0.6em;
				}
			}
			.patreonBt {
				margin-top: 0.5em;
			}

			.sponsorTable {
				font-size: 1rem;
				width: 80%;
				margin: auto;
				margin-top: 0.5em;
			}
		}

		:deep(.label) {
			flex-grow: 1;
		}

		.button {
			* {
				pointer-events: all;
			}
			border-radius: var(--border-radius);
			:deep(.label) {
				flex-shrink: 1;
				flex-grow: 0;
				width: calc(100% - 0.6em - 1em);
			}
			.labelHolder {
				display: flex;
				flex-direction: column;
				i {
					font-style: italic;
					font-size: 0.6em;
					line-height: 1em;
					align-self: center;
				}
			}

			:deep(.erase) {
				text-decoration: line-through;
				font-style: normal;
				font-size: 0.8em;
			}
		}
	}

	.important {
		text-align: center;
		line-height: 1.5em;

		.link {
			color: var(--color-light);
		}

		.readToggle {
			display: inline-block;
			//Kinda dirty but to lazy to find a clean solution.
			//Basically disables the fading of the form if option is
			//unselected
			opacity: 1 !important;
		}
	}
}
</style>
