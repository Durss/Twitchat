<template>
	<div class="paramslist">
		<div class="row" v-for="(p, key) in params" :key="key">

			<div :class="getClasses(p, key as string)">
				<ParamItem :paramData="p" noBackground />
				<transition
					@enter="onShowItem"
					@leave="onHideItem"
				>
					<div v-if="p.id == 212 && p.value === true && !isOBSConnected && !isMissingScope(p)" class="card-item alert info obsConnect">
						<img src="@/assets/icons/alert.svg">
						<i18n-t scope="global" class="label" tag="p" keypath="global.obs_connect">
							<template #LINK>
								<a @click="$store('params').openParamsPage(contentObs)">{{ $t("global.obs_connect_link") }}</a>
							</template>
						</i18n-t>
					</div>
				
					<i18n-t v-else-if="p.id == 201 && p.value === true" class="info greetThem" scope="global" tag="div"
					keypath="params.firstMessage_info">
						<template #URL>
							<a href='https://chatters.alxios.com' target='_blank'>chatters.alxios.com</a>
						</template>
					</i18n-t>
					
					<i18n-t v-else-if="p.id == 213 && p.value === true" class="info pronouns" scope="global" tag="div"
					keypath="params.showUserPronouns_based_on">
						<template #URL1>
							<a href='https://pronouns.alejo.io' target='_blank'>Alejo.io</a>
						</template>
						<template #URL2>
							<a href='https://pronoundb.org/' target='_blank'>PronounDB</a>
						</template>
					</i18n-t>
	
					<div v-else-if="p.id == 215 && p.value === true" class="config">
						<PostOnChatParam class="item"
							botMessageKey="shoutout"
							noBackground
							:noToggle="true"
							titleKey="params.chatShoutout_info"
							:placeholders="soPlaceholders"
						/>
					</div>
	
					<div v-else-if="p.id == 216 && p.value === true" class="config">
						<Button small secondary @click="$store('params').openParamsPage(contentSpoiler)">{{$t('global.configure')}}</Button>
					</div>
	
					<div v-else-if="p.id == 217 && p.value === true" class="config">
						<Button small secondary @click="$store('params').openParamsPage(contentAlert)">{{$t('global.configure')}}</Button>
					</div>
	
					<div v-else-if="p.id == 12 && fakeMessageData">
						<ChatMessage class="chatMessage" :messageData="fakeMessageData" contextMenuOff />
					</div>
	
					<div v-else-if="isMissingScope(p) && p.value == true" class="card-item alert info scope">
						<img src="@/assets/icons/lock_fit.svg">
						<p class="label">{{ $t("params.scope_missing") }}</p>
						<Button small alert
							class="grantBt"
							icon="unlock"
							@click="requestPermission(p.twitch_scopes!)">{{ $t('global.grant_scope') }}</Button>
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
import Utils from '@/utils/Utils';

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
	public filteredParams!:TwitchatDataTypes.ParameterData<unknown>[];

	public showAdInfo:boolean = false;
	public fakeMessageData:TwitchatDataTypes.MessageChatData|null = null;
	public soPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [];

	public get isDonor():boolean { return StoreProxy.auth.twitch.user.donor.state; }
	public get isOBSConnected():boolean { return OBSWebsocket.instance.connected && false; }//TODO

	public get params():{[key:string]:TwitchatDataTypes.ParameterData<unknown>} {
		let res:{[key:string]:TwitchatDataTypes.ParameterData<unknown>} = {};
		if(this.filteredParams?.length > 0) {
			for (let i = 0; i < this.filteredParams.length; i++) {
				const p = this.filteredParams[i];
				res[(p.id as number)?.toString()] = p;
			}

		}else{
			if(!this.category) return {};

			for (const key in this.$store("params").$state[this.category]) {
				if(this.$store("params").$state[this.category][key].parent) continue;
				res[key] = (this.$store("params").$state[this.category] as {[key:string]:TwitchatDataTypes.ParameterData<unknown>})[key] as TwitchatDataTypes.ParameterData<unknown>;
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

	public isDisabled(p:TwitchatDataTypes.ParameterData<unknown>):boolean {
		if(p.id == 212 && !this.isOBSConnected) return true;
		if(!TwitchUtils.hasScopes(p.twitch_scopes ?? [])) return true;
		return false;
	}

	public isMissingScope(p:TwitchatDataTypes.ParameterData<unknown>):boolean {
		if(!p.twitch_scopes) return false;
		return !TwitchUtils.hasScopes(p.twitch_scopes);
	}

	public getClasses(p:TwitchatDataTypes.ParameterData<unknown>, key:string):string[] {
		let res = ["item", key];
		if(p.icon) res.push("hasIcon");
		if(p.value === false) res.push("off");
		if(this.isDisabled(p)) res.push("disabled");
		return res;
	}

	public requestPermission(scopes:TwitchScopesString[]):void {
		this.$store("auth").requestTwitchScopes(scopes);
	}

	public async onShowItem(el:Element, done:()=>void):Promise<void> {
		gsap.from(el, {height:0, duration:.2, marginTop:0, ease:"sine.out", clearProps:"all", onComplete:()=>{
			done();
		}});
	}

	public onHideItem(el:Element, done:()=>void):void {
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
			border-radius: .5em;
			background-color: var(--color-light-fader);
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
				z-index: 0;
				border-top-left-radius: .5em;
				border-bottom-left-radius: .5em;
				background-color: var(--color-light-fader);
			}

			&.off {
				background-color: var(--color-secondary-fadest);
			}

			&.disabled {
				background-color: var(--color-alert-fader);
				:deep(label) {
					opacity: .5;
				}
			}

			

			// @colorSize: .5em;
			// &.highlightMods {
			// 	border: 1px solid var(--highlight-mods);
			// 	:deep(label) {
			// 		padding-left: @colorSize;
			// 	}
			// 	&::before {
			// 		border-right: @colorSize solid var(--highlight-mods);
			// 	}
			// }
			// &.highlightVips {
			// 	border: 1px solid var(--highlight-vips);
			// 	:deep(label) {
			// 		padding-left: @colorSize;
			// 	}
			// 	&::before {
			// 		border-right: @colorSize solid var(--highlight-vips);
			// 	}
			// }
			// &.highlightSubs {
			// 	border: 1px solid var(--highlight-subs);
			// 	:deep(label) {
			// 		padding-left: @colorSize;
			// 	}
			// 	&::before {
			// 		border-right: @colorSize solid var(--highlight-subs);
			// 	}
			// }
			// &.highlightPartners {
			// 	border: 1px solid var(--highlight-partners);
			// 	:deep(label) {
			// 		padding-left: @colorSize;
			// 	}
			// 	&::before {
			// 		border-right: @colorSize solid var(--highlight-partners);
			// 	}
			// }
			// &.highlightMentions {
			// 	border: 1px solid var(--highlight-mention);
			// 	:deep(label) {
			// 		padding-left: @colorSize;
			// 	}
			// 	&::before {
			// 		border-right: @colorSize solid var(--highlight-mention);
			// 	}
			// }

			.chatMessage {
				background-color: var(--color-dark);
				padding: 1em;
				border-radius: .5em;
				transition: font-size .25s;
			}
		}
		
		:deep(input[type='range']) {
			width: 100%;
		}

		&:not(:last-child) {
			margin-bottom: 10px;
		}

		.info, .config {
			overflow: hidden;
			padding: 4px;
			margin-left: calc(@iconSize + 10px);
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
					background: red;
				}
			}
	
			&.obsConnect, &.scope {
				margin-left: calc(@iconSize + 10px);
				padding-left: 0;
				text-align: center;
				p {
					font-size: .8em;
				}
				img {
					height: .8em;
					margin-right: .25em;
					vertical-align: middle;
				}
				.grantBt {
					display: flex;
					margin: .5em auto;
				}
			}
	
			&.pronouns, &.spoiler, &.greetThem {
				font-size: .8em;
				opacity: .8;
			}
	
		}
	}
}
</style>