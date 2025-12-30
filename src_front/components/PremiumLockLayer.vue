<template>
	<div class="premiumlocklayer" v-if="!$store.auth.isPremium">
		<Icon name="premium" class="icon" />
		<Button icon="premium" @click="openPremium()" premium>{{$t('premium.become_premiumBt')}}</Button>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from './TTButton.vue';
import Icon from './Icon.vue';

@Component({
	components:{
		Icon,
		Button: TTButton,
	},
	emits:[],
})
class PremiumLockLayer extends Vue {

	/**
	 * Open premium section
	 */
	 public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

}
export default toNative(PremiumLockLayer);
</script>

<style scoped lang="less">
.premiumlocklayer{
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 1;
	// background-color: var(--color-premium-fadest);
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
