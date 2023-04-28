<template>
	<div class="triggeractiontriggerentry">
			
		<i18n-t scope="global" class="info" tag="p" keypath="triggers.actions.trigger.beta">
			<template #LINK>
				<a :href="discordURL" target="_blank">{{ $t("triggers.actions.trigger.beta_link") }}</a>
			</template>
			<template #BR>
				<br>
			</template>
		</i18n-t>

		<div class="row item field col" v-if="!action.triggerId">
			<div class="item title" v-if="rewards.length > 0 && !action.triggerId">{{$t('triggers.actions.trigger.select')}}</div>
	
			<TriggerList class="list"
			noEdit
			:rewards="rewards"
			@select="onSelectTrigger($event)" />
		</div>

		<div class="row item field" v-else>
			<img src="@/assets/icons/broadcast.svg" class="icon">
			<div class="item title">{{$t('triggers.actions.trigger.selected')}}</div>
			<TriggerList
				noEdit
				:triggerId="action.triggerId"
				:rewards="rewards"
				@select="action.triggerId = ''" />
		</div>

		<ToggleBlock class="item" :title="$t('triggers.actions.trigger.warning_title')" :open="false" small>
			<p>{{ $t("triggers.actions.trigger.warning") }}</p>
			<strong>{{ $t("global.example") }}</strong>
			<span v-html="$t('triggers.actions.trigger.warning_example')"></span>
		</ToggleBlock>
		
		<div v-if="dependencyLoopInfos.length > 0" class="dependencyLoop">
			<div class="title">{{ $t("triggers.actions.trigger.loop") }}</div>
			<div class="head">{{ $t("triggers.actions.trigger.loop_delails") }}</div>
			<div v-for="(d, index) in dependencyLoopInfos" :key="index" class="loopItem">
				<div class="loopInfo">
					<img v-if="d.iconURL" :src="d.iconURL" :alt="d.label">
					<img v-if="d.icon" :src="$image('icons/'+d.icon+'.svg')" :alt="d.icon">
					<span class="label">{{ d.label }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TriggerActionTriggerData, TriggerData, TriggerTypeDefinition } from '@/types/TriggerActionDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ToggleBlock from '../../../../ToggleBlock.vue';
import TriggerList from '../TriggerList.vue';

@Component({
	components:{
		ToggleBlock,
		TriggerList,
	}
})
export default class TriggerActionTriggerEntry extends Vue {

	@Prop
	public action!:TriggerActionTriggerData;
	@Prop
	public triggerData!:TriggerData;
	@Prop
	public rewards!:TwitchDataTypes.Reward[];

	public dependencyLoopInfos:{label: string, icon: string, iconURL?: string | undefined, iconBgColor?: string | undefined}[] = [];
	public triggerList:{triggerKey:string, label?:string, labelKey?:string, trigger:TriggerData, info:TriggerTypeDefinition}[] = [];
	
	public get discordURL():string { return Config.instance.DISCORD_URL; }

	/**
	 * Gets a trigger's icon
	 */
	public getIcon(e:TriggerTypeDefinition):string {
		if(!e.icon) return "";
		if(e.icon.indexOf("/") > -1) {
			return e.icon as string;
		}
		return this.$image("icons/"+e.icon+".svg");
	}

	public mounted():void {
		watch(()=>this.action.triggerId, ()=> {
			this.buildDependencyLoop();
		});
		watch(()=>this.triggerData.type, ()=> {
			this.buildDependencyLoop();
		});
		this.buildDependencyLoop();
	}

	public onSelectTrigger(trigger:TriggerData):void {
		this.action.triggerId = trigger.id;
		this.buildDependencyLoop();
	}

	private buildDependencyLoop():void {
		const links = this.recursiveLoopCheck(this.triggerData);
		if(links.length > 0) {
			links.push(links[0]);
			this.dependencyLoopInfos = links.map(v => {
				return Utils.getTriggerDisplayInfo(v)
			});
		}else{
			this.dependencyLoopInfos = [];
		}
	}

	private recursiveLoopCheck(base:TriggerData):TriggerData[] {
		if(!this.action.triggerId) return [];
		const triggers = this.$store("triggers").triggerList;
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
				}else if(a.triggerId) {
					//Check deeper
					const t = triggers.find(v=>v.id == a.triggerId);
					if(t) {
						const list = this.recursiveLoopCheck( t );
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
</script>

<style scoped lang="less">
.triggeractiontriggerentry{
	.triggerActionForm();

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

		.title {
			min-width: 150px;
		}
		
		.list {
			flex-grow: 1;
			max-height: 300px;
			overflow-y: auto;
			border: 1px solid var(--mainColor_normal);
			border-radius: .5em;
			background-color: var(--mainColor_normal_extralight);
			padding: .5em;
		}
	}

	.dependencyLoop{
		background-color: var(--mainColor_alert);
		color: var(--mainColor_light);
		padding: .5em;
		border-radius: .5em;
		text-align: center;
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
				}
			}

			&:not(.loopItem ~ .loopItem),//This means "first item with class .loopItem"
			&:last-child {
				.loopInfo {
					background-color: darken(@mainColor_alert, 20%);
				}
			}

			.loopInfo {
				border: 1px solid var(--mainColor_light);
				border-radius: .25em;
				padding: .25em;
				background-color: darken(@mainColor_alert, 10%);
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