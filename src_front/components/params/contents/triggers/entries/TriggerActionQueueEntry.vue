<template>
	<div class="triggeractionqueueentry triggerActionForm">
		<div v-if="queueList.length === 0">
			<p>{{ $t("triggers.actions.queue.no_queue") }}</p>
			<TTButton @click="openQueueParams">{{ $t("triggers.actions.queue.createQueue_bt") }}</TTButton>
		</div>
		<template v-else>
			<ParamItem :paramData="param_queue" v-model="action.queueId" @change="updateAction" />
			<ParamItem :paramData="param_action" v-model="action.action" @change="updateAction" />
			<ParamItem :paramData="param_user" v-model="action.userPlaceholder" v-if="showUserField" />
		</template>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import TTButton from '@/components/TTButton.vue';
import { type ITriggerPlaceholder, type TriggerActionQueueData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative, Watch } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class TriggerActionQueueEntry extends AbstractTriggerActionEntry {

	@Prop()
	declare action:TriggerActionQueueData;

	@Prop()
	declare triggerData:TriggerData;

	public param_queue:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", labelKey:"triggers.actions.queue.param_queue", icon:"list" };
	public param_action:TwitchatDataTypes.ParameterData<TriggerActionQueueData["action"]> = { type:"list", value:"join", labelKey:"triggers.actions.queue.param_action" };
	public param_user:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", labelKey:"triggers.actions.queue.param_user", icon:"user", placeholderList:[], placeholderKey:"triggers.actions.queue.param_user_placeholder" };

	public queueList:TwitchatDataTypes.QueueData[] = [];

	public get showUserField():boolean {
		const allowed:TriggerActionQueueData["action"][] = ["join", "leave", "move_to_progress", "remove"];
		return allowed.includes(this.action.action);
	}

	public beforeMount():void {
		// Initialize action structure if needed
		if(!this.action.queueId) {
			this.action.queueId = "";
		}
		if(!this.action.action){
			this.action.action = "join";
		}

		this.updateQueueList();

		this.param_action.listValues = [
			{value:"join", label:this.$t("triggers.actions.queue.param_action_join")},
			{value:"leave", label:this.$t("triggers.actions.queue.param_action_leave")},
			{value:"move_to_progress", label:this.$t("triggers.actions.queue.param_action_move_to_progress")},
			{value:"remove", label:this.$t("triggers.actions.queue.param_action_remove")},
			{value:"pause", label:this.$t("triggers.actions.queue.param_action_pause")},
			{value:"resume", label:this.$t("triggers.actions.queue.param_action_resume")},
			{value:"clear", label:this.$t("triggers.actions.queue.param_action_clear")},
			{value:"clear_progress", label:this.$t("triggers.actions.queue.param_action_clear_progress")},
			{value:"clear_removed", label:this.$t("triggers.actions.queue.param_action_clear_removed")},
			{value:"pick_first", label:this.$t("triggers.actions.queue.param_action_pick_first")},
			{value:"pick_random", label:this.$t("triggers.actions.queue.param_action_pick_random")},
		];

		this.updateAction();
	}

	@Watch("$store.queue.queueList", {deep: true})
	private updateQueueList():void {
		// Get all queues, not just enabled ones, so user can select any queue
		this.queueList = this.$store.queue.queueList;
		
		this.param_queue.listValues = this.queueList.map(q => {
			return {
				value:q.id,
				label:q.title,
			}
		});

		// Set default queue if none selected and we have queues
		if(!this.action.queueId && this.queueList.length > 0){
			this.action.queueId = this.queueList[0].id;
		}
	}

	public updateAction():void {
		// Update icon based on action
		switch(this.action.action) {
			case "join":
			case "leave":
			case "move_to_progress":
			case "remove":
				this.param_action.icon = "user";
				break;
			case "pause":
				this.param_action.icon = "pause";
				break;
			case "resume":
				this.param_action.icon = "play";
				break;
			case "clear":
			case "clear_progress":
			case "clear_removed":
				this.param_action.icon = "trash";
				break;
			case "pick_first":
				this.param_action.icon = "next";
				break;
			case "pick_random":
				this.param_action.icon = "dice";
				break;
		}
	}

	public openQueueParams():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.QUEUES);
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<string>[]):void {
		this.param_user.placeholderList = list.filter(p=>p.isUserID);
	}

}
export default toNative(TriggerActionQueueEntry);
</script>

<style scoped lang="less">
.triggeractionqueueentry{

}
</style>