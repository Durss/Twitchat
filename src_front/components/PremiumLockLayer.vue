<template>
	<div class="premiumlocklayer" v-if="!$store.auth.isPremium">
		<Icon name="premium" class="icon" />
		<Button icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</Button>
	</div>
</template>

<script lang="ts" setup>
import { storeParams } from '@/store/params/storeParams';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

const store = storeParams();
function openPremium(): void {
	store.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}
</script>

<style scoped lang="less">
.premiumlocklayer{
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 1;
	background-color: transparent;
	background-image: repeating-linear-gradient(-45deg, var(--color-premium-fadest), var(--color-premium-fadest) 10px, transparent 10px, transparent 20px);
	cursor: not-allowed;
	& > * {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
	.button {
		opacity: 0;
		transition: opacity .25s;
		&:active {
			//Make sure button stays centered.
			//Button natively translateY() itself when active
			transform: translate(-50%, calc( -50% + 2px));
		}
	}
	&>.icon {
		color: var(--color-light);
		height: 1.75em;
		width: 1.75em;
		transition: opacity .25s;
		filter: drop-shadow(0 0 10px #000000);
	}
	&:hover {
		.button {
			opacity: 1;
		}
		&>.icon {
			opacity: 0;
		}
	}
}
</style>
