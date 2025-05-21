<template>
	<div class="donorstate">
		<DonorBadge class="donorBadge" :premium="isPremium" />
		<div class="badgesList">
			<DonorBadge class="badge" v-for="i in donorLevel+1" :level="i-1" light />
			<DonorBadge class="badge" v-if="isPremium" light :premium="isPremium" />
			<Icon name="donor_placeholder" class="badge" v-for="i in 9-donorLevel" />
			<button class="premiumDisabled" @click="openPremium">
				<Icon v-if="!isPremium" name="donor_placeholder" class="badge" />
				<Icon name="premium" class="premiumIcon" />
			</button>
		</div>

		<DonorPublicState class="card-item publicState" />
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import ParamItem from '../params/ParamItem.vue';
import DonorBadge from './DonorBadge.vue';
import DonorPublicState from './DonorPublicState.vue';

@Component({
	components:{
		Icon,
		ParamItem,
		DonorBadge,
		DonorPublicState,
	},
	emits:[],
})
class DonorState extends Vue {

	public get isPremium():boolean { return false && this.$store.auth.isPremium; }
	public get donorLevel():number { return this.$store.auth.donorLevel; }

	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}
}
export default toNative(DonorState);
</script>

<style scoped lang="less">
.donorstate{
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 1em 0;
	.donorBadge {
		margin-bottom: 1em;
	}

	.badgesList {
		margin-top: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		width: 80%;
		.badge {
			margin: .25em;
			height: 3em;
		}
	}
	
	.premiumDisabled {
		cursor: pointer;
		position: relative;
		.badge {
			height: 3em;
		}
		.premiumIcon {
			height: 1.4em;
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -70%);
			transition: transform .2s;
			color: #808080;
		}
		&:hover {
			.premiumIcon {
				transform: translate(-50%, -70%) scale(1.2, 1.2);
			}
		}
	}

	.publicState {
		margin-top: 1em;
		max-width: 300px;
	}
}
</style>