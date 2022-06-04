<template>
	<ToggleBlock :open="open" class="overlayparamsraffle" title="Wheel" :icons="['ticket_purple']">
		<div>when doing a raffle, this page will display a wheel that'll animate to pick a winner.</div>
		<div class="content">
			<div class="row">
				<input type="text" v-model="overlayUrl">
			</div>
			<div class="row center">
				<Button :loading="loading" @click="testWheel()" title="Test it" :icon="require('@/assets/icons/test.svg')" />
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import { WheelItem } from '@/components/overlays/OverlaysRaffleWheel.vue';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { JsonArray, JsonObject } from "type-fest";
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	}
})
export default class OverlayParamsRaffle extends Vue {

	public open:boolean = false;
	public loading:boolean = false;
	
	public get overlayUrl():string { return Utils.getOverlayURL("wheel"); }

	public mounted():void {
		
	}

	public async testWheel():Promise<void> {
		this.loading = true;
		const followers = await TwitchUtils.getFollowers(null, 500);
		const items:WheelItem[] = followers.map(v=> {
			return {label:v.from_name, data:v.from_id}
		});
		const data = {
			items:((items as unknown) as JsonArray),
			winner: (Utils.pickRand(items) as unknown) as JsonObject,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, data)
		await Utils.promisedTimeout(100);
		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.overlayparamsraffle{
	.content {
		.row {
			display: flex;
			flex-direction: column;

			&:not(:first-of-type) {
				margin-top: .5em;
			}

			&.center {
				align-items: center;
			}
		}
	}
}
</style>