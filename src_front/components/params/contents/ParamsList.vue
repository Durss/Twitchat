<template>
	<div class="paramslist">
		<div class="row" v-for="(p, key) in params" :key="key">

			<div :class="getClasses(p, key as string)">
				<ParamItem :paramData="p" save />
				<transition
					@enter="onShowItem"
					@leave="onHideItem"
				>
					<div v-if="p.id == 212 && p.value === true && !isOBSConnected && !isMissingScope(p)" class="info obsConnect">
						<img src="@/assets/icons/alert_purple.svg">
						<i18n-t scope="global" class="label" tag="p" keypath="global.obs_connect">
							<template #LINK>
								<a @click="$store('params').openParamsPage(contentObs)">{{ $t("global.obs_connect_link") }}</a>
							</template>
						</i18n-t>
					</div>
				
					<div v-else-if="p.id == 201 && p.value === true" class="info greetThem">
						<i18n-t scope="global" tag="p" class="label"
						keypath="params.firstMessage_info">
							<template #URL>
								<a href='https://chatters.alxios.com' target='_blank'>chatters.alxios.com</a>
							</template>
						</i18n-t>
					</div>
					
					<div v-else-if="p.id == 213 && p.value === true" class="info pronouns">
						<i18n-t scope="global" tag="p" class="label"
						keypath="params.showUserPronouns_based_on">
							<template #URL1>
								<a href='https://pronouns.alejo.io' target='_blank'>Alejo.io</a>
							</template>
							<template #URL2>
								<a href='https://pronoundb.org/' target='_blank'>PronounDB</a>
							</template>
						</i18n-t>
					</div>
	
					<div v-else-if="p.id == 215 && p.value === true" class="info config">
						<PostOnChatParam class="item"
							botMessageKey="shoutout"
							:noToggle="true"
							titleKey="params.chatShoutout_info"
							:placeholders="soPlaceholders"
						/>
					</div>
	
					<div v-else-if="p.id == 216 && p.value === true" class="info config">
						<Button small :title="$t('global.configure')" @click="$store('params').openParamsPage(contentSpoiler)" />
					</div>
	
					<div v-else-if="p.id == 217 && p.value === true" class="info config">
						<Button small :title="$t('global.configure')" @click="$store('params').openParamsPage(contentAlert)" />
					</div>
	
					<div v-else-if="p.id == 12 && fakeMessageData">
						<ChatMessage class="chatMessage" :messageData="fakeMessageData" contextMenuOff />
					</div>
	
					<div v-else-if="isMissingScope(p) && p.value == true" class="info scope">
						<img src="@/assets/icons/lock_fit_purple.svg">
						<p class="label">{{ $t("params.scope_missing") }}</p>
						<Button small highlight
							class="grantBt"
							:title="$t('global.grant_scope')"
							:icon="$image('icons/unlock.svg')"
							@click="requestPermission(p.twitch_scopes!)" />
					</div>
				</transition>
			</div>

		</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import type { TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../Button.vue';
import ParamItem from '../ParamItem.vue';
import PostOnChatParam from '../PostOnChatParam.vue';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Button,
		ParamItem,
		ChatMessage,
		PostOnChatParam,
	},
	emits:[],
})
export default class ParamsList extends Vue implements IParameterContent {

	@Prop
	public category!:TwitchatDataTypes.ParameterCategory;
	@Prop
	public filteredParams!:TwitchatDataTypes.ParameterData[];

	public showAdInfo:boolean = false;
	public fakeMessageData:TwitchatDataTypes.MessageChatData|null = null;
	public soPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [];

	public get isDonor():boolean { return StoreProxy.auth.twitch.user.donor.state; }
	public get isOBSConnected():boolean { return OBSWebsocket.instance.connected; }

