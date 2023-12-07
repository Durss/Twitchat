<template>
	<div class="rewardslist blured-background-window">

		<div v-if="!scopeGranted" class="scope scrollable">
			<p>{{ $t("rewards.manage.scope_grant") }}</p>
			<TTButton icon="lock_fit" primary @click="grantScopes()">{{ $t("rewards.manage.scope_grantBt") }}</TTButton>
		</div>

		<div v-else-if="loading" class="loader scrollable">
			<Icon class="loader" name="loader" />
			<p>{{ $t("global.loading") }}</p>
		</div>

		<div v-else-if="rewardToTransfer" class="transfer scrollable">
			<h1>{{ $t("rewards.manage.transfer_title") }}</h1>
			<RewardListTransferForm :reward="rewardToTransfer" @complete="onTranferComplete()" />
			<CloseButton @click="rewardToTransfer = null" />
		</div>

		<div v-else-if="rewardToEdit" class="edit scrollable">
			<RewardListEditForm :reward="rewardToEdit" />
			<CloseButton @click="rewardToEdit = null" />
		</div>

		<template v-else>
			<div class="rewards scrollable" v-if="manageableRewards.length > 0 || nonManageableRewards.length > 0">
				<div class="list">
					<h1>{{ $t("rewards.manage.title") }}</h1>
					<RewardListItem v-for="r in manageableRewards" :key="r.id" :reward="r" manageable @edit="rewardToEdit = $event" />
					<div class="empty" v-if="manageableRewards.length == 0">{{ $t("rewards.manage.empty") }}</div>
				</div>
				
				<div class="list" v-if="nonManageableRewards.length > 0">
					<h1>{{ $t("rewards.manage.not_manageable_title") }}</h1>
					<p>{{ $t("rewards.manage.not_manageable_description") }}</p>
					<RewardListItem v-for="r in nonManageableRewards" :key="r.id" :reward="r" :manageable="false" @transfer="transferReward" />
				</div>
			</div>
			<div class="empty" v-else>{{ $t("rewards.manage.empty") }}</div>
		</template>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import contenteditable from 'vue-contenteditable';
import { Component, Vue } from 'vue-facing-decorator';
import CloseButton from '../CloseButton.vue';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import ToggleButton from '../ToggleButton.vue';
import RewardListEditForm from './RewardListEditForm.vue';
import RewardListItem from './RewardListItem.vue';
import RewardListTransferForm from './RewardListTransferForm.vue';

@Component({
	components:{
		Icon,
		TTButton,
		CloseButton,
		ToggleButton,
		RewardListItem,
		contenteditable,
		RewardListEditForm,
		RewardListTransferForm,
	}
})
/**
 * This displays all the user's rewards.
 * 
 * This is, to date, actually NOT USED.
 * There is no API to redeem a reward and the API that
 * allows to enable/disable a reward is super restrictive.
 * An app can only update a reward it has created.
 */
export default class RewardsList extends Vue {

	public loading:boolean = true;
	public rewardToEdit:TwitchDataTypes.Reward|null = null;
	public rewardToTransfer:TwitchDataTypes.Reward|null = null;
	public nonManageableRewards:TwitchDataTypes.Reward[] = [];
	public manageableRewards:TwitchDataTypes.Reward[] = [];

	private clickHandler!:(e:MouseEvent) => void;

	public get scopeGranted():boolean { return TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])};

	public mounted():void {
		this.open();
		this.loadRewards();
		
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	public transferReward(reward:TwitchDataTypes.Reward):void {
		if(!TwitchUtils.requestScopes([TwitchScopes.MANAGE_REWARDS])) return;

		this.rewardToTransfer = reward;
	}

	public onTranferComplete():void {
		this.rewardToTransfer = null;
		this.loadRewards();
	}

	public grantScopes():void {
		TwitchUtils.requestScopes([TwitchScopes.LIST_REWARDS,TwitchScopes.MANAGE_REWARDS]);
	}

	private async loadRewards(forceReload:boolean = false):Promise<void> {
		this.loading = true;
		try {
			this.nonManageableRewards = await TwitchUtils.getRewards(forceReload);
			this.manageableRewards = await TwitchUtils.getRewards(forceReload, true);
		}catch(e) {
			//User is probably not an affiliate
			this.loading = false;
			return;
		}
		// this.rewards = this.rewards.filter(v => v.is_enabled);
		this.manageableRewards.sort((a, b) => a.cost - b.cost);
		this.loading = false;

		//Filter out manageable rewards from the list
		this.nonManageableRewards = this.nonManageableRewards
					.filter(v=> this.manageableRewards.findIndex(w=>w.id == v.id) == -1)
					.sort((a, b) => a.cost - b.cost);
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.2, scaleX:0, delay:.1, clearProps:"scaleX", ease:"back.out"});
		gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	private close():void {
		if(this.rewardToTransfer) return;
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.3, scaleX:0, ease:"back.in"});
		gsap.to(ref, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY, scaleX", ease:"back.in", onComplete:() => {
			this.$emit("close");
		}});
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target && target.dataset.type != "ContextSubMenu") {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref && target.dataset.type != "ContextSubMenu") {
			this.close();
		}
	}
}
</script>

<style scoped lang="less">
.rewardslist{
	color: var(--color-text);

	.scrollable {
		height: 400px;
		width: 450px;
		max-width: 100%;
		max-height: 80%;
		overflow-x: hidden;
		overflow-y: auto;
		gap: 1em;
		display: flex;
		flex-direction: column;
		white-space: pre-line;

		&.loader {
			align-items: center;
			justify-content: center;
			margin: 0 auto;
			.icon {
				width: 30px;
				height: 30px;
			}
			p {
				color: #fff;
				font-style: italic;
				font-size: 1em;
			}
		}

		&.scope {
			align-items: center;
			justify-content: center;
			margin: 0 auto;
			p {
				max-width: 80%;
				text-align: center;
			}
		}

		&.rewards {
			gap: 2em;
		}
		h1 {
			text-align: center;
			width: 100%;
			position: sticky;
			top: 0;
			z-index: 1;
			background-color: var(--grayout);
			padding: 0 1.5em;
			line-height: 1.1em;
		}

		.list {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			h1 {
				position: sticky;
			}
		}
	}
	
	.empty {
		text-align: center;
	}
}
</style>