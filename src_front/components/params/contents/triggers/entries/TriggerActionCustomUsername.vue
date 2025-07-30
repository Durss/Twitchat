<template>
	<div class="triggeractioncustomusername triggerActionForm">
		<ParamItem :paramData="param_userSource" v-model="action.customUsernameUserSource" />
		<ParamItem :paramData="param_username" v-model="action.customUsername" />
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import CustomBadgeSelector from '@/components/user/CustomBadgeSelector.vue';
import { COUNTER_EDIT_SOURCE_CHATTERS, COUNTER_EDIT_SOURCE_EVERYONE, COUNTER_EDIT_SOURCE_SENDER, COUNTER_VALUE_PLACEHOLDER_PREFIX, type ITriggerPlaceholder, type TriggerCustomUsernameData as TriggerCustomUsernameData, type TriggerData } from '@/types/TriggerActionDataTypes';
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
class TriggerActionCustomUsername extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerCustomUsernameData;

	@Prop
	declare triggerData:TriggerData;

	public param_userSource:TwitchatDataTypes.ParameterData<string, string> = {type:"list", value:"", labelKey:"triggers.actions.customUsername.param_user"};
	public param_username:TwitchatDataTypes.ParameterData<string, string> = {type:"string", value:"", labelKey:"triggers.actions.customUsername.param_username"};

	private userPLaceholders:ITriggerPlaceholder<any>[] = [];

	/**
	 * Build user trigger source list
	 */
	private get userSourceOptions():TwitchatDataTypes.ParameterDataListValue<string>[] {
		const res:TwitchatDataTypes.ParameterDataListValue<string>[] = [
			//Add static sources "sender" and "everyone"
			{labelKey:"triggers.actions.customUsername.user_source_sender", value:COUNTER_EDIT_SOURCE_SENDER},
			{labelKey:"triggers.actions.customUsername.user_source_chatters", value:COUNTER_EDIT_SOURCE_CHATTERS},
			{labelKey:"triggers.actions.customUsername.user_source_everyone", value:COUNTER_EDIT_SOURCE_EVERYONE},
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
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.userPLaceholders = list;
		this.param_userSource.listValues = this.userSourceOptions;
		this.param_username.placeholderList = list;
	}
}
export default toNative(TriggerActionCustomUsername);
</script>

<style scoped lang="less">
.triggeractioncustomusername{
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