	public get params():{[key:string]:TwitchatDataTypes.ParameterData} {
		let res:{[key:string]:TwitchatDataTypes.ParameterData} = {};
		if(this.filteredParams?.length > 0) {
			for (let i = 0; i < this.filteredParams.length; i++) {
				const p = this.filteredParams[i];
				res[(p.id as number)?.toString()] = p;
			}

		}else{
			if(!this.category) return {};

			for (const key in this.$store("params").$state[this.category]) {
				if(this.$store("params").$state[this.category][key].parent) continue;
				res[key] = (this.$store("params").$state[this.category] as {[key:string]:TwitchatDataTypes.ParameterData})[key] as TwitchatDataTypes.ParameterData;
			}
		}
		return res;
	}
	
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; } 
	public get contentEmergency():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.EMERGENCY; } 
	public get contentSpoiler():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPOILER; } 
	public get contentAlert():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ALERT; } 
	public get contentSponsor():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPONSOR; } 

	public async beforeMount(): Promise<void> {
		await new Promise((resolve)=> {
			this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			(data)=> {
				this.fakeMessageData = data as TwitchatDataTypes.MessageChatData;
				resolve(null);
			}, false, false);
		});
		
		const me = this.$store("auth").twitch.user;
		this.soPlaceholders = [
			{
				tag:"USER",
				descKey:"params.chatShoutout_placeholders.user",
				example:me.displayName,
			},
			{
				tag:"URL",
				descKey:"params.chatShoutout_placeholders.user_link",
				example:"twitch.tv/"+me.login,
			},
			{
				tag:"TITLE",
				descKey:"params.chatShoutout_placeholders.stream_title",
				example:"Lorem ipsum",
			},
			{
				tag:"CATEGORY",
				descKey:"params.chatShoutout_placeholders.stream_category",
				example:"Just chatting",
			},
		];
	}

	public onNavigateBack(): boolean { return false; }

	public isDisabled(p:TwitchatDataTypes.ParameterData):boolean {
		if(p.id == 212 && !this.isOBSConnected) return true;
		return false;
	}

	public isMissingScope(p:TwitchatDataTypes.ParameterData):boolean {
		if(!p.twitch_scopes) return false;
		return !TwitchUtils.hasScopes(p.twitch_scopes);
	}

	public getClasses(p:TwitchatDataTypes.ParameterData, key:string):string[] {
		let res = ["item", key];
		if(p.icon) res.push("hasIcon");
		if(this.isDisabled(p)) res.push("disabled");
		return res;
	}

	public requestPermission(scopes:TwitchScopesString[]):void {
		this.$store("auth").requestTwitchScopes(scopes);
	}

	public async onShowItem(el:HTMLDivElement, done:()=>void):Promise<void> {
		gsap.from(el, {height:0, duration:.2, marginTop:0, ease:"sine.out", clearProps:"all", onComplete:()=>{
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
	.row {
		position: relative;
		@iconSize: 1.5em;

		&>.item {
			@defaultBg: fade(@mainColor_normal_extralight, 30%);
			border-radius: .5em;
			background-color: @defaultBg;
			padding: .25em;
			position: relative;
			&:not(:first-of-type) {
				margin-top: 10px;
			}
			:deep(.icon) {
				z-index: 1;
				height: @iconSize;
				width: @iconSize;
			}
			:deep(.child) {
				width:calc(100% - @iconSize - .5em);
				.holder::before {
					left: -@iconSize;
				}
			}
			:deep(.content) {
				align-items: center;
			}
			&.hasIcon::before {
				content: "";
				position: absolute;
				left: 0;
				top: 0;
				width: @iconSize + .5em;
				height: 100%;
				background: @mainColor_light;
				z-index: 0;
				border-top-left-radius: .5em;
				border-bottom-left-radius: .5em;
			}

			&.disabled {
				background-color: fade(@mainColor_dark, 15%);
			}
			

			@colorSize: @iconSize + 1.5em;
			&.highlightMods {
				:deep(label) {
					padding-left: 1em;
				}
				background: linear-gradient(to right, @highlight_mods @colorSize, @defaultBg @colorSize);
			}
			&.highlightVips {
				:deep(label) {
					padding-left: 1em;
				}
				background: linear-gradient(to right, @highlight_vips @colorSize, @defaultBg @colorSize);
			}
			&.highlightSubs {
				:deep(label) {
					padding-left: 1em;
				}
				background: linear-gradient(to right, @highlight_subs @colorSize, @defaultBg @colorSize);
			}
			&.highlightPartners {
				:deep(label) {
					padding-left: 1em;
				}
				background: linear-gradient(to right, @highlight_partners @colorSize, @defaultBg @colorSize);
			}
			&.highlightMentions {
				:deep(label) {
					padding-left: 1em;
				}
				background: linear-gradient(to right, @highlight_mention @colorSize, @defaultBg @colorSize);
			}

			.chatMessage {
				background-color: @mainColor_dark;
				padding: 1em;
				border-radius: .5em;
				transition: font-size .25s;
			}
		}
		
		:deep(input[type='range']) {
			width: 100%;
		}
		
		:deep(input[type='number']) {
			flex-basis: 100px;
		}

		&:not(:last-child) {
			margin-bottom: 10px;
		}

		.info {
			overflow: hidden;
			padding-left: calc(@iconSize + 10px);
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
	
			&.obsConnect, &.scope {
				display: block;
				border-radius: .25em;
				margin: .25em auto;
				background-color: @mainColor_light;
				border: 1px solid @mainColor_alert;
				padding: .25em .5em;
				margin-left: calc(@iconSize + 10px);
				text-align: center;
				p {
					font-size: .8em;
				}
				img {
					height: .8em;
					margin-right: .25em;
					vertical-align: middle;
				}
				a{
					color: @mainColor_alert;
				}
				.grantBt {
					margin: .5em auto;
					display: block;
				}
			}
	
			&.pronouns, &.spoiler, &.greetThem {
				.label {
					font-size: .8em;
				}
			}
	
		}
	}
}
</style>