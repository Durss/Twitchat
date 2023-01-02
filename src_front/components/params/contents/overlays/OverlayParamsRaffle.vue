<template>
	<ToggleBlock :open="open" class="overlayparamsraffle" :title="$t('overlay.raffle.title')" :icons="['ticket_purple']">
		<div class="holder">
			<div class="row" v-t="'overlay.raffle.head'"></div>

			<div class="row">
				<input type="text" v-model="overlayUrl">
				<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
					<div v-t="'overlay.raffle.css'"></div>
					<ul>
						<li>.wheel-item { ... }</li>
						<li>.wheel-item.selected { ... }</li>
					</ul>
				</ToggleBlock>
			</div>

			<div class="row center" v-if="overlayExists">
				<Button :loading="loading" @click="testWheel()" :title="$t('overlay.raffle.testBt')" :icon="$image('icons/test.svg')" />
			</div>

			<div class="row center" v-if="!overlayExists">
				<span class="error" v-t="'overlay.raffle.no_overlay'"></span>
			</div>
			
			<div class="row">
				<i18n-t scope="global" tag="div" keypath="overlay.raffle.start">
					<template #MENU><img src="@/assets/icons/commands_purple.svg" class="icon"></template>
					<template #CMD><strong>/raffle</strong></template>
				</i18n-t>
			</div>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import TwitchatEvent from '@/events/TwitchatEvent';
import Utils from '@/utils/Utils';
import type { JsonArray } from "type-fest";
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	}
})
export default class OverlayParamsRaffle extends Vue {

	public open = false;
	public loading = false;
	public overlayExists = false;

	private checkInterval!:number;
	private subcheckTimeout!:number;
	private overlayPresenceHandler!:()=>void;
	
	public get overlayUrl():string { return this.$overlayURL("wheel"); }

	public mounted():void {
		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>{
			PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
			clearTimeout(this.subcheckTimeout);
			//If after 1,5s the overlay didn't answer, assume it doesn't exist
			this.subcheckTimeout = setTimeout(()=>{
				this.overlayExists = false;
			}, 1500);
		}, 2000);
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	public async testWheel():Promise<void> {
		this.loading = true;
		const followers = await TwitchUtils.getFollowers(null, 500);
		const items:TwitchatDataTypes.EntryItem[] = followers.map(v=> {
			return {id:v.from_id, label:v.from_name, data:v};
		});
		const data = {
			items:((items as unknown) as JsonArray),
			winner: Utils.pickRand(items).id,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, data)
		await Utils.promisedTimeout(100);
		this.loading = false;
	}

}
</script>

<style scoped lang="less">
.overlayparamsraffle{
	.holder {
		display: flex;
		flex-direction: column;
		gap: 1em;
		.row {
			display: flex;
			flex-direction: column;

			&.center {
				align-items: center;
			}

			:deep(.icon) {
				height: 1em;
				vertical-align: middle;
			}

			.error {
				color:@mainColor_alert;
				font-style: italic;
			}

			ul {
				margin-top: .5em;
				li {
					list-style-type: disc;
					list-style-position: inside;
				}
			}
		}
	}
}
</style>