<template>
	<div class="paramsemergency">
		<img src="@/assets/icons/emergency_purple.svg" alt="emergency icon" class="icon">
		
		<p class="head">Perform custom actions to protect yourself in case of a hate raid, doxxing or any other toxic behavior.</p>
		<p class="head small" v-if="param_enable.value === true">Start an emergency with the <img src="@/assets/icons/emergency.svg" class="btExample"> button on the chat bar <i>(see bottom right of screen)</i> or with a chat command</p>
		<ParamItem class="enableBt" :paramData="param_enable" />

		<div class="fadeHolder" :style="holderStyles">
			<section>
				<Splitter class="item splitter">Chat command</Splitter>
				<div class="item label">Allow your mods to trigger the emergency mode from a chat command</div>
				<div class="item">
					<ParamItem :paramData="param_chatCommand" />
					<ToggleBlock title="Allowed users" :open="false" small class="item">
						<PermissionsForm v-model="chatCommandPerms" />
					</ToggleBlock>
				</div>
			</section>

			<section>
				<Splitter class="item splitter">Chat params</Splitter>
				<ParamItem class="item" :paramData="param_enableShieldMode" />
				<div class="twitchParams item">
					<div :class="param_enableShieldMode.value? 'disabled' : ''">
						<ParamItem class="item" :paramData="param_followersOnly" />
						<ParamItem class="item" :paramData="param_subsOnly" />
						<ParamItem class="item" :paramData="param_emotesOnly" />
						<ParamItem class="item" :paramData="param_slowMode" />
					</div>
					<div v-if="param_enableShieldMode.value" class="disabledLabel">Configure these options <a :href="'https://www.twitch.tv/popout/moderator/'+userName+'/shield-mode'" target="_blank">on Twitch</a></div>
				</div>
				<ParamItem class="item" :paramData="param_noTrigger" />
				<ParamItem class="item" :paramData="param_autoTO" />
			</section>

			<section>
				<Splitter class="item splitter">Followbot raid</Splitter>
				<ParamItem class="item" :paramData="param_autoEnableOnFollowbot" />
				<div class="item infos">
					<p>You will get a list of all the users that followed you during an emergency whether this feature is enabled or not.</p>
				</div>
			</section>

			<section>
				<Splitter class="item splitter">OBS params</Splitter>
				<div class="item" v-if="!obsConnected">
					<div class="warn">
						<img src="@/assets/icons/infos.svg" alt="info">
						<p class="label"><a @click="$emit('setContent', contentObs)">Connect with OBS</a> to control scene and sources</p>
					</div>
				</div>
				
				<div v-else class="item">
					<div class="item label">
						<img src="@/assets/icons/list_purple.svg" alt="scene icon" class="icon">
						<p>Select an OBS scene to switch to</p>
					</div>
					<vue-select class="sourceSelector" label="label"
						placeholder="Select a scene..."
						v-model="selectedOBSScene"
						:options="param_obsScene.listValues"
						:calculate-position="$placeDropdown"
						appendToBody
					></vue-select>
					
					<div class="item label">
						<img src="@/assets/icons/show_purple.svg" alt="sources icon" class="icon">
						<p>Select OBS sources to hide<br><i>(ex: streamelements alerts)</i></p>
					</div>
					<vue-select class="sourceSelector" label="sourceName"
						placeholder="Select one or more sources..."
						v-model="selectedOBSSources"
						:options="obsSources_filtered"
						:calculate-position="$placeDropdown"
						appendToBody
						multiple
					></vue-select>
				</div>
			</section>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import gsap from 'gsap';
