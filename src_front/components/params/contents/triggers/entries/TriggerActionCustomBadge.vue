<template>
	<div class="triggeractioncustombadge triggerActionForm">
		<ParamItem :paramData="param_userSource" v-model="action.customBadgeUserSource" />

		<div class="card-item">
			<div class="list" v-if="$store.users.customBadgeList.length > 0">
				<CustomBadgeSelector noTooltip v-tooltip="$t('triggers.actions.customBadge.param_add_badgeBt')" />
				<draggable
				class="group"
				v-model="$store.users.customBadgeList"
				:group="{ name: 'badge', pull: 'clone', put: false }"
				item-key="id"
				ghost-class="ghost"
				direction="horizontal"
				:animation="250">
					<template #item="{element, index}:{element:{id:string, img:string}, index:number}">
						<button class="badge" :key="element.id">
							<img :src="element.img">
						</button>
					</template>
				</draggable>
			</div>
			<div class="list" v-else>
				<CustomBadgeSelector noTooltip v-tooltip="$t('triggers.actions.customBadge.param_add_badgeBt')" />
			</div>

			<div class="targets">
				<div class="col">
					<div class="head">
						<Icon name="cross" theme="alert" />
						<span>{{ $t("triggers.actions.customBadge.badge_to_del") }}</span>
					</div>
					<div class="dropZone">
						<div class="placeholder" v-if="badgesDel.length == 0">{{ $t("triggers.actions.customBadge.no_badge") }}</div>
						<draggable
						class="group"
						group="badge"
						item-key="id"
						ghost-class="ghost"
						direction="horizontal"
						:animation="250"
						v-model="badgesDel"
						@change="listUpdate(badgesDel)">
							<template #item="{element, index}:{element:{id:string, img:string}, index:number}">
								<button class="badge" @click="badgesDel.splice(index, 1)"><img :src="element.img"></button>
							</template>
						</draggable>
					</div>
				</div>

				<div class="col">
					<div class="head">
						<Icon name="add" />
						<span>{{ $t("triggers.actions.customBadge.badge_to_add") }}</span>
					</div>
					<div class="dropZone">
						<div class="placeholder" v-if="badgesAdd.length == 0">{{ $t("triggers.actions.customBadge.no_badge") }}</div>
						<draggable
						class="group"
						group="badge"
						item-key="id"
						ghost-class="ghost"
						direction="horizontal"
						:animation="250"
						v-model="badgesAdd"
						@change="listUpdate(badgesAdd)">
							<template #item="{element, index}:{element:{id:string, img:string}, index:number}">
								<button class="badge" @click="badgesAdd.splice(index, 1)"><img :src="element.img"></button>
							</template>
						</draggable>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import CustomBadgeSelector from '@/components/user/CustomBadgeSelector.vue';
