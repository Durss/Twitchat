<template>
	<div class="overlayparamsbitswall overlayParamsSection">
		<div class="header">{{ $t("overlay.bitswall.head") }}</div>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ $t("overlay.title_install") }}</div>
			</div>

			<OverlayInstaller type="bitswall"
				:orderToBottom="param_cristalEffect.value"
				:sourceSuffix="param_cristalEffect.value? '_shader' : ''"
				:queryParams="{mode:param_cristalEffect.value? 'shader' : 'normal'}"
				:css="'html, body{ background-color:transparent;}'"
				:sourceTransform="{positionX:param_cristalEffect.value? 3000 : 0, positionY:param_cristalEffect.value? 3000 : 0, width:param_cristalEffect.value? 3840 : 1920}"
				@obsSourceCreated="onObsSourceCreated" />
				
			<div class="card-item" @mouseenter="showShaderEffect=true" @mouseleave="showShaderEffect=false">
				<ParamItem :paramData="param_cristalEffect" noBackground />
	
				<div :class="showShaderEffect? 'demo open' : 'demo'">
					<img src="@/assets/img/bitswall/cheermotes_render.gif" :class="param_cristalEffect.value? 'shader' : ''">
				</div>
	
				<div class="card-item alert error" v-if="shaderstasticError" @click="shaderstasticError = false" ref="error">
					<Icon name="alert" /> 
					<i18n-t scope="global" keypath="overlay.heatDistort.shadertastic_missing">
						<template #URL>
							<a href="https://www.shadertastic.com" target="_blank">{{ $t("overlay.heatDistort.shadertastic_missing_url") }}</a>
						</template>
					</i18n-t>
				</div>
			</div>
		</section>
		

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="params" /> {{ $t("overlay.title_settings") }}</div>
			</div>

			<ParamItem :paramData="param_size" v-model="parameters.size">
				<img class="cheerScale" src="@/assets/img/bitswall/10000_tex.png" :style="{height:(128 * (param_size.value/100))+'px'}">
			</ParamItem>

			<ParamItem :paramData="param_break" v-model="parameters.break">
				<ParamItem :paramData="param_break_senderOnly" v-model="parameters.break_senderOnly" class="child" noBackground />
			</ParamItem>

			<template v-if="overlayExists">
				<TTButton class="center" :loading="loading" @click="testOverlay()" icon="test">{{ $t('overlay.bitswall.testBt') }}</TTButton>
			</template>

			<Icon class="center loader card-item" name="loader" v-else-if="checkingOverlayAtStart" />

			<div class="center card-item alert" v-else-if="!overlayExists">{{ $t("overlay.bitswall.no_overlay") }}</div>
		</section>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import type { JsonObject } from 'type-fest';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
		OverlayInstaller,
	},
	emits:[],
})
export default class OverlayParamsBitswall extends Vue {

	public loading = false;
	public overlayExists = false;
	public checkingOverlayAtStart:boolean = true;
	public shaderstasticError:boolean = false;
	public showShaderEffect:boolean = false;