import { watch, type StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Splitter from '../../Splitter.vue';
import ToggleBlock from '../../ToggleBlock.vue';
import ParamItem from '../ParamItem.vue';
import PermissionsForm from './obs/PermissionsForm.vue';

@Options({
	props:{},
	components:{
		Splitter,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class ParamsEmergency extends Vue {

	public param_enable:TwitchatDataTypes.ParameterData						= {type:"toggle", label:"Enabled", value:false};
	public param_enableShieldMode:TwitchatDataTypes.ParameterData			= {type:"toggle", label:"Enable Twitch shield mode", value:false, icon:"shieldMode_purple.svg"};
	public param_chatCommand:TwitchatDataTypes.ParameterData				= {type:"text", label:"Chat command", value:"!emergency"};
	public param_obsScene:TwitchatDataTypes.ParameterData					= {type:"list", label:"Switch to scene", value:""};
	public param_autoEnableOnFollowbot:TwitchatDataTypes.ParameterData		= {type:"toggle", value:false, label:"Automatically start emergency mode on followbot raid", icon:"follow_purple.svg", tooltip:"A raid is detected when receiving<br>30 follow events with less than<br>0,5s between each follow"};
	public param_slowMode:TwitchatDataTypes.ParameterData					= {type:"toggle", value:false,	label:"Slow mode", icon:"timer_purple.svg"};
	public param_slowModeDuration:TwitchatDataTypes.ParameterData			= {type:"number", value:10, label:"Cooldown (seconds)", max:1800, min:1};
	public param_followersOnly:TwitchatDataTypes.ParameterData				= {type:"toggle", value:false,	label:"Followers only", icon:"follow_purple.svg"};
	public param_followersOnlyDuration:TwitchatDataTypes.ParameterData		= {type:"number", value:30, label:"Must follow your channel for (minutes)", max:129600, min:1};
	public param_subsOnly:TwitchatDataTypes.ParameterData					= {type:"toggle", value:false,	label:"Subs only", icon:"sub_purple.svg"};
	public param_emotesOnly:TwitchatDataTypes.ParameterData					= {type:"toggle", value:false,	label:"Emotes only", icon:"emote_purple.svg"};
	public param_autoTO:TwitchatDataTypes.ParameterData						= {type:"text", longText:true, value:"", label:"Timeout users for 30min (ex: timeout wizebot, streamelements, etc if you don't want them to keep alerting for new followers on your chat)", placeholder:"user1, user2, user3, ...", icon:"timeout_purple.svg"};
	public param_noTrigger:TwitchatDataTypes.ParameterData					= {type:"toggle", value:true, label:"Disable Twitchat triggers (follow, subs, bits, raid)", icon:"broadcast_purple.svg"};
	public obsSources:OBSSourceItem[] = [];	
	public selectedOBSSources:OBSSourceItem[] = [];
	public selectedOBSScene:TwitchatDataTypes.ParameterDataListValue|null = null;
	public chatCommandPerms:TwitchatDataTypes.PermissionsData = {
		broadcaster:true,
		mods:true,
		vips:false,
		subs:false,
		all:false,
		users:"",
	};

	public get holderStyles():StyleValue {
		return {
			opacity:this.param_enable.value === true? 1 : .5,
			pointerEvents:this.param_enable.value === true? "all" : "none",
		};
	}
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OBS; } 
	public get userName():string { return this.$store('auth').twitch.user.login; } 
	
	public get obsSources_filtered():OBSSourceItem[] {
		let sources = this.obsSources.concat();
		sources = sources.filter(v=> {
			return this.selectedOBSSources.find(s => s.sourceName == v.sourceName) == undefined;
		})
		return sources;
	}
	
	public get finalData():TwitchatDataTypes.EmergencyParamsData {
		return {
			enabled:this.param_enable.value as boolean,
			chatCmd:this.param_chatCommand.value as string,
			chatCmdPerms:this.chatCommandPerms,
			noTriggers:this.param_noTrigger.value === true,
			emotesOnly:this.param_emotesOnly.value === true,
			subOnly:this.param_subsOnly.value === true,
			slowMode:this.param_slowMode.value === true,
			followOnly:this.param_followersOnly.value === true,
			followOnlyDuration:this.param_followersOnlyDuration.value as number,
			slowModeDuration:this.param_slowModeDuration.value as number,
			toUsers:this.param_autoTO.value as string,
			obsScene:this.selectedOBSScene? this.selectedOBSScene.value as string : "",
			obsSources:this.selectedOBSSources? this.selectedOBSSources.map(v=>v.sourceName) : [],
			autoEnableOnFollowbot:this.param_autoEnableOnFollowbot.value === true,
			enableShieldMode:this.param_enableShieldMode.value === true,
		};
	}

	public async beforeMount():Promise<void> {
		this.param_enable.value					= this.$store("emergency").params.enabled;
		this.param_noTrigger.value				= this.$store("emergency").params.noTriggers;
		this.param_autoTO.value					= this.$store("emergency").params.toUsers;
		this.param_subsOnly.value				= this.$store("emergency").params.subOnly;
		this.param_emotesOnly.value				= this.$store("emergency").params.emotesOnly;
		this.param_followersOnly.value			= this.$store("emergency").params.followOnly;
		this.param_followersOnlyDuration.value	= this.$store("emergency").params.followOnlyDuration;
		this.param_slowMode.value				= this.$store("emergency").params.slowMode;
		this.param_slowModeDuration.value		= this.$store("emergency").params.slowModeDuration;
		this.param_enableShieldMode.value		= this.$store("emergency").params.enableShieldMode;

		this.param_slowMode.children			= [this.param_slowModeDuration];
		this.param_followersOnly.children		= [this.param_followersOnlyDuration];

		if(this.$store("emergency").params.chatCmd) {
			this.param_chatCommand.value = this.$store("emergency").params.chatCmd;
		}
		if(this.$store("emergency").params.chatCmdPerms) {
			this.chatCommandPerms = this.$store("emergency").params.chatCmdPerms;
		}
		if(this.$store("emergency").params.autoEnableOnFollowbot != undefined) {
			this.param_autoEnableOnFollowbot.value = this.$store("emergency").params.autoEnableOnFollowbot;
		}

		await this.listOBSScenes();
		await this.listOBSSources();

		watch(()=>this.finalData, ()=> {
			this.$store("emergency").setEmergencyParams(this.finalData);
		}, {deep:true});
		
		watch(()=> OBSWebsocket.instance.connected, () => { 
			this.listOBSScenes();
			this.listOBSSources();
		});
	}

	public onShowItem(el:HTMLDivElement, done:()=>void):void {
		gsap.killTweensOf(el);
		//Delay the opening so the animation occurs after the child's animation.
		//this way the user has more chances to see it appear than if all the
		//animations occured at the same time
		gsap.from(el, {height:0, duration:.2, ease:"sine.out", delay:.5, onComplete:()=>{
			done();
		}});
	}

	public onHideItem(el:HTMLDivElement, done:()=>void):void {
		gsap.killTweensOf(el);
		gsap.to(el, {height:0, duration:.2, ease:"sine.out", onComplete:()=>{
			done();
		}});
	}

	/**
	 * List OBS Scenes
	 */
	private async listOBSScenes():Promise<void> {
		if(!OBSWebsocket.instance.connected) return;

		const list:TwitchatDataTypes.ParameterDataListValue[] = [];
		const res = await OBSWebsocket.instance.getScenes();
		for (let i = 0; i < res.scenes.length; i++) {
			const scene = res.scenes[i] as {sceneIndex:number, sceneName:string};
			list.push({label:scene.sceneName, value:scene.sceneName});
		}
		list.sort((a, b) => {
			if(a.label.toLowerCase() < b.label.toLowerCase()) return -1;
			if(a.label.toLowerCase() > b.label.toLowerCase()) return 1;
			return 0;
		});

		this.param_obsScene.listValues = list;
		//Prefill form from storage
		this.selectedOBSScene = list.find(v=>v.value == this.$store("emergency").params.obsScene) ?? null;
	}

	/**
	 * Gets all the available OBS sources and sort them alphabetically
	 */
	private async listOBSSources():Promise<void> {
		try {
			this.obsSources = await OBSWebsocket.instance.getSources();
		}catch(error){
			//
		}
		this.obsSources.sort((a, b) => {
			if(a.sourceName.toLowerCase() < b.sourceName.toLowerCase()) return -1;
			if(a.sourceName.toLowerCase() > b.sourceName.toLowerCase()) return 1;
			return 0;
		});

		//Prefill form from storage
		const list = [];
		for (let i = 0; i < this.obsSources.length; i++) {
			const el = this.obsSources[i];
			if((this.$store("emergency").params.obsSources as string[]).findIndex(v => v === el.sourceName) > -1) {
				list.push(el);
			}
		}
		this.selectedOBSSources = list;
	}
}
</script>

<style scoped lang="less">
.paramsemergency{
	.parameterContent();

	.head {
		margin-bottom: .5em;
		&.small {
			font-size: .8em;
			margin-bottom: 0;
			.btExample {
				height: 1.25em;
				padding: .25em;
				border-radius: .25em;
				background-color: @mainColor_alert;
				vertical-align: middle;
			}
		}
	}

	.enableBt {
		width: min-content;
		margin: auto;
		margin-top: 1.5em;
		margin-bottom: 1.5em;
		border: 1px solid @mainColor_normal;
		border-radius: 1em;
		padding: .5em 1em !important;
		background-color: fade(@mainColor_normal_extralight, 30%);
		:deep(label) {
			white-space: nowrap;
		}
	}

	.fadeHolder {
		transition: opacity .2s;

		section {
			border-radius: .5em;
			background-color: fade(@mainColor_normal_extralight, 30%);
			padding: .5em;
			&:not(:first-of-type) {
				margin-top: 2em;
			}

			.twitchParams {
				position: relative;
				.disabled {
					opacity: .35;
					pointer-events: none;
					// border: 1px solid @mainColor_normal;
					background-color: #fff;
					padding: .5em;
				}
	
				.disabledLabel {
					position: absolute;
					top: 50%;
					text-align: center;
					width: 100%;
					padding: 3em 0;
					transform: translateY(-50%);
					background: radial-gradient(rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0) 80%);
					background-size: 120% 100%;
					background-position-x: 50%;
				}
			}
			
			.warn {
				overflow: hidden;
				padding: .5em;
				padding-left: calc(1em + 10px);
				background-color: @mainColor_light;
				border-radius: .5em;
				margin-bottom: .5em;
				img {
					height: 1em;
					margin-right: .5em;
					vertical-align: middle;
				}
				.label {
					display: inline;
					color: @mainColor_warn;
				}
			}

			.item {
				&:not(:first-child) {
					margin-top: .5em;
				}
				&.splitter {
					margin: .5em 0 1em 0;
				}
				&.label {
					i {
						font-size: .8em;
					}
					.icon {
						width: 1.2em;
						max-height: 1.2em;
						margin-right: .5em;
						margin-bottom: 2px;
						display: inline;
						vertical-align: middle;
					}
					p {
						display: inline;
					}
				}

				&.intro {
					margin-top: 1em;
				}
				
				&.infos {
					font-size: .8em;
					background-color:  @mainColor_light;
					padding: .5em;
					border-radius: .5em;
					// margin-top: 0;
					// overflow: hidden;
					// padding-left: calc(1em + 10px);

					.togglable {
						overflow: hidden;
					}
				}
				:deep(input[type="number"]) {
					width: 90px;
				}
			}
		}
	}

	.sourceSelector {
		:deep(.vs__selected) {
			color: @mainColor_light !important;
			background-color: @mainColor_normal;
			border: none;
			svg {
				fill: @mainColor_light;
			}
		}
	}

	mark {
		font-weight: bold;
		padding: .25em .5em;
		border-radius: .5em;
		font-size: .8em;
		background: fade(@mainColor_normal, 15%);
	}
	
}
</style>