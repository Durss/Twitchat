<template>
	<div class="paramsvalues parameterContent">
		<Icon name="placeholder" class="icon" />

		<div class="head">
			<i18n-t scope="global"  tag="p" keypath="values.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()" target="_blank">{{ $t("values.header_link_trigger") }}</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!showForm">
			<Button icon="add" @click="showForm = true" v-if="canCreateValues" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'values_create'}">{{ $t('values.addBt') }}</Button>
			<div class="card-item secondary" v-else-if="$store.auth.isPremium">{{ $t("values.max_values_reached", {COUNT:maxValues}) }}</div>
			<template v-else>
				<div class="card-item secondary">{{ $t("error.max_values", {COUNT:maxValues}) }}</div>
				<Button slot="footer" class="item" icon="premium" premium big @click="openPremium()">{{ $t("premium.become_premiumBt") }}</Button>
			</template>
		</section>

		<section class="card-item" v-if="showForm">
			<form @submit.prevent="createValue()">
				<ParamItem :paramData="param_title" :errorMessage="$t('values.form.name_conflict')" />
				<ParamItem :paramData="param_value" />
				<ParamItem :paramData="param_more" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'values_form_more'}">
					<ParamItem class="child" noBackground :paramData="param_userSpecific" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'values_form_more_peruser'}" />
					<ParamItem class="child" noBackground :paramData="param_placeholder" />
				</ParamItem>
				<div class="ctas">
					<Button type="button" icon="cross" alert @click="cancelForm()">{{ $t('global.cancel') }}</Button>
					<Button type="submit" v-if="!editedValue" icon="add" :disabled="param_title.value.length == 0 || param_title.error || param_placeholder.error">{{ $t('global.create') }}</Button>
					<Button type="submit" v-else icon="edit" :disabled="param_title.value.length == 0 || param_title.error || param_placeholder.error">{{ $t('values.editBt') }}</Button>
				</div>
			</form>
		</section>

		<ToggleBlock class="valueEntry" :open="false" noArrow
		v-if="valueEntries.length > 0"
		v-for="entry in valueEntries" :key="entry.value.id"
		:title="entry.value.name">
		
			<template #right_actions>
				<div class="actions">
					<Button class="actionBt" v-tooltip="$t('values.editBt')" icon="edit" @click.stop="editValue(entry.value)" />
					<Button class="actionBt" alert icon="trash" @click.stop="deleteValue(entry)" />
				</div>
			</template>

			<div class="content">
				<ParamItem class="value" v-if="!entry.value.perUser"
					:paramData="entry.param"
					@change="onChangeValue(entry)" />
				
				<div class="userList" v-else>
					<template v-if="Object.keys(entry.value.users ?? {}).length > 0">
						<div class="search">
							<input type="text" :placeholder="$t('values.form.search')" v-model="search[entry.value.id]" @input="searchUser(entry.value)">
							<Icon name="loader" class="loader" v-show="idToLoading[entry.value.id] === true" />
						</div>
							
						<Button class="resetBt" v-if="search[entry.value.id].length === 0"
							secondary
							@click="resetUsers(entry)">{{ $t('values.form.reset_all_users') }}</Button>
						
						<Button class="clearBt" v-if="search[entry.value.id].length === 0"
							alert
							@click="clearUsers(entry)">{{ $t('values.form.clear_all_users') }}</Button>
						
						<Button class="loadAllBt" v-if="search[entry.value.id].length === 0 && idToAllLoaded[entry.value.id] !== true"
							@click="loadUsers(entry)"
							:loading="idToLoading[entry.value.id]">{{ $t('values.form.load_all_users') }}</Button>
	
						<div class="noResult" v-if="idToNoResult[entry.value.id] === true">{{ $t("values.user_not_found") }}</div>
					</template>

					<span class="noResult" v-else>{{ $t("values.form.no_users") }}</span>

					<template v-if="idToUsers[entry.value.id] && idToUsers[entry.value.id]!.length > 0">
						<div class="sort" v-if="idToUsers[entry.value.id]!.filter(v=>v.hide !== true).length > 1">
							<button>{{$t("values.form.username")}}</button>
							<button>{{$t("values.form.userValue")}}</button>
						</div>
						<InfiniteList class="scrollableList"
						:dataset="idToUsers[entry.value.id]!.filter(v=>v.hide !== true)"
						:itemSize="100"
						:itemMargin="3"
						lockScroll
						v-slot="{ item } : {item:UserEntry}">
							<div class="card-item userItem">
								<div class="infos">
									<div class="head">
										<img :src="item.user.avatarPath" class="avatar" v-if="item.user.avatarPath">
										<a :href="'https://twitch.tv/'+item.user.login" class="login" target="_blank">{{ item.user.displayNameOriginal }}</a>
									</div>
									<ParamItem class="value" noBackground
										:paramData="item.param"
										@input="onChangeValue(entry, item)" />
								</div>
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
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { reactive, watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
		ToggleBlock,
		InfiniteList,
	},
	emits:[]
})
 class ParamsValues extends Vue implements IParameterContent {

	public showForm:boolean = false;
	public timeoutSearch:number = -1;
	public timeoutEdit:number = -1;
	public editedValue:TwitchatDataTypes.ValueData|null = null;
	public idToUsers:{[key:string]:UserEntry[]|null} = {};
	public idToNoResult:{[key:string]:boolean} = {};
	public idToLoading:{[key:string]:boolean} = {};
	public idToAllLoaded:{[key:string]:boolean} = {};
	public search:{[key:string]:string} = {};

	public param_title:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:50, labelKey:"values.form.name"};
	public param_value:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", labelKey:"values.form.value"};
	public param_more:TwitchatDataTypes.ParameterData<boolean, any, any> = {type:"boolean", value:false, labelKey:"values.form.more"};
	public param_userSpecific:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"values.form.value_user", icon:"user"};
	public param_placeholder:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:20, labelKey:"values.form.placholder", icon:"broadcast", tooltipKey:"values.form.placholder_tt", allowedCharsRegex:"A-z0-9_"};

	public get maxValues():number { return this.$store.auth.isPremium? Config.instance.MAX_VALUES_PREMIUM : Config.instance.MAX_VALUES; }
	public get canCreateValues():boolean { return this.$store.values.valueList.length < this.maxValues; }

	public get valueEntries():ValueEntry[] {
		const list = this.$store.values.valueList;
		return list.map((v):ValueEntry => {
			return {
					value:v,
					param:reactive({type:'string', value:v.value, labelKey:'values.form.value'})
				}
		});
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
		for (let i = 0; i < this.valueEntries.length; i++) {
			const element = this.valueEntries[i];
			this.search[element.value.id] = "";
		}

		watch(()=> this.param_title.value, ()=> {
			const values = this.$store.values.valueList;
			const name = this.param_title.value.toLowerCase();
			let exists = false;
			for (let i = 0; i < values.length; i++) {
				const c = values[i];
				if(c.id == this.editedValue?.id) continue;
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
			const values = this.$store.values.valueList;
			const placeholder = this.param_placeholder.value.toLowerCase();
			let exists = false;
			for (let i = 0; i < values.length; i++) {
				const c = values[i];
				if(c.id == this.editedValue?.id) continue;
				if(c.placeholderKey.toLowerCase() === placeholder) {
					exists = true;
					continue;
				}
			}
			this.param_placeholder.error = exists;
			this.param_placeholder.errorMessage = exists? this.$t("values.form.placeholder_conflict") : '';
		})
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Create a new Value
	 */
	public createValue(): void {
		let placeholderKey = this.param_placeholder.value;
		if(!placeholderKey){
			//No placeholder define, create a default one from the value's name
			placeholderKey = Utils.slugify(this.param_title.value).toUpperCase();
			//Load all placeholders
			let hashmap:{[key:string]:boolean} = {};
			for (let i = 0; i < this.valueEntries.length; i++) {
				const c = this.valueEntries[i];
				if(this.editedValue && c.value.id == this.editedValue.id) continue;
				hashmap[c.value.placeholderKey] = true;
			}
			//If a placeholder with the same name exists, add an increment suffix
			//until a slot is available
			if(hashmap[placeholderKey]) {
				let index = 1;
				while(hashmap[placeholderKey+"_"+index]) index ++;
				placeholderKey = placeholderKey+"_"+index;
			}
		}

		const data:TwitchatDataTypes.ValueData = {
			id:this.editedValue? this.editedValue.id : Utils.getUUID(),
			placeholderKey,
			name:this.param_title.value,
			value:this.param_value.value,
			perUser:this.param_userSpecific.value,
		};
		if(this.editedValue) {
			this.editedValue = null;
			this.$store.values.editValueParams(data.id, data);
		}else{
			this.$store.values.addValue(data);
		}
		this.showForm = false;
		this.cancelForm();
	}

	/**
	 * Called when editing the value of an existing value
	 */
	public onChangeValue(entry:ValueEntry, userEntry?:UserEntry):void {
		clearTimeout(this.timeoutEdit);
		this.timeoutEdit = setTimeout(() => {
			if(userEntry) {
				entry.value.users![ userEntry.user.id ] = userEntry.param.value;
			}else{
				entry.value.value = entry.param.value;
			}
			this.$store.values.updateValue(entry.value.id, entry.value.value);
		}, 250);
	}

	/**
	 * Called when requesting to delete a value
	 * @param entry 
	 */
	public deleteValue(entry:ValueEntry):void {
		this.$confirm(this.$t("values.delete_confirm.title"), this.$t("values.delete_confirm.desc")).then(()=>{
			this.$store.values.delValue(entry.value);
		}).catch(()=>{/* ignore */});
	}

	/**
	 * Start a value edition
	 */
	public editValue(c:TwitchatDataTypes.ValueData):void {
		this.editedValue = c;
		this.showForm = true;
		this.param_title.value = c.name;
		this.param_value.value = c.value;
		this.param_placeholder.value = c.placeholderKey;
		this.param_userSpecific.value = c.perUser;
		this.param_more.value = c.perUser;
	}

	/**
	 * Called when canceling value edition
	 */
	public cancelForm():void {
		this.editedValue = null;
		this.showForm = false;
		this.param_title.value = "";
		this.param_value.value = "";
		this.param_placeholder.value = "";
		this.param_placeholder.value = "";
		this.param_userSpecific.value = false;
	}

	/**
	 * Called when clicking premium button
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
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
	public deleteUser(entry:ValueEntry, userEntry:UserEntry):void {
		if(!entry.value.users) return;
		delete entry.value.users[userEntry.user.id];
		this.idToUsers[entry.value.id] = this.idToUsers[entry.value.id]!.filter(v=>v.user.id != userEntry.user.id);
		this.$store.values.updateValue(entry.value.id, entry.value.value);
	}
	
	/**
	 * Search for a user.
	 * If all users are loaded, search within them.
	 * If users are not loaded, query twitch for a user matching current search
	 */
	public searchUser(value:TwitchatDataTypes.ValueData):void {
		let preloadedUsers = this.idToUsers[value.id];
		this.idToNoResult[value.id] = false;
		if(this.search[value.id].length == 0) {
			if(this.idToAllLoaded[value.id] !== true) delete this.idToUsers[value.id];
			else if(preloadedUsers) preloadedUsers.forEach(v=> v.hide = false);
			return;
		}
		//If there are more than 1 loaded users, that's because they've all been loaded
		//In this case, just search there instead of polling from twitch API
		if(this.idToAllLoaded[value.id] === true && preloadedUsers && preloadedUsers.length > 1) {
			let hasResult = false;
			for (let i = 0; i < preloadedUsers.length; i++) {
				const u = preloadedUsers[i];
				u.hide = false;
				if(u.user.login.indexOf(this.search[value.id]) == -1 && u.user.displayNameOriginal.indexOf(this.search[value.id]) == -1) {
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

		this.idToLoading[value.id] = true;

		//Users not loaded yet, search user from Twitch API
		clearTimeout(this.timeoutSearch);
		this.timeoutSearch = setTimeout(async () => {
			const users = await TwitchUtils.loadUserInfo(undefined, [this.search[value.id]]);
			let found = false;
			if(users.length > 0) {
				const u = users[0];
				if(value.users![u.id] != undefined) {
					found = true;
					let v = (value.users && value.users[u.id])? value.users![u.id] : "";
					this.idToUsers[value.id] = [{
							hide:false,
							param:reactive({type:"string", value:v, maxLength:100000}),
							user:this.$store.users.getUserFrom("twitch", this.$store.auth.twitch.user.id, u.id, u.login, u.display_name),
						}];
				}
			}
			this.idToNoResult[value.id] = !found;
			this.idToLoading[value.id] = false;
			
		}, 500);
	}

	/**
	 * Load all users
	 * @param entry 
	 */
	public async loadUsers(entry:ValueEntry):Promise<void> {
		this.idToLoading[entry.value.id] = true;

		clearTimeout(this.timeoutSearch);
		const users = await TwitchUtils.loadUserInfo(Object.keys(entry.value.users!));
		if(users.length > 0) {
			const channelId = this.$store.auth.twitch.user.id;
			const ttUsers:UserEntry[] = users.map((u) => {
				let value = (entry.value.users && entry.value.users[u.id])? entry.value.users![u.id] : "";
				const param:TwitchatDataTypes.ParameterData<string> = reactive({type:'string', longText:true, value});
				const user = this.$store.users.getUserFrom("twitch", channelId, u.id, u.login, u.display_name);
				user.avatarPath = u.profile_image_url;
				const res:UserEntry = { param, user, hide:false };
				return res;
			});
			this.idToAllLoaded[entry.value.id] = true;
			this.idToUsers[entry.value.id] = ttUsers;
		}
		this.idToLoading[entry.value.id] = false;
	}

	/**
	 * Reset all user values to empty string
	 * @param entry 
	 */
	public resetUsers(entry:ValueEntry):void {
		this.$confirm(this.$t("values.reset_users_confirm.title"), this.$t("values.reset_users_confirm.desc"))
		.then(()=>{
			//Reset value data
			for (const key in entry.value.users!) {
				entry.value.users[key] = "";
			}

			//Reset view data
			if(this.idToUsers[entry.value.id]) {
				for (let i = 0; i < this.idToUsers[entry.value.id]!.length; i++) {
					const u = this.idToUsers[entry.value.id]![i];
					u.param.value = "";
				}
			}

			this.$store.values.updateValue(entry.value.id, entry.value.value);
		}).catch(()=>{});
	}

	/**
	 * Clears all users of a value
	 * @param entry 
	 */
	public clearUsers(entry:ValueEntry):void {
		this.$confirm(this.$t("values.delete_users_confirm.title"), this.$t("values.delete_users_confirm.desc"))
		.then(()=>{
			//Reset value data
			entry.value.users = {};
	
			//Reset view data
			this.idToUsers[entry.value.id] = [];
	
			this.$store.values.updateValue(entry.value.id, entry.value.value);
		}).catch(()=>{});
	}
}

interface ValueEntry {
    param: TwitchatDataTypes.ParameterData<string, unknown, unknown>;
    value: TwitchatDataTypes.ValueData;
}

interface UserEntry {
	param:TwitchatDataTypes.ParameterData<string>,
	user:TwitchatDataTypes.TwitchatUser,
	hide:boolean,
}

export default toNative(ParamsValues);
</script>

<style scoped lang="less">
.paramsvalues{

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

			.errorDetails {
				text-align: center;
				margin-top: -.25em;
				&.shrink {
					margin-left: 1.5em;
				}
				.text {
					//Text is inside a sub holder so we can set its font-size without
					//it impacting the margin-left of the holder specified in "em" unit
					font-size: .8em;
				}
			}
		}
	}

	.valueEntry {
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
		}
		:deep(h2) {
			text-align: left;
			margin-right: 1em;
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
					height: 100px;
					.infos {
						display: flex;
						flex-direction: column;
						gap: .5em;
						width: 100%;
						flex-grow: 1;
						.head {
							display: flex;
							flex-direction: row;
							align-items: center;
							gap: .5em;
							.login {
								font-weight: bold;
								flex-grow: 1;
								text-overflow: ellipsis;
								cursor: pointer;
							}
							.avatar {
								height: 100%;
								border-radius: 50%;
								width: 2em;
							}
						}
						.value {
							// flex-basis: 100px;
							height: 50px;
							:deep(textarea) {
								height: 50px;
								resize: none;
							}
						}
					}
					.deleteBt {
						width: 1.5em;
						padding: 1em .5em;
						flex-shrink: 0;
						flex-basis: 1.5em;
						margin-right: -.5em;
						background-color: var(--color-alert);
						height: 100px;
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