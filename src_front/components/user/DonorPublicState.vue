<template>
	<div class="donorpublicstate" v-if="isDonor">
		<Icon class="loader" name="loader" v-if="!publicDonation_loaded" />
		<ParamItem class="param toggle" v-if="publicDonation_loaded" :paramData="$store.account.publicDonation" v-model="publicDonation" noBackground />
		<i18n-t scope="global" class="infos" tag="div" v-if="publicDonation_loaded && noInfos === false" keypath="account.donation_public">
			<template #LINK>
				<a @click="$store.params.openParamsPage(contentDonate)">{{ $t("account.about_link") }}.</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../params/ParamItem.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		ParamItem,
		DonorPublicState,
	},
	emits:["change"],
})
export default class DonorPublicState extends Vue {

	@Prop({type:Boolean, default:false})
	public noInfos!:boolean;

	public publicDonation = false;
	public publicDonation_loaded = false;
	
	public get isDonor():boolean { return this.$store.auth.twitch.user.donor.state; }
	public get contentDonate():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.DONATE; }

	public async mounted():Promise<void> {
		this.publicDonation = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == "true";

		if(this.isDonor) {
			//Load current anon state of the user's donation
			try {
				const {json} = await ApiHelper.call("user/donor/anon");
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
			await ApiHelper.call("user/donor/anon", "POST", {public:this.publicDonation});
			this.$emit("change");
		}catch(error) {
		}
	}

}
</script>

<style scoped lang="less">
.donorpublicstate{
	.loader {
		height: 2em;
		display: block;
		margin: auto;
	}
	.infos {
		margin-top: .25em;
		// max-width: 300px;
		font-size: .8em;
	}
}
</style>