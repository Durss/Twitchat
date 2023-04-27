<template>
	<div class="paramsconnexions">
		<ToggleBlock class="item" title="OBS websocket" :icons="['obs']" :open="subContent == 'obs'" :class="subContent == 'obs'? 'selected' : ''">
			<OBSConnectForm />
		</ToggleBlock>

		<ConnectSpotifyForm class="item" :open="subContent == 'spotify'" :class="subContent == 'spotify'? 'selected' : ''" />
		
		<ConnectWebsocket class="item" :open="subContent == 'websocket'" :class="subContent == 'websocket'? 'selected' : ''" />
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { Component, Vue } from 'vue-facing-decorator';
import ConnectSpotifyForm from './connexions/ConnectSpotifyForm.vue';
import ConnectWebsocket from './connexions/ConnectWebsocket.vue';
import type IParameterContent from './IParameterContent';
import OBSConnectForm from './obs/OBSConnectForm.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

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

	public get subContent():TwitchatDataTypes.ConnexionSectionsStringType {
		return (this.$store("params").currentPageSubContent) as TwitchatDataTypes.ConnexionSectionsStringType;
	}
}
</script>

<style scoped lang="less">
.paramsconnexions{
	.item {
		margin-bottom: 1em;

		&.selected {
			border: 5px solid transparent;
			border-radius: 1em;
			animation: blink .5s 3 forwards;
			animation-delay: 1s;
			@keyframes blink {
				0% {
					border-color: var(--color-secondary);
				}
				50% {
					border-color: transparent;
				}
				100% {
					border-color: var(--color-secondary);
				}
			}
		}
	}
}
</style>