<template>
	<div class="scopeselector">
		<div class="forced optionList" v-if="param_items_requested.length > 0">
			<p class="head">{{ $tc("login.specific_scope", param_items_requested.length) }}</p>
			<ParamItem class="item" :class="getClasses(p)" v-for="p in param_items_requested" :paramData="p" @change="onSelectionUpdate()" />
		</div>
		
		<Button class="allowMoreBt"
			v-if="!forceFullList && param_items_requested.length > 0"
			:title="$t('login.specific_scope_moreBt')"
			:icon="$image('icons/lock_fit_purple.svg')"
			small white
			@click="expandList()" />

		<div ref="permsList" class="permsHolder" v-if="forceFullList || param_items_requested.length == 0">
			<div class="allBt">
				<ToggleButton class="bt" v-model="allBt" />
			</div>
			<div class="optionList">
				<ParamItem class="item" :class="getClasses(p)" v-for="p in param_items" :paramData="p" @change="onSelectionUpdate()" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import type { TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import ToggleButton from '../ToggleButton.vue';

@Options({
	props:{
		requestedScopes:Array,
	},
	components:{
		Button,
		ParamItem,
		ToggleButton,
	},
	emits:["update"]
})
export default class ScopeSelector extends Vue {

	public requestedScopes!:TwitchScopesString[];

	public allBt:boolean = true;
	public forceFullList:boolean = false;
	public param_items:TwitchatDataTypes.ParameterData[] = [];
	public param_items_requested:TwitchatDataTypes.ParameterData[] = [];

	private debounce:number = -1;

	public getClasses(p:TwitchatDataTypes.ParameterData):string[] {
		let res:string[] = [];
		if(this.requestedScopes?.indexOf(p.storage as TwitchScopesString) > -1) res.push("forced");
		return res;
	}

	public beforeMount():void {
		const scopeToInfos = this.$tm('global.twitch_scopes') as {[key:string]:string};
		const scopes:TwitchScopesString[] = JSON.parse(JSON.stringify(Config.instance.TWITCH_APP_SCOPES));
		const scopeToIcon:{[key:string]:string} = {
			"chat:read": "whispers_purple.svg",
			"chat:edit": "whispers_purple.svg",
			"moderator:manage:announcements": "announcement_purple.svg",
			"whispers:read": "whispers_purple.svg",
			"user:manage:whispers": "whispers_purple.svg",
			"moderator:manage:chat_messages": "trash_purple.svg",
			"moderator:read:chatters": "user_purple.svg",
			"channel:read:redemptions": "channelPoints_purple.svg",
			"channel:manage:polls": "poll_purple.svg",
			"channel:manage:predictions": "prediction_purple.svg",
			"moderator:manage:chat_settings": "lock_purple.svg",
			"channel:moderate": "mod_purple.svg",
			"moderation:read": "mod_purple.svg",
			"channel:manage:moderators": "mod_purple.svg",
			"channel:manage:vips": "vip_purple.svg",
			"channel:manage:raids": "raid_purple.svg",
			"channel:manage:broadcast": "info_purple.svg",
			"channel:read:hype_train": "train_purple.svg",
			"channel:edit:commercial": "coin_purple.svg",
			"channel:read:subscriptions": "sub_purple.svg",
			"user:read:follows": "user_purple.svg",
			"user:read:blocked_users": "block_purple.svg",
			"user:manage:blocked_users": "block_purple.svg",
			"moderator:manage:banned_users": "ban_purple.svg",
			"moderator:manage:automod": "automod_purple.svg",
			"moderator:manage:shield_mode": "shield_purple.svg",
		};
		const disabled:string[] = ["chat:read", "chat:edit", "moderator:manage:announcements"];
		const userScopes = this.$store("auth").twitch.scopes ?? [];
		for (let i = 0; i < disabled.length; i++) {
			if(userScopes.indexOf(disabled[i]) == -1) {
				userScopes.unshift(disabled[i]);
			}
		}

		scopes.sort((a, b)=> {
			if(this.requestedScopes.indexOf(a) > -1) return -1;
			return 0;
		});
		
		const forceSelect = !userScopes || userScopes.length < disabled.length;
		for (let i = 0; i < scopes.length; i++) {
			const s:TwitchScopesString = scopes[i];
			if(this.requestedScopes.indexOf(s) > -1) {
				this.param_items_requested.push({
					label:scopeToInfos[s],
					type:"toggle",
					value:true,
					icon:scopeToIcon[s],
					storage:s,
				});
			}else{
				this.param_items.push({
					label:scopeToInfos[s],
					type:"toggle",
					value:forceSelect? true : (userScopes.findIndex(v=> v == s) > -1),
					icon:scopeToIcon[s],
					disabled:disabled.indexOf(s.toLowerCase()) > -1,
					storage:s,
				});
			}
		}
		this.allBt = forceSelect;
	}

	public mounted(): void {
		watch(()=>this.allBt, ()=> {
			for (let i = 0; i < this.param_items.length; i++) {
				const p = this.param_items[i];
				if(p.disabled === true) continue;
				p.value = this.allBt;
			}
		});

		this.onSelectionUpdate();
	}

	public onSelectionUpdate():void {
		clearTimeout(this.debounce);
		this.debounce = setTimeout(()=> {
			const scopes:string[] = [];
			for (let i = 0; i < this.param_items.length; i++) {
				const p = this.param_items[i];
				if(p.value === true) scopes.push(p.storage as string);
			}
			for (let i = 0; i < this.param_items_requested.length; i++) {
				const p = this.param_items_requested[i];
				if(p.value === true) scopes.push(p.storage as string);
			}
			this.$emit("update", scopes);
		}, 50)
	}

	public async expandList():Promise<void> {
		this.forceFullList = true;

		await this.$nextTick();

		gsap.from(this.$refs.permsList as HTMLDivElement, {height:"1.5em", duration:.5, ease:"sine.inOut", clearProps:"all"});
	}
}
</script>

<style scoped lang="less">
.scopeselector{
	display: flex;
	flex-direction: column;
	gap: .5em;
	align-items: center;

	.permsHolder {
		overflow: hidden;
	}

	.optionList {
		max-height: 250px;
		overflow: auto;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		gap: .25em;
		padding: .25em;
		.item {
			font-size: .8em;
			flex-grow: 1;
			text-align: left;
			border-radius: .5em;
			background-color: fade(@mainColor_normal_extralight, 30%);
			padding: .25em;

			&.forced {
				border: 1px solid @mainColor_normal;
			}
		}

		&.forced {
			background-color: fade(@mainColor_normal, 15%);
			border-radius: .5em;
			padding: .5em;
			.head {
				font-size: .8em;
			}
			.item {
				background-color: @mainColor_light;
			}
		}
	}

	.allowMoreBt {
		border: 1px solid @mainColor_normal;
	}

	.allBt {
		flex-grow: 1;
		width: 100%;
		display: flex;
		padding-right: calc(.25em + 10px);//10px = scrollbar size
		justify-content: flex-end;
		.bt {
			font-size: .8em;
			margin-right: .25em;
		}
	}
	
}
</style>