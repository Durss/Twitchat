<template>
	<div class="paramsconnexions parameterContent">
		<Icon name="offline" alt="connections icon" class="icon" />

		<p class="head">{{ $t("connexions.header") }}</p>

<ConnectYoutube v-if="youtubeEnabled" class="item" :open="subContent == 'youtube'" :class="allowHighlight && subContent == 'youtube'? 'selected' : ''" @click="allowHighlight = false" />

		<ToggleBlock class="item" title="OBS websocket" :icons="['obs']" :open="subContent == 'obs'" :class="allowHighlight && subContent == 'obs'? 'selected' : ''" @click="allowHighlight = false">
			<OBSConnectForm />
		</ToggleBlock>

		<ConnectSpotifyForm class="item" :open="subContent == 'spotify'" :class="allowHighlight && subContent == 'spotify'? 'selected' : ''" @click="allowHighlight = false" />

		<!-- <ToggleBlock class="item" title="Patreon" :icons="['patreon']" :open="subContent == 'patreon'" :class="subContent == 'patreon'? 'selected' : ''">
			<ParamsAccountPatreon />
		</ToggleBlock> -->
		
		<ConnectWebsocket class="item" :open="subContent == 'websocket'" :class="allowHighlight && subContent == 'websocket'? 'selected' : ''" @click="allowHighlight = false" />
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { Component, Vue } from 'vue-facing-decorator';
import type IParameterContent from './IParameterContent';
import ConnectSpotifyForm from './connexions/ConnectSpotifyForm.vue';
import ConnectWebsocket from './connexions/ConnectWebsocket.vue';
import OBSConnectForm from './obs/OBSConnectForm.vue';
import ParamsAccountPatreon from './account/ParamsAccountPatreon.vue';
import ConnectYoutube from './connexions/ConnectYoutube.vue';
import Config from '@/utils/Config';

@Component({
	components:{
		ToggleBlock,
		ConnectYoutube,
		OBSConnectForm,
		ConnectWebsocket,
		ConnectSpotifyForm,
		ParamsAccountPatreon,
	},
	emits:[],
})
export default class ParamsConnexions extends Vue implements IParameterContent {

	public allowHighlight:boolean = true;

	public onNavigateBack(): boolean { return false; }

	public get subContent() { return this.$store.params.currentPageSubContent; }
	
	public get youtubeEnabled() { return Config.instance.YOUTUBE_CLIENT_ID; }

	public async mounted():Promise<void> {
		await this.$nextTick();
		if(this.subContent) {
			const holder = (this.$refs[this.subContent] as Vue)?.$el;
			if(holder) holder.scrollIntoView();
		}
	}
}
</script>

<style scoped lang="less">
.paramsconnexions{
	.item {
		width: 100%;
		flex-grow: 1;
		border: 0 solid transparent;
		transition: border-width .25s;

		&.selected {
			border-width: 5px;
			border-radius: 1em;
			animation: blink .5s 3 forwards;
			animation-delay: .5s;
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