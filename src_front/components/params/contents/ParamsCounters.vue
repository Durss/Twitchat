<template>
	<div class="paramscounters">
		<img src="@/assets/icons/count_purple.svg" alt="counter icon" class="icon">

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
			<Button :title="$t('counters.addBt')" :icon="$image('icons/add.svg')" @click="showForm = true" />
		</section>

		<section class="examples" v-if="!showForm && $store('counters').counterList.length == 0">
			<h1>{{ $t("counters.examples") }}</h1>
			<OverlayCounter class="counterExample" embed :staticCounterData="counterExample" />
			<OverlayCounter class="counterExample" embed :staticCounterData="progressExample" />
		</section>

		<section v-if="showForm">
			<form @submit.prevent="createCounter()">
				<ParamItem class="item" :paramData="param_title" />
				<div class="errorDetails" v-if="param_title.error">
					<span class="text">{{ $t("counters.form.name_conflict") }}</span>
				</div>
				<ParamItem class="item" :paramData="param_value" />
				<ParamItem class="item" :paramData="param_more" />
				<div class="errorDetails shrink" v-if="param_placeholder.error">
					<span class="text">{{ $t("counters.form.placholder_conflict") }}</span>
				</div>
				<div class="item ctas">
					<Button type="button" :title="$t('global.cancel')" :icon="$image('icons/cross_white.svg')" highlight @click="cancelForm()" />
					<Button type="submit" v-if="!editedCounter" :title="$t('global.create')" :icon="$image('icons/add.svg')" :disabled="param_title.value.length == 0" />
					<Button type="submit" v-else :title="$t('counters.editBt')" :icon="$image('icons/edit.svg')" :disabled="param_title.value.length == 0" />
				</div>
			</form>
		</section>

		<ToggleBlock class="counterEntry"
		v-if="$store('counters').counterList.length > 0"
		v-for="entry in counterEntries" :key="entry.counter.id"
		:title="entry.counter.name" medium>
		
			<template #right_actions>
				<button class="placholder" @click.stop="copyPlaceholder($event, entry.counter)" v-tooltip="$t('global.copy')">
					<mark class="light" v-if="entry.counter.placeholderKey">{{ getCounterPlaceholder(entry.counter) }}</mark>
				</button>
				<span class="info min" v-tooltip="$t('counters.min_tt')" v-if="entry.counter.min !== false"><img src="@/assets/icons/min.svg" alt="min">{{ entry.counter.min }}</span>
				<span class="info max" v-tooltip="$t('counters.max_tt')" v-if="entry.counter.max !== false"><img src="@/assets/icons/max.svg" alt="max">{{ entry.counter.max }}</span>
				<span class="info loop" v-tooltip="$t('counters.loop_tt')" v-if="entry.counter.loop"><img src="@/assets/icons/loop.svg" alt="loop"></span>
				<span class="info user" v-tooltip="$t('counters.user_tt')" v-if="entry.counter.perUser"><img src="@/assets/icons/user.svg" alt="user"> {{ Object.keys(entry.counter.users ?? {}).length }}</span>
				<Button class="actionBt" v-tooltip="$t('counters.editBt')" :icon="$image('icons/edit.svg')" @click="editCounter(entry.counter)" />
				<Button class="actionBt" highlight :icon="$image('icons/trash.svg')" @click="deleteCounter(entry)" />
			</template>

			<div class="content">
				<ParamItem class="item value" v-if="!entry.counter.perUser"
					:paramData="entry.param"
					@change="onChangeValue(entry)" />
				
				<div class="userList" v-else>
					<template v-if="Object.keys(entry.counter.users ?? {}).length > 0">
						<div class="search">
							<input type="text" :placeholder="$t('counters.form.search')" v-model="search" @input="searchUser(entry.counter)">
							<img src="@/assets/loader/loader.svg" alt="loader" v-show="idToLoading[entry.counter.id] === true && search.length > 0">
						</div>
						
						<Button class="loadAllBt" v-if="search.length === 0 && idToAllLoaded[entry.counter.id] !== true" :title="$t('counters.form.load_all_users')"
						@click="loadUsers(entry)"
						:loading="idToLoading[entry.counter.id]" />
	
						<div class="noResult" v-if="idToNoResult[entry.counter.id] === true">
							user not found
						</div>
					</template>

					<span class="noResult" v-else>{{ $t("counters.form.no_users") }}</span>

					<template
					v-if="idToUsers[entry.counter.id] && idToUsers[entry.counter.id]!.length > 0">
						<div class="sort" v-if="idToUsers[entry.counter.id]!.filter(v=>v.hide !== true).length > 1">
							<button @click="sortOn(entry, 'name')">
								{{$t("counters.form.sort_name")}}
								<template v-if="sortType==='name'">{{ sortDirection == 1? "▼" : "▲" }}</template>
							</button>
							<button @click="sortOn(entry, 'points')">
								{{$t("counters.form.sort_points")}}
								<template v-if="sortType==='points'">{{ sortDirection == 1? "▼" : "▲" }}</template>
							</button>
						</div>
						<InfiniteList class="scrollableList"
						:dataset="idToUsers[entry.counter.id]!.filter(v=>v.hide !== true)"
						:itemSize="50"
						:itemMargin="3"
						lockScroll
						v-slot="{ item } : {item:UserEntry}">
							<div class="userItem">
								<img :src="item.user.avatarPath" class="avatar" v-if="item.user.avatarPath">
								<span class="login" @click="openUserCard(item.user)">{{ item.user.displayName }}</span>
								<ParamItem class="value"
									:paramData="item.param"
									@change="onChangeValue(entry, item)" />
							</div>
						</InfiniteList>
					</template>
				</div>
			</div>
		</ToggleBlock>

	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import InfiniteList from '@/components/InfiniteList.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import OverlayCounter from '@/components/overlays/OverlayCounter.vue';
