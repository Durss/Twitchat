<template>
	<div class="sponsor">
		<div class="gradient"></div>

		<div class="logo" ref="logo">
			<img src="@/assets/logo.svg" alt="Twitchat" />
		</div>

		<div class="lang">
			<select v-model="$i18n.locale">
				<option :value="lang" v-for="lang in enabledLocales" :key="lang">
					{{ $t("global.lang_label", 1, { locale: lang }) }}
				</option>
			</select>
		</div>

		<TTButton icon="back" ref="backBt" primary class="backBt" :to="{ name: 'home_forced' }">
			{{ $t("global.back") }}
		</TTButton>

		<ParamsSponsor class="content" ref="content" animate />
	</div>
</template>

<script setup lang="ts">
import StoreProxy from "@/store/StoreProxy";
import { gsap } from "gsap";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../components/TTButton.vue";
import ParamsSponsor from "../components/params/contents/ParamsSponsor.vue";

const { availableLocales } = useI18n();

const backBt = ref<InstanceType<typeof TTButton> | null>(null);

const enabledLocales = computed<string[]>(() => {
	return availableLocales.filter((v) => {
		let root: any = StoreProxy.i18n.getLocaleMessage(v);
		if (!root.global) return false;
		return root.global.lang_enabled;
	});
});

onMounted(() => {
	const el = backBt.value!.$el as HTMLElement;
	gsap.fromTo(
		el,
		{ opacity: 0, y: -20, scale: 0.85 },
		{
			duration: 0.5,
			scale: 1,
			opacity: 1,
			y: 0,
			clearProps: "all",
			ease: "back.out",
			delay: 0.5,
		},
	);
});
</script>

<style scoped lang="less">
.sponsor {
	text-align: center;
	color: var(--color-light);
	min-height: 100%;
	background-image: url("../assets/img/homepage/grain.png");
	margin: auto;
	padding: 4em 5px;
	position: relative;
	overflow: hidden;

	.gradient {
		background: linear-gradient(
			180deg,
			var(--color-primary-fadest) 0%,
			var(--color-secondary-transparent) 100%
		);
		background-size: 100% 100vh;
		background-repeat: no-repeat;
		background-position: top center;
		width: 100%;
		height: 100vh;
		position: absolute;
		top: 0;
		left: 0;
		z-index: -1;
	}

	.logo {
		width: 80vw;
		max-width: 400px;
		margin: auto;
		img {
			filter: drop-shadow(0 10px 20px fade(#000000, 50%));
		}
	}

	.backBt {
		margin-top: 2em;
	}

	.content {
		margin: auto;
		margin-top: 2em;
		max-width: 600px;
	}

	.lang {
		position: absolute;
		top: 10px;
		right: 10px;
		font-size: 0.8em;
		select {
			color: var(--color-light);
			background: none;
			border: none;
			option {
				color: var(--color-light);
			}
		}
	}
}
</style>
