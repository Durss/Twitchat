<template>
	<div class="paramsconnexions">
		<ToggleBlock class="item" :open="false" title="OBS websocket" :icons="['obs']">
			<OBSConnectForm />
		</ToggleBlock>

		<ConnectSpotifyForm class="item" />
		
		<ConnectWebsocket class="item" />
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { Component, Vue } from 'vue-facing-decorator';
import ConnectSpotifyForm from './connexions/ConnectSpotifyForm.vue';
import ConnectWebsocket from './connexions/ConnectWebsocket.vue';
import type IParameterContent from './IParameterContent';
import OBSConnectForm from './obs/OBSConnectForm.vue';

@Component({
	components:{
		ToggleBlock,
		OBSConnectForm,
		ConnectWebsocket,
		ConnectSpotifyForm,
	},
	emits:[],
})
export default class ParamsConnexions extends Vue implements IParameterContent {

	public onNavigateBack(): boolean { return false; }
}
</script>

<style scoped lang="less">
.paramsconnexions{
	.item {
		margin-bottom: 1em;
	}
}
</style>