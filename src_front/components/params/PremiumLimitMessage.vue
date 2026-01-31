<template>
	<div class="parampremiumlimitmessage card-item premium premiumLimit">
		<span>{{$t(labelKey, {MAX:max, MAX_PREMIUM:maxPremium})}}</span>
		<TTButton icon="premium" premium light @click="openPremium()">{{ $t("premium.become_premiumBt") }}</TTButton>
	</div>
</template>

<script lang="ts">
import { TTButton } from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
	},
	emits:[],
})
class ParamPremiumLimitMessage extends Vue {

	@Prop
	public labelKey!:string;

	@Prop
	public max!:number;

	@Prop
	public maxPremium!:number;

	/**
	 * Opens the premium page
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}
}
export default toNative(ParamPremiumLimitMessage);
</script>

<style scoped lang="less">
.parampremiumlimitmessage{
	text-align: center;
	.button {
		display: flex;
		margin: auto;
		margin-top: .5em;
	}
}
</style>