import { COUNTER_EDIT_SOURCE_CHATTERS, COUNTER_EDIT_SOURCE_EVERYONE, COUNTER_EDIT_SOURCE_SENDER, COUNTER_VALUE_PLACEHOLDER_PREFIX, type ITriggerPlaceholder, type TriggerCustomBadgesData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		Icon,
		draggable,
		ParamItem,
		CustomBadgeSelector,
	},
	emits:[],
})
class TriggerActionCustomBadge extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerCustomBadgesData;

	@Prop
	declare triggerData:TriggerData;

	public param_userSource:TwitchatDataTypes.ParameterData<string, string> = {type:"list", value:"", labelKey:"triggers.actions.customBadge.param_user"}
	public badgesAdd:TwitchatDataTypes.TwitchatCustomUserBadge[] = [];
	public badgesDel:TwitchatDataTypes.TwitchatCustomUserBadge[] = [];

	private userPLaceholders:ITriggerPlaceholder<any>[] = [];

	/**
	 * Build user trigger source list
	 */
	private get userSourceOptions():TwitchatDataTypes.ParameterDataListValue<string>[] {
		const res:TwitchatDataTypes.ParameterDataListValue<string>[] = [
			//Add static sources "sender" and "everyone"
			{labelKey:"triggers.actions.customBadge.user_source_sender", value:COUNTER_EDIT_SOURCE_SENDER},
			{labelKey:"triggers.actions.customBadge.user_source_chatters", value:COUNTER_EDIT_SOURCE_CHATTERS},
			{labelKey:"triggers.actions.customBadge.user_source_everyone", value:COUNTER_EDIT_SOURCE_EVERYONE},
		];

		//Add command's placeholders
		if(this.triggerData.chatCommandParams) {
			this.triggerData.chatCommandParams.forEach(v=> {
				res.push({label:this.$t("triggers.actions.count.user_source_placeholder", {PLACEHOLDER:v.tag.toUpperCase()}), value:v.tag});
			});
		}

		//Add global placeholders that may contain a user name
		this.userPLaceholders.filter(v=>v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX)==-1).forEach(v=> {
			res.push({label:this.$t("triggers.actions.count.user_source_placeholder", {PLACEHOLDER:v.tag.toUpperCase()}), value:v.tag});
		})
		return res;
	}

	public mounted():void {
		if(!this.action.customBadgeAdd) this.action.customBadgeAdd = [];
		if(!this.action.customBadgeDel) this.action.customBadgeDel = [];
		if(!this.action.customBadgeUserSource) this.action.customBadgeUserSource = COUNTER_EDIT_SOURCE_SENDER;

		this.badgesAdd = this.action.customBadgeAdd.map(v=> {
			return {id:v, img:this.$store.users.customBadgeList.find(w=>w.id === v)?.img || ""};
		}).filter(v=>v.img != "");

		this.badgesDel = this.action.customBadgeDel.map(v=> {
			return {id:v, img:this.$store.users.customBadgeList.find(w=>w.id === v)?.img || ""};
		}).filter(v=>v.img != "");
	}

	public listUpdate(list:TwitchatDataTypes.TwitchatCustomUserBadge[]):void {
		//Avoid badges duplicates
		const idDone:{[key:string]:boolean} = {};
		list.forEach((v, index)=> {
			if(idDone[v.id] === true) list.splice(index, 1);
			idDone[v.id] = true;
		});

		//Avoid having a badge on both cols
		let cleanup = this.badgesAdd;
		if(list == this.badgesAdd) cleanup = this.badgesDel;
		cleanup.forEach((v, index)=> {
			if(idDone[v.id] === true) cleanup.splice(index, 1);
		});

		this.action.customBadgeAdd = this.badgesAdd.map(v=> v.id);
		this.action.customBadgeDel = this.badgesDel.map(v=> v.id);
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.userPLaceholders = list;
		this.param_userSource.listValues = this.userSourceOptions;
	}
}
export default toNative(TriggerActionCustomBadge);
</script>

<style scoped lang="less">
.triggeractioncustombadge{
	.list, .group {
		gap: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		max-height: 300px;
		overflow-x: hidden;
		padding: 1px;

		.badge {
			padding: 2px;
			outline: 1px solid var(--color-light-fade);
			img, .icon {
				display: block;
				width: 32px;
				height: 32px;
			}

			&:hover {
				outline: 1px solid var(--color-light);
			}
		}
	}

	.targets {
		gap: .5em;
		display: flex;
		flex-direction: row;
		.col {
			width: 50%;
			padding: .5em;
			background-color: var(--grayout);
			border-radius: var(--border-radius);

			.head {
				gap: .5em;
				display: flex;
				flex-direction: row;
				justify-content: center;
				.icon {
					height: 1em;
					margin-bottom: .5em;
				}
			}

			.dropZone {
				position: relative;
				.group {
					min-height: 3em;
					overflow: hidden;
					z-index: 1;
					position: relative;
				}
				.placeholder, .placeholder_hidden {
					position: absolute;
					width: 100%;
					height: 100%;
					font-style: italic;
					text-align: center;
					opacity: .5;
					padding: 1em;
					// min-height: 3.5em;
					border: 1px dashed var(--color-text);
					border-radius: var(--border-radius);
				}

				.placeholder_hidden{
					opacity: 0;
					position: relative;
				}

				.badge {
					cursor: not-allowed;
				}
			}
		}
	}
}
</style>
