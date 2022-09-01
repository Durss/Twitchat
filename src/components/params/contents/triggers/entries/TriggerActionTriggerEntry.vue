<template>
	<div class="triggeractiontriggerentry">
		<div class="item">Execute another trigger.</div>
		<ToggleBlock class="item" title="Important warning" :open="false" small>
			Placeholders may not be available on the selected trigger.<br>
			<u>Example:</u> If you execute a <strong>Chat command</strong> trigger from a <strong>Scheduled action</strong> trigger, the {USER} and {MESSAGE} placeholders won't be available as it won't be executed from an actual chat message.
		</ToggleBlock>

		<img src="@/assets/loader/loader.svg" alt="loading" class="loader" v-if="loading">
		
		<vue-select class="item list" v-model="action.triggerKey"
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
		
		<div v-if="dependencyLoopInfos.length > 0" class="dependencyLoop">
			<div class="title">Dependency loop detected. This may make twitchat unstable</div>
			<div v-for="(d, index) in dependencyLoopInfos" :key="index" class="item" :data-tooltip="d.event?.label">
				<div class="infos">
					<img v-if="d.event?.icon" :src="$image('icons/'+d.event?.icon+'.svg')"
						:alt="d.event?.icon">
					<span class="label">{{d.label}}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TriggerActionTriggerData, TriggerData, TriggerEventTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import { TriggerEvents, TriggerTypes } from '@/utils/TriggerActionData';
import TwitchUtils from '@/utils/TwitchUtils';
import UserSession from '@/utils/UserSession';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../../../../ToggleBlock.vue';

@Options({
	props:{
		action:Object,
		event:Object,
		triggerData:Object,
		triggerKey:String,
	},
	components:{
		ToggleBlock,
	}
})
export default class TriggerActionTriggerEntry extends Vue {

	public action!:TriggerActionTriggerData;
	public event!:TriggerEventTypes;
	public triggerData!:TriggerData;
	public triggerKey!:string;

	public loading:boolean = true;
	public dependencyLoopInfos:{event?:TriggerEventTypes, label:string}[] = [];
	public triggerList:{triggerKey:string, label:string, trigger:TriggerData, info:TriggerEventTypes}[] = [];

	private rewards:TwitchDataTypes.Reward[] = [];

	public reduceSelectData(option:{triggerKey:string, label:string, trigger:TriggerData}){ return option.triggerKey; }

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

	public mounted():void {
		this.populateList();
		watch(()=>this.action.triggerKey, ()=> {
			this.buildDependencyLoop();
		});
	}

	public checkDependencyLoop(base?:TriggerData, key?:string):string[] {
		if(!this.action.triggerKey) return [];
		const triggers:{[key:string]:TriggerData} = StoreProxy.store.state.triggers;
		let found:string[] = [];
		if(!base) {
			base = this.triggerData;
			key = this.triggerKey;
		}
		if(!base.actions) return [];
		// console.log(this.action.triggerKey, base);
		for (let i = 0; i < base.actions.length; i++) {
			const a = base.actions[i];
			if(a.type == "trigger") {
				if(a.triggerKey == this.triggerKey) {
					found.push(key as string);
					break;
				}else if(a.triggerKey){
					const list = this.checkDependencyLoop( triggers[a.triggerKey], a.triggerKey );
					if(list.length > 0) {
						found.push(key as string);
						found = found.concat( list );
					}
				}
			}
		}
		return found;
	}

	/**
	 * Loads all existing triggers
	 */
	private async populateList():Promise<void> {
		const triggers:{[key:string]:TriggerData} = StoreProxy.store.state.triggers;
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
							triggerKey:key,
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
								triggerKey:key,
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
						triggerKey:key,
						label:subKey,
						trigger:triggers[key],
						info,
					});
				}
			}else{
				this.triggerList.push({
					triggerKey:key,
					label:info.label,
					trigger:triggers[key],
						info,
				});
			}
		}
		this.loading = false;
		this.buildDependencyLoop();
	}

	private buildDependencyLoop():void {
		const links = this.checkDependencyLoop();
		if(links.length > 0) {
			links.push(links[0]);
			this.dependencyLoopInfos = links.map(v => {
				const chunks = v.split("_");
				const type = chunks[0];
				const event = TriggerEvents.find(v=> v.value === type);
				return {
					event: event,
					label: chunks[1],
				}
			});
		}else{
			this.dependencyLoopInfos = [];
		}
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

	.dependencyLoop{
		background-color: @mainColor_warn;
		color: @mainColor_light;
		padding: .5em;
		border-radius: .5em;

		.title {
			margin-bottom: .5em;
		}

		.item {
			display: inline-block;
			cursor: default;
			
			&:not(:last-child) {
				&:after {
					content:"=>";
					margin: 0 .5em;
				}
			}

			&:not(.item ~ .item),//This means first item with class ".item"
			&:last-child {
				.infos {
					// color: @mainColor_warn;
				background-color: lighten(@mainColor_warn, 5%);

					.label {
						// font-weight: bold;
					}
				}
			}

			.infos {
				border: 1px solid @mainColor_light;
				border-radius: .25em;
				display: inline-block;
				padding: .25em;
				background-color: darken(@mainColor_warn, 5%);
				img {
					height: 1em;
					vertical-align: middle;
					margin-right: .25em;
				}
			}
		}
	}
}
</style>