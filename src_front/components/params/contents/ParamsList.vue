<template>
	<div class="paramslist">
		<div v-for="(p, key, index) in params"
		:class="highlightId == p.id?.toString()? 'row blinkBorder blink' : 'row blinkBorder'"
		:key="key"
		:ref="'entry_'+p.id"
		v-newflag="(p.storage && (p.storage as any).vnew)? (p.storage as any).vnew : null">
			<div :class="classes[p.id!]" v-if="buildIndex > index">
				<ParamItem :paramData="p" noBackground autoFade v-model="p.value" @change="$store.params.updateParams();">
					<div v-if="p.id == 212 && p.value === true && !isOBSConnected && !missingScopeStates[p.id!]" class="config">
						<div class="card-item alert">
							<Icon name="alert" theme="light" />
							<i18n-t scope="global" class="label" tag="p" keypath="global.obs_connect">
								<template #LINK>
									<a @click="$store.params.openParamsPage(contentConnexions ,subcontentObs)">{{ $t("global.obs_connect_link") }}</a>
								</template>
							</i18n-t>
						</div>
					</div>

					<div v-else-if="p.id == 201 && p.value === true" class="config">
						<Button small secondary icon="date" @click="resetGreetHistory()">{{$t('greet.resetBt')}}</Button>
						<i18n-t class="greetThem" scope="global" tag="div"
						keypath="params.firstMessage_info">
							<template #URL>
								<a href='https://chatters.alxios.com' target='_blank'>chatters.alxios.com</a>
							</template>
						</i18n-t>
					</div>

					<div v-else-if="p.id == 213 && p.value === true" class="config">
						<i18n-t class="pronouns" scope="global" tag="div"
						keypath="params.showUserPronouns_based_on">
							<template #URL1>
								<a href='https://pronouns.alejo.io' target='_blank'>Alejo.io</a>
							</template>
							<template #URL2>
								<a href='https://pronoundb.org/' target='_blank'>PronounDB</a>
							</template>
						</i18n-t>
					</div>

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
						<Button small secondary @click="$store.params.openParamsPage(contentSpoiler)">{{$t('global.configure')}}</Button>
					</div>

					<div v-else-if="p.id == 217 && p.value === true" class="config">
						<Button small secondary @click="$store.params.openParamsPage(contentAlert)">{{$t('global.configure')}}</Button>
					</div>

					<div v-else-if="p.id == 224 && p.value === true" class="config">
						<Button small secondary
						v-newflag="{date:1695691108070, id:'params_clearHistory'}"
						@click="$store.chat.clearHistory()" icon="trash">{{$t('params.clearHistory')}}</Button>
					</div>

					<div v-else-if="missingScopeStates[p.id!] && p.value == true" class="config">
						<div class="card-item alert">
							<Icon name="lock_fit" theme="light" />
							<p class="label">{{ $t("params.scope_missing") }}</p>
							<Button small alert light
							class="grantBt"
							icon="unlock"
							@click.capture.stop="requestPermission(p.twitch_scopes!)">{{ $t('global.grant_scope') }}</Button>
						</div>
					</div>
				</ParamItem>
				
				<div v-if="p.id == 12 && fakeMessageData" class="config">
					<ChatMessage class="chatMessage" :messageData="fakeMessageData" contextMenuOff />
				</div>
			</div>

		</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import type { TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TTButton from '../../TTButton.vue';
import ParamItem from '../ParamItem.vue';
import PostOnChatParam from '../PostOnChatParam.vue';
import type IParameterContent from './IParameterContent';
import { watch } from 'vue';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
		ChatMessage,
		PostOnChatParam,
	},
	emits:[],
})
class ParamsList extends Vue implements IParameterContent {

	@Prop
	public category!:TwitchatDataTypes.ParameterCategory;
	@Prop
	public filteredParams!:TwitchatDataTypes.ParameterData<unknown>[];

	public buildIndex:number = 0;
	public showAdInfo:boolean = false;
	public highlightId:string = "";
	public fakeMessageData:TwitchatDataTypes.MessageChatData|null = null;
	public soPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [];
	public classes:{[key:number]:string[]} = [];
	public disabledStates:{[key:number]:boolean} = {};
	public missingScopeStates:{[key:number]:boolean} = {};

	private buildInterval:number = -1;
	private buildBatch:number = 15;

	public get isOBSConnected():boolean { return OBSWebsocket.instance.connected; }

	public get params():{[key:string]:TwitchatDataTypes.ParameterData<unknown>} {
		let res:{[key:string]:TwitchatDataTypes.ParameterData<unknown>} = {};
		if(this.filteredParams?.length > 0) {
			for (const p of this.filteredParams) {
				res[(p.id as number)?.toString()] = p;
			}

		}else{
			if(!this.category) return {};

			for (const key in this.$store.params.$state[this.category]) {
				const cat = this.$store.params.$state[this.category];
				if(this.category == "appearance" || this.category == "features") {
					const param = cat[key as keyof typeof cat] as TwitchatDataTypes.ParameterData<unknown>;
					if(param.parent) continue;
					res[key] = param;
				}
			}
		}
		return res;
	}

