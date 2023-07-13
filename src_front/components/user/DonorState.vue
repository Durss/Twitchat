<template>
	<div class="donorstate">
		<DonorBadge class="donorBadge" />
		<div class="badgesList">
			<DonorBadge class="badge" v-for="i in donorLevel+1" :level="i-1" light />
			<img src="@/assets/icons/donor_placeholder.svg" class="badge" v-for="i in 9-donorLevel" />
		</div>

		<div class="card-item">
			<Icon name="loader" v-if="!publicDonation_loaded" />
			<ParamItem class="param toggle" v-if="publicDonation_loaded" :paramData="$store('account').publicDonation" v-model="publicDonation" noBackground />
			<i18n-t scope="global" class="infos" tag="div" v-if="publicDonation_loaded" keypath="account.donation_public">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentAbout)">{{ $t("account.about_link") }}.</a>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiController from '@/utils/ApiController';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../params/ParamItem.vue';
import DonorBadge from './DonorBadge.vue';

@Component({
	components:{
		ParamItem,
		DonorBadge,
	},
	emits:[],
})
export default class DonorState extends Vue {

	public publicDonation = false;
	public publicDonation_loaded = false;

	public get isDonor():boolean { return this.$store("auth").twitch.user.donor.state; }
	public get donorLevel():number { return this.$store("auth").twitch.user.donor.level; }
	public get contentAbout():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ABOUT; } 

	public async mounted():Promise<void> {
		this.publicDonation = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == "true";

		if(this.isDonor) {
			//Load current anon state of the user's donation
			try {
				const {json} = await ApiController.call("user/donor/anon");
				if(json.success === true) {
					this.publicDonation = json.data.public === true;
				}
			}catch(error) {
			}
			this.publicDonation_loaded = true;
	
			watch(()=> this.publicDonation, async ()=> this.updateDonationState());
		}
	}

	private async updateDonationState():Promise<void> {
		try {
			await ApiController.call("user/donor/anon", "POST", {public:this.publicDonation});
		}catch(error) {
		}
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

	.infos {
		margin-top: .25em;
		max-width: 300px;
		font-size: .8em;
	}
}
</style>