<template>
	<ToggleBlock :open="open" class="overlayparamshighlight overlayParamsSection" :title="$t('overlay.highlight.title')" :icons="['highlight']">
		<template #right_actions>
			<Button href="https://www.youtube.com/watch?v=Yv3ACHtNj3Q"
			target="_blank"
			type="link"
			icon="youtube"
			alert
			v-tooltip="$t('overlay.youtube_demo_tt')"
			@click.stop/>
		</template>
		
		<div class="holder">
			<div class="header">{{ $t("overlay.highlight.instruction") }}</div>
			
			<OverlayInstaller class="installer" type="chathighlight" />

			<div class="card-item center placement">
				<p class="">{{ $t("overlay.highlight.message_pos") }}</p>
				<PlacementSelector v-model="placement" />
			</div>

			<div class="center" v-if="overlayExists">
				<Button @click="testOverlay()" icon="test">{{ $t('overlay.highlight.testBt') }}</Button>
			</div>
			
			<div class="center card-item alert" v-if="!overlayExists">{{ $t("overlay.highlight.no_overlay") }}</div>

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
			
			<div class="card-item footer">
				<i18n-t scope="global" tag="div" keypath="overlay.highlight.alternative_tool">
					<template #URL>
						<a href="https://featured.chat" target="_blank">featured.chat</a>
					</template>
				</i18n-t>
			</div>
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import Utils from '@/utils/Utils';
import { LoremIpsum } from 'lorem-ipsum';
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import OverlayInstaller from './OverlayInstaller.vue';
import PlacementSelector from '@/components/PlacementSelector.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
		OverlayInstaller,
		PlacementSelector,
	}
})
export default class OverlayParamsHighlight extends Vue {
	
	@Prop({default:false})
	public open!:boolean;
	
	public overlayExists = false;
	public placement:TwitchatDataTypes.ScreenPosition = "bl";

	private checkInterval!:number;
	private subcheckTimeout!:number;
	private overlayPresenceHandler!:()=>void;
	
	public beforeMount(): void {
		this.placement = this.$store("chat").chatHighlightOverlayParams.position;

		this.overlayPresenceHandler = ()=> {
			this.overlayExists = true;
			clearTimeout(this.subcheckTimeout);
		};
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, this.overlayPresenceHandler);

		//Regularly check if the overlay exists
		this.checkInterval = window.setInterval(()=>{
			PublicAPI.instance.broadcast(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE);
			clearTimeout(this.subcheckTimeout);
			//If after 1,5s the overlay didn't answer, assume it doesn't exist
			this.subcheckTimeout = setTimeout(()=>{
				this.overlayExists = false;
			}, 1500);
		}, 2000);

		watch(()=>this.placement, ()=> {
			const data:TwitchatDataTypes.ChatHighlightParams = {
				position:this.placement,
			}
			this.$store("chat").setChatHighlightOverlayParams(data);
		})
	}

	public mounted():void {
		if(this.open) {
			setTimeout(()=> {
				const target = this.$el;
				//@ts-ignore
				if(target.scrollIntoViewIfNeeded) {
					//@ts-ignore
					target.scrollIntoViewIfNeeded();//Works everywhere but firefox
				}else{
					target.scrollIntoView(false);
				}
			}, 500);
		}
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
			user: this.$store("users").getUserFrom("twitch", uid, uid),
			answers: [],
			channel_id:uid,
			message: text,
			message_chunks: chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
			message_size: TwitchUtils.computeMessageSize(chunks),
			is_short: false,
		}
		this.$store("chat").highlightChatMessageOverlay(message);
	}

}
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