<template>
	<ToggleBlock :open="open" class="overlayparamshighlight" :title="$t('overlay.highlight.title')" :icons="['highlight']">
		
		<div class="holder">
			<a class="item demoLink" href="https://www.youtube.com/watch?v=Yv3ACHtNj3Q" target="_blank"><img src="@/assets/img/param_examples/chatHighlightVideo.jpg" class="demo"></a>
			
			<label for="highlight_overlay_url">{{ $t("overlay.highlight.instruction") }}</label>
			<input class="primary" type="text" id="highlight_overlay_url" v-model="overlayUrl" v-click2Select>
			<ToggleBlock class="cssToggle" small :title="$t('overlay.css_customization')" :open="false">
				<div class="head">{{ $t("overlay.highlight.css") }}</div>
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

			<div class="card-item item center placement">
				<p class="">{{ $t("overlay.highlight.message_pos") }}</p>
				<div class="table">
					<div class="item" :class="placement=='tl'? 'selected' : ''">
						<input type="radio" v-model="placement" value="tl" id="mazePos_tl">
						<label for="mazePos_tl">┌</label>
					</div>
					<div class="item" :class="placement=='t'? 'selected' : ''">
						<input type="radio" v-model="placement" value="t" id="mazePos_t">
						<label for="mazePos_t">┬</label>
					</div>
					<div class="item" :class="placement=='tr'? 'selected' : ''">
						<input type="radio" v-model="placement" value="tr" id="mazePos_tr">
						<label for="mazePos_tr">┐</label>
					</div>
					<div class="item" :class="placement=='l'? 'selected' : ''">
						<input type="radio" v-model="placement" value="l" id="mazePos_l">
						<label for="mazePos_l">├</label>
					</div>
					<div class="item" :class="placement=='m'? 'selected' : ''">
						<input type="radio" v-model="placement" value="m" id="mazePos_m">
						<label for="mazePos_m">┼</label>
					</div>
					<div class="item" :class="placement=='r'? 'selected' : ''">
						<input type="radio" v-model="placement" value="r" id="mazePos_r">
						<label for="mazePos_r">┤</label>
					</div>
					<div class="item" :class="placement=='bl'? 'selected' : ''">
						<input type="radio" v-model="placement" value="bl" id="mazePos_bl">
						<label for="mazePos_bl">└</label>
					</div>
					<div class="item" :class="placement=='b'? 'selected' : ''">
						<input type="radio" v-model="placement" value="b" id="mazePos_b">
						<label for="mazePos_b">┴</label>
					</div>
					<div class="item" :class="placement=='br'? 'selected' : ''">
						<input type="radio" v-model="placement" value="br" id="mazePos_br">
						<label for="mazePos_br">┘</label>
					</div>
				</div>
			</div>

			<div class="item center" v-if="overlayExists">
				<Button @click="testOverlay()" icon="test">{{ $t('overlay.highlight.testBt') }}</Button>
			</div>
			
			<div class="item center card-item alert" v-if="!overlayExists">{{ $t("overlay.highlight.no_overlay") }}</div>
			
			<div class="card-item item footer">
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

@Component({
	components:{
		Button,
		ToggleBlock,
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
	
	public get overlayUrl():string { return this.$overlayURL("chathighlight"); }

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
			children:[],
		}
		this.$store("chat").highlightChatMessageOverlay(message);
	}

}
</script>

<style scoped lang="less">
.overlayparamshighlight{
	
	.holder {
		display: flex;
		flex-direction: column;
		gap: .5em;

		input {
			width: 100%;
		}

		.item {
			display: flex;
			flex-direction: column;
			border-radius: .5em;

			&.center {
				align-items: center;
				margin: auto;
			}

			&.placement {
				.table {
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					justify-content: center;
					@btSize: 25px;
					width: @btSize * 3;
					margin-top: .5em;
					.item {
						width: @btSize;
						height: @btSize;
						position: relative;
						display: flex;
						align-items: center;
						justify-content: center;
						border-radius: 5px;
						background-color: rgba(255, 255, 255, .5);
						border: 1px solid rgba(0, 0, 0, .15);
						transition: background-color .2s;
						&.selected {
							background-color: var(--color-secondary);
						}
						&:hover {
							background-color: var(--color-secondary-light);
						}
						label {
							margin: 0;
							padding: 0;
						}
						input {
							margin: 0;
							padding: 0;
							opacity: 0;
							position: absolute;
							top:0;
							left:0;
							width: 100%;
							height: 100%;
							cursor: pointer;
						}
					}
				}
			}

			&.footer {
				font-size: .8em;
				font-style: italic;
			}
			
			ul {
				margin-top: .5em;
			}

			img {
				margin-top: .5em;
			}
		}

		.cssToggle {
			width: 100%;
			.head {
				margin-bottom: .5em;
			}
			.cssPositionning {
				margin-left: .6em;
			}
		}
	}
}
</style>