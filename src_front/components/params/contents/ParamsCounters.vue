<template>
	<div class="paramscounters parameterContent">
		<Icon name="count" class="icon" />

		<div class="head">
			<i18n-t scope="global"  tag="p" keypath="counters.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()" target="_blank">{{ $t("counters.header_link_trigger") }}</a>
				</template>
				<template #LINK_OVERLAY>
					<a @click="openOverlays()" target="_blank">{{ $t("counters.header_link_overlay") }}</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!showForm">
			<Button icon="add" @click="showForm = true" v-if="canCreateCounters">{{ $t('counters.addBt') }}</Button>
			<div class="card-item alert premiumLimit" v-else>
				<span>{{$t("triggers.premium_limit", {MAX:$config.MAX_TRIGGERS, MAX_PREMIUM:$config.MAX_TRIGGERS_PREMIUM})}}</span>
				<Button icon="premium" premium @click="openPremium()">{{ $t("premium.become_premiumBt") }}</Button>
			</div>
		</section>

		<section class="card-item primary examples" v-if="!showForm && counterEntries.length == 0">
			<h1>{{ $t("counters.examples") }}</h1>
			<OverlayCounter class="counterExample" embed :staticCounterData="counterExample" />
			<OverlayCounter class="counterExample" embed :staticCounterData="progressExample" />
		</section>

		<section class="card-item" v-if="showForm">
			<form @submit.prevent="createCounter()">
				<ParamItem :paramData="param_title" :errorMessage="$t('counters.form.name_conflict')" />
				<ParamItem :paramData="param_value" />
				<ParamItem :paramData="param_more" v-model="param_more.value" />
				<div class="ctas">
					<Button type="button" icon="cross" alert @click="cancelForm()">{{ $t('global.cancel') }}</Button>
					<Button type="submit" v-if="!editedCounter" icon="add" :disabled="param_title.value.length == 0 || param_title.error || param_placeholder.error">{{ $t('global.create') }}</Button>
					<Button type="submit" v-else icon="edit" :disabled="param_title.value.length == 0 || param_title.error || param_placeholder.error">{{ $t('counters.editBt') }}</Button>
				</div>
			</form>
		</section>

		<ToggleBlock class="counterEntry"
		v-if="counterEntries.length > 0"
		v-for="entry in counterEntries"
		:open="false" noArrow
		:key="entry.counter.id"
		:title="entry.counter.name">
		
			<template #right_actions>
				<div class="actions">
					<template v-if="entry.counter.enabled !== false">
						<span class="info loop" v-tooltip="$t('counters.loop_tt')" v-if="entry.counter.loop"><Icon name="loop" alt="loop" /></span>
						<span class="info min" v-tooltip="$t('counters.min_tt')" v-if="entry.counter.min !== false"><Icon name="min" alt="min" />{{ entry.counter.min }}</span>
						<span class="info max" v-tooltip="$t('counters.max_tt')" v-if="entry.counter.max !== false"><Icon name="max" alt="max" />{{ entry.counter.max }}</span>
						<span class="info user" v-tooltip="$t('counters.user_tt')" v-if="entry.counter.perUser"><Icon name="user" alt="user" /> {{ Object.keys(entry.counter.users ?? {}).length }}</span>
						<Button class="actionBt" v-tooltip="$t('counters.editBt')" icon="edit" @click.stop="editCounter(entry.counter)" />
					</template>
					<div class="toggle" v-else @click="toggleCounterState(entry.counter)">
						<ToggleButton v-model="entry.counter.enabled" />
					</div>
					<Button class="actionBt" alert icon="trash" @click.stop="deleteCounter(entry)" />
				</div>
			</template>

			<div class="content">

				<ParamItem class="value" v-if="!entry.counter.perUser"
					:paramData="entry.param"
					v-model="entry.param.value"
					@change="onChangeValue(entry)" />
				
				<div class="userList" v-else>
					<template v-if="Object.keys(entry.counter.users ?? {}).length > 0">
						<div class="search">
							<input type="text" :placeholder="$t('counters.form.search')"
								v-model="search[entry.counter.id]" @input="searchUser(entry.counter)">
							<Icon name="loader" class="loader" v-show="idToLoading[entry.counter.id] === true" />
						</div>
							
						<Button class="resetBt" v-if="search[entry.counter.id].length === 0"
							secondary
							@click="resetUsers(entry)">{{ $t('counters.form.reset_all_users') }}</Button>
						
						<Button class="clearBt" v-if="search[entry.counter.id].length === 0"
							alert
							@click="clearUsers(entry)">{{ $t('counters.form.clear_all_users') }}</Button>
						
						<Button class="loadAllBt" v-if="search[entry.counter.id].length === 0 && idToAllLoaded[entry.counter.id] !== true"
							@click="loadUsers(entry)"
							:loading="idToLoading[entry.counter.id]">{{ $t('counters.form.load_all_users') }}</Button>
	
						<div class="noResult" v-if="idToNoResult[entry.counter.id] === true">{{ $t("counters.user_not_found") }}</div>
					</template>

					<span class="noResult" v-else>{{ $t("counters.form.no_users") }}</span>

					<template v-if="idToUsers[entry.counter.id] && idToUsers[entry.counter.id]!.length > 0">
						<div class="sort" v-if="idToUsers[entry.counter.id]!.filter(v=>v.hide !== true).length > 1">
							<button @click="sortOn(entry, 'name')">
								{{$t("counters.form.sort_name")}}
								<template v-if="sortType[entry.counter.id]==='name'">{{ sortDirection[entry.counter.id] == 1? "▼" : "▲" }}</template>
							</button>
							<button @click="sortOn(entry, 'points')">
								{{$t("counters.form.sort_points")}}
								<template v-if="sortType[entry.counter.id]==='points'">{{ sortDirection[entry.counter.id] == 1? "▼" : "▲" }}</template>
							</button>
						</div>
						<InfiniteList class="scrollableList"
						:dataset="idToUsers[entry.counter.id]!.filter(v=>v.hide !== true)"
						:itemSize="50"
						:itemMargin="3"
						lockScroll
						v-slot="{ item } : {item:UserEntry}">
							<div class="card-item userItem">
								<img :src="item.user.avatarPath" class="avatar" v-if="item.user.avatarPath">
								<a :href="'https://twitch.tv/'+item.user.login" class="login" target="_blank">{{ item.user.displayNameOriginal }}</a>
								<ParamItem class="value" noBackground
									:paramData="item.param"
									@input="onChangeValue(entry, item)" />
								<button class="deleteBt" @click="deleteUser(entry, item)"><Icon name="trash" theme="light" /></button>
							</div>
						</InfiniteList>
					</template>
				</div>
			</div>
		</ToggleBlock>

	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import InfiniteList from '@/components/InfiniteList.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import OverlayCounter from '@/components/overlays/OverlayCounter.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { reactive, watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';
import ToggleButton from '@/components/ToggleButton.vue';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
		ToggleBlock,
		InfiniteList,
		ToggleButton,
		OverlayCounter,
	},
	emits:[]
})
class ParamsCounters extends Vue implements IParameterContent {

