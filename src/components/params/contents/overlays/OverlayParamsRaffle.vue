<template>
	<ToggleBlock :open="open" class="overlayparamsraffle" title="Wheel" :icons="['ticket_purple']">
		<div>when doing a raffle, this page will display a wheel that'll animate to show the winner.</div>
		<div class="content">
			<div class="row">
				<input type="text" id="spotify_overlay_url" v-model="overlayUrl">
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../../../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		ToggleBlock,
	}
})
export default class OverlayParamsRaffle extends Vue {

	public open:boolean = false;
	
	public get overlayUrl():string { return Utils.getOverlayURL("wheel"); }

	public mounted():void {
		
	}

}
</script>

<style scoped lang="less">
.overlayparamsraffle{
	.content {
		.row {
			display: flex;
			flex-direction: column;
		}
	}
}
</style>