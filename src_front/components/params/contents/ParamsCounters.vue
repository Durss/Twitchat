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

		<section v-if="showForm">
			<form @submit.prevent="createCounter()">
				<ParamItem class="item" :paramData="param_title" />
				<ParamItem class="item" :paramData="param_value" />
				<ParamItem class="item" :paramData="param_more" />
				<div class="item ctas">
					<Button type="button" :title="$t('global.cancel')" :icon="$image('icons/cross_white.svg')" highlight @click="cancelForm()" />
					<Button type="submit" v-if="!editedCounter" :title="$t('global.create')" :icon="$image('icons/add.svg')" :disabled="(param_title.value as string).length == 0" />
					<Button type="submit" v-else :title="$t('counters.editBt')" :icon="$image('icons/edit.svg')" :disabled="(param_title.value as string).length == 0" />
				</div>
			</form>
		</section>

		<ToggleBlock class="counterEntry"
		v-if="$store('counters').data.length > 0"
		v-for="entry in counterEntries" :key="entry.counter.id"
		:title="entry.counter.name" medium>
			<template #left_actions>
				<Button class="actionBt" white :data-tooltip="$t('counters.editBt')" :icon="$image('icons/edit_purple.svg')" @click="editCounter(entry.counter)" />
			</template>
			<template #right_actions>
				<Button class="actionBt" highlight :icon="$image('icons/trash.svg')" @click="deleteCounter(entry.counter)" />
			</template>
			<div class="content">
				<ParamItem class="item value" v-if="!entry.counter.perUser"
					:paramData="entry.param"
					v-model="entry.counter.value"
					@change="onChangeValue(entry.counter)" />

				<div class="item infos" v-if="entry.counter.min !== false || entry.counter.max !== false || entry.counter.loop || entry.counter.perUser">
					<span class="min" :data-tooltip="$t('counters.min_tt')" v-if="entry.counter.min !== false"><img src="@/assets/icons/min_purple.svg" alt="min">{{ entry.counter.min }}</span>
					<span class="max" :data-tooltip="$t('counters.max_tt')" v-if="entry.counter.max !== false"><img src="@/assets/icons/max_purple.svg" alt="max">{{ entry.counter.max }}</span>
					<span class="loop" :data-tooltip="$t('counters.loop_tt')" v-if="entry.counter.loop"><img src="@/assets/icons/loop_purple.svg" alt="loop"></span>
					<span class="user" :data-tooltip="$t('counters.user_tt')" v-if="entry.counter.perUser"><img src="@/assets/icons/user_purple.svg" alt="user"> {{ Object.keys(entry.counter.users ?? {}).length }}</span>
				</div>
				
				<div class="userList" v-if=" Object.keys(entry.counter.users ?? {}).length > 0">
					<div class="search">
						<input type="text" :placeholder="$t('counters.form.search')" v-model="search" @input="searchUser(entry.counter)">
						<img src="@/assets/loader/loader.svg" alt="loader" v-show="searching">
					</div>

					<div class="noResult" v-if="idToSearchResult[entry.counter.id] === null">
						user not found
					</div>

					<div class="item userItem" v-else-if="idToSearchResult[entry.counter.id]">
						<img :src="idToSearchResult[entry.counter.id]?.avatarPath" class="avatar" v-if="idToSearchResult[entry.counter.id]?.avatarPath">
						<span class="login" @click="openUserCard(idToSearchResult[entry.counter.id]!)">{{ idToSearchResult[entry.counter.id]!.displayName }}</span>
						<ParamItem class="item value"
							:paramData="entry.param"
							v-model="entry.counter.users![ idToSearchResult[entry.counter.id]!.id ]"
							@change="onChangeValue(entry.counter)" />
					</div>
				</div>
			</div>
		</ToggleBlock>

	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { reactive } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:["setContent"]
})
export default class ParamsCounters extends Vue {

	public search:string = "";
	public showForm:boolean = false;
	public searching:boolean = false;
	public timeoutSearch:number = -1;
	public timeoutEdit:number = -1;
	public editedCounter:TwitchatDataTypes.CounterData|null = null;
	public idToSearchResult:{[key:string]:TwitchatDataTypes.TwitchatUser|null} = {};