	public showForm:boolean = false;
	public timeoutSearch:number = -1;
	public timeoutEdit:number = -1;
	public editedCounter:TwitchatDataTypes.CounterData|null = null;
	public idToUsers:{[key:string]:UserEntry[]|null} = {};
	public idToNoResult:{[key:string]:boolean} = {};
	public idToLoading:{[key:string]:boolean} = {};
	public idToAllLoaded:{[key:string]:boolean} = {};
	public sortType:{[key:string]:"name"|"points"} = {};
	public sortDirection:{[key:string]:1|-1} = {};
	public search:{[key:string]:string} = {};
	public counterExample:TwitchatDataTypes.CounterData = {
		id:Utils.getUUID(),
		placeholderKey:"",
		loop:false,
		perUser:false,
		value:50,
		name:"My awesome counter",
		min:false,
		max:false,
	}
	public progressExample:TwitchatDataTypes.CounterData = {
		id:Utils.getUUID(),
		placeholderKey:"",
		loop:false,
		perUser:false,
		value:50,
		name:"My awesome counter",
		min:0,
		max:75,
	}

	public param_title:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:50, labelKey:"counters.form.name"};
	public param_value:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, min:Number.MIN_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, labelKey:"counters.form.value"};
	public param_more:TwitchatDataTypes.ParameterData<boolean, any, any> = {type:"boolean", value:false, labelKey:"counters.form.more"};
	public param_valueMin_toggle:TwitchatDataTypes.ParameterData<boolean, any, any> = {type:"boolean", value:false, labelKey:"counters.form.value_min", icon:"min"};
	public param_valueMin_value:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0};
	public param_valueMax_toggle:TwitchatDataTypes.ParameterData<boolean, any, any> = {type:"boolean", value:false, labelKey:"counters.form.value_max", icon:"max"};
	public param_valueMax_value:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0};
	public param_valueLoop_toggle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"counters.form.value_loop", icon:"loop"};
	public param_userSpecific:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"counters.form.value_user", icon:"user"};
	public param_placeholder:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:20, labelKey:"counters.form.placholder", icon:"broadcast", tooltipKey:"counters.form.placholder_tt", allowedCharsRegex:"A-z0-9_"};


	public get counterEntries():CounterEntry[] {
		const list = this.$store.counters.counterList;
		return list.map((v) => {
			const min = v.min == false ? Number.MIN_SAFE_INTEGER : v.min as number;
			const max = v.min == false ? Number.MAX_SAFE_INTEGER : v.max as number;
			return {
					counter:v,
					param:reactive({type:'number', value:v.value, min, max, labelKey:'counters.form.value'})
				}
		});
	}

	public get canCreateCounters():boolean {
		if(this.$store.auth.isPremium) return true;
		const count = this.$store.counters.counterList.filter(v=>v.enabled != false).length;
		return count < this.$config.MAX_COUNTERS;
	}

	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

	public getUserFromID(id:string):TwitchatDataTypes.TwitchatUser {
		return this.$store.users.getUserFrom("twitch", this.$store.auth.twitch.user.id, id);
	}

	public openOverlays():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS);
	}

	public mounted(): void {
		this.param_more.children = [this.param_valueMax_toggle, this.param_valueMin_toggle, this.param_valueLoop_toggle, this.param_userSpecific, this.param_placeholder];
		this.param_valueMin_toggle.children = [this.param_valueMin_value];
		this.param_valueMax_toggle.children = [this.param_valueMax_value];

		for (let i = 0; i < this.counterEntries.length; i++) {
			const element = this.counterEntries[i];
			this.sortType[element.counter.id] = "points";
			this.sortDirection[element.counter.id] = -1;
			this.search[element.counter.id] = "";
		}

		watch(()=> this.param_title.value, ()=> {
			const counters = this.$store.counters.counterList;
			const name = this.param_title.value.toLowerCase();
			let exists = false;
			for (let i = 0; i < counters.length; i++) {
				const c = counters[i];
				if(c.id == this.editedCounter?.id) continue;
				if(c.name.toLowerCase() === name) {
					exists = true;
					continue;
				}
			}
			this.param_title.error = exists;
		})

		watch(()=> this.param_placeholder.value, ()=> {
			if(!this.param_placeholder.value) {
				this.param_placeholder.error = false;
				return;
			}
			//Check if a placeholder with the same name already exists
			const counters = this.$store.counters.counterList;
			const placeholder = this.param_placeholder.value.toLowerCase();
			let exists = false;
			for (let i = 0; i < counters.length; i++) {
				const c = counters[i];
				if(c.id == this.editedCounter?.id) continue;
				if(c.placeholderKey && c.placeholderKey.toLowerCase() === placeholder) {
					exists = true;
					continue;
				}
			}
			this.param_placeholder.error = exists;
			this.param_placeholder.errorMessage = exists? this.$t("counters.form.placholder_conflict") : '';
		})
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Opens the premium page
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Create a new counter
	 */
	public createCounter(): void {
		let placeholderKey = this.param_placeholder.value;
		if(!placeholderKey){
			//No placeholder define, create a default one from the counter's name
			placeholderKey = Utils.slugify(this.param_title.value).toUpperCase();
			//Load all placeholders
			let hashmap:{[key:string]:boolean} = {};
			for (let i = 0; i < this.counterEntries.length; i++) {
				const c = this.counterEntries[i];
				if(this.editedCounter && c.counter.id == this.editedCounter.id) continue;
				hashmap[c.counter.placeholderKey] = true;
			}
			//If a placeholder with the same name exists, adds an increment suffix
			//until a slot is available
			if(hashmap[placeholderKey]) {
				let index = 1;
				while(hashmap[placeholderKey+"_"+index]) index ++;
				placeholderKey = placeholderKey+"_"+index;
			}
		}

		const data:TwitchatDataTypes.CounterData = {
			id:this.editedCounter? this.editedCounter.id : Utils.getUUID(),
			placeholderKey,
			name:this.param_title.value,
			value:this.param_value.value,
			max:this.param_valueMax_toggle.value === true? this.param_valueMax_value.value : false,
			min:this.param_valueMin_toggle.value === true? this.param_valueMin_value.value : false,
			loop:this.param_valueLoop_toggle.value,
			perUser:this.param_userSpecific.value,
		};
		if(this.editedCounter) {
			this.editedCounter = null;
			this.$store.counters.updateCounter(data);
		}else{
			this.$store.counters.addCounter(data);
		}
		this.showForm = false;
		this.cancelForm();
	}

	/**
	 * Called when editing the value of an existing counter
	 */
	public onChangeValue(entry:CounterEntry, userEntry?:UserEntry):void {
		clearTimeout(this.timeoutEdit);
		let diff = 0;
		this.timeoutEdit = setTimeout(() => {
			if(userEntry) {
				diff = userEntry.param.value - entry.counter.users![ userEntry.user.id ];
			}else{
				diff = entry.param.value - entry.counter.value;
			}
			this.$store.counters.increment(entry.counter.id, "ADD", diff, userEntry?.user);
		}, 500);
	}

	/**
	 * Called when requesting to delete a counter
	 * @param counter 
	 */
	public deleteCounter(entry:CounterEntry):void {
		this.$confirm(this.$t("counters.delete_confirm.title"), this.$t("counters.delete_confirm.desc")).then(()=>{
			this.$store.counters.delCounter(entry.counter);
		}).catch(()=>{/* ignore */});
	}

	/**
	 * Start a counter edition
	 */
	public editCounter(c:TwitchatDataTypes.CounterData):void {
		this.editedCounter = c;
		this.showForm = true;
		this.param_title.value = c.name;
		this.param_value.value = c.value;
		this.param_placeholder.value = c.placeholderKey;
		this.param_valueMax_toggle.value = c.max !== false;
		this.param_valueMax_value.value = c.max === false? 0 : c.max;
		this.param_valueMin_toggle.value = c.min !== false;
		this.param_valueMin_value.value = c.min === false? 0 : c.min;
		this.param_valueLoop_toggle.value = c.loop;
		this.param_userSpecific.value = c.perUser;
		this.param_more.value = c.loop || c.min !== false || c.max !== false || c.perUser;
	}

	/**
	 * Called when canceling counter edition
	 */
	public cancelForm():void {
		this.editedCounter = null;
		this.showForm = false;
		this.param_title.value = "";
		this.param_value.value = 0;
		this.param_placeholder.value = "";
		this.param_valueMax_toggle.value = false;
		this.param_valueMax_value.value = 0;
		this.param_valueMin_toggle.value = false;
		this.param_valueMin_value.value = 0;
		this.param_valueLoop_toggle.value = false;
		this.param_userSpecific.value = false;
		this.param_more.value = false;

	}

	/**
	 * Open a user's profile info
	 */
	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store.users.openUserCard(user);
	}

	/**
	 * Open a user's profile info
	 */
	public deleteUser(counterEntry:CounterEntry, userEntry:UserEntry):void {
		if(!counterEntry.counter.users) return;
		delete counterEntry.counter.users[userEntry.user.id];
		this.idToUsers[counterEntry.counter.id] = this.idToUsers[counterEntry.counter.id]!.filter(v=>v.user.id != userEntry.user.id);
		this.$store.counters.updateCounter(counterEntry.counter);
	}
	
	/**
	 * Search for a user.
	 * If all users are loaded, search within them.
	 * If users are not loaded, query twitch for a user matching current search
	 */
	public searchUser(counter:TwitchatDataTypes.CounterData):void {
		let preloadedUsers = this.idToUsers[counter.id];
		this.idToNoResult[counter.id] = false;
		if(this.search[counter.id].length == 0) {
			if(this.idToAllLoaded[counter.id] !== true) delete this.idToUsers[counter.id];
			else if(preloadedUsers) preloadedUsers.forEach(v=> v.hide = false);
			return;
		}
		//If there are more than 1 loaded users, that's because they've all been loaded
		//In this case, just search there instead of polling from twitch API
		if(this.idToAllLoaded[counter.id] === true && preloadedUsers && preloadedUsers.length > 1) {
			let hasResult = false;
			for (let i = 0; i < preloadedUsers.length; i++) {
				const u = preloadedUsers[i];
				u.hide = false;
				if(u.user.login.indexOf(this.search[counter.id]) == -1 && u.user.displayNameOriginal.indexOf(this.search[counter.id]) == -1) {
					u.hide = true;
				}else{
					hasResult = true;
				}
			}
			if(hasResult) return;
		}

		if(preloadedUsers) {
			preloadedUsers.forEach(v=> v.hide = true);
		}

		this.idToLoading[counter.id] = true;

		//Users not loaded yet, search user from Twitch API
		clearTimeout(this.timeoutSearch);
		this.timeoutSearch = setTimeout(async () => {
			const users = await TwitchUtils.getUserInfo(undefined, [this.search[counter.id]]);
			let found = false;
			if(users.length > 0) {
				const u = users[0];
				if(counter.users![u.id] != undefined) {
					found = true;
					let value = (counter.users && counter.users[u.id])? counter.users![u.id] : 0;
					this.idToUsers[counter.id] = [{
							hide:false,
							param:reactive({type:"number", value:value, min:counter.min || undefined, max:counter.max || undefined}),
							user:this.$store.users.getUserFrom("twitch", this.$store.auth.twitch.user.id, u.id, u.login, u.display_name),
						}];
				}
			}
			this.idToNoResult[counter.id] = !found;
			this.idToLoading[counter.id] = false;
			
		}, 500);
	}

	/**
	 * Load all users
	 * @param entry 
	 */
	public async loadUsers(entry:CounterEntry):Promise<void> {
		this.idToLoading[entry.counter.id] = true;

		clearTimeout(this.timeoutSearch);
		const users = await TwitchUtils.getUserInfo(Object.keys(entry.counter.users!));
		if(users.length > 0) {
			const channelId = this.$store.auth.twitch.user.id;
			const ttUsers:UserEntry[] = users.map((u) => {
				let value = (entry.counter.users && entry.counter.users[u.id])? entry.counter.users![u.id] : 0;
				const param:TwitchatDataTypes.ParameterData<number> = reactive({type:'number', value, min:entry.counter.min || undefined, max:entry.counter.max || undefined});
				const user = this.$store.users.getUserFrom("twitch", channelId, u.id, u.login, u.display_name);
				user.avatarPath = u.profile_image_url;
				const res:UserEntry = { param, user, hide:false };
				return res;
			});
			this.idToAllLoaded[entry.counter.id] = true;
			this.idToUsers[entry.counter.id] = ttUsers;
			this.sortOn(entry);
		}
		this.idToLoading[entry.counter.id] = false;
	}

	/**
	 * Reset all user counters to 0 or min value
	 * @param entry 
	 */
	public resetUsers(entry:CounterEntry):void {
		this.$confirm(this.$t("counters.reset_users_confirm.title"), this.$t("counters.reset_users_confirm.desc"))
		.then(()=>{
			//Reset counter data
			let value:number = entry.counter.min != false? entry.counter.min : 0;
			for (const key in entry.counter.users!) {
				entry.counter.users[key] = value;
			}

			//Reset view data
			if(this.idToUsers[entry.counter.id]) {
				for (let i = 0; i < this.idToUsers[entry.counter.id]!.length; i++) {
					const u = this.idToUsers[entry.counter.id]![i];
					u.param.value = 0;
				}
			}

			this.$store.counters.updateCounter(entry.counter);
		}).catch(()=>{});
	}

	/**
	 * Clears all users of a counter
	 * @param entry 
	 */
	public clearUsers(entry:CounterEntry):void {
		this.$confirm(this.$t("counters.delete_users_confirm.title"), this.$t("counters.delete_users_confirm.desc"))
		.then(()=>{
			//Reset counter data
			entry.counter.users = {};
	
			//Reset view data
			this.idToUsers[entry.counter.id] = [];
	
			this.$store.counters.updateCounter(entry.counter);
		}).catch(()=>{});
	}

	/**
	 * Sorts users on the requested field.
	 * If sorting is already made on the specified field it reverses the order.
	 * Otherwise it simply sorts on the specified field in the latest order direction
	 * @param entry 
	 * @param type 
	 */
	public sortOn(entry:CounterEntry, type?:"name"|"points"):void {
		if(type) {
			if(this.sortType[entry.counter.id] == type) this.sortDirection[entry.counter.id] = -this.sortDirection[entry.counter.id] as 1|-1;
			else this.sortType[entry.counter.id] = type;
		}
		let users = this.idToUsers[entry.counter.id];
		if(users) {
			users.sort((a,b)=> {
				if(this.sortType[entry.counter.id] == "name") {
					if(a.user.displayNameOriginal.toLowerCase() > b.user.displayNameOriginal.toLowerCase()) return this.sortDirection[entry.counter.id];
					if(a.user.displayNameOriginal.toLowerCase() < b.user.displayNameOriginal.toLowerCase()) return -this.sortDirection[entry.counter.id];
					return 0;
				}
				if(this.sortType[entry.counter.id] == "points") {
					if(a.param.value > b.param.value) return this.sortDirection[entry.counter.id];
					if(a.param.value < b.param.value) return -this.sortDirection[entry.counter.id];
					return 0;
				}
				return 0;
			})
		}
	}

	/**
	 * A counter can be disabled if the user created more counters than allowed
	 * if not also premium. In which case they're invited to disable some counters.
	 * @param counter 
	 */
	public toggleCounterState(counter:TwitchatDataTypes.CounterData):void {
		if(!this.canCreateCounters) {
			this.$store.common.alert(this.$t("counters.premium_cannot_enable", {MAX:this.$config.MAX_COUNTERS, MAX_PREMIUM:this.$config.MAX_COUNTERS_PREMIUM}))
		}else{
			counter.enabled = true;
			this.$store.counters.saveCounters();
		}
	}
}

