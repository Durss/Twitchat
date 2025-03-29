<template>
	<div :class="classes">
		<div class="infos" :style="styles">
			<img :src="icon" alt="reward icon">

			<contenteditable class="cost" tag="p"
				:no-nl="true"
				:no-html="true"
				v-model="localCost"
				:contenteditable="manageable !== false"
				@blur="validateCostValue()"
				@keydown="onKeyDown($event)" />

			<div class="indicators" v-if="reward.is_paused || !reward.is_enabled">
				<Icon name="pause" class="indicator" v-if="reward.is_paused" v-tooltip="$t('rewards.manage.pause_tt')" />
				<Icon name="ban" class="indicator" v-if="!reward.is_enabled" v-tooltip="$t('rewards.manage.disable_tt')" />
			</div>
		</div>

		<div class="ctas">
			<contenteditable class="title" tag="p"
				:no-nl="true"
				:no-html="true"
				v-model="localTitle"
				:contenteditable="manageable !== false"
				@blur="updateTitle()" />
	
			<TTButton v-if="manageable === true" class="settingsBt" small transparent @click="openMenu($event)" icon="settings" />
		</div>
		<TTButton v-if="manageable === false" icon="twitchat" @click="$emit('transfer', reward)" small secondary>{{$t("rewards.manage.transferBt")}}</TTButton>

	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import type * as CMTypes from "@imengyu/vue3-context-menu";
import ContextMenu from '@imengyu/vue3-context-menu';
import { h, type RendererElement, type RendererNode, type CSSProperties, type VNode } from 'vue';
import contenteditable from 'vue-contenteditable';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import Icon from '../Icon.vue';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import { TriggerTypes } from '@/types/TriggerActionDataTypes';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		Icon,
		TTButton,
		contenteditable,
	},
	emits:["transfer", "edit", "delete"],
})
class RewardListItem extends Vue {

	@Prop
	public reward!:TwitchDataTypes.Reward;

	@Prop({default:false, type:Boolean})
	public manageable!:boolean;

	public localCost:string = "";
	public localTitle:string = "";
	public loading:boolean = false;

	private updateDebounce:number = -1;

	public get icon():string{
		if(this.reward.image?.url_2x) return this.reward.image.url_2x;
		return this.reward.default_image.url_1x;
	}

	public get classes():string[] {
		const res = ["rewardlistitem"];
		if(this.loading) res.push("loading");
		if(this.reward.is_paused
		|| !this.reward.is_enabled
		|| this.manageable === false) res.push("disabled");
		return res;
	}

	public get styles():CSSProperties {
		const res = {
			backgroundColor:this.reward.background_color,
		};
		return res;
	}

	public beforeMount():void {
		this.localCost = this.reward.cost.toString();
		this.localTitle = this.reward.title;
	}

	/**
	 * Makes sure the cost is a number within the min/max range
	 */
	public validateCostValue():void {
		let txt = this.localCost;
		txt = txt.replace(",", ".").replace(/[^\d.]/g, "");
		let v = Math.max(1, Math.min(1000000000, parseFloat(txt)));
		if(isNaN(v)) v = 0;

		if(v == this.reward.cost) return;

		this.reward.cost = v;
		this.localCost = v.toString();

		this.loading = true;
		clearTimeout(this.updateDebounce);
		this.updateDebounce = window.setTimeout(async ()=> {
			await TwitchUtils.updateReward(this.reward.id, {cost: this.reward.cost});
			await Utils.promisedTimeout(250);
			this.loading = false;
		}, 250);
	}

	/**
	 * Called when enabling/disabling reward
	 * @param reward 
	 */
	public async updateRewardState():Promise<void> {
		this.loading = true;
		await TwitchUtils.updateReward(this.reward.id, {is_paused: this.reward.is_paused});
		await Utils.promisedTimeout(250);
		this.loading = false;
	}

	/**
	 * Called when enabling/disabling reward
	 * @param reward 
	 */
	public async updateTitle():Promise<void> {
		this.localTitle = this.localTitle.substring(0,45);
		if(this.localTitle == this.reward.title) return;
		
		this.loading = true;
		if(await TwitchUtils.updateReward(this.reward.id, {title: this.localTitle})) {
			this.reward.title = this.localTitle;
		}else{
			this.localTitle = this.reward.title;
		}
		await Utils.promisedTimeout(250);
		this.loading = false;
	}

	/**
	 * Increment/Decrement value with up and down keyboard arrows
	 * @param event 
	 */
	public onKeyDown(event:KeyboardEvent):void {
		let add = 0;
		switch(event.key) {
			case "ArrowUp": add = 1; break;
			case "ArrowDown": add = -1; break;
		}
		if(add != 0) {
			this.reward.cost += add;
			this.localCost = this.reward.cost.toString();
			this.validateCostValue();
		}else{
			let parsed = parseInt(this.localCost);
			if(isNaN(parsed)) parsed = 0;
			parsed = Math.max(1, Math.min(1000000000, parsed));
			this.localCost = parsed.toString();
		}
	}

