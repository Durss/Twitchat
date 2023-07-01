<template>
	<ToggleBlock class="heatdebug" :title="$t('heat.debug_interaction')" :open="false" :icons="['debug']" secondary>
		<div class="content">
			<div>{{ $t("heat.debug.description") }}</div>
			
			<div ref="areaHolder" class="areaHolder">
				<HeatDebugPopout />
				<button class="fsBt" @click="goFullscreen()"><img src="@/assets/icons/newtab.svg" alt=""></button>
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import HeatDebugPopout from '@/views/HeatDebugPopout.vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleBlock,
		HeatDebugPopout,
	},
	emits:[],
})
export default class HeatDebug extends Vue {

	public mounted():void {
	}

	public goFullscreen():void {
		// if (document.fullscreenElement) {
		// 	document.exitFullscreen();
		// }else{
		// 	const area = (this.$refs.areaHolder as HTMLDivElement);
		// 	area.requestFullscreen({navigationUI:'show'});
		// }

		let params = `scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,directories=no,menubar=no,width=1080,height=800,left=600,top=100`;
		const url = new URL(document.location.origin + this.$router.resolve({name:"heatDebug"}).href);
		
		const port = DataStore.get(DataStore.OBS_PORT);
		const pass = DataStore.get(DataStore.OBS_PASS);
		const ip = DataStore.get(DataStore.OBS_IP);
		if(port) url.searchParams.append("obs_port", port);
		if(pass) url.searchParams.append("obs_pass", pass);
		if(ip) url.searchParams.append("obs_ip", ip);

		window.open(url, "heatDebug", params);
	}

}
</script>

<style scoped lang="less">
.heatdebug{
	width: 100%;

	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;

		.areaHolder {
			overflow: hidden;
			position: relative;
			user-select: none;
			border-radius: var(--border-radius);
			background-repeat: no-repeat;
			width: 100%;
			aspect-ratio: 16/9;

			.fsBt {
				cursor: pointer;
				width: 1em;
				height: 1em;
				position: absolute;
				top: .5em;
				right: .5em;
				img {
					width: 100%;
				}
			}
		}
	}
}
</style>