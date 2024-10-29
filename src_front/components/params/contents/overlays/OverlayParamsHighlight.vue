<template>
	<div class="overlayparamshighlight overlayParamsSection">
		<a href="https://www.youtube.com/watch?v=Yv3ACHtNj3Q" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a>

		<div class="header">{{ $t("overlay.highlight.instruction") }}</div>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="obs" /> {{ $t("overlay.title_install") }}</div>
			</div>
			<OverlayInstaller type="chathighlight" @obsSourceCreated="getOverlayPresence(true)" />

			<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div class="cssHead">{{ $t("overlay.highlight.css") }}</div>
				<ul class="cssStructure">
					<li>#highlight_holder { ... }</li>
					<li class="sublist">
						<ul>
							<li>#highlight_avatar { ... }</li>
							<li>#highlight_infos { ... }</li>
							<li class="sublist">
								<ul>
									<li>#highlight_login { ... }</li>
									<li>#highlight_message { ... }</li>
								</ul>
							</li>
						</ul>
					</li>
				</ul>
				<ToggleBlock class="cssPositionning" small title="Holder's positionning" :open="false">
					<ul class="cssStructure">
						<li>#highlight_holder.position-tl { ... }</li>
						<li>#highlight_holder.position-t { ... }</li>
						<li>#highlight_holder.position-tr { ... }</li>
						<li>#highlight_holder.position-l { ... }</li>
						<li>#highlight_holder.position-m { ... }</li>
						<li>#highlight_holder.position-r { ... }</li>
						<li>#highlight_holder.position-bl { ... }</li>
						<li>#highlight_holder.position-b { ... }</li>
						<li>#highlight_holder.position-br { ... }</li>
					</ul>
				</ToggleBlock>
				<ul class="cssStructure">
					<li>#clip_holder { ... }</li>
					<li class="sublist">
						<ul>
							<li>#clip_player { ... }</li>
							<li>#clip_progressbar { ... }</li>
						</ul>
					</li>
				</ul>
				<ToggleBlock class="cssPositionning" small title="Holder's positionning" :open="false">
					<ul class="cssStructure">
						<li>#clip_holder.position-tl { ... }</li>
						<li>#clip_holder.position-t { ... }</li>
						<li>#clip_holder.position-tr { ... }</li>
						<li>#clip_holder.position-l { ... }</li>
						<li>#clip_holder.position-m { ... }</li>
						<li>#clip_holder.position-r { ... }</li>
						<li>#clip_holder.position-bl { ... }</li>
						<li>#clip_holder.position-b { ... }</li>
						<li>#clip_holder.position-br { ... }</li>
					</ul>
				</ToggleBlock>
			</ToggleBlock>
		</section>

		<section class="card-item">
			<div class="header">
				<div class="title"><Icon name="params" /> {{ $t("overlay.title_settings") }}</div>
			</div>
			<div class="placement">
				<p>{{ $t("overlay.highlight.message_pos") }}</p>
				<PlacementSelector v-model="placement" />
			</div>

			<div class="center" v-if="overlayExists">
				<TTButton @click="testOverlay()" icon="test">{{ $t('overlay.highlight.testBt') }}</TTButton>
			</div>

			<Icon class="center loader card-item" name="loader" v-else-if="checkingOverlayPresence" />

			<div class="center card-item alert" v-else-if="!overlayExists">{{ $t("overlay.overlay_not_configured") }}</div>
		</section>

		<!-- <div class="card-item footer">
			<i18n-t scope="global" tag="div" keypath="overlay.highlight.alternative_tool">
				<template #URL>
					<a href="https://featured.chat" target="_blank">featured.chat</a>
				</template>
			</i18n-t>
		</div> -->
	</div>
</template>

<script lang="ts">
import PlacementSelector from '@/components/PlacementSelector.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { LoremIpsum } from 'lorem-ipsum';
import { watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../../../TTButton.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ToggleBlock,
		OverlayInstaller,
		PlacementSelector,
	}
})
class OverlayParamsHighlight extends Vue {

	public overlayExists = false;
	public checkingOverlayPresence = false;
	public placement:TwitchatDataTypes.ScreenPosition = "bl";

	private checkInterval:number = -1;
	private subcheckTimeout:number = -1;
	private overlayPresenceHandler!:()=>void;

	public beforeMount(): void {
		this.placement = this.$store.chat.chatHighlightOverlayParams.position;

		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.getOverlayPresence(true);
		this.checkInterval = window.setInterval(()=>this.getOverlayPresence(), 2000);

		watch(()=>this.placement, ()=> {
			const data:TwitchatDataTypes.ChatHighlightParams = {
				position:this.placement,
			}
			this.$store.chat.setChatHighlightOverlayParams(data);
		})
	}

	/**
	 * Checks if overlay exists
	 */
	public getOverlayPresence(showLoader:boolean = false):void {
		if(showLoader) this.checkingOverlayPresence = true;
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE);
		clearTimeout(this.subcheckTimeout);
		//If after 1,5s the overlay didn't answer, assume it doesn't exist
		this.subcheckTimeout = window.setTimeout(()=>{
			this.overlayExists = false;
			this.checkingOverlayPresence = false;
		}, 1500);
	}

	public beforeUnmount():void {
		clearInterval(this.checkInterval);
		clearTimeout(this.subcheckTimeout);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	public async testOverlay():Promise<void> {
		const lorem = new LoremIpsum({
			sentencesPerParagraph: { max: 3, min: 1 },
			wordsPerSentence: { max: 16, min: 4 }
		});

		const uid = StoreProxy.auth.twitch.user.id;
		const text = lorem.generateParagraphs(1)+" TakeNRG";
		const chunks = TwitchUtils.parseMessageToChunks(text, undefined, true);
		const message:TwitchatDataTypes.MessageChatData = {
			id:Utils.getUUID(),
			platform:"twitch",
			date: Date.now(),
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			user: this.$store.users.getUserFrom("twitch", uid, uid),
			answers: [],
			channel_id:uid,
			message: text,
			message_chunks: chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
			message_size: TwitchUtils.computeMessageSize(chunks),
			is_short: false,
		}
		this.$store.chat.highlightChatMessageOverlay(message);
	}

}
export default toNative(OverlayParamsHighlight);
</script>

<style scoped lang="less">
.overlayparamshighlight{

	.placement {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cssPositionning {
		margin-left: 1em;
		width: fit-content;
	}
}
</style>
