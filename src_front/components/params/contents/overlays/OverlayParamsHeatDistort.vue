<template>
	<ToggleBlock class="overlayparamsheatdistort" :title="$t('overlay.heatDistort.title')" :icons="['heat']">

		<div class="holder card-item alert" v-if="!obsConnected">
			<p>{{ $t("heat.need_OBS") }}</p>
			<Button class="button"
				icon="obs"
				light alert
				@click="$store('params').openParamsPage(contentObs)">{{ $t('heat.need_OBS_connectBt') }}</Button>
		</div>
		
		<div class="holder" v-else>
			<div class="item">
				<div class="info">
					<i18n-t scope="global" tag="div" keypath="overlay.heatDistort.description">
					</i18n-t>
				</div>
			</div>

			<div class="card-item item info">
				<Icon name="alert" />
				<i18n-t scope="global" tag="span" keypath="overlay.heatDistort.install">
					<template #HEAT>
						<a @click="openHeat()">{{ $t("overlay.heatDistort.install_heat_link") }}</a>
					</template>
					<template #SHADER>
						<a href="https://www.shadertastic.com" target="_blank">{{ $t("overlay.heatDistort.install_shader_link") }}</a>
					</template>
				</i18n-t>
			</div>
			
			<Button class="item center" icon="add" primary @click="addDistortion()"
			v-if="distortionList.length < maxEntries">{{ $t("overlay.heatDistort.add_overlay") }}</Button>

			<div class="card-item maximumReached" v-else>
				<p><Icon name="alert" />{{ $t("overlay.heatDistort.max_reached") }}</p>
				<Button icon="premium" premium v-if="!isPremium" @click="becomePremium()">{{ $t("premium.become_premiumBt") }}</Button>
			</div>

			<template v-for="(item, index) in distortionList" :key="item.id">
				<HeatDistortParams v-model="distortionList[index]" @delete="deleteDistorsion" />
			</template>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Icon from '@/components/Icon.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import HeatDistortParams from './heat/HeatDistortParams.vue';
import Utils from '@/utils/Utils';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';

@Component({
	components:{
		Icon,
		Button,
		ToggleBlock,
		HeatDistortParams,
	},
	emits:[],
})
export default class OverlayParamsHeatDistort extends Vue {

	public distortionList:TwitchatDataTypes.HeatDistortionData[] = [];

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get isPremium():boolean{ return this.$store("auth").isPremium; }
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; }
	public get maxEntries():number{ return this.isPremium? Config.instance.MAX_DISTORTION_OVERLAYS_PREMIUM : Config.instance.MAX_DISTORTION_OVERLAYS; }

	public openHeat():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.HEAT);
	}

	public addDistortion():void {
		this.distortionList.push({
			id:Utils.getUUID(),
			enabled:true,
			obsSceneItemId:"",
			obsSceneName:"",
			shape:"",
			permissions:{
				all:true,
				broadcaster:true,
				follower:true,
				follower_duration_ms:0,
				mods:true,
				vips:true,
				subs:true,
				usersAllowed:[],
				usersRefused:[],
			},
		})
	}

	public becomePremium():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	public deleteDistorsion(data:TwitchatDataTypes.HeatDistortionData):void {
		this.distortionList = this.distortionList.filter(v=>v.id != data.id);
	}

}
</script>

<style scoped lang="less">
.overlayparamsheatdistort{
	.holder{
		display: flex;
		flex-direction: column;
		gap: .5em;

		.icon {
			height: 1em;
			margin-right: .5em;
		}

		.info {
			a {
				font-weight: bold;
			}
		}

		.item {
			&.center {
				margin: auto;
			}
		}

		.maximumReached {
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			background-color: var(--color-secondary-fader);
		}
	}
}
</style>