<template>
	<div class="paramslist">
		<h1 v-if="title"><img :src="icon" v-if="icon" class="icon">{{title}}</h1>
		<div class="row" v-for="(p) in params" :key="p.id">

			<!-- Special case for shoutout label -->
			<PostOnChatParam class="row" v-if="p.id==13"
				icon="shoutout_purple.svg"
				botMessageKey="shoutout"
				:noToggle="true"
				title="Shoutout message"
				:placeholders="soPlaceholders"
			/>

			<ParamItem :paramData="p" save />
			
			<transition
				@enter="onShowItem"
				@leave="onHideItem"
			>
				<div v-if="p.id == 212 && p.value === true && !isOBSConnected" class="info obsConnect">
					<img src="@/assets/icons/infos.svg" alt="info">
					<p class="label">This feature needs you to connect on <a @click="$emit('setContent', contentObs)">OBS tab</a></p>
				</div>
				
				<div v-else-if="p.id == 213 && p.value === true" class="info pronouns">
					<p class="label">based on
						<a href='https://pronouns.alejo.io' target='_blank'>Alejo.io</a>
						and
						<a href='https://pronoundb.org/' target='_blank'>PronounDB</a>
					</p>
				</div>

				<div v-else-if="p.id == 215 && p.value === true" class="info config">
					<Button white small title="Configure" @click="$emit('setContent', contentEmergency)" />
				</div>

				<div v-else-if="p.id == 216 && p.value === true" class="info config">
					<Button white small title="Configure" @click="$emit('setContent', contentSpoiler)" />
				</div>

				<div v-else-if="p.id == 217 && p.value === true" class="info config">
					<Button white small title="Configure" @click="$emit('setContent', contentAlert)" />
				</div>
			</transition>
		</div>
	</div>
</template>

<script lang="ts">
import { storeParams } from '@/store/params/storeParams';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import UserSession from '@/utils/UserSession';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import ParamItem from '../ParamItem.vue';
import PostOnChatParam from '../PostOnChatParam.vue';

@Options({
	props:{
		category:String,
		filteredParams:Object,
	},
	components:{
		Button,
		ParamItem,
		PostOnChatParam,
	},
	emits:['setContent'],
})
export default class ParamsList extends Vue {

	public category!:TwitchatDataTypes.ParameterCategory;
	public filteredParams!:TwitchatDataTypes.ParameterData[];

	public showAdInfo:boolean = false;

	private sParams = storeParams();

	public get isDonor():boolean { return UserSession.instance.isDonor; }

	public get title():string {
		switch(this.category) {
			case 'features': return "Features";
			case 'appearance': return "Appearance";
			case 'filters': return "Filters";
		}
		return ""
	}

	public get icon():string {
		let code = "";
		switch(this.category) {
			case 'features': code = "params_purple"; break;
			case 'appearance': code = "show_purple"; break;
			case 'filters': code = "filters_purple"; break;
		}
		if(!code) return "";
		return this.$image("icons/"+code+".svg");
	}

	public get isOBSConnected():boolean {
		return OBSWebsocket.instance.connected;
	}

	public get soPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [
			{
				tag:"USER",
				desc:"User name",
			},
			{
				tag:"URL",
				desc:"User channel URL",
			},
			{
				tag:"TITLE",
				desc:"Last stream's title",
			},
			{
				tag:"CATEGORY",
				desc:"Last stream's category",
			},
		];
	}

	public get params():{[key:string]:TwitchatDataTypes.ParameterData} {
		let res:{[key:string]:TwitchatDataTypes.ParameterData} = {};
		if(this.filteredParams?.length > 0) {
			for (let i = 0; i < this.filteredParams.length; i++) {
				const p = this.filteredParams[i];
				res[(p.id as number)?.toString()] = p;
			}

		}else{
			if(!this.category) return {};

			for (const key in this.sParams.$state[this.category]) {
				if(this.sParams.$state[this.category][key].parent) continue;
				res[key] = (this.sParams.$state[this.category] as {[key:string]:TwitchatDataTypes.ParameterData})[key] as TwitchatDataTypes.ParameterData;
			}
		}
		return res;
	}
	
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.OBS; } 
	public get contentEmergency():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.EMERGENCY; } 
	public get contentSpoiler():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.SPOILER; } 
	public get contentAlert():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.ALERT; } 
	public get contentSponsor():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.SPONSOR; } 

	public onShowItem(el:HTMLDivElement, done:()=>void):void {
		gsap.from(el, {height:0, duration:.2, marginTop:0, ease:"sine.out", onComplete:()=>{
			done();
		}});
	}

	public onHideItem(el:HTMLDivElement, done:()=>void):void {
		gsap.to(el, {height:0, duration:.2, marginTop:0, ease:"sine.out", onComplete:()=>{
			done();
		}});
	}

}
</script>

<style scoped lang="less">
.paramslist{
	h1 {
		text-align: center;
		margin-bottom: 20px;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		.icon {
			height: 1.25em;
			margin-right: .5em;
		}
	}

	.row {
		:deep(input[type='range']) {
			width: 100%;
		}
		&:not(:first-of-type) {
			margin-top: 10px;
		}

		&:not(:last-child) {
			margin-bottom: 10px;
		}

		.info {
			overflow: hidden;
			padding-left: calc(1em + 10px);
			img {
				height: 1em;
				vertical-align: middle;
			}
	
			.label {
				display: inline;
				strong {
					padding: .25em .5em;
					border-radius: .5em;
					font-size: .8em;
					background: fade(@mainColor_normal, 15%);
				}
			}
	
			&.obsConnect {
				.label {
					color: @mainColor_warn;
				}
			}
	
			&.pronouns, &.spoiler {
				.label {
					font-size: .8em;
				}
			}
	
			&.config {
				// text-align: center;
				// margin-top: -8px;
	
				.button {
					border: 1px solid @mainColor_normal;
					border-top: none;
					border-top-left-radius: 0;
					border-top-right-radius: 0;
					position: relative;
					overflow: visible;
				}
			}
		}
	}
}
</style>