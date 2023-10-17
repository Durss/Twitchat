<template>
	<div class="nonpremiumcleanup modal">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<h1 class="title"><Icon name="alert" /> {{ $t('premium.cleanup.title') }}</h1>
				<CloseButton @click="close()" v-if="!$store('main').nonPremiumLimitExceeded" />
			</div>
			<div class="content">
				<span class="subtitle">{{ $t('premium.cleanup.description') }}</span>
				<Button icon="premium" class="premiumBt" big premium @click="openPremium()">{{ $t("premium.become_premiumBt") }}</Button>

				<ToggleBlock :icons="['broadcast']" :title="$t('params.categories.triggers')" :alert="!triggersOK" :open="!triggersOK"
				v-if="$store('triggers').triggerList.length > 0">
					<template #right_actions>
						<Icon :name="(triggersOK? 'checkmark' : 'alert')" />
						<strong>{{$store("triggers").triggerList.filter(v=>v.enabled === true).length}}/{{ $config.MAX_TRIGGERS }}</strong>
					</template>
					<div class="itemList">
						<TriggerListItem :entryData="item" v-for="item in triggerList" @click="toggleTrigger(item.trigger)" @changeState="toggleTrigger()" toggleMode />
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['count']" :title="$t('params.categories.counters')" :alert="!countersOK" :open="!countersOK"
				v-if="$store('counters').counterList.length > 0">
					<template #right_actions>
						<Icon :name="(triggersOK? 'checkmark' : 'alert')" />
						<strong>{{$store("counters").counterList.filter(v=>v.enabled !== false).length}}/{{ $config.MAX_COUNTERS }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store('counters').counterList" @click="toggleCounter(item)">
							<span class="label"><Icon name="count" />{{ item.name }} {{ item.enabled }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleCounter()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['placeholder']" :title="$t('params.categories.values')" :alert="!valuesOK" :open="!valuesOK"
				v-if="$store('values').valueList.length > 0">
					<template #right_actions>
						<Icon :name="(valuesOK? 'checkmark' : 'alert')" />
						<strong>{{$store("values").valueList.filter(v=>v.enabled !== false).length}}/{{ $config.MAX_VALUES }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="item in $store('values').valueList" @click="toggleValue(item)">
							<span class="label"><Icon name="count" />{{ item.name }}</span>
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleValue()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['heat']" :title="$t('params.categories.heat')" :alert="!heatOK" :open="!heatOK"
				v-if="$store('heat').screenList.length > 0">
					<template #right_actions>
						<Icon :name="(heatOK? 'checkmark' : 'alert')" />
						<strong>{{$store("heat").screenList.filter(v=>v.enabled !== false).length}}/{{ $config.MAX_CUSTOM_HEAT_SCREENS }}</strong>
					</template>
					<div class="itemList heat">
						<div class="rowItem" v-for="item in $store('heat').screenList" @click="toggleHeat(item)">
							<HeatScreenPreview class="heatScreen" :screen="item" />
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleHeat()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['heat']" :title="$t('premium.cleanup.custom_badges')" :alert="!badgesOK" :open="!badgesOK"
				v-if="$store('users').customBadgeList.length > 0">
					<template #right_actions>
						<Icon :name="(badgesOK? 'checkmark' : 'alert')" />
						<strong>{{$store('users').customBadgeList.filter(v=>v.enabled !== false).length}}/{{ $config.MAX_CUSTOM_BADGES }}</strong>
					</template>
					<div class="itemList badges">
						<div class="rowItem" v-for="item in $store('users').customBadgeList" @click="toggleBadge(item)">
							<img :src="item.img" alt="custom badge">
							<div class="toggle">
								<ToggleButton v-model="item.enabled" @change="toggleBadge()" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['heat']" :title="$t('premium.cleanup.custom_badges_attribution')" :alert="!badgesUserOK" :open="!badgesUserOK"
				v-if="Object.keys($store('users').customUserBadges).length > 0">
					<template #right_actions>
						<Icon :name="(badgesUserOK? 'checkmark' : 'alert')" />
						<strong>{{Object.keys($store('users').customUserBadges).length}}/{{ $config.MAX_CUSTOM_BADGES_ATTRIBUTION }}</strong>
					</template>
					<div class="itemList">
						<div class="rowItem" v-for="user in userBadges" v-tooltip="$t('premium.cleanup.custom_badges_attribution_remove')" @click="deleteUserBadges(user)">
							<div class="label">
								<span>{{ user.displayName }}</span>
								<span class="small" v-if="user.displayName != user.displayNameOriginal">({{ user.displayNameOriginal }})</span>
								<div class="badgeList">
									<img class="badge card-item" :src="$store('users').customBadgeList.find(v=>v.id == badge.id)?.img" alt="custom badge" v-for="badge in $store('users').customUserBadges[user.id]">
								</div>
							</div>
							<div class="deleteBt">
								<Icon name="trash" theme="alert" />
							</div>
						</div>
					</div>
				</ToggleBlock>

				<ToggleBlock :icons="['heat']" :title="$t('premium.cleanup.custom_usernames')" :alert="!usernamesOK" :open="!usernamesOK"
				v-if="Object.keys($store('users').customUsernames).length > 0">
					<template #right_actions>
						<Icon :name="(usernamesOK? 'checkmark' : 'alert')" />
						<strong>{{Object.keys($store('users').customUsernames).length}}/{{ $config.MAX_CUSTOM_USERNAMES }}</strong>
					</template>
					<div class="itemList users">
						<div class="rowItem" v-for="user in usernames" v-tooltip="$t('premium.cleanup.custom_username_remove')" @click="deleteUsername(user)">
							<span class="label">{{ user.displayName }}</span>
							<span class="label small" v-if="user.displayName != user.displayNameOriginal">({{ user.displayNameOriginal }})</span>
							<Icon name="trash" theme="alert" />
						</div>
					</div>
				</ToggleBlock>

				<Button class="completeBt" icon="checkmark" @click="close()">{{ $t("premium.cleanup.completeBt") }}</Button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/all';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import Icon from '../Icon.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ToggleButton from '../ToggleButton.vue';
import HeatScreenPreview from '../params/contents/heat/areas/HeatScreenPreview.vue';
import type { TriggerListEntry } from '../params/contents/triggers/TriggerList.vue';
import TriggerListItem from '../params/contents/triggers/TriggerListItem.vue';
import type { HeatScreen } from '@/types/HeatDataTypes';

//TODO add distort overlays

@Component({
	components:{
		Icon,
		Button,
		CloseButton,
		ToggleBlock,
		ToggleButton,
		TriggerListItem,
		HeatScreenPreview,
	},
	emits:["close"],
})
export default class NonPremiumCleanup extends Vue {

	public get triggersOK():boolean { return this.$store('triggers').triggerList.filter(v=>v.enabled === true).length <= this.$config.MAX_TRIGGERS; }
	public get countersOK():boolean { return this.$store('counters').counterList.filter(v=>v.enabled !== false).length <= this.$config.MAX_COUNTERS; }
	public get valuesOK():boolean { return this.$store('values').valueList.filter(v=>v.enabled !== false).length <= this.$config.MAX_VALUES; }
	public get heatOK():boolean { return this.$store('heat').screenList.filter(v=>v.enabled === true).length <= this.$config.MAX_CUSTOM_HEAT_SCREENS; }
	public get badgesOK():boolean { return this.$store('users').customBadgeList.filter(v=>v.enabled !== false).length <= this.$config.MAX_CUSTOM_BADGES; }
	public get badgesUserOK():boolean { return Object.keys(this.$store('users').customUserBadges).length <= this.$config.MAX_CUSTOM_BADGES_ATTRIBUTION; }
	public get usernamesOK():boolean { return Object.keys(this.$store('users').customUsernames).length <= this.$config.MAX_CUSTOM_USERNAMES; }

	public get userBadges():TwitchatDataTypes.TwitchatUser[] {
		const res:TwitchatDataTypes.TwitchatUser[] = [];
		const badges = this.$store('users').customUserBadges;
		for (const uid in badges) {
			res.push(this.$store("users").getUserFrom(badges[uid][0].platform, badges[uid][0].channel, uid as string));
		}
		return res;
	}

	public get usernames():TwitchatDataTypes.TwitchatUser[] {
		const res:TwitchatDataTypes.TwitchatUser[] = [];
		const user = this.$store('users').customUsernames;
		for (const uid in user) {
			res.push(this.$store("users").getUserFrom(user[uid].platform, user[uid].channel, uid as string));
		}
		return res;
	}

	public get triggerList():TriggerListEntry[] {
		const triggers = this.$store('triggers').triggerList;
		const entries = triggers.map((trigger, index) => {
			const info = Utils.getTriggerDisplayInfo(trigger);
			const entry:TriggerListEntry = { index, label:info.label, trigger, icon:info.icon, iconURL:info.iconURL, canTest:false };
			return entry;
		})
		return entries;
	}

	public mounted():void {
		// TwitchUtils.loadUserInfo(["102915378","642638701","123092401","226588311","231462936","37004815","599501960","608524090"]).then(res=>{
		// 	console.log(res);
		// })
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});

		this.$store('counters').counterList.forEach(v=> v.enabled = v.enabled === undefined? true : v.enabled);
		this.$store('values').valueList.forEach(v=> v.enabled = v.enabled === undefined? true : v.enabled);
		this.$store('users').customBadgeList.forEach(v=> v.enabled = v.enabled === undefined? true : v.enabled);
	}

	public async close():Promise<void> {
		//Don't close if there still are limits exceed
		if(this.$store("main").nonPremiumLimitExceeded) return;

		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	public openPremium():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	public toggleTrigger(item?:TriggerData):void {
		if(item) item.enabled = !item.enabled;
		this.$store("triggers").saveTriggers();
	}

	public deleteUserBadges(user:TwitchatDataTypes.TwitchatUser):void {
		this.$confirm( this.$t("premium.cleanup.delete_badges_title"), this.$t("premium.cleanup.delete_badges_description")).then(()=>{
			delete this.$store("users").customUserBadges[user.id];
			this.$store("users").saveCustomBadges();
		})
	}
	
	public deleteUsername(user:TwitchatDataTypes.TwitchatUser):void {
		this.$confirm( this.$t("premium.cleanup.delete_name_title"), this.$t("premium.cleanup.delete_name_description")).then(()=>{
			delete this.$store("users").customUsernames[user.id];
			this.$store("users").saveCustomUsername();
		})
	}

	public toggleCounter(item?:TwitchatDataTypes.CounterData):void {
		if(item) item.enabled = !item.enabled;
		this.$store("counters").saveCounters();
	}

	public toggleValue(item?:TwitchatDataTypes.ValueData):void {
		if(item) item.enabled = !item.enabled;
		this.$store("values").saveValues();
	}

	public toggleHeat(item?:HeatScreen):void {
		if(item) item.enabled = !item.enabled;
		this.$store("heat").saveScreens();
	}
	
	public toggleBadge(item?:TwitchatDataTypes.TwitchatCustomUserBadge):void {
		if(item) item.enabled = !item.enabled;
		this.$store("users").saveCustomBadges();
	}

}
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
			margin: auto;
		}
	}

	.holder {
		margin-top: calc(0px - var(--chat-form-height) / 2) !important;
		max-height: calc(var(--vh) - var(--chat-form-height));
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
				.icon {
					height: 1.5em;
					width: 1.5em;
					padding: 0.25em;
					object-fit: fill;
					margin-right: .5em;
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