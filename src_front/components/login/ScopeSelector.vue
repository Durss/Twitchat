<template>
	<div class="scopeselector">
		<div class="forced" v-if="param_items_requested.length > 0">
			<Icon name="unlock" class="unlockIcon" />
			<p class="head">{{ $t("login.specific_scope", param_items_requested.length) }}</p>
			<div class="optionList">
				<ParamItem class="item" :class="getClasses(p)" v-for="p in param_items_requested"
					v-model="p.value"
					:secondary="!p.value"
					:paramData="p"
					@change="onSelectionUpdate()" noBackground />
			</div>
		</div>

		<TTButton v-if="!forceFullList && param_items_requested.length > 0"
			icon="lock_fit"
			small secondary
			@click="expandList()">{{ $t('login.specific_scope_moreBt') }}</TTButton>

		<div ref="permsList" class="permsHolder" v-if="forceFullList || param_items_requested.length == 0">
			<div class="optionList">
				<ParamItem class="item" :class="getClasses(p)" v-for="p in param_items"
					v-model="p.value"
					:secondary="!p.value"
					:paramData="p"
					@change="onSelectionUpdate()"
					noBackground />
			</div>
			<ParamItem class="item all" :paramData="params_all" v-model="params_all.value" @change="onSelectionUpdate()" noBackground />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { TwitchScope2Icon, type TwitchScopesString } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap/gsap-core';
import { watch } from 'vue';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import ToggleButton from '../ToggleButton.vue';
import ParamItem from '../params/ParamItem.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleButton,
	},
	emits:["update"]
})
class ScopeSelector extends Vue {
	@Prop({
			type:Array,
			default:[],
		})
	public requestedScopes!:TwitchScopesString[];

	public forceFullList:boolean = false;
	public params_all:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"login.grant_all"};
	public param_items:TwitchatDataTypes.ParameterData<boolean, unknown, unknown, TwitchScopesString[]>[] = [];
	public param_items_requested:TwitchatDataTypes.ParameterData<boolean, unknown, unknown, TwitchScopesString[]>[] = [];

	private debounce:number = -1;

	public getClasses(p:TwitchatDataTypes.ParameterData<boolean, unknown, unknown, TwitchScopesString[]>):string[] {
		let res:string[] = [];
		if(p.value === true) res.push("selected");
		return res;
	}

	public beforeMount():void {
		this.buildList();
	}

	public mounted(): void {
		watch(()=>this.params_all.value, ()=> {
			for (let i = 0; i < this.param_items.length; i++) {
				const p = this.param_items[i];
				if(p.disabled === true) continue;
				p.value = this.params_all.value;
			}
		});

		watch(()=>this.$store.auth.twitch.scopes, (newVal, oldVal) => {
			this.buildList();
		});

		this.onSelectionUpdate();
	}

	public onSelectionUpdate():void {
		clearTimeout(this.debounce);
		this.debounce = window.setTimeout(()=> {
			const scopes:string[] = [];
			for (let i = 0; i < this.param_items.length; i++) {
				const p = this.param_items[i];
				if(p.value === true) scopes.push(...p.storage || []);
			}
			for (let i = 0; i < this.param_items_requested.length; i++) {
				const p = this.param_items_requested[i];
				if(p.value === true) scopes.push(...p.storage || []);
			}
			this.$emit("update", scopes);
		}, 50)
	}

	public async expandList():Promise<void> {
		this.forceFullList = true;

		await this.$nextTick();

		gsap.from(this.$refs.permsList as HTMLDivElement, {height:"1.5em", duration:.5, ease:"sine.inOut", clearProps:"all"});
	}

	private buildList():void {
		const scopes:TwitchScopesString[] = JSON.parse(JSON.stringify(Config.instance.TWITCH_APP_SCOPES));

		const disabled = Config.instance.MANDATORY_TWITCH_SCOPES;
		const userScopes = this.$store.auth.twitch.scopes ?? [];
		for (let i = 0; i < disabled.length; i++) {
			if(userScopes.indexOf(disabled[i]) == -1) {
				userScopes.unshift(disabled[i]);
			}
		}

		scopes.sort((a, b)=> {
			if(this.requestedScopes.indexOf(a) > -1) return -1;
			return 0;
		});

		const requestedList:TwitchatDataTypes.ParameterData<boolean, unknown, unknown, TwitchScopesString[], unknown>[] = [];
		const availableList:TwitchatDataTypes.ParameterData<boolean, unknown, unknown, TwitchScopesString[], unknown>[] = [];
		const forceSelect = !userScopes || userScopes.length < disabled.length && (!this.requestedScopes || this.requestedScopes.length == 0);
		let allSelected = true;
		for (let i = 0; i < scopes.length; i++) {
			const localScopes:TwitchScopesString[] = scopes[i].split("+") as TwitchScopesString[];
			const requested = localScopes.filter(s=> this.requestedScopes.indexOf(s) > -1);
			if(requested.length > 0) {
				requestedList.push({
					labelKey:"global.twitch_scopes."+localScopes[0],
					type:"boolean",
					value:true,
					icon:TwitchScope2Icon[localScopes[0]],
					iconTheme:"light",
					storage:localScopes,
				});
			}else{
				const selected = forceSelect? true : TwitchUtils.hasScopes(localScopes);
				if(!selected) allSelected = false;
				availableList.push({
					labelKey:"global.twitch_scopes."+localScopes[0],
					type:"boolean",
					value:selected,
					icon:TwitchScope2Icon[localScopes[0]],
					iconTheme:"light",
					disabled:localScopes.filter(s => disabled.indexOf(s) > -1).length > 0,
					storage:localScopes,
				});
			}
		}

		//Move non-granted scopes tot he top
		availableList.sort((a,b)=> {
			if(a.disabled) return -1;
			if(b.disabled) return 1;
			if(a.value && !b.value) return 1;
			if(!a.value && b.value) return -1;
			return 0
		})
		this.params_all.value = allSelected;
		this.param_items_requested = requestedList;
		this.param_items = availableList;
	}
}
export default toNative(ScopeSelector);
</script>

<style scoped lang="less">
.scopeselector{
	gap: .5em;
	display: flex;
	flex-direction: column;
	align-items: center;

	.icon {
		margin: auto;
	}

	.permsHolder {
		overflow: hidden;
	}

	.optionList {
		//Show 8 items and make sure only half of the last item is
		//visible so the user knows there are more items to scroll
		max-height: calc(2em * 8.5);
		overflow: auto;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		gap: .25em;
		padding: .25em;
		margin-bottom: .5em;
		.item {
			width: 100%;
			text-align: left;
			border-radius: .5em;
			color: var(--color-text-light);
			background-color: var(--color-secondary-fader);
			padding: .25em;
			opacity: .7;
			transition: all .2s;
			&.selected {
				opacity: 1;
				background-color: var(--color-primary);
			}
		}
	}

	.forced {
		display: flex;
		flex-direction: column;
		gap: .5em;
		.unlockIcon {
			height: 2em;
		}
	}

	.item.all {
		margin-right: 1.1em;
		:deep(label) {
			text-align: right;
		}
	}
}

@media only screen and (max-width: 600px) {
	.scopeselector{

		.optionList {
			max-height: 50vh;
		}
	}

}
</style>

<style lang="less">
body.light {
	.scopeselector{
		.optionList {
			.item:not(.selected) {
				color: var(--color-text) !important;
				.icon {
					filter:invert();
				}
			}
		}
	}
}
</style>
