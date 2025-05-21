<template>
	<div class="triggeractiontriggerentry triggerActionForm">

		<!-- <i18n-t scope="global" class="info" tag="p" keypath="triggers.actions.trigger.beta">
			<template #LINK>
				<a :href="discordURL" target="_blank">{{ $t("triggers.actions.trigger.beta_link") }}</a>
			</template>
			<template #BR><br></template>
		</i18n-t> -->

		<div class="card-item field col" v-if="!action.triggerId">
			<div class="title" v-if="rewards.length > 0 && !action.triggerId">{{$t('triggers.actions.trigger.select')}}</div>

			<SimpleTriggerList class="list" @select="onSelectTrigger" />
		</div>

		<div class="card-item field" v-else>
			<Icon name="broadcast" class="icon"/>
			<div class="item title">{{$t('triggers.actions.trigger.selected')}}</div>
			<SimpleTriggerList :filteredItemId="action.triggerId" @click="action.triggerId = ''" primary />
			<button class="openTriggerBt" @click="openTrigger()"><Icon name="newtab" /></button>
		</div>

		<ToggleBlock :title="$t('triggers.actions.trigger.warning_title')" :open="false" small>
			<div class="disclaimer">
				<p>{{ $t("triggers.actions.trigger.warning") }}</p>
				<strong>{{ $t("global.example") }}</strong>
				<span v-html="$t('triggers.actions.trigger.warning_example')"></span>
			</div>
		</ToggleBlock>

		<div v-if="dependencyLoopInfos.length > 0" class="card-item alert dependencyLoop">
			<div class="title">{{ $t("triggers.actions.trigger.loop") }}</div>
			<div class="head">{{ $t("triggers.actions.trigger.loop_delails") }}</div>
			<div v-for="(d, index) in dependencyLoopInfos" :key="index" class="loopItem">
				<div class="loopInfo">
					<img v-if="d.iconURL" :src="d.iconURL" :alt="d.label">
					<img v-if="d.icon" :src="$asset('icons/'+d.icon+'.svg')" :alt="d.icon">
					<span class="label">{{ d.label }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import type { TriggerActionTriggerData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Config from '@/utils/Config';
import TriggerUtils from '@/utils/TriggerUtils';
import { watch } from 'vue';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import ToggleBlock from '../../../../ToggleBlock.vue';
import SimpleTriggerList from '../SimpleTriggerList.vue';
import TriggerList from '../TriggerList.vue';

@Component({
	components:{
		Icon,
		ToggleBlock,
		TriggerList,
		SimpleTriggerList,
	}
})
class TriggerActionTriggerEntry extends Vue {

	@Prop()
	public action!:TriggerActionTriggerData;
	@Prop()
	public triggerData!:TriggerData;
	@Prop()
	public rewards!:TwitchDataTypes.Reward[];

	public dependencyLoopInfos:{label: string, icon: string, iconURL?: string | undefined, iconBgColor?: string | undefined}[] = [];

	public get discordURL():string { return Config.instance.DISCORD_URL; }

	public mounted():void {
		watch(()=>this.action.triggerId, ()=> {
			this.buildDependencyLoop();
		});
		watch(()=>this.triggerData.type, ()=> {
			this.buildDependencyLoop();
		});
		this.buildDependencyLoop();
	}

	public onSelectTrigger(id:string):void {
		const trigger = this.$store.triggers.triggerList.find(v=>v.id == id);
		if(!trigger) return;
		this.action.triggerId = trigger.id;
		this.buildDependencyLoop();
	}

	public openTrigger():void {
		const trigger = this.$store.triggers.triggerList.find(v=>v.id == this.action.triggerId);
		if(trigger) this.$store.triggers.openTriggerEdition(trigger)
	}

	private buildDependencyLoop():void {
		const links = this.recursiveLoopCheck(this.triggerData);
		if(links.length > 0) {
			links.push(links[0]);
			this.dependencyLoopInfos = links.map(v => {
				return TriggerUtils.getTriggerDisplayInfo(v)
			});
		}else{
			this.dependencyLoopInfos = [];
		}
	}

	private recursiveLoopCheck(base:TriggerData, doneIds:{[key:string]:boolean} = {}):TriggerData[] {
		if(!this.action.triggerId) return [];
		const triggers = this.$store.triggers.triggerList;
		let found:TriggerData[] = [];

		if(!base.actions) return [];

		for (let i = 0; i < base.actions.length; i++) {
			const a = base.actions[i];
			//Ignore if it's not related to the current action
			//This avoids showing a dependency loop an another action of
			//the current trigger if it's not the source of the looped dependency
			if(base == this.triggerData && a.id != this.action.id) continue;

			//If it's a trigger action
			if(a.type == "trigger") {
				//If the trigger to be called is the current one, a loop is detected
				if(a.triggerId == this.triggerData.id) {
					found.push(base);
					break;
				//If it's not the current trigger and this trigger has not yet been parsed, check deeper
				//Ignore if the trigger was already parsed to avoid detecting a loop external to the
				//current trigger. For exemple, if the selected trigger leads to a dependency loop
				//that is not part of the current trigger, this would lead to an infinite recursion.
				}else if(a.triggerId && doneIds[a.triggerId] !== true) {
					doneIds[a.triggerId] = true;
					//Check deeper
					const t = triggers.find(v=>v.id == a.triggerId);
					if(t) {
						const list = this.recursiveLoopCheck( t, doneIds );
						if(list.length > 0) {
							found.push(base);
							found = found.concat( list );
						}
					}
				}
			}
		}
		return found;
	}

}
export default toNative(TriggerActionTriggerEntry);
</script>

<style scoped lang="less">
.triggeractiontriggerentry{
	.field {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: .5em;
		&.col {
			flex-direction: column;
		}

		.icon {
			height: 1em;
			margin-top: -5px;
		}

		.list {
			flex-grow: 1;
			max-height: 300px;
			width: 100%;
		}

		.openTriggerBt{
			height: 1em;
			transition: transform .2s;
			color: var(--color-text);
			&:hover {
				transform: scale(1.2);
			}
		}
	}

	.dependencyLoop{
		display: flex;
		flex-direction: column;
		align-items: center;

		.title {
			font-weight: bold;
			margin-bottom: .25em;
		}

		.head {
			margin-bottom: .5em;
		}

		.loopItem {
			cursor: default;

			&:not(:last-child) {
				&:after {
					display: block;
					content:"↓";
					margin: .25em 0;
					text-align: center;
				}
			}

			&:not(.loopItem ~ .loopItem),//This means "first item with class .loopItem"
			&:last-child {
				.loopInfo {
					background-color: var(--color-alert-light);
				}
			}

			.loopInfo {
				border-radius: .25em;
				padding: .25em;
				background-color: var(--color-alert-dark);
				box-shadow: 3px 3px 3px rgba(0,0,0,.35);
				img {
					height: 1em;
					vertical-align: middle;
					margin-right: .25em;
				}
			}
		}
	}

	.disclaimer {
		font-size: .9em;
		line-height: 1.3em;
	}
}
</style>
