<template>
	<div class="triggeractiontriggerentry">
		<div class="item">Execute another trigger.</div>
		<ToggleBlock class="item" title="Important warning" :open="false" small>
			Placeholders may not be available on the selected trigger.<br>
			<u>Example:</u> If you execute a <strong>Chat command</strong> trigger from a <strong>Scheduled action</strong> trigger, the {USER} and {MESSAGE} placeholders won't be available as it won't be executed from an actual chat message.
		</ToggleBlock>

		<img src="@/assets/loader/loader.svg" alt="loading" class="loader" v-if="loading">
		
		<vue-select class="item list" v-model="selectedTrigger"
		v-if="triggerList?.length > 1"
		placeholder="Select a trigger..."
		:options="triggerList"
		:appendToBody="true"
		:calculate-position="$placeDropdown"
		:reduce="reduceSelectData"
		>
			<template v-slot:option="option">
				<img :src="getIcon(option.info)" alt="icon" class="listIcon">
				{{ option.label }}
			</template>
		</vue-select>

	</div>
</template>

<script lang="ts">
import type { TriggerActionTriggerData, TriggerData, TriggerEventTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import { TriggerEvents, TriggerTypes } from '@/utils/TriggerActionData';
import TwitchUtils from '@/utils/TwitchUtils';
import UserSession from '@/utils/UserSession';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../../../../ToggleBlock.vue';

@Options({
	props:{
		action:Object,
		event:String,
	},
	components:{
		ToggleBlock,
	}
})
export default class TriggerActionTriggerEntry extends Vue {

	public action!:TriggerActionTriggerData;
	public event!:string;

	public loading:boolean = true;
	public selectedTrigger:{label:string, trigger:TriggerData, info:TriggerEventTypes}|null = null;
	public triggerList:{label:string, trigger:TriggerData, info:TriggerEventTypes}[] = [];

	private rewards:TwitchDataTypes.Reward[] = [];

	public reduceSelectData(option:{label:string, trigger:TriggerData}){ return option.label; }

	/**
	 * Gets a trigger's icon
	 */
	public getIcon(e:TriggerEventTypes):string {
		if(!e.icon) return "";
		if(e.icon.indexOf("/") > -1) {
			return e.icon as string;
		}
		return this.$image("icons/"+e.icon+"_purple.svg");
	}

	public async mounted():Promise<void> {
		const triggers = StoreProxy.store.state.triggers;
		this.triggerList = [];
		for (const key in triggers) {
			const mainKey = key.split("_")[0];
			const info:TriggerEventTypes|undefined = TriggerEvents.find(v=> v.value === mainKey);
			if(!info) continue;
			if(info.isCategory) {
				const subKey = key.split("_")[1];
				if(!subKey) continue;
				//Handle channel point rewards, load rewards info etc...
				if(mainKey == TriggerTypes.REWARD_REDEEM) {
					if(subKey == "highlighted-message") {
						//Special case for "highlight my message" reward
						this.triggerList.push({
							label:UserSession.instance.highlightMyMessageReward.title,
							trigger:triggers[key],
							info,
						});
					}else{
						//Load rewards list if necessary
						if(!this.rewards) {
							this.loading = true;
							this.rewards = await TwitchUtils.loadRewards();
						}
						const reward = this.rewards.find(v=> v.id == subKey);
						if(reward) {
							this.triggerList.push({
								label:reward.title,
								trigger:triggers[key],
								info,
							});
						}
					}
				}else{
					//Not a reward
					//It's a Chat Command or Scheduled action (or anything new done after this comment)
					this.triggerList.push({
						label:subKey,
						trigger:triggers[key],
						info,
					});
				}
			}else{
				this.triggerList.push({
					label:info.label,
					trigger:triggers[key],
						info,
				});
			}
		}
		console.log(this.triggerList);
		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.triggeractiontriggerentry{

	//.listIcon style is on index.less.
	//Couldn't make it work from the template even in a unscoped tag

	.loader {
		height: 2m;
		margin: auto;
		display: block;
	}

	.paramitem  {
		:deep(select), :deep(input) {
			max-width: 200px;
		}
	}

	.item {
		margin-bottom: .25em;
		&.list {
			margin-top: .5em;
			margin-bottom: .5em;
		}
	}
}
</style>