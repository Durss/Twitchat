<template>
	<div class="rewardslist blured-background-window">

		<div v-if="!scopeGranted" class="scope scrollable">
			<p>{{ $t("rewards.manage.scope_grant") }}</p>
			<TTButton icon="lock_fit" primary @click="grantScopes()">{{ $t("rewards.manage.scope_grantBt") }}</TTButton>
		</div>

		<div v-else-if="loading && !rewardToTransfer" class="loader scrollable">
			<Icon class="loader" name="loader" />
			<p>{{ $t("global.loading") }}</p>
		</div>

		<div v-else-if="rewardToTransfer" class="transfer scrollable">
			<div class="head">
				<TTButton icon="back" @click="rewardToTransfer = null" class="backBt" transparent />
				<h1>{{ $t("rewards.manage.transfer_title") }}</h1>
			</div>
			<RewardListTransferForm :reward="rewardToTransfer" @transferDone="loadRewards(true)" />
		</div>

		<div v-else-if="rewardToEdit" class="edit scrollable">
			<div class="head">
				<TTButton icon="back" @click="rewardToEdit = null" class="backBt" transparent />
				<h1>{{ $t("rewards.manage.edit_title") }}</h1>
			</div>
			<RewardListEditForm :reward="rewardToEdit" @complete="onCreateComplete()" />
		</div>

		<div v-else-if="createReward" class="create scrollable">
			<div class="head">
				<TTButton icon="back" @click="createReward = false" class="backBt" transparent />
				<h1>{{ $t("rewards.manage.create_title") }}</h1>
			</div>
			<RewardListEditForm @complete="onCreateComplete()" />
		</div>

		<template v-else>
			<div class="rewards scrollable">
				<TTButton class="refreshBt" icon="refresh" transparent @click="loadRewards(true)" v-tooltip="$t('global.refresh')" />

				<div class="list">
					<div class="head"><h1>{{ $t("rewards.manage.title") }}</h1></div>
					<button @click="createReward = true" class="createRewardBt"><Icon name="add" /></button>
					<RewardListItem v-for="r in manageableRewards" :key="r.id" :reward="r" manageable @edit="rewardToEdit = $event" @delete="onDeleteReward()" />
				</div>
				
				<div class="list" v-if="nonManageableRewards.length > 0">
					<div class="head"><h1>{{ $t("rewards.manage.not_manageable_title") }}</h1></div>
					<p class="subtitle">{{ $t("rewards.manage.not_manageable_description") }}</p>
					<RewardListItem v-for="r in nonManageableRewards" :key="r.id" :reward="r" :manageable="false" @transfer="transferReward" />
				</div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
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
		ClearButton,
		ToggleButton,
		RewardListItem,
		RewardListEditForm,
		RewardListTransferForm,
	},
	emits:["close"]
})
/**
 * This displays all the user's rewards.
 */
class RewardsList extends Vue {

	public loading:boolean = true;
	public createReward:boolean = false;
	public rewardToEdit:TwitchDataTypes.Reward|null = null;
	public rewardToTransfer:TwitchDataTypes.Reward|null = null;
	public nonManageableRewards:TwitchDataTypes.Reward[] = [];
	public manageableRewards:TwitchDataTypes.Reward[] = [];

	private clickHandler!:(e:MouseEvent) => void;

	public get scopeGranted():boolean { return TwitchUtils.hasScopes([TwitchScopes.MANAGE_REWARDS])};

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
		this.loadRewards(true);
	}

	public onCreateComplete():void {
		this.createReward = false;
		this.rewardToEdit = null;
		this.loadRewards(true);
	}

	public onDeleteReward():void {
		this.loadRewards(true);
	}

	public grantScopes():void {
		TwitchUtils.requestScopes([TwitchScopes.LIST_REWARDS,TwitchScopes.MANAGE_REWARDS]);
	}

	public async loadRewards(forceReload:boolean = false):Promise<void> {
		console.log("REWARDS LIST LOAD");
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
		while(target != document.body
		&& target != ref
		&& target
		&& !target.classList.contains("confirmView")
		&& target.dataset.type != "ContextSubMenu") {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref
		&& !target.classList.contains("confirmView")
		&& target.dataset.type != "ContextSubMenu") {
			this.close();
		}
	}
}
export default toNative(RewardsList);
</script>

<style scoped lang="less">
.rewardslist{
	color: var(--color-text);
	padding: 0;

	.scrollable {
		height: 500px;
		width: 450px;
		max-height: 80%;
		max-width: 100%;
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
			.createRewardBt {
				transition: background-color .25s;
				background-color: var(--background-color-fader);
				border-radius: var(--border-radius);
				padding: 2em;
				width: calc(25% - 0.5em);
				.icon {
					height: 1em;
					color: var(--color-text);
					transition: transform .25s;
				}
				&:hover {
					background-color: var(--background-color-fade);
					.icon {
						transform: scale(1.5);
					}
				}
			}
			.refreshBt {
				position: absolute;
				top: 0;
				right: 0;
				z-index: 2;
				padding: .75em;
				padding-right: 1em;
			}
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

		.head {
			display: flex;
			flex-direction: row;
			justify-content: flex-start;
			align-items: center;
			width: 100%;
			position: sticky;
			top: 0;
			z-index: 1;
			line-height: 1.1em;
			background: linear-gradient(180deg, var(--color-text-inverse) 30%, var(--color-text-inverse-fadest) 100%);
			margin-bottom: -1em;

			h1 {
				text-align: center;
				flex-grow: 1;
				padding: .5em;
				padding-bottom: 1em;
				line-height: 1em;
			}

			.backBt {
				z-index: 1;
				padding: .75em;
				flex-shrink: 0;
			}
		}
		.subtitle {
			padding: 0 .5em;
		}
	}
	
	.empty {
		text-align: center;
	}
}

@media only screen and (max-width: 450px) {
	.rewardslist {
		.scrollable {
			height: 100%;
			width: 100%;
			max-height: 100%;
		}
	}
}
</style>