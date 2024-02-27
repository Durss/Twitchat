<template>
	<div class="paramsconnexions parameterContent">
		<Icon name="offline" alt="connections icon" class="icon" />

		<p class="head">{{ $t("connexions.header") }}</p>

		<ConnectYoutube listMode is="ToggleBlock" class="blinkBorder" :open="subContent == 'youtube'" :class="allowHighlight && subContent == 'youtube'? 'blink' : ''" @click="allowHighlight = false" v-if="youtubeEnabled" />

		<ToggleBlock class="blinkBorder" :open="subContent == 'obs'" :class="allowHighlight && subContent == 'obs'? 'blink' : ''" @click="allowHighlight = false" title="OBS websocket" :icons="['obs']">
			<OBSConnectForm />
		</ToggleBlock>

		<ConnectSpotifyForm class="blinkBorder" :open="subContent == 'spotify'" :class="allowHighlight && subContent == 'spotify'? 'blink' : ''" @click="allowHighlight = false" />

		<!-- <ToggleBlock class="blinkBorder" title="Patreon" :icons="['patreon']" :open="subContent == 'patreon'" :class="subContent == 'patreon'? 'blink' : ''">
			<ParamsAccountPatreon />
		</ToggleBlock> -->
		
		<ConnectWebsocket class="blinkBorder" :open="subContent == 'websocket'" :class="allowHighlight && subContent == 'websocket'? 'blink' : ''" @click="allowHighlight = false" />
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
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
 class ParamsConnexions extends Vue implements IParameterContent {

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
export default toNative(ParamsConnexions);
</script>

<style scoped lang="less">
.paramsconnexions{
	.item {
		width: 100%;
		flex-grow: 1;
	}
}
</style>