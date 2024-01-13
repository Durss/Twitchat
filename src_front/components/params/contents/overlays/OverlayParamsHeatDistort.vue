<template>
	<div class="overlayparamsheatdistort overlayParamsSection" :title="$t('overlay.heatDistort.title')" :icons="['distort']">
		<a href="https://www.youtube.com/watch?v=yD3BmZXWph4" target="_blank" class="youtubeBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a>
		
		<div class="card-item alert center" v-if="!obsConnected">
			<p>{{ $t("heat.need_OBS") }}</p>
			<Button class="button"
				icon="obs"
				light alert
				@click="$store.params.openParamsPage(contentObs)">{{ $t('heat.need_OBS_connectBt') }}</Button>
		</div>
		
		<template v-else>
			<div class="header">{{ $t("overlay.heatDistort.description") }}</div>

			<template v-for="(item, index) in distortionList" :key="item.id">
				<HeatDistortParams v-model="distortionList[index]" @delete="deleteDistorsion" @created="distortionCreated" :ref="'distortion_'+item.id" />
			</template>

			<div class="card-item alert error" v-if="shaderstasticError" @click="shaderstasticError = false" ref="error">
				<Icon name="alert" /> 
				<i18n-t scope="global" keypath="overlay.heatDistort.shadertastic_missing">
					<template #URL>
						<a href="https://www.shadertastic.com" target="_blank">{{ $t("overlay.heatDistort.shadertastic_missing_url") }}</a>
					</template>
				</i18n-t>
			</div>
			
			<Button class="item center" icon="add" primary @click="addDistortion()"
			v-if="distortionList.length < maxEntries">{{ $t("overlay.heatDistort.add_overlay") }}</Button>
			
			<Button class="item center" icon="add" premium @click="expandPremiumInfo = true"
			v-else-if="!expandPremiumInfo">{{ $t("overlay.heatDistort.add_overlay") }}</Button>

			<div class="card-item maximumReached" v-else>
				<p class="label">
					<Icon name="alert" />
					<i18n-t scope="global" keypath="overlay.heatDistort.max_reached">
						<template #COUNT>{{ premiumCount }}</template>
					</i18n-t>
				</p>
				<Button icon="premium" premium v-if="!isPremium" @click="becomePremium()">{{ $t("premium.become_premiumBt") }}</Button>
			</div>

			<div class="card-item item footer">
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
		</template>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import HeatDistortParams from './heat/HeatDistortParams.vue';

@Component({
	components:{
		Icon,
		Button: TTButton,
		ToggleBlock,
		HeatDistortParams,
	},
	emits:[],
})
export default class OverlayParamsHeatDistort extends Vue {

	public expandPremiumInfo:boolean = false;
	public shaderstasticError:boolean = false;
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get isPremium():boolean{ return this.$store.auth.isPremium; }
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; }
	public get maxEntries():number{ return this.isPremium? Config.instance.MAX_DISTORTION_OVERLAYS_PREMIUM : Config.instance.MAX_DISTORTION_OVERLAYS; }
	public get premiumCount():number{ return Config.instance.MAX_DISTORTION_OVERLAYS_PREMIUM; }
	public get distortionList():TwitchatDataTypes.HeatDistortionData[] { return this.$store.heat.distortionList; }

	public beforeMount():void {
		watch(()=>this.distortionList, () => this.$store.heat.saveDistorsions(), {deep:true});
	}

	public openHeat():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.HEAT);
	}

	public addDistortion():void {
		const id = Utils.getUUID();
		this.distortionList.push({
			id,
			name:"",
			enabled:true,
			refuseAnon:false,
			triggerOnly:false,
			effect:"liquid",
			filterName:"",
			browserSourceName:"",
			obsItemPath:{
				groupName:"",
				sceneName:"",
				source:{
					id:0,
					name:"",
				}
			},
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
		});
		
		this.$nextTick().then(()=> {
			const holder = this.$refs["distortion_"+id] as Vue[];
			gsap.from(holder[0].$el, {height:0, paddingTop:0, paddingBottom:0, duration:.35, ease:"back.out", clearProps:"all"});
		})
	}

	public becomePremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Called when a new distotion has been created and the overlay installed
	 * @param sourceName 
	 * @param vo 
	 * @param suffix 
	 */
	public async distortionCreated(sourceName:string, vo:TwitchatDataTypes.HeatDistortionData, suffix:string):Promise<void> {
		let filterTarget = "";
		if(vo.obsItemPath.source.name) filterTarget = vo.obsItemPath.source.name;
		else if(vo.obsItemPath.groupName) filterTarget = vo.obsItemPath.groupName;
		else if(vo.obsItemPath.sceneName) filterTarget = vo.obsItemPath.sceneName;

		const filterSettings = {
			"displacement_map_source.displacement_map": sourceName,
			"effect": "displacement_map_source",
			"displacement_map_source.color_space":0,
			"displacement_map_source.displacement_strength_x":.05,
			"displacement_map_source.displacement_strength_y":.05,
		};
		const filterName = ("Heat Distortion"+suffix).substring(0, 100);
		vo.filterName = filterName;
		vo.browserSourceName = sourceName;

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
			const sceneItem = await OBSWebsocket.instance.searchSceneItemId(sourceName, vo.obsItemPath.sceneName);
			if(sceneItem) {
				await OBSWebsocket.instance.socket.call("RemoveSceneItem", {sceneItemId:sceneItem.itemId, sceneName:vo.obsItemPath.sceneName});
			}

			await this.$nextTick();
			gsap.from(this.$refs["error"] as HTMLDivElement, {duration:.5, ease:"back.out", padding:0, height:0, delay:.5});
		}
	}

	public deleteDistorsion(data:TwitchatDataTypes.HeatDistortionData):void {
		const holder = this.$refs["distortion_"+data.id] as Vue[];
		gsap.to(holder[0].$el, {height:0, paddingTop:0, paddingBottom:0, duration:.35, ease:"back.in", onComplete:()=>{
			(async()=> {
				this.$store.heat.deleteDistorsion(data);
			})();
		}});
	}

}
</script>

<style scoped lang="less">
.overlayparamsheatdistort{
	.maximumReached {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		background-color: var(--color-premium-fader);
		.icon {
			height: 1em;
			margin-right: .5em;
		}
		.label {
			text-align: center;
			white-space: pre-line;
			line-height: 1.25em;
		}
	}
	
	&.alert {
		align-items: center;
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