<template>
	<ToggleBlock class="overlayparamsheatdistort overlayParamsSection" :title="$t('overlay.heatDistort.title')" :icons="['distort']">

		<div class="holder card-item alert" v-if="!obsConnected">
			<p>{{ $t("heat.need_OBS") }}</p>
			<Button class="button"
				icon="obs"
				light alert
				@click="$store('params').openParamsPage(contentObs)">{{ $t('heat.need_OBS_connectBt') }}</Button>
		</div>
		
		<div class="holder" v-else>
			<div class="header">{{ $t("overlay.heatDistort.description") }}</div>

			<template v-for="(item, index) in distortionList" :key="item.id">
				<HeatDistortParams v-model="distortionList[index]" @delete="deleteDistorsion" @created="distortionCreated" :ref="'distortion_'+item.id" />
			</template>
			
			<Button class="item center" icon="add" primary @click="addDistortion()"
			v-if="distortionList.length < maxEntries">{{ $t("overlay.heatDistort.add_overlay") }}</Button>

			<div class="card-item maximumReached" v-else>
				<p><Icon name="alert" />{{ $t("overlay.heatDistort.max_reached") }}</p>
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
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Icon from '@/components/Icon.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import type { JsonObject } from "type-fest";
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import HeatDistortParams from './heat/HeatDistortParams.vue';
import gsap from 'gsap/all';

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

	public beforeMount():void {
		const json = JSON.parse(DataStore.get(DataStore.OVERLAY_DISTORTIONS) || "[]");
		this.distortionList = json;

		watch(()=>this.distortionList, () => this.saveData(), {deep:true});
	}

	public openHeat():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.HEAT);
	}

	public addDistortion():void {
		const id = Utils.getUUID();
		this.distortionList.push({
			id,
			enabled:true,
			refuseAnon:false,
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
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
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
		 await OBSWebsocket.instance.socket.call("CreateSourceFilter", params);
	}

	public deleteDistorsion(data:TwitchatDataTypes.HeatDistortionData):void {
		const holder = this.$refs["distortion_"+data.id] as Vue[];
		gsap.to(holder[0].$el, {height:0, paddingTop:0, paddingBottom:0, duration:.35, ease:"back.in", onComplete:()=>{
			this.distortionList = this.distortionList.filter(v=>v.id != data.id);

			let sourceName = "";
			if(data.obsItemPath.source.name) sourceName = data.obsItemPath.source.name;
			else if(data.obsItemPath.groupName) sourceName = data.obsItemPath.groupName;
			else if(data.obsItemPath.sceneName) sourceName = data.obsItemPath.sceneName;
			
			//Attempt to cleanup OBS from related filter and sources.
			//Won't work if user changed the filter's name or browser source's name
			//Won't work if user created filter and brower source manually instead of
			//the 1-click install button
			if(data.filterName) {
				OBSWebsocket.instance.socket.call("RemoveSourceFilter", {filterName:data.filterName, sourceName}).catch(()=>{
					console.log("No filter found with given name on givent source", {filterName:data.filterName, sourceName});
				});
			}

			if(data.browserSourceName) {
				OBSWebsocket.instance.socket.call("GetSceneItemId", {sceneName:data.obsItemPath.sceneName, sourceName:data.browserSourceName})
				.then(res => {
					if(res.sceneItemId) {
						OBSWebsocket.instance.socket.call("RemoveSceneItem", {sceneName:data.obsItemPath.sceneName, sceneItemId:res.sceneItemId});
					}
				}).catch(()=> {
					console.log("No source found on given scene for given ID", {sceneName:data.obsItemPath.sceneName, sourceName:data.browserSourceName});
				})
			}
		}});
	}

	public saveData():void {
		DataStore.set(DataStore.OVERLAY_DISTORTIONS, this.distortionList);
		for (let i = 0; i < this.distortionList.length; i++) {
			const data = {
				params:(this.distortionList[i] as unknown) as JsonObject
			}
			PublicAPI.instance.broadcast(TwitchatEvent.DISTORT_OVERLAY_PARAMETERS, data);
		}
	}

}
</script>

<style scoped lang="less">
.overlayparamsheatdistort{
	.holder{
		.maximumReached {
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;
			background-color: var(--color-secondary-fader);
		}

		&.alert {
			align-items: center;
		}
	}
}
</style>