	public param_size:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:100, min:10, max: 200, labelKey:"overlay.bitswall.param_size", icon:"scale"};
	public param_break:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"overlay.bitswall.param_break", icon:"click"};
	public param_break_senderOnly:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"overlay.bitswall.param_break_senderOnly", icon:"bits", tooltipKey:"heat.anonymous"};
	public param_cristalEffect:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"overlay.bitswall.param_cristalEffect"};
	public parameters:TwitchatDataTypes.BitsWallOverlayData = {
		size:25,
		break:false,
		break_senderOnly:true,
	}

	private checkInterval!:number;
	private subcheckTimeout!:number;
	private overlayPresenceHandler!:()=>void;
	
	public beforeMount():void {
		const paramsJSON = DataStore.get(DataStore.BITS_WALL_PARAMS);
		if(paramsJSON) {
			const parsed = JSON.parse(paramsJSON);
			if(parsed.scale != undefined) this.parameters.size = parsed.scale;
			if(parsed.break != undefined) this.parameters.break = parsed.break;
			if(parsed.break_senderOnly != undefined) this.parameters.break_senderOnly = parsed.break_senderOnly;
		}
		
		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			this.checkingOverlayAtStart = false;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.BITSWALL_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>{
			PublicAPI.instance.broadcast(TwitchatEvent.GET_BITSWALL_OVERLAY_PRESENCE);
			clearTimeout(this.subcheckTimeout);
			//If after 1,5s the overlay didn't answer, assume it doesn't exist
			this.subcheckTimeout = setTimeout(()=>{
				this.overlayExists = false;
				this.checkingOverlayAtStart = false;
			}, 1500);
		}, 2000);

		watch(()=>this.parameters, ()=> {
			DataStore.set(DataStore.BITS_WALL_PARAMS, this.parameters);
			PublicAPI.instance.broadcast(TwitchatEvent.BITSWALL_OVERLAY_PARAMETERS, (this.parameters as unknown) as JsonObject);
		}, {deep:true});
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.BITSWALL_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	public testOverlay():void {
		const user = this.$store.auth.twitch.user;
		const pinned = Math.random() > .5;
		const wsMessage = {
			channel:user.id,
			message:"",
			message_chunks:[],
			user: {
				id:user.id,
				login:user.login,
				displayName:user.displayNameOriginal,
			},
			bits:Utils.pickRand([123, 456, 789, 1515, 5237, 18423]),
			pinned,
			pinLevel:pinned? Math.round(Math.random()*8) : 0,
		} as JsonObject;
		PublicAPI.instance.broadcast(TwitchatEvent.BITS, wsMessage);
	}

	/**
	 * Called when a new distotion has been created and the overlay installed
	 * @param sourceName 
	 * @param vo 
	 * @param suffix 
	 */
	public async onObsSourceCreated(data:{sourceName:string}):Promise<void> {
		if(this.param_cristalEffect.value !== true) return;

		let filterTarget = await OBSWebsocket.instance.getCurrentScene();

		const filterSettings = {
			"effect": "displacement_map_source",
			"displacement_map_source.displacement_map": data.sourceName,
			"displacement_map_source.color_space":0,
			"displacement_map_source.displacement_strength_x":.05,
			"displacement_map_source.displacement_strength_y":.05,
		};
		const filterName = ("Bits wall shader ("+filterTarget+")").substring(0, 100);

		const params = {
						sourceName: filterTarget,
						filterKind:"shadertastic_filter",
						filterName,
						filterSettings
					};
		try {
			await OBSWebsocket.instance.socket.call("CreateSourceFilter", params);
		}catch(error) {
			this.shaderstasticError = true;
			//Remove browser source created before
			const sceneItem = await OBSWebsocket.instance.searchSceneItemId(data.sourceName, filterTarget);
			if(sceneItem) {
				await OBSWebsocket.instance.socket.call("RemoveSceneItem", {sceneItemId:sceneItem.itemId, sceneName:filterTarget});
			}

			await this.$nextTick();

			gsap.from(this.$refs["error"] as HTMLDivElement, {duration:.5, ease:"back.out", padding:0, height:0, delay:.5});
		}
	}

}
</script>

<style scoped lang="less">
.overlayparamsbitswall{
	.demo {
		@scale: .8;
		position: relative;
		width: (855px / 2) * @scale;
		height: 0;
		margin: auto;
		border-radius: var(--border-radius);
		overflow: hidden;
		transition: height .25s;
		&.open {
			margin-top: .5em;
			height: 100px * @scale;
		}
		img {
			height: 100px * @scale;
			&:not(.shader) {
				left: -(855px / 2) * @scale - 2px;
				position: relative;
			}
		}
	}

	.cheerScale {
		margin: auto;
		margin-top: .5em;
		display: block;
	}
	.error {
		text-align: center;
		white-space: pre-line;
		line-height: 1.25em;
		cursor: pointer;
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}
}
</style>