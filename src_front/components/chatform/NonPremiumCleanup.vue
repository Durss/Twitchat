<template>
	<div class="nonpremiumcleanup modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<h1 class="title"><Icon name="alert" /> {{ $t('premium.cleanup.title') }}</h1>
				<ClearButton @click="close()" v-if="!$store.main.nonPremiumLimitExceeded" />
			</div>
			<div class="content">
				<span class="subtitle">{{ $t('premium.cleanup.description') }}</span>
				<TTButton icon="premium" class="premiumBt" big premium @click="openPremium()">{{ $t("premium.become_premiumBt") }}</TTButton>

				<ToggleBlock :icons="['broadcast']" :title="$t('params.categories.triggers')" :alert="!triggersOK" :open="!triggersOK"
				v-if="$store.triggers.triggerList.length > 0">
					<template #right_actions>
						<Icon :name="(triggersOK? 'checkmark' : 'alert')" />
						<strong>{{triggerCount}}/{{ $config.MAX_TRIGGERS }}</strong>
					</template>
					<div class="itemList">
						<TriggerListFolderItem
							v-model:items="folderTriggerList"
							:noEdit="true"
							:forceDisableOption="true"
							@change="onToggleTrigger()" />
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['count']" :title="$t('params.categories.counters')" :alert="!countersOK" :open="!countersOK"
				v-if="$store.counters.counterList.length > 0">
					<template #right_actions>
						<Icon :name="(countersOK? 'checkmark' : 'alert')" />
						<strong>{{$store.counters.counterList.filter(v=>v.enabled !== false).length}}/{{ $config.MAX_COUNTERS }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store.counters.counterList" @click="toggleCounter(item)">
							<span class="label"><Icon name="count" />{{ item.name }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleCounter()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['placeholder']" :title="$t('params.categories.values')" :alert="!valuesOK" :open="!valuesOK"
				v-if="$store.values.valueList.length > 0">
					<template #right_actions>
						<Icon :name="(valuesOK? 'checkmark' : 'alert')" />
						<strong>{{$store.values.valueList.filter(v=>v.enabled !== false).length}}/{{ $config.MAX_VALUES }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store.values.valueList" @click="toggleValue(item)">
							<span class="label"><Icon name="count" />{{ item.name }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleValue()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['heat']" :title="$t('params.categories.heat')" :alert="!heatOK" :open="!heatOK"
				v-if="$store.heat.screenList.length > 0">
					<template #right_actions>
						<Icon :name="(heatOK? 'checkmark' : 'alert')" />
						<strong>{{$store.heat.screenList.filter(v=>v.enabled !== false).length}}/{{ $config.MAX_CUSTOM_HEAT_SCREENS }}</strong>
					</template>
					<div class="itemList heat">
						<div class="rowItem" v-for="item in $store.heat.screenList" @click="toggleHeat(item)">
							<HeatScreenPreview class="heatScreen" :screen="item" />
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleHeat()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['badge']" :title="$t('premium.cleanup.custom_badges')" :alert="!badgesOK" :open="!badgesOK"
				v-if="$store.users.customBadgeList.length > 0">
					<template #right_actions>
						<Icon :name="(badgesOK? 'checkmark' : 'alert')" />
						<strong>{{$store.users.customBadgeList.filter(v=>v.enabled !== false).length}}/{{ $config.MAX_CUSTOM_BADGES }}</strong>
					</template>
					<div class="itemList badges">
						<div class="rowItem" v-for="item in $store.users.customBadgeList" @click="toggleBadge(item)">
							<img :src="item.img" alt="custom badge">
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleBadge()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['badge','user']" :title="$t('premium.cleanup.custom_badges_attribution')" :alert="!badgesUserOK" :open="!badgesUserOK"
				v-if="userBadges.length > 0">
					<template #right_actions>
						<Icon :name="(badgesUserOK? 'checkmark' : 'alert')" />
						<strong>{{userBadges.length}}/{{ $config.MAX_CUSTOM_BADGES_ATTRIBUTION }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="user in userBadges" v-tooltip="$t('premium.cleanup.custom_badges_attribution_remove')" @click="deleteUserBadges(user)">
							<div class="label">
								<span class="username">{{ user.displayName }}</span>
								<span class="small" v-if="user.displayName != user.displayNameOriginal">({{ user.displayNameOriginal }})</span>
								<div class="badgeList">
									<img class="badge card-item" :src="$store.users.customBadgeList.find(v=>v.id == badge.id)?.img" alt="custom badge" v-for="badge in $store.users.customUserBadges[user.id]">
								</div>
							</div>
							<div class="deleteBt">
								<Icon name="trash"/>
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['user']" :title="$t('premium.cleanup.custom_usernames')" :alert="!usernamesOK" :open="!usernamesOK"
				v-if="Object.keys($store.users.customUsernames).length > 0">
					<template #right_actions>
						<Icon :name="(usernamesOK? 'checkmark' : 'alert')" />
						<strong>{{Object.keys($store.users.customUsernames).length}}/{{ $config.MAX_CUSTOM_USERNAMES }}</strong>
					</template>
					<div class="itemList users">
						<div class="rowItem" v-for="user in usernames" v-tooltip="$t('premium.cleanup.custom_username_remove')" @click="deleteUsername(user)">
							<span class="label">{{ user.displayName }}</span>
							<span class="label small" v-if="user.displayName != user.displayNameOriginal">({{ user.displayNameOriginal }})</span>
							<Icon name="trash" theme="alert" />
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['distort']" :title="$t('premium.cleanup.distortion')" :alert="!distortionsOK" :open="!distortionsOK"
				v-if="$store.heat.distortionList.length > 0">
					<template #right_actions>
						<Icon :name="(distortionsOK? 'checkmark' : 'alert')" />
						<strong>{{$store.heat.distortionList.filter(v=>v.enabled).length}}/{{ $config.MAX_DISTORTION_OVERLAYS }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store.heat.distortionList">
							<span class="label">{{ item.name || [item.obsItemPath.sceneName, item.obsItemPath.groupName, item.obsItemPath.source?.name].filter(v=>v!='').join(" => ") }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleDistortion()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['bingo_grid']" :title="$t('premium.cleanup.bingo_grids')" :alert="!bingoGridsOK" :open="!bingoGridsOK"
				v-if="$store.bingoGrid.gridList.length > 0">
					<template #right_actions>
						<Icon :name="(bingoGridsOK? 'checkmark' : 'alert')" />
						<strong>{{$store.bingoGrid.gridList.filter(v=>v.enabled).length}}/{{ $config.MAX_BINGO_GRIDS }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store.bingoGrid.gridList">
							<span class="label">{{ item.title }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleBingoGrid(item)" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['label']" :title="$t('premium.cleanup.labels')" :alert="!labelsOK" :open="!labelsOK"
				v-if="$store.labels.labelList.length > 0">
					<template #right_actions>
						<Icon :name="(labelsOK? 'checkmark' : 'alert')" />
						<strong>{{$store.labels.labelList.filter(v=>v.enabled).length}}/{{ $config.MAX_LABELS }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store.labels.labelList">
							<span class="label">{{ item.title }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleLabel(item)" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['timer']" :title="$t('premium.cleanup.timers')" :alert="!timersOK" :open="!timersOK"
				v-if="$store.timers.timerList.filter(v=>!v.isDefault).length > 0">
					<template #right_actions>
						<Icon :name="(timersOK? 'checkmark' : 'alert')" />
						<strong>{{$store.timers.timerList.filter(v=>v.enabled && !v.isDefault).length}}/{{ $config.MAX_TIMERS }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store.timers.timerList.filter(v=>!v.isDefault)">
							<span class="label">{{ item.title }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleTimer(item)" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['animate']" :title="$t('premium.cleanup.animated_text')" :alert="!animatedTextsOK" :open="!animatedTextsOK"
				v-if="$store.animatedText.animatedTextList.filter(v=>v.enabled).length > 0">
					<template #right_actions>
						<Icon :name="(animatedTextsOK? 'checkmark' : 'alert')" />
						<strong>{{$store.animatedText.animatedTextList.filter(v=>v.enabled).length}}/{{ $config.MAX_ANIMATED_TEXT }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store.animatedText.animatedTextList">
							<span class="label">{{ item.title || $t("overlay.animatedText.default_title") }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleAnimatedText(item)" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['train']" :title="$t('premium.cleanup.custom_train')" :alert="!customTrainOK" :open="!customTrainOK"
				v-if="$store.customTrain.customTrainList.filter(v=>v.enabled).length > 0">
					<template #right_actions>
						<Icon :name="(customTrainOK? 'checkmark' : 'alert')" />
						<strong>{{$store.customTrain.customTrainList.filter(v=>v.enabled).length}}/{{ $config.MAX_CUSTOM_TRAIN }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store.customTrain.customTrainList">
							<span class="label">{{ item.title || $t("overlay.customTrain.default_title") }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleCustomTrain(item)" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<div class="card-item warning" v-if="!allOK">{{ $t("premium.cleanup.disable_more_items") }}</div>
				<TTButton class="completeBt" icon="checkmark" v-else @click="close()">{{ $t("premium.cleanup.completeBt") }}</TTButton>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { HeatScreen } from '@/types/HeatDataTypes';
import type { LabelItemData } from '@/types/ILabelOverlayData';
import type { TriggerData, TriggerTreeItemData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TriggerUtils from '@/utils/TriggerUtils';
import { gsap } from 'gsap/all';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ToggleButton from '../ToggleButton.vue';
import HeatScreenPreview from '../params/contents/heat/areas/HeatScreenPreview.vue';
import type { TriggerListEntry, TriggerListFolderEntry } from '../params/contents/triggers/TriggerList.vue';
import TriggerListFolderItem from '../params/contents/triggers/TriggerListFolderItem.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
		ToggleBlock,
		ToggleButton,
		HeatScreenPreview,
		TriggerListFolderItem,
	},
	emits:["close"],
})
class NonPremiumCleanup extends Vue {

	public get triggersOK():boolean { return this.triggerCount <= this.$config.MAX_TRIGGERS; }
	public get countersOK():boolean { return this.$store.counters.counterList.filter(v=>v.enabled !== false).length <= this.$config.MAX_COUNTERS; }
	public get valuesOK():boolean { return this.$store.values.valueList.filter(v=>v.enabled !== false).length <= this.$config.MAX_VALUES; }
	public get heatOK():boolean { return this.$store.heat.screenList.filter(v=>v.enabled !== false).length <= this.$config.MAX_CUSTOM_HEAT_SCREENS; }
	public get badgesOK():boolean { return this.$store.users.customBadgeList.filter(v=>v.enabled !== false).length <= this.$config.MAX_CUSTOM_BADGES; }
	public get badgesUserOK():boolean { return Object.keys(this.$store.users.customUserBadges).length <= this.$config.MAX_CUSTOM_BADGES_ATTRIBUTION; }
	public get usernamesOK():boolean { return Object.keys(this.$store.users.customUsernames).length <= this.$config.MAX_CUSTOM_USERNAMES; }
	public get distortionsOK():boolean { return this.$store.heat.distortionList.filter(v=>v.enabled).length <= this.$config.MAX_DISTORTION_OVERLAYS; }
	public get bingoGridsOK():boolean { return this.$store.bingoGrid.gridList.filter(v=>v.enabled).length <= this.$config.MAX_BINGO_GRIDS; }
	public get labelsOK():boolean { return this.$store.labels.labelList.filter(v=>v.enabled).length <= this.$config.MAX_LABELS; }
	public get timersOK():boolean { return this.$store.timers.timerList.filter(v=>v.enabled && !v.isDefault).length <= this.$config.MAX_TIMERS; }
	public get animatedTextsOK():boolean { return this.$store.animatedText.animatedTextList.filter(v=>v.enabled).length <= this.$config.MAX_ANIMATED_TEXT; }
	public get customTrainOK():boolean { return this.$store.customTrain.customTrainList.filter(v=>v.enabled).length <= this.$config.MAX_CUSTOM_TRAIN; }
	public get allOK():boolean {
		return this.triggersOK
			&& this.countersOK
			&& this.valuesOK
			&& this.heatOK
			&& this.badgesOK
			&& this.badgesUserOK
			&& this.usernamesOK
			&& this.distortionsOK
			&& this.bingoGridsOK
			&& this.labelsOK
			&& this.timersOK
			&& this.animatedTextsOK
			&& this.customTrainOK
		;
	}

	public folderTriggerList:(TriggerListEntry|TriggerListFolderEntry)[] = [];

	public get triggerCount():number {
		return this.$store.triggers.triggerList.filter(v=>v.enabled !== false && this.$store.triggers.triggerIdToFolderEnabled[v.id] !== false).length;
	}

	public get userBadges():TwitchatDataTypes.TwitchatUser[] {
		const res:TwitchatDataTypes.TwitchatUser[] = [];
		const badges = this.$store.users.customUserBadges;
		for (const uid in badges) {
			if(badges[uid]?.length > 0) {
				res.push(this.$store.users.getUserFrom(badges[uid][0].platform, badges[uid][0].channel, uid as string));
			}
		}
		return res;
	}

	public get usernames():TwitchatDataTypes.TwitchatUser[] {
		const res:TwitchatDataTypes.TwitchatUser[] = [];
		const user = this.$store.users.customUsernames;
		for (const uid in user) {
			res.push(this.$store.users.getUserFrom(user[uid].platform, user[uid].channel, uid as string));
		}
		return res;
	}

	public get triggerList():TriggerListEntry[] {
		const triggers = this.$store.triggers.triggerList;
		const entries = triggers.map((trigger, index) => {
			const info = TriggerUtils.getTriggerDisplayInfo(trigger);
			const entry:TriggerListEntry = { type:"trigger", id:trigger.id, index, label:info.label, trigger, icon:info.icon, iconURL:info.iconURL, canTest:false };
			return entry;
		})
		return entries;
	}

	public mounted():void {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});

		this.$store.counters.counterList.forEach(v=> v.enabled = v.enabled === undefined? true : v.enabled);
		this.$store.values.valueList.forEach(v=> v.enabled = v.enabled === undefined? true : v.enabled);
		this.$store.users.customBadgeList.forEach(v=> v.enabled = v.enabled === undefined? true : v.enabled);

		// console.log(StoreProxy.counters.counterList.filter(v=>v.enabled != false).length > Config.instance.MAX_COUNTERS);
		// console.log(StoreProxy.values.valueList.filter(v=>v.enabled != false).length > Config.instance.MAX_VALUES);
		// console.log(this.triggerList.length, StoreProxy.triggers.triggerList.filter(v=>v.enabled != false).length > Config.instance.MAX_TRIGGERS);
		// console.log(StoreProxy.heat.screenList.filter(v=>v.enabled != false).length > Config.instance.MAX_CUSTOM_HEAT_SCREENS);
		// console.log(StoreProxy.users.customBadgeList.filter(v=>v.enabled != false).length > Config.instance.MAX_CUSTOM_BADGES);
		// console.log(Object.keys(StoreProxy.users.customUserBadges).length > Config.instance.MAX_CUSTOM_BADGES_ATTRIBUTION);
		// console.log(Object.keys(StoreProxy.users.customUsernames).length > Config.instance.MAX_CUSTOM_USERNAMES);
		// console.log(StoreProxy.heat.distortionList.filter(v=>v.enabled).length > Config.instance.MAX_DISTORTION_OVERLAYS);

		//Build folder structure
		const triggerList = this.$store.triggers.triggerList;
		const idToHasFolder:{[key:string]:boolean} = {};

		const flatList = triggerList.map<TriggerListEntry>(v=> {
			const info = TriggerUtils.getTriggerDisplayInfo(v);
			return { type:"trigger", index:0, label:info.label, id:v.id, trigger:v, icon:info.icon, iconURL:info.iconURL, canTest:false }
		})

		function buildItem(items:TriggerTreeItemData[]):(TriggerListEntry|TriggerListFolderEntry)[] {
			const res:(TriggerListEntry|TriggerListFolderEntry)[] = [];
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if(item.type == "folder") {
					const children = buildItem(item.children || []);
					res.push({type:"folder",
							id:item.id,
							label:item.name!,
							items:children,
							color:{type:"color", value:item.color || "#60606c"},
							expand:item.expand == true,
							enabled:item.enabled !== false});
				}else{
					const entry = flatList.find(v=> v.trigger.id == item.triggerId);
					if(entry && !idToHasFolder[entry.id]) {
						idToHasFolder[entry.id] = true;
						res.push(entry);
					}
				}
			}
			return res;
		}
		this.folderTriggerList = buildItem(this.$store.triggers.triggerTree);
		for (let i = 0; i < this.triggerList.length; i++) {
			const t = this.triggerList[i];
			if(!idToHasFolder[t.id]) {
				idToHasFolder[t.id] = true;
				this.folderTriggerList.push(t);
			}
		}
	}

	public async close():Promise<void> {
		//Don't close if there still are limits exceed
		if(this.$store.main.nonPremiumLimitExceeded) return;

		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	public toggleTrigger(item?:TriggerData):void {
		if(item) item.enabled = !item.enabled;
		this.$store.triggers.saveTriggers();
	}

	public deleteUserBadges(user:TwitchatDataTypes.TwitchatUser):void {
		this.$confirm( this.$t("premium.cleanup.delete_badges_title"), this.$t("premium.cleanup.delete_badges_description")).then(()=>{
			delete this.$store.users.customUserBadges[user.id];
			this.$store.users.saveCustomBadges();
		}).catch(()=>{});
	}

	public deleteUsername(user:TwitchatDataTypes.TwitchatUser):void {
		this.$confirm( this.$t("premium.cleanup.delete_name_title"), this.$t("premium.cleanup.delete_name_description")).then(()=>{
			delete this.$store.users.customUsernames[user.id];
			this.$store.users.saveCustomUsername();
		}).catch(()=>{});
	}

	public deleteDistortion(data:TwitchatDataTypes.HeatDistortionData):void {
		this.$confirm( this.$t("premium.cleanup.delete_distortion_title"), this.$t("premium.cleanup.delete_distortion_description")).then(()=>{
			this.$store.heat.deleteDistorsion(data);
		}).catch(()=>{});
	}

	public toggleCounter(item?:TwitchatDataTypes.CounterData):void {
		if(item) item.enabled = !item.enabled;
		this.$store.counters.saveCounters();
	}

	public toggleValue(item?:TwitchatDataTypes.ValueData):void {
		if(item) item.enabled = !item.enabled;
		this.$store.values.saveValues();
	}

	public toggleHeat(item?:HeatScreen):void {
		if(item) item.enabled = !item.enabled;
		this.$store.heat.saveScreens();
	}

	public toggleBadge(item?:TwitchatDataTypes.TwitchatCustomUserBadge):void {
		if(item) item.enabled = !item.enabled;
		this.$store.users.saveCustomBadges();
	}

	public toggleDistortion(item?:TwitchatDataTypes.HeatDistortionData):void {
		this.$store.heat.saveDistorsions();
	}

	public toggleBingoGrid(item:TwitchatDataTypes.BingoGridConfig):void {
		this.$store.bingoGrid.saveData(item.id);
	}

	public toggleLabel(item:LabelItemData):void {
		this.$store.labels.saveData(item.id);
	}

	public toggleTimer(item:TwitchatDataTypes.TimerData):void {
		this.$store.timers.saveData();
	}

	public toggleAnimatedText(item:TwitchatDataTypes.AnimatedTextData):void {
		this.$store.animatedText.saveData();
	}

	public toggleCustomTrain(item:TwitchatDataTypes.CustomTrainData):void {
		this.$store.customTrain.saveData();
	}

	public onToggleTrigger():void {
		function buildItem(root:TriggerListEntry|TriggerListFolderEntry):TriggerTreeItemData {
			switch(root.type) {
				case "folder":{
					return {type:"folder",
							id:root.id,
							name:root.label,
							expand:root.expand === true,
							color:root.color.value,
							enabled:root.enabled !== false,
							children:root.items.map(v=> buildItem(v))
						};
				}
				default:
				case "trigger":{
					return {type:"trigger", id:root.id, triggerId:root.id};
				}
			}
		}
		const tree = this.folderTriggerList.map(v => buildItem(v));
		this.$store.triggers.updateTriggerTree(tree);
	}

}
export default toNative(NonPremiumCleanup);
</script>

<style scoped lang="less">
.nonpremiumcleanup{
	// z-index: 2;

	.premiumBt {
		display: flex;
		margin: auto;
	}

	.content {
		gap: 1em;
		display: flex;
		flex-direction: column;

		.completeBt {
			flex-shrink: 0;
			margin: auto;
		}
	}

	.holder {
		margin-top: calc(0px - var(--chat-form-height) / 2) !important;
		max-height: calc(var(--vh) - var(--chat-form-height));
	}

	.warning {
		flex-shrink: 0;
		padding: .5em;
		margin: 0 auto;
		font-style: italic;
		background-color: var(--color-secondary-fader);
	}

	.itemList {
		gap: 1px;
		display: flex;
		flex-direction: column;
		.rowItem {
			box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
			background-color: var(--background-color-fadest);
			border-radius: .5em;
			padding: 0;
			gap: .5em;
			display: flex;
			flex-direction: row;
			min-height: 1.5em;
			position: relative;
			transition: background-color .1s;
			cursor: pointer;

			&:hover {
				background-color: var(--background-color-fader);
			}
			.label {
				flex-grow: 1;
				gap: .5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				color: var(--color-text);
				padding: 0;
				margin-left: .5em;
				.icon {
					height: 1.5em;
					width: 1.5em;
					padding: 0.25em;
					object-fit: fill;
					margin-right: .5em;
				}

				.username {
					padding-left: .5em;
				}

				.small {
					font-style: italic;
					font-size: .9em;
					margin-left: -.5em;
				}
				.badgeList {
					gap: .5em;
					display: flex;
					flex-direction: row;
					.badge {
						padding: .25em;
						height: 2em;
					}
				}
			}
			.icon {
				height: 1em;
			}

			.heatScreen {
				pointer-events: none;
				flex-grow: 1;
			}
			.toggle, .deleteBt, .badgeList {
				padding: 0 .5em;
				border-left: 1px solid var(--color-dark-light);
			}
			.deleteBt {
				display: flex;
				align-items: center;
			}
		}
		&.heat, &.badges, &.users {
			gap: 1em;
			width: 100%;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			.rowItem {
				max-width: 200px;
				flex-grow: 1;
				align-items: center;
			}
		}

		&.badges {
			.rowItem {
				max-width: fit-content;
			}
		}

		&.users {
			.rowItem {
				padding: .5em;
				max-width: fit-content;
			}
		}
	}
}
</style>
