}<template>
	<ToggleBlock :open="false" class="overlayparamshighlight" title="Message highlight" :icons="['highlight_purple']">
		<div>If you add this overlay on OBS you'll be able to display any chat message and clips on your stream like this:</div>
		
		<iframe src="https://www.youtube.com/embed/x9RCqbRm6A8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
		
		<div class="content">
			<div class="row">
				<label for="spotify_overlay_url">Set this in an OBS browser source to display the highlighted message:</label>
				<input type="text" id="spotify_overlay_url" v-model="overlayUrl">
				<ToggleBlock small title="CSS customization" :open="false">
					<div>You can change the appearance of the message by overriding these CSS IDs on OBS browser source params</div>
					<ul>
						<li>#highlight_holder { ... }</li>
					</ul>
					<ToggleBlock class="cssPositionning" small title="Holder's positionning">
						<li>#highlight_holder.position-tl { ... }</li>
						<li>#highlight_holder.position-t { ... }</li>
						<li>#highlight_holder.position-tr { ... }</li>
						<li>#highlight_holder.position-l { ... }</li>
						<li>#highlight_holder.position-m { ... }</li>
						<li>#highlight_holder.position-r { ... }</li>
						<li>#highlight_holder.position-bl { ... }</li>
						<li>#highlight_holder.position-b { ... }</li>
						<li>#highlight_holder.position-br { ... }</li>
					</ToggleBlock>
					<ul>
						<li>#highlight_avatar { ... }</li>
						<li>#highlight_infos { ... }</li>
						<li>#highlight_login { ... }</li>
						<li>#highlight_message { ... }</li>
					</ul>
					<ul>
						<li>#clip_holder { ... }</li>
						<li>#clip_player { ... }</li>
						<li>#clip_progressbar { ... }</li>
					</ul>
				</ToggleBlock>
			</div>

			<div class="row center placement">
				Message position
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

			<div class="row center">
				<div>To clear the currently highlighted message click this button on the chat bar</div>
				<img src="@/assets/img/clearHighlightedMessage.png" alt="example">
			</div>

			<div class="row center" v-if="overlayExists">
				<Button @click="testOverlay()" title="Send test message" :icon="$image('icons/test.svg')" />
			</div>
			
			<div class="row center" v-if="!overlayExists">
				<span class="error">- overlay not configured or hidden -</span>
			</div>
			
			<div class="row footer">
				<div>Check out <a href="https://featured.chat" target="_blank">featured.chat</a> for a dedicated tool doing this with much more options</div>
			</div>
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import UserSession from '@/utils/UserSession';
import { LoremIpsum } from 'lorem-ipsum';
import { watch } from 'vue';
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
export default class OverlayParamsHighlight extends Vue {
	
	public overlayExists = false;
	public placement = StoreProxy.chat.chatHighlightOverlayParams.position;

	private checkInterval!:number;
	private subcheckTimeout!:number;
	private overlayPresenceHandler!:()=>void;
	
	public get overlayUrl():string { return this.$overlayURL("chathighlight"); }

	public mounted():void {
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
			const data:TwitchatDataTypes.ChatHighlightOverlayData = {
				position:this.placement,
			}
			StoreProxy.chat.setChatHighlightOverlayParams(data);
		})
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
		const message:IRCEventDataList.Message = {
			"type": "message",
			"message": "imGlitch " + lorem.generateParagraphs(1),
			"tags": {
				"badge-info": { "subscriber": "16" },
				"badges": { "broadcaster": "1", "subscriber": "12" },
				"client-nonce": "7c5bec730ea702eb4397fa901185c5eb",
				"color": "#9ACD32",
				"display-name": UserSession.instance.user?.display_name,
				"emotes": { "112290": [ "0-7" ] },
				"first-msg": false,
				"flags": undefined,
				"id": "2b6830f3-5ff2-4d39-8f4d-f70f0858c9e9",
				"mod": false,
				"returning-chatter": false,
				"room-id": UserSession.instance.user?.id,
				"subscriber": true,
				"tmi-sent-ts": "1657909756626",
				"turbo": false,
				"user-id": UserSession.instance.user?.id,
				"user-type": undefined,
				"emotes-raw": "112290:0-7",
				"badge-info-raw": "subscriber/16",
				"badges-raw": "broadcaster/1,subscriber/12",
				"username": UserSession.instance.user?.login,
				"message-type": "chat"
			},
			"channel": "#"+UserSession.instance.user?.login,
			"self": false,
			"firstMessage": false,
		};
		StoreProxy.chat.highlightChatMessageOverlay(message);
	}

}
</script>

<style scoped lang="less">
.overlayparamshighlight{
	
	.content {
		margin-top: 1em;
		.row {
			display: flex;
			flex-direction: column;
			&:not(:first-child) {
				margin-top: 1em;
			}

			&.center {
				align-items: center;
			}

			.cssPositionning {
				margin-left: 1.7em;
			}

			&.placement {
				.table {
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					justify-content: center;
					@btSize: 25px;
					width: @btSize * 3;
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
						&.selected {
							background-color: @mainColor_normal;
							color: @mainColor_light;
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
				li {
					list-style-type: disc;
					list-style-position: inside;
				}
			}

			img {
				margin-top: .5em;
			}
		}

		iframe {
			margin-top: .5em;
			width: 100%;
			aspect-ratio: 16 / 9;
		}
	}
}
</style>