interface CounterEntry {
    param: TwitchatDataTypes.ParameterData<number, unknown, unknown>;
    counter: TwitchatDataTypes.CounterData;
}

interface UserEntry {
	param:TwitchatDataTypes.ParameterData<number>,
	user:TwitchatDataTypes.TwitchatUser,
	hide:boolean,
}
export default toNative(ParamsCounters);
</script>

<style scoped lang="less">
.paramscounters{

	section {
		display: flex;
		flex-direction: column;
		gap: .5em;
		max-width: 400px;

		form {
			display: flex;
			flex-direction: column;
			gap: .25em;
			.ctas {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: space-evenly;
			}
		}
	}

	.examples{
		text-align: center;
		.counterExample {
			color: var(--color-dark);
			font-size: .5em;
		}
	}

	.premiumLimit {
		.button {
			display: flex;
			margin: auto;
			margin-top: .5em;
		}
	}

	.counterEntry {
		// width: 100%;
		width: calc(100% - 2em);
		max-width: 400px;
		margin: auto;
		.actions {
			gap: .25em;
			display: flex;
			flex-direction: row;
			align-items: center;
			margin: calc(-.5em - 1px);
			align-self: stretch;
			.actionBt {
				width: 1.5em;
				min-width: 1.5em;
				border-radius: 0;
				align-self: stretch;
				&:last-child {
					margin-left: -.25em;//avoid gap between buttons without putting them in a dedicated container
				}
			}
			.toggle {
				background-color: var(--color-alert);
				height: 100%;
				display: flex;
				align-items: center;
				padding: 0 .5em;
				&:hover {
					background-color: var(--color-alert-light);
				}
				* {
					pointer-events: none;
				}
			}
			.icon {
				height: 1em;
				margin-left: .5em;
			}
		}
		:deep(h2) {
			text-align: left;
			margin-right: 1em;
		}

		.info {
			gap: .25em;
			display: flex;
			flex-direction: row;
			cursor: default;
			img {
				height: 1em;
			}
		}
		.content {
			.value {
				border-radius: var(--border-radius);
				min-width: 3em;
				width: 100%;
				:deep(.content) {
					.holder{
						flex-wrap: nowrap;
					}
				}
				:deep(input) {
					font-weight: bold;
					text-align: center;
					flex-basis: unset;
				}
			}

			.userList {
				display: flex;
				flex-direction: column;
				gap: .5em;

				.search {
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
					gap: .5em;
					img {
						width: 1em;
						height: 1em;
					}
				}

				.loadAllBt, .clearBt, .resetBt {
					margin: auto;
				}

				.noResult {
					text-align: center;
					font-style: italic;
				}

				.sort {
					gap: 1px;
					display: flex;
					flex-direction: row;
					button {
						color: var(--color-light);
						border-radius: .5em;
						background-color: var(--color-primary);
						box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
						&:hover {
							background-color: var(--color-primary-light);
						}
					}
					button:nth-child(1) {
						flex-grow: 1;
						border-top-right-radius: 0;
						border-bottom-right-radius: 0;
					}
					button:nth-child(2) {
						flex-basis: 130px;
						text-align: center;
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
					}
				}

				.scrollableList {
					overflow: hidden;
					max-height: 300px;
				}

				.userItem {
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: .5em;
					height: 50px;
					.login {
						font-weight: bold;
						flex-grow: 1;
						text-overflow: ellipsis;
						cursor: pointer;
					}
					.avatar {
						height: 100%;
						border-radius: 50%;
					}
					.value {
						flex-basis: 100px;
					}
					.deleteBt {
						width: 1.5em;
						padding: 1em .5em;
						flex-shrink: 0;
						flex-basis: 1.5em;
						margin-right: -.5em;
						background-color: var(--color-alert);
						img {
							height: 100%;
						}
						&:hover {
							background-color: var(--color-alert-light);
						}
					}
				}
			}
		}
	}
}
</style>