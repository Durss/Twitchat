<template>
	<div class="donorstate">
		<DonorBadge class="donorBadge" :premium="isPremium" />
		<div class="badgesList">
			<DonorBadge class="badge" v-for="i in donorLevel+1" :level="i-1" light />
			<DonorBadge class="badge" v-if="isPremium" light :premium="isPremium" />
			<img src="@/assets/icons/donor_placeholder.svg" class="badge" v-for="i in 9-donorLevel" />
			<button class="premiumDisabled" @click="openPremium">
				<img v-if="!isPremium" src="@/assets/icons/donor_placeholder.svg" class="badge" />
				<Icon name="premium" />
			</button>
		</div>

		<DonorPublicState class="card-item publicState" />
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
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
export default class DonorState extends Vue {

	public get isPremium():boolean { return this.$store("auth").isPremium; }
	public get donorLevel():number { return this.$store("auth").twitch.user.donor.level; }

	public openPremium():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}
}
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
	
	.card-item {
		margin-top: 1em;
	}

	.premiumDisabled {
		cursor: pointer;
		position: relative;
		.icon {
			height: 1.4em;
			opacity: .5;
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -60%);
			transition: transform .2s;
		}
		&:hover {
			.icon {
				transform: translate(-50%, -60%) scale(1.2, 1.2);
			}
		}
	}

	.publicState {
		max-width: 300px;
	}
}
</style>