	public async openMenu(e:MouseEvent):Promise<void> {
		if(!TwitchUtils.requestScopes([TwitchScopes.MANAGE_REWARDS])) return;
		
		e.preventDefault();
		const options:CMTypes.MenuItem[]= [];
		options.push({ 
					label: (this.reward.is_paused)? this.$t("rewards.manage.contextmenu_unpause") : this.$t("rewards.manage.contextmenu_pause"),
					icon: this.getIcon((this.reward.is_paused)? "icons/play.svg" : "icons/pause.svg"),
					onClick: async () => {
						this.loading = true;
						await TwitchUtils.updateReward(this.reward.id, {is_paused: !this.reward.is_paused});
						await Utils.promisedTimeout(250);
						this.reward.is_paused = !this.reward.is_paused;
						this.loading = false;
					}
				});
		options.push({ 
					label: (this.reward.is_enabled)? this.$t("rewards.manage.contextmenu_disable") : this.$t("rewards.manage.contextmenu_enable"),
					icon: this.getIcon("icons/disable.svg"),
					onClick: async () => {
						this.loading = true;
						await TwitchUtils.updateReward(this.reward.id, {is_enabled: !this.reward.is_enabled});
						await Utils.promisedTimeout(250);
						this.reward.is_enabled = !this.reward.is_enabled;
						this.loading = false;
					}
				});
		options.push({ 
					label: this.$t("rewards.manage.contextmenu_edit"),
					icon: this.getIcon("icons/edit.svg"),
					onClick: () => {
						this.$emit("edit", this.reward);
					}
				});
		options.push({ 
					label: this.$t("rewards.manage.contextmenu_delete"),
					icon: this.getIcon("icons/trash.svg"),
					customClass:"alert",
					onClick: () => {
						this.$confirm(this.$t("rewards.manage.contextmenu_delete_confirm_title"), this.$t("rewards.manage.contextmenu_delete_confirm_desc"))
						.then(async ()=> {
							await TwitchUtils.deleteReward(this.reward.id);
							this.$emit("delete");
						}).catch(() => { /* ignore */});
					}
				});

		const relatedTriggers = this.$store.triggers.triggerList.filter(v=>v.type == TriggerTypes.REWARD_REDEEM && v.rewardId == this.reward.id);
		if(relatedTriggers.length > 0) {
			options.push({ 
				label: this.$t("rewards.manage.contextmenu_trigger"),
				icon: this.getIcon("icons/broadcast.svg"),
				customClass:"alert",
				onClick: () => {
					relatedTriggers.forEach(t=> {
						this.$store.debug.simulateMessage<TwitchatDataTypes.MessageRewardRedeemData>(TwitchatDataTypes.TwitchatMessageType.REWARD, (message)=>{
							message.reward = {
								color:this.reward.background_color,
								cost:this.reward.cost,
								description:this.reward.prompt,
								icon:{
									sd:this.reward.image? this.reward.image.url_1x : this.reward.default_image.url_1x,
									hd:this.reward.image? this.reward.image.url_4x : this.reward.default_image.url_4x,
								},
								id:this.reward.id,
								title:this.reward.title,
							};
							TriggerActionHandler.instance.executeTrigger(t, message, false);
						}, false);
					})
				}
			});
		}

		ContextMenu.showContextMenu({
			theme: 'mac '+StoreProxy.common.theme,
			x: e.x,
			y: e.y,
			items: options,
			closeWhenScroll:false,
		});
	}

	private getIcon(icon:string):VNode<RendererNode, RendererElement> {
		return h('img', {
			src: StoreProxy.asset(icon),
			style: {
			width: '1em',
			height: '1em',
			}
		})
	}

}
export default toNative(RewardListItem);
</script>

<style scoped lang="less">
.rewardlistitem{
	// gap: .5em;
	display: flex;
	flex-direction: column;
	width: calc(25% - .5em);
	background-color: var(--background-color-fader);
	border-radius: var(--border-radius);
	align-items: center;
	padding: .5em;
	min-height: 120px;
	transition: all .5s;
	// cursor: pointer;
	overflow: hidden;
	position: relative;

	&.loading::before {
		width: 50px;
		height: 500%;
		content: "";
		position: absolute;
		background-color: var(--color-text-fadest);
		z-index: 1;
		animation: slide .5s linear infinite;
		@keyframes slide {
			0% {
				transform: translateY(-50%) translateX(-200%) rotate(45deg);
			}
			100% {
				transform: translateY(-50%) translateX(500%) rotate(45deg);
			}
		}
	}

	&.disabled {
		.infos {
			filter: saturate(0%);
		}
	}

	&.grayout {
		background-color: var(--background-color-fadest);
		.infos {
			opacity: .5;
			filter: saturate(70%);
		}
	}

	.infos {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		border-radius: var(--border-radius);
		transition: all .5s;
		overflow: hidden;
		img {
			height: 28px;
			margin: 10px;
		}
		
		.cost {
			font-size: .7em;
			padding: .5em;
			border-radius: 5px;
			background-color: var(--background-color-fade);
			color: var(--color-text-inverse);
			font-weight: normal;
			margin-bottom: 5px;
			max-width: 100%;
		}
		.indicators {
			gap: .5em;
			display: flex;
			flex-direction: row;
			position: absolute;
			top: 0;
			right: 0;
			padding: .25em;
			background-color: var(--grayout);
			border-bottom-left-radius: .25em;
			.indicator {
				height: .5em;
			}
		}
	}

	.cost:focus, .title:focus {
		.bevel();
	}

	.ctas {
		display: flex;
		flex-direction: row;
		width: 100%;
		align-items: center;
		justify-content: center;
		flex-grow: 1;

		.title {
			font-size: .8em;
			text-align: center;
			flex-grow: 1;
			border-radius: 5px;
			padding: .5em;
			max-width: calc(100% - 1em);
		}
		.settingsBt {
			width: 1.5em;
			flex-shrink: 0;
		}
	}
}
</style>