	public get subcontentObs():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }
	public get contentSpoiler():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.SPOILER; }
	public get contentAlert():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.ALERT; }

	public async beforeMount(): Promise<void> {
		this.buildIndex = 0;
		new Promise((resolve)=> {
			this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			(data)=> {
				this.fakeMessageData = data as TwitchatDataTypes.MessageChatData;
				resolve(null);
			}, false, false);
		});

		const me = this.$store.auth.twitch.user;
		this.soPlaceholders = [
			{
				tag:"USER",
				descKey:"params.chatShoutout_placeholders.user",
				example:me.displayNameOriginal,
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

		watch(()=>this.category, () => { this.startSequentialBuild(); this.computeMissingScopeStates();});
		watch(()=>this.filteredParams, () => { this.startSequentialBuild(); this.computeMissingScopeStates();});
		watch(()=>this.$store.auth.twitch.scopes, () => this.computeMissingScopeStates());

		this.computeMissingScopeStates();
		this.startSequentialBuild();
	}

	public beforeUnmount():void {
		clearInterval(this.buildInterval);
	}

	public onNavigateBack(): boolean { return false; }

	public requestPermission(scopes:TwitchScopesString[]):void {
		this.$store.auth.requestTwitchScopes(scopes);
	}

	public resetGreetHistory():void {
		this.$confirm(this.$t("greet.reset_confirm_title"), this.$t("greet.reset_confirm_description"), null).then(() => {
			this.$store.chat.resetGreetingHistory();
		}).catch(()=>{});
	}

	private startSequentialBuild():void {
		this.buildIndex = this.buildBatch;
		clearInterval(this.buildInterval);
		this.buildInterval = window.setInterval(()=> {
			this.buildIndex ++;
			if(this.buildIndex >= Object.keys(this.params).length) {
				clearInterval(this.buildInterval);

				//If redirecting to a specific params, highlight it
				const param = this.$store.main.tempStoreValue || this.$store.params.currentPageSubContent;
				if(param) {
					this.$nextTick().then(()=> {
						const holders = this.$refs["entry_"+param] as HTMLElement[]
						if(holders) {
							this.highlightId = param as string;
							const holder = holders[0];
							if(holder) {
								const interval = window.setInterval(()=>{
									holder.scrollIntoView({behavior:"auto", block:"center"});
								},30);
								window.setTimeout(() => {
									clearInterval(interval);
								}, 1000);
							}
						}
						this.$store.main.tempStoreValue = "";
						this.$store.params.currentPageSubContent = "";
					})
				}
			}
		}, 30);
	}

	private computeMissingScopeStates():void {
		for (const key in this.params) {
			const p = this.params[key]!;
			const id = this.params[key]!.id!;
			if(p.twitch_scopes) {
				this.missingScopeStates[id] = !TwitchUtils.hasScopes(p.twitch_scopes);
			}else{
				this.missingScopeStates[id] = false;
			}
			this.disabledStates[id] = (p.id == 212 && !this.isOBSConnected) || this.missingScopeStates[id];

			let res = ["item", key];
			if(p.icon) res.push("hasIcon");
			if(p.value === false) res.push("off");
			if(p.premiumOnly === true) res.push("premium");
			if(this.disabledStates[id]) res.push("disabled");
			this.classes[id] = res;
		}
	}

}
export default toNative(ParamsList);
</script>

<style scoped lang="less">
.paramslist{
	padding-top: .25em;
	.row {
		position: relative;
		@iconSize: 1em;

		&>.item {
			padding: .25em;
			position: relative;
			border-radius: .5em;
			background-color: var(--background-color-fader);
			&:not(:first-of-type) {
				margin-top: 10px;
			}
			:deep(.child) {
				width:calc(100% - @iconSize - .5em);
				.holder::before {
					left: -@iconSize - .25em;
				}
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
				background-color: var(--background-color-fadest);
			}

			&.off:not(.premium) {
				background-color: var(--background-color-fadest);
			}

			.chatMessage {
				background-color: var(--background-color-primary);
				padding: .5em;
				border-radius: .5em;
				transition: font-size .25s;
			}
			&.premium {
				background-color: var(--color-premium-fadest);
			}
		}

		&:not(:last-child) {
			margin-bottom: 10px;
		}

		.config {
			overflow: hidden;
			padding: .5em 0 0 0;
			gap: .5em;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
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

			.alert {
				margin-left: calc(@iconSize + .5em);
				text-align: center;
				align-self: stretch;
				p {
					font-size: .8em;
				}
				.icon {
					height: .8em;
					margin-right: .25em;
					vertical-align: middle;
				}
				.grantBt {
					display: flex;
					margin: .5em auto;
				}
			}
			.pronouns, .spoiler, .greetThem {
				font-size: .8em;
				opacity: .9;
			}
		}

		.hasIcon {
			.config {
				padding-left: @iconSize + .5em;
			}
		}

	}
}
</style>