import { COUNTER_VALUE_PLACEHOLDER_PREFIX } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { reactive, watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../ParamItem.vue';
import type IParameterContent from './IParameterContent';
import { gsap } from 'gsap';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		InfiniteList,
		OverlayCounter,
	},
	emits:[]
})
export default class ParamsCounters extends Vue implements IParameterContent {

	public search:string = "";
	public showForm:boolean = false;
	public timeoutSearch:number = -1;
	public timeoutEdit:number = -1;
	public editedCounter:TwitchatDataTypes.CounterData|null = null;
	public idToUsers:{[key:string]:UserEntry[]|null} = {};
	public idToNoResult:{[key:string]:boolean} = {};
	public idToLoading:{[key:string]:boolean} = {};
	public idToAllLoaded:{[key:string]:boolean} = {};
	public sortType:"name"|"points" = "name";
	public sortDirection:1|-1 = 1;
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
	public param_value:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, labelKey:"counters.form.value"};
	public param_more:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"counters.form.more"};
	public param_valueMin_toggle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"counters.form.value_min", icon:"min_purple.svg"};
	public param_valueMin_value:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0};
	public param_valueMax_toggle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"counters.form.value_max", icon:"max_purple.svg"};
	public param_valueMax_value:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0};
	public param_valueLoop_toggle:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"counters.form.value_loop", icon:"loop_purple.svg"};
	public param_userSpecific:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"counters.form.value_user", icon:"user_purple.svg"};
	public param_placeholder:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:15, labelKey:"counters.form.placholder", icon:"broadcast_purple.svg", tooltipKey:"counters.form.placholder_tt", allowedCharsRegex:"A-z0-9-_"};


	public get counterEntries():CounterEntry[] {
		const list = this.$store('counters').counterList;
		return list.map((v) => {
			const min = v.min == false ? -Number.MAX_SAFE_INTEGER : v.min as number;
			const max = v.min == false ? Number.MAX_SAFE_INTEGER : v.max as number;
			return {
					counter:v,
					param:reactive({type:'number', value:v.value, min, max, labelKey:'counters.form.value'})
				}
		});
	}

	public getCounterPlaceholder(counter:TwitchatDataTypes.CounterData):string {
		return "{"+COUNTER_VALUE_PLACEHOLDER_PREFIX + counter.placeholderKey+"}";
	}

	public openTriggers():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

	public getUserFromID(id:string):TwitchatDataTypes.TwitchatUser {
		return this.$store("users").getUserFrom("twitch", this.$store("auth").twitch.user.id, id);
	}

	public openOverlays():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS);
	}

	public mounted(): void {
		this.param_more.children = [this.param_valueMax_toggle, this.param_valueMin_toggle, this.param_valueLoop_toggle, this.param_userSpecific, this.param_placeholder];
		this.param_valueMin_toggle.children = [this.param_valueMin_value];
		this.param_valueMax_toggle.children = [this.param_valueMax_value];

		watch(()=> this.param_title.value, ()=> {
			const counters = this.$store("counters").counterList;
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
			const counters = this.$store("counters").counterList;
			const placeholder = this.param_placeholder.value.toLowerCase();
			let exists = false;
			for (let i = 0; i < counters.length; i++) {
				const c = counters[i];
				if(c.id == this.editedCounter?.id) continue;
				if(c.placeholderKey.toLowerCase() === placeholder) {
					exists = true;
					continue;
				}
			}
			this.param_placeholder.error = exists;
		})
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Create a new counter
	 */
	public createCounter(): void {
		const data:TwitchatDataTypes.CounterData = {
			id:this.editedCounter? this.editedCounter.id : Utils.getUUID(),
			placeholderKey:this.param_placeholder.value,
			name:this.param_title.value,
			value:this.param_value.value,
			max:this.param_valueMax_toggle.value === true? this.param_valueMax_value.value : false,
			min:this.param_valueMin_toggle.value === true? this.param_valueMin_value.value : false,
			loop:this.param_valueLoop_toggle.value,
			perUser:this.param_userSpecific.value,
		};
		if(this.editedCounter) {
			this.editedCounter = null;
			this.$store("counters").updateCounter(data);
		}else{
			this.$store("counters").addCounter(data);
		}
		this.showForm = false;
	}

	/**
	 * Called when editing the value of an existing counter
	 */
	public onChangeValue(entry:CounterEntry, userEntry?:UserEntry):void {
		clearTimeout(this.timeoutEdit);
		this.timeoutEdit = setTimeout(() => {
			if(userEntry) {
				entry.counter.users![ userEntry.user.id ] = userEntry.param.value;
			}else{
				entry.counter.value = entry.param.value;
			}
			this.$store("counters").updateCounter(entry.counter);
		}, 250);
	}

	/**
	 * Called when requesting to delete a counter
	 * @param counter 
	 */
	public deleteCounter(entry:CounterEntry):void {
		this.$confirm(this.$t("counters.delete_confirm.title"), this.$t("counters.delete_confirm.desc")).then(()=>{
			this.$store("counters").delCounter(entry.counter);
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
		this.$store("users").openUserCard(user);
	}
	
	/**
	 * Search for a user.
	 * If all users are loaded, search within them.
	 * If users are not loaded, query twitch for a user matching current search
	 */
	public searchUser(counter:TwitchatDataTypes.CounterData):void {
		let preloadedUsers = this.idToUsers[counter.id];
		this.idToNoResult[counter.id] = false;
		if(this.search.length == 0) {
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
				if(u.user.login.indexOf(this.search) == -1 && u.user.displayName.indexOf(this.search) == -1) {
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
			const users = await TwitchUtils.loadUserInfo(undefined, [this.search]);
			let found = false;
			if(users.length > 0) {
				const u = users[0];
				if(counter.users![u.id] != undefined) {
					found = true;
					let value = (counter.users && counter.users[u.id])? counter.users![u.id] : 0;
					this.idToUsers[counter.id] = [{
							hide:false,
							param:reactive({type:"number", value:value, min:counter.min || undefined, max:counter.max || undefined}),
							user:this.$store("users").getUserFrom("twitch", this.$store("auth").twitch.user.id, u.id, u.login, u.display_name),
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
		const users = await TwitchUtils.loadUserInfo(Object.keys(entry.counter.users!).slice(0, 5000));
		if(users.length > 0) {
			const channelId = this.$store("auth").twitch.user.id;
			const ttUsers:UserEntry[] = users.map((u) => {
				let value = (entry.counter.users && entry.counter.users[u.id])? entry.counter.users![u.id] : 0;
				const param:TwitchatDataTypes.ParameterData<number> = reactive({type:'number', value, min:entry.counter.min || undefined, max:entry.counter.max || undefined});
				const user = this.$store("users").getUserFrom("twitch", channelId, u.id, u.login, u.display_name);
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
	 * Sorts users on the requested field.
	 * If sorting is already made on the specified field it reverses the order.
	 * Otherwise it simply sorts on the specified field in the latest order direction
	 * @param entry 
	 * @param type 
	 */
	public sortOn(entry:CounterEntry, type?:"name"|"points"):void {
		if(type) {
			if(this.sortType == type) this.sortDirection = -this.sortDirection as 1|-1;
			else this.sortType = type;
		}
		let users = this.idToUsers[entry.counter.id];
		if(users) {
			users.sort((a,b)=> {
				if(this.sortType == "name") {
					if(a.user.displayName.toLowerCase() > b.user.displayName.toLowerCase()) return this.sortDirection;
					if(a.user.displayName.toLowerCase() < b.user.displayName.toLowerCase()) return -this.sortDirection;
					return 0;
				}
				if(this.sortType == "points") {
					if(a.param.value > b.param.value) return this.sortDirection;
					if(a.param.value < b.param.value) return -this.sortDirection;
					return 0;
				}
				return 0;
			})
		}
	}

	/**
	 * Copies the placeholder
	 * @param event 
	 */
	public copyPlaceholder(event:MouseEvent, counter:TwitchatDataTypes.CounterData):void {
		Utils.copyToClipboard(this.getCounterPlaceholder(counter));
		gsap.fromTo(event.currentTarget, {scale:1.2}, {scale:1, duration: .7, ease:"elastic.out"});
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
</script>

<style scoped lang="less">
.paramscounters{
	.parameterContent();

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

			&:deep(input) {
				flex-basis: 10em !important;
			}

			.errorDetails {
				background-color: @mainColor_alert;
				color: @mainColor_light;
				padding: 0 .5em .25em .5em;
				margin-top: -.25em;
				border-bottom-right-radius: .5em;
				border-bottom-left-radius: .5em;
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

	.examples{
		text-align: center;
		.counterExample {
			width: auto;
			font-size: .75em;
			align-self: center;
		}
	}

	.counterEntry {
		margin-bottom: 1em;
		.actionBt {
			width: 1.5em;
			min-width: 1.5em;
			border-radius: 0;
			align-self: stretch;
		}
		:deep(h2) {
			text-align: left;
			margin-left: .5em;
		}

		mark {
			font-size: .7em;
			padding: 2px 5px;
		}

		.placholder {
			display: flex;//Dunno why i need this for the button to be properly centered
		}
		.info {
			border: 1px solid @mainColor_light;
			padding: .25em .5em;
			border-radius: @border_radius;
			font-size: .8em;
			display: flex;
			flex-direction: row;
			gap: .25em;
			margin-left: .5em;
			cursor: default;
			img {
				height: 1em;
			}
		}
		.content {
			display: flex;
			flex-direction: column;
			gap: .5em;
			width: 100%;
			.button {
				height: 1em;
			}
			.break {
				height: 0;
				flex-basis: 100%;
				padding: 0;
				&:last-child {
					display: none;
				}
			}
			.value {
				font-weight: bold;
				background-color: @mainColor_normal_extralight;
				padding: .25em .5em;
				border-radius: @border_radius;
				min-width: 3em;
				width: 100%;
				color: darken(@mainColor_normal, 10%);
				:deep(.content) {
					.holder{
						flex-wrap: nowrap;
					}
				}
				:deep(input) {
					border: none;
					font-weight: bold;
					background-color: transparent;
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

				.loadAllBt {
					margin: auto;
				}

				.noResult {
					text-align: center;
					font-style: italic;
					color:@mainColor_alert;
				}

				.sort {
					display: flex;
					flex-direction: row;
					button {
						color: @mainColor_normal;
						border-radius: .5em;
						background-color: fade(@mainColor_normal, 10%);
						// border: 1px solid @mainColor_normal;
						box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
						&:hover {
							background-color: fade(@mainColor_normal, 20%);
						}
					}
					button:nth-child(1) {
						flex-grow: 1;
					}
					button:nth-child(2) {
						flex-basis: 130px;
						text-align: center;
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
					gap: 1em;
					height: 50px;
					// border: 1px solid @mainColor_normal_extralight;
					box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
					background-color: rgba(255, 255, 255, .5);
					padding:.25em;
					border-radius: @border_radius;
					.login {
						font-weight: bold;
						flex-grow: 1;
						cursor: pointer;
					}
					.avatar {
						height: 100%;
						border-radius: 50%;
					}
					.value {
						flex-basis: 100px;
					}
				}
			}
		}
	}
}
</style>