	public param_title:TwitchatDataTypes.ParameterData = {type:"text", value:"", maxLength:50, labelKey:"counters.form.name"};
	public param_value:TwitchatDataTypes.ParameterData = {type:"number", value:0, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, labelKey:"counters.form.value"};
	public param_more:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, labelKey:"counters.form.more"};
	public param_valueMin_toggle:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, labelKey:"counters.form.value_min", icon:"min_purple.svg"};
	public param_valueMin_value:TwitchatDataTypes.ParameterData = {type:"number", value:0};
	public param_valueMax_toggle:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, labelKey:"counters.form.value_max", icon:"max_purple.svg"};
	public param_valueMax_value:TwitchatDataTypes.ParameterData = {type:"number", value:0};
	public param_valueLoop_toggle:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, labelKey:"counters.form.value_loop", icon:"loop_purple.svg"};
	public param_userSpecific:TwitchatDataTypes.ParameterData = {type:"toggle", value:false, labelKey:"counters.form.value_user", icon:"user_purple.svg"};


	public get counterEntries():{param:TwitchatDataTypes.ParameterData, counter:TwitchatDataTypes.CounterData}[] {
		const list = this.$store('counters').data;
		return list.map((v) => {
			const min = v.min == false ? -Number.MAX_SAFE_INTEGER : v.min as number;
			const max = v.min == false ? Number.MAX_SAFE_INTEGER : v.max as number;
			return {
					counter:v,
					param:reactive({type:'number', value:0, min, max, labelKey:'counters.form.value'})
				}
		});
	}

	public openTriggers():void {
		this.$emit("setContent", TwitchatDataTypes.ParamsCategories.TRIGGERS);
	}

	public getUserFromID(id:string):TwitchatDataTypes.TwitchatUser {
		return this.$store("users").getUserFrom("twitch", this.$store("auth").twitch.user.id, id);
	}

	public openOverlays():void {
		this.$emit("setContent", TwitchatDataTypes.ParamsCategories.OVERLAYS);
	}

	public mounted(): void {
		this.param_more.children = [this.param_valueMin_toggle, this.param_valueMax_toggle, this.param_valueLoop_toggle, this.param_userSpecific];
		this.param_valueMin_toggle.children = [this.param_valueMin_value];
		this.param_valueMax_toggle.children = [this.param_valueMax_value];
	}

	public createCounter(): void {
		const data:TwitchatDataTypes.CounterData = {
			id:this.editedCounter? this.editedCounter.id : Utils.getUUID(),
			name:this.param_title.value as string,
			value:this.param_value.value as number,
			max:this.param_valueMax_toggle.value === true? this.param_valueMax_value.value as number : false,
			min:this.param_valueMin_toggle.value === true? this.param_valueMin_value.value as number : false,
			loop:this.param_valueLoop_toggle.value as boolean,
			perUser:this.param_userSpecific.value as boolean,
		};
		if(this.editedCounter) {
			this.editedCounter = null;
			this.$store("counters").updateCounter(data);
		}else{
			this.$store("counters").addCounter(data);
		}
		this.showForm = false;
	}

	public onChangeValue(counter:TwitchatDataTypes.CounterData):void {
		console.log("CHANGE");
		clearTimeout(this.timeoutEdit);
		this.timeoutEdit = setTimeout(() => {
			this.$store("counters").updateCounter(counter);
		}, 250);
	}

	public deleteCounter(c:TwitchatDataTypes.CounterData):void {
		this.$confirm(this.$t("counters.delete_confirm.title"), this.$t("counters.delete_confirm.desc")).then(()=>{
			this.$store("counters").delCounter(c);
		}).catch(()=>{/* ignore */});
	}

	public editCounter(c:TwitchatDataTypes.CounterData):void {
		this.editedCounter = c;
		this.showForm = true;
		this.param_title.value = c.name;
		this.param_value.value = c.value;
		this.param_valueMax_toggle.value = c.max !== false;
		this.param_valueMax_value.value = c.max === false? 0 : c.max;
		this.param_valueMin_toggle.value = c.min !== false;
		this.param_valueMin_value.value = c.min === false? 0 : c.min;
		this.param_valueLoop_toggle.value = c.loop;
		this.param_userSpecific.value = c.perUser;
		this.param_more.value = c.loop || c.min !== false || c.max !== false || c.perUser;
	}

	public cancelForm():void {
		this.editedCounter = null;
		this.showForm = false;
		this.param_title.value = "";
		this.param_value.value = 0;
		this.param_valueMax_toggle.value = false;
		this.param_valueMax_value.value = 0;
		this.param_valueMin_toggle.value = false;
		this.param_valueMin_value.value = 0;
		this.param_valueLoop_toggle.value = false;
		this.param_userSpecific.value = false;
		this.param_more.value = false;

	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

	public searchUser(counter:TwitchatDataTypes.CounterData):void {
		delete this.idToSearchResult[counter.id];

		if(this.search.length == 0) return;

		this.searching = true;
		clearTimeout(this.timeoutSearch);
		this.timeoutSearch = setTimeout(async () => {
			const users = await TwitchUtils.loadUserInfo(undefined, [this.search]);
			this.searching = false;
			let found = false;
			if(users.length > 0) {
				const u = users[0];
				if(counter.users![u.id]) {
					found = true;
					this.idToSearchResult[counter.id] = await this.$store("users").getUserFrom("twitch", this.$store("auth").twitch.user.id, u.id, u.login, u.display_name);
				}
			}
			if(!found) {
				this.idToSearchResult[counter.id] = null;
			}
			
		}, 500);
	}

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
		}
	}

	.counterEntry {
		margin-bottom: 1em;
		.actionBt {
			width: 1.5em;
			min-width: 1.5em;
			border-radius: 0;
		}
		.content {
			display: flex;
			flex-direction: column;
			gap: .5em;
			width: 100%;
			.button {
				height: 1em;
			}
			.name {
				font-weight: bold;
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

			&>.infos{
				display: flex;
				flex-direction: row;
				justify-content: center;
				gap: .25em;

				span {
					border: 1px solid @mainColor_normal;
					padding: .25em .5em;
					border-radius: @border_radius;
					font-size: .8em;
					display: flex;
					flex-direction: row;
					gap: .25em;
					cursor: default;
					img {
						height: 1em;
					}
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

				.noResult {
					text-align: center;
					font-style: italic;
					color:@mainColor_alert;
				}

				.userItem {
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
					gap: 1em;
					// border: 1px solid @mainColor_normal_extralight;
					background-color: rgba(255, 255, 255, .5);
					padding:.25em;
					border-radius: @border_radius;
					.login {
						font-weight: bold;
						margin-right: .25em;
						font-size: 1.5em;
						cursor: pointer;
					}
					.avatar {
						height: 5em;
						border-radius: 50%;
					}
				}
			}
		}
	}
}
</style>