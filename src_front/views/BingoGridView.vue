<template>
	<div class="bingogridview">
		<div class="head">
			<img src="@/assets/icons/bingo_logo.svg" alt="logo" class="logo" />
		</div>

		<i18n-t keypath="bingo_grid.state.info" class="card-item body" tag="div">
			<template #EXTENSION
				><a :href="$config.TWITCHAT_EXTENSION_URL" target="_blank"
					>Twichat Companion<Icon name="newtab" /></a
			></template>
		</i18n-t>

		<i18n-t scope="global" keypath="bingo_grid.state.footer" class="footer" tag="div">
			<template #LINK><a href="/">Twitchat</a></template>
		</i18n-t>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
</script>

<style scoped lang="less">
.bingogridview {
	color: var(--color-text);
	// min-width: 100vw;
	min-height: 99vh;
	width: 100%;
	gap: 1em;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-between;

	.head {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		margin: 2em auto 0 auto;
		align-items: center;
		width: 100%;
		.logo {
			height: 5em;
			display: block;
		}
	}
	.body {
		font-size: 1.5em;
		line-height: 1.2em;
		max-width: 500px;
		margin: 0 1em;
		text-align: center;
		text-wrap: balance;
		.icon {
			height: 1em;
			margin-left: 0.25em;
			vertical-align: middle;
		}
		a {
			display: inline-block;
		}
	}
}
</style>
