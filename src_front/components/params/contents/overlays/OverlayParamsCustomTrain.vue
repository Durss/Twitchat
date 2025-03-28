<template>
	<div class="overlayparamscustomtrain overlayParamsSection">

		<div class="header">{{ $t("overlay.customTrain.header") }}</div>

		<section>
			<TTButton class="addBt"
			v-if="($store.auth.isPremium && $store.customTrain.customTrainList.length < $config.MAX_CUSTOM_TRAIN_PREMIUM) || $store.customTrain.customTrainList.length < $config.MAX_CUSTOM_TRAIN"
			@click="addEntry()" icon="add">{{ $t("overlay.customTrain.add_bt") }}</TTButton>

			<div class="card-item secondary" v-else-if="$store.auth.isPremium && $store.customTrain.customTrainList.length >= $config.MAX_CUSTOM_TRAIN_PREMIUM">{{ $t("overlay.customTrain.premium_limit") }}</div>

			<div class="card-item premium maximumReached" v-else>
				<div>{{ $t("overlay.customTrain.non_premium_limit", {MAX:$config.MAX_CUSTOM_TRAIN_PREMIUM}) }}</div>
				<TTButton icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</TTButton>
			</div>
		</section>

		<VueDraggable class="entryList"
		v-model="$store.customTrain.customTrainList"
		:group="{name:'labels'}"
		handle=".header"
		animation="250">
			<ToggleBlock v-for="entry in $store.customTrain.customTrainList"
			editableTitle
			v-model:title="entry.title"
			:titleDefault="$t('overlay.customTrain.default_title')"
			:titleMaxLengh="30"
			:open="false"
			:key="entry.id"
			@update:title="onChange(entry)">
				<template #right_actions>
					<div class="rightActions">
						<TTButton @click.stop="$store.customTrain.deleteCustomTrain(entry.id)" icon="trash" alert />
					</div>
				</template>
				<template #left_actions>
					<ToggleButton v-model="entry.enabled" @change="onChange(entry)" @click.stop
						v-if="$store.auth.isPremium || entry.enabled || $store.customTrain.customTrainList.filter(v=>v.enabled).length < $config.MAX_CUSTOM_TRAIN" />
				</template>

				<div class="content">
					<div class="card-item install">
						<label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
						<OverlayInstaller type="customtrain" :sourceSuffix="entry.title" :id="entry.id"
						:sourceTransform="{width:1800, height:350}" />
					</div>

					<div class="ctas">
						<TTButton icon="test"
						@click="simulateTrain(entry.id)"
						:disabled="(entry.levelAmounts.match(/(\d|\.)+/g) || []).length <= 1">{{ $t("overlay.customTrain.simulate_bt") }}</TTButton>
					</div>

					<div class="card-item platforms">
						<strong>{{ $t("overlay.customTrain.param_platforms") }}</strong>
						<div class="platformsList">
							<TTButton class="platform" small
								v-tooltip="!$store.streamlabs.connected? $t('overlay.customTrain.connectPlatform_tt') : ''"
								:disabled="!$store.streamlabs.connected"
								:primary="$store.streamlabs.connected && entry.platforms.streamlabs"
								@click.capture="!$store.streamlabs.connected? openConnections('streamlabs') : entry.platforms.streamlabs = !entry.platforms.streamlabs"
								icon="streamlabs">Streamlabs</TTButton>

							<TTButton class="platform" small
								v-tooltip="!$store.streamelements.connected? $t('overlay.customTrain.connectPlatform_tt') : ''"
								:disabled="!$store.streamelements.connected"
								:primary="$store.streamelements.connected && entry.platforms.streamelements"
								@click.capture="!$store.streamelements.connected? openConnections('streamelements') : entry.platforms.streamelements = !entry.platforms.streamelements"
								icon="streamelements">Stream<br>Elements</TTButton>

							<TTButton class="platform" small
								v-tooltip="!$store.tipeee.connected? $t('overlay.customTrain.connectPlatform_tt') : ''"
								:disabled="!$store.tipeee.connected"
								:primary="$store.tipeee.connected && entry.platforms.tipeee"
								@click.capture="!$store.tipeee.connected? openConnections('tipeee') : entry.platforms.tipeee = !entry.platforms.tipeee"
								icon="tipeee">Tipeee</TTButton>

							<TTButton class="platform" small
								v-tooltip="!$store.kofi.connected? $t('overlay.customTrain.connectPlatform_tt') : ''"
								:disabled="!$store.kofi.connected"
								:primary="$store.kofi.connected && entry.platforms.kofi"
								@click.capture="!$store.kofi.connected? openConnections('kofi') : entry.platforms.kofi = !entry.platforms.kofi"
								icon="kofi">Ko-Fi</TTButton>

							<TTButton class="platform" small
								v-tooltip="!$store.patreon.connected? $t('overlay.customTrain.connectPlatform_tt') : ''"
								:disabled="!$store.patreon.connected"
								:primary="$store.patreon.connected && entry.platforms.patreon"
								@click.capture="!$store.patreon.connected? openConnections('patreon') : entry.platforms.patreon = !entry.platforms.patreon"
								icon="patreon">Patreon</TTButton>

							<TTButton class="platform" small
								v-tooltip="!$store.tiltify.connected? $t('overlay.customTrain.connectPlatform_tt') : ''"
								:disabled="!$store.tiltify.connected"
								:primary="$store.tiltify.connected && entry.platforms.tiltify"
								@click.capture="!$store.tiltify.connected? openConnections('tiltify') : entry.platforms.tiltify = !entry.platforms.tiltify"
								icon="tiltify">Tiltify</TTButton>

							<TTButton class="platform" small
								v-tooltip="!$store.streamlabs.charityTeam? $t('overlay.customTrain.connectPlatform_tt') : ''"
								:disabled="!$store.streamlabs.charityTeam"
								:primary="$store.streamlabs.charityTeam != null && entry.platforms.streamlabs_charity"
								@click.capture="!$store.streamlabs.charityTeam? openConnections('streamlabs') : entry.platforms.streamlabs_charity = !entry.platforms.streamlabs_charity"
								icon="streamlabs">Streamlabs<br>charity</TTButton>

							<TTButton class="platform" small
								target="_blank"
								v-tooltip="!$store.twitchCharity.currentCharity? $t('overlay.customTrain.connectPlatform_twitchCharity_tt') : ''"
								:class="{disabled:!$store.twitchCharity.currentCharity}"
								:primary="$store.twitchCharity.currentCharity && entry.platforms.twitch_charity"
								:type="!$store.twitchCharity.currentCharity? 'link' : 'button'"
								:href="!$store.twitchCharity.currentCharity? 'https://dashboard.twitch.tv/charity/' : null"
								@click.capture="!$store.twitchCharity.currentCharity? null : entry.platforms.twitch_charity = !entry.platforms.twitch_charity"
								icon="twitch_charity">Twitch Charity</TTButton>
						</div>
					</div>

					<div class="themeBlock">
						<div class="font">
							<ParamItem :paramData="param_textFont[entry.id]" v-model="entry.textFont" @change="onChange(entry)" />
							<ParamItem :paramData="param_textSize[entry.id]" v-model="entry.textSize" @change="onChange(entry)" />
						</div>
						<div class="colors">
							<ParamItem :paramData="param_colorFill[entry.id]" v-model="entry.colorFill" @change="onChange(entry)" />
							<ParamItem :paramData="param_colorBg[entry.id]" v-model="entry.colorBg" @change="onChange(entry)" />
							<CurrencyPatternInput v-model="entry.currency" @change="onChange(entry)" />
						</div>
					</div>


					<div class="card-item trainRender">
						<strong><Icon name="timer" />{{ $t("overlay.customTrain.param_approaching") }}</strong>
						<OverlayCustomTrainRenderer class="train"
							:showApproaching="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:eventCount="entry.triggerEventCount"
							:eventDone="1"
							:approachingEmote="entry.approachingEmote"
							v-model:titleApproaching="entry.approachingLabel"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="($event:MouseEvent) => openEmoteSelector(entry, 'approaching', $event)"
							editable
							/>
						<ParamItem :paramData="param_triggerEventCount[entry.id]" v-model="entry.triggerEventCount" @change="onChange(entry)" :childLevel="1" noBackground/>
					</div>

					<div class="card-item trainRender">
						<strong><Icon name="train" />{{ $t("overlay.customTrain.param_progress") }}</strong>
						<OverlayCustomTrainRenderer class="train"
							:showProgress="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:percent=".35"
							:amountLeft="42"
							:currencyPattern="entry.currency"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							editable
							/>
						<ParamItem :paramData="param_levelAmounts[entry.id]" v-model="entry.levelAmounts" @change="onChange(entry)" :childLevel="1" noBackground/>
						<div class="paramitem levelCount">{{$t("overlay.customTrain.param_levelAmounts_count", {COUNT:(entry.levelAmounts.match(/(\d|\.)+/g) || []).length})}}</div>
						<i18n-t scope="global" class="card-item premium plz" tag="div"
						keypath="overlay.customTrain.param_levelAmounts_plz"
						v-if="parseFloat((entry.levelAmounts.match(/(\d|\.)+/g) || []).pop() || '') > 1000">
							<template #LINK>
								<a @click.prevent="openDonationForm()">{{ $t("overlay.customTrain.param_levelAmounts_plz_link") }}</a>
							</template>
							<template #EMOJI>
								<br><span class="head">🥺</span><br>👉👈
							</template>
						</i18n-t>
					</div>

					<div class="card-item trainRender">
						<strong><Icon name="train_boost" />{{ $t("overlay.customTrain.param_levelUp") }}</strong>
						<OverlayCustomTrainRenderer class="train"
							:showLevelUp="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:titleLevelUp="entry.levelUpLabel"
							:levelUpEmote="entry.levelUpEmote"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="($event:MouseEvent) => openEmoteSelector(entry, 'levelUp', $event)"
							editable
							/>
						<ParamItem :paramData="param_levelsDuration_ms[entry.id]" v-model="entry.levelsDuration_s" @change="onChange(entry)" :childLevel="1" noBackground/>

						<ParamItem :paramData="param_postLevelUpOnChat[entry.id]" v-model="entry.postLevelUpOnChat" @change="onChange(entry)" :childLevel="1" noBackground>
							<ParamItem :paramData="param_postLevelUpMessage[entry.id]" v-model="entry.postLevelUpChatMessage" @change="onChange(entry)" :childLevel="1" noBackground/>
						</ParamItem>
					</div>

					<div class="card-item trainRender">
						<strong><Icon name="sub" />{{ $t("overlay.customTrain.param_record") }}</strong>
						<OverlayCustomTrainRenderer class="train"
							:showRecord="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:recordColorText="entry.recordColorFill"
							:recordColorBg="entry.recordColorBg"
							:titleRecord="entry.recordLabel"
							:recordEmote="entry.recordEmote"
							:isRecord="true"
							v-model:title="entry.recordLabel"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="($event:MouseEvent) => openEmoteSelector(entry, 'levelUp', $event)"
							editable
							/>
						<div class="paramitem colors">
							<ParamItem class="child" :paramData="param_recordColorFill[entry.id]" v-model="entry.recordColorFill" @change="onChange(entry)" noBackground />
							<ParamItem :paramData="param_recordColorBg[entry.id]" v-model="entry.recordColorBg" @change="onChange(entry)" noBackground />
						</div>
					</div>

					<div class="card-item trainRender">
						<strong><Icon name="leaderboard" />{{ $t("overlay.customTrain.param_success") }}</strong>
						<OverlayCustomTrainRenderer class="train"
							:showSuccess="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:successEmote="entry.successEmote"
							v-model:titleSuccess="entry.successLabel"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="($event:MouseEvent) => openEmoteSelector(entry, 'success', $event)"
							editable
							/>
						<ParamItem :paramData="param_cooldownDuration_ms[entry.id]" v-model="entry.cooldownDuration_s" @change="onChange(entry)" :childLevel="1" noBackground/>

						<ParamItem :paramData="param_postSuccessOnChat[entry.id]" v-model="entry.postSuccessOnChat" @change="onChange(entry)" :childLevel="1" noBackground>
							<ParamItem :paramData="param_postSuccessMessage[entry.id]" v-model="entry.postSuccessChatMessage" @change="onChange(entry)" :childLevel="1" noBackground/>
						</ParamItem>
					</div>

					<div class="card-item trainRender">
						<strong><Icon name="sad" />{{ $t("overlay.customTrain.param_failed") }}</strong>
						<OverlayCustomTrainRenderer class="train"
							:showFail="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:failedEmote="entry.failedEmote"
							v-model:titleFail="entry.failedLabel"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@edit="onChange(entry)"
							@selectEmote="($event:MouseEvent) => openEmoteSelector(entry, 'failed', $event)"
							editable
							/>
					</div>
				</div>
			</ToggleBlock>
		</VueDraggable>
		<EmoteSelector class="emoteSelector" popoutMode v-if="showEmoteSelector" @select="onSelectEmote" ref="emoteSelector" @onLoad="replaceEmoteSelector()" />
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import OverlayCustomTrainRenderer from '@/components/overlays/custom_train/OverlayCustomTrainRenderer.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { VueDraggable } from 'vue-draggable-plus';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import TTButton from '../../../TTButton.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import CurrencyPatternInput from '@/components/CurrencyPatternInput.vue';
import EmoteSelector from '@/components/chatform/EmoteSelector.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		ToggleBlock,
		VueDraggable,
		ToggleButton,
		EmoteSelector,
		OverlayInstaller,
		CurrencyPatternInput,
		OverlayCustomTrainRenderer,
	}
})
class OverlayParamsCustomTrain extends Vue {

	public showEmoteSelector:boolean = false;
	public emoteSelector_y:string = "0";
	public emoteSelector_x:string = "0";
	public emoteSelectorOrigin:{x:number, y:number} = {x:0, y:0};
	public param_colorFill:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_colorBg:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_recordColorFill:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_recordColorBg:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_textFont:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_textSize:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_currency:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_triggerEventCount:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_cooldownDuration_ms:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_levelsDuration_ms:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_postLevelUpOnChat:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_postLevelUpMessage:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_postSuccessOnChat:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_postSuccessMessage:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_levelAmounts:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};

	private emoteSelectorTarget:{entry:TwitchatDataTypes.CustomTrainData, step:"approaching"|"success"|"failed"|"levelUp"}|null = null;
	private clickHandler!:(e:MouseEvent)=>void;

	public beforeMount():void {
		this.initParams();

		this.clickHandler = (e:MouseEvent)=> this.onClick(e);
		document.addEventListener("click", this.clickHandler, true);
	}

	public beforeUnmount():void {
		document.removeEventListener("click", this.clickHandler, true);
	}

	/**
	 * Create parameters for a bingo entry
	 * @param id
	 */
	private initParams():void {
		this.$store.customTrain.customTrainList.forEach(entry=> {
			const id = entry.id;
			if(this.param_colorFill[id]) return;
			this.param_colorFill[id]			= {type:"color", value:"", labelKey:"overlay.customTrain.param_colorFill", icon:"color"};
			this.param_colorBg[id]				= {type:"color", value:"", labelKey:"overlay.customTrain.param_colorBg", icon:"color"};
			this.param_recordColorFill[id]		= {type:"color", value:"", labelKey:"overlay.customTrain.param_recordColorFill", icon:"color"};
			this.param_recordColorBg[id]		= {type:"color", value:"", labelKey:"overlay.customTrain.param_recordColorBg", icon:"color"};
			this.param_textFont[id]				= {type:"font", value:"", labelKey:"overlay.customTrain.param_textFont", icon:"font"};
			this.param_textSize[id]				= {type:"slider", value:20, min:15, max:40, labelKey:"overlay.customTrain.param_textSize", icon:"fontSize"};
			this.param_currency[id]				= {type:"string", value:"", labelKey:"overlay.customTrain.param_currency", icon:"coin"};
			this.param_triggerEventCount[id]	= {type:"number", value:3, min:1, max:5, labelKey:"overlay.customTrain.param_triggerEventCount", icon:"notification"};
			this.param_cooldownDuration_ms[id]	= {type:"duration", value:0, min:30*60, max:24*3600, labelKey:"overlay.customTrain.param_cooldownDuration_ms", icon:"timer"};
			this.param_levelsDuration_ms[id]	= {type:"duration", value:5*6, min:30, max:30*60, labelKey:"overlay.customTrain.param_levelsDuration_ms", icon:"countdown"};
			this.param_postLevelUpOnChat[id]	= {type:"boolean", value:false, labelKey:"overlay.customTrain.param_postLevelUpOnChat", icon:"whispers"};
			this.param_postLevelUpMessage[id]	= {type:"string", value:"", longText:true, maxLength:400};
			this.param_postSuccessOnChat[id]	= {type:"boolean", value:false, labelKey:"overlay.customTrain.param_postSuccessOnChat", icon:"whispers"};
			this.param_postSuccessMessage[id]	= {type:"string", value:"", longText:true, maxLength:400};
			this.param_levelAmounts[id]			= {type:"string", value:"", longText:true, maxLength:1000, labelKey:"overlay.customTrain.param_levelAmounts"};

			this.param_postLevelUpMessage[id].placeholderList = [
				{tag:"LEVEL", descKey:"triggers.placeholders.customTrain_level" },
				{tag:"AMOUNT", descKey:"triggers.placeholders.customTrain_amount_left" },
			];
			this.param_postSuccessMessage[id].placeholderList = this.param_postLevelUpMessage[id].placeholderList.concat();

			const levels = (entry.levelAmounts.match(/(\d|\.)+/g) || [])
					.filter(v=> !isNaN(parseFloat(v)))
					.sort((a,b)=>parseFloat(a) - parseFloat(b));
			entry.levelAmounts = levels.join(", ");
		});
	}

	/**
	 * Saves data on change
	 * @param entry
	 */
	public onChange(entry:TwitchatDataTypes.CustomTrainData):void {
		//Make sure user doesn't hack this value
		entry.triggerEventCount = Math.max(Math.min(entry.triggerEventCount, this.param_triggerEventCount[entry.id].max!), 0);

		this.$store.customTrain.saveData();
		this.$store.customTrain.broadcastStates(entry.id);
	}

	/**
	 * Opens the premium section
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Saves given label
	 */
	public addEntry():void {
		this.$store.customTrain.createCustomTrain();
		this.initParams();
	}

	/**
	 * Tests the text
	 */
	public simulateTrain(overlayId:string):void {
		this.$store.customTrain.simulateTrain(overlayId);
	}

	/**
	 * Opens connections params
	 */
	public openConnections(subSection:TwitchatDataTypes.ParamDeepSectionsStringType):void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, subSection);
	}

	/**
	 * Opens donation form
	 */
	public openDonationForm():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.DONATE);
	}

	/**
	 * Detect click outside emote selector
	 */
	public onClick(e:MouseEvent):void {
		if (this.showEmoteSelector) {
			const emoteSelector = (this.$refs["emoteSelector"] as Vue).$el;
			if (!emoteSelector.contains(e.target as Node)) {
				this.showEmoteSelector = false;
			}
		}
	}

	/**
	 * Open emote selector
	 */
	public async openEmoteSelector(entry:TwitchatDataTypes.CustomTrainData, step:NonNullable<typeof this.emoteSelectorTarget>["step"], event:MouseEvent):Promise<void> {
		this.emoteSelectorTarget = {entry, step};
		this.showEmoteSelector = true;
		await this.$nextTick();
		this.emoteSelectorOrigin = {x:event.clientX, y:event.clientY};
		this.replaceEmoteSelector();
	}

	/**
	 * Replaces emote selector position
	 */
	public replaceEmoteSelector():void {
		const bounds = (this.$refs["emoteSelector"] as Vue).$el.getBoundingClientRect();
		let x = this.emoteSelectorOrigin.x < window.innerWidth/2? this.emoteSelectorOrigin.x : this.emoteSelectorOrigin.x - bounds.width;
		let y = this.emoteSelectorOrigin.y < window.innerHeight/2? this.emoteSelectorOrigin.y : this.emoteSelectorOrigin.y - bounds.height;
		const marginBottom = 70;
		if(x + bounds.width > window.innerWidth) x = window.innerWidth - bounds.width;
		if(y + bounds.height > window.innerHeight - marginBottom) y = window.innerHeight - marginBottom - bounds.height;
		this.emoteSelector_x = x + "px";
		this.emoteSelector_y = y + "px";
	}

	/**
	 * Called after selecting an emote
	 */
	public async onSelectEmote(emote:TwitchatDataTypes.Emote):Promise<void> {
		switch(this.emoteSelectorTarget?.step) {
			case "approaching":
				this.emoteSelectorTarget.entry.approachingEmote = emote.images.url_4x || emote.images.url_2x || emote.images.url_1x;
				break;
			case "levelUp":
				this.emoteSelectorTarget.entry.levelUpEmote = emote.images.url_4x || emote.images.url_2x || emote.images.url_1x;
				break;
			case "failed":
				this.emoteSelectorTarget.entry.failedEmote = emote.images.url_4x || emote.images.url_2x || emote.images.url_1x;
				break;
			case "success":
				this.emoteSelectorTarget.entry.successEmote = emote.images.url_4x || emote.images.url_2x || emote.images.url_1x;
				break;
		}
	}
}
export default toNative(OverlayParamsCustomTrain);
</script>

<style scoped lang="less">
.overlayparamscustomtrain{

	.emoteSelector {
		position: absolute;
		z-index: 100;
		top: v-bind(emoteSelector_y);
		left: v-bind(emoteSelector_x);
	}

	.entryList, .content {
		gap: .5em;
		display: flex;
		flex-direction: column;

		form {
			gap: 1px;
			display: flex;
			flex-direction: row;
			justify-content: center;
			*{
				border-radius: 0;
			}
			*:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			*:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
			input {
				text-align: right;
				width: 0;
				flex-basis: 100px;
			}
		}
	}

	.themeBlock {
		margin: 1em 0;
		gap: .25em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		&>.font, &>.colors {
			flex-grow: 10;
			gap: .25em;
			display: flex;
			flex-direction: column;
			flex-basis: 200px;
			&>* {
				flex-grow: 1;
			}
		}
		&>.colors {
			flex-grow: 1;
		}
	}

	.install {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		.icon {
			height: 1em;
		}
		label {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
	}

	.rightActions {
		gap: .25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-shrink: 0;
		.button {
			margin: -.5em 0;
			align-self: stretch;
			border-radius: 0;
			flex-shrink: 0;
			padding: 0 .5em;
		}
	}

	.maximumReached {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		white-space: pre-line;
	}

	.trainRender {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.train {
			margin-bottom: .35em;
		}
		&>.paramitem {
			margin-top: -.5em;
			font-size: .9em;
			&.levelCount {
				font-style: italic;
				margin-left: 1.6em;
				text-align: center;
			}
		}
		.plz {
			text-align: center;
			white-space: pre-line;
			background-color: var(--color-premium-fader);
			.head {
				display: block;
				margin-top: .25em;
				margin-bottom: -.9em;
				font-size: 1.5em;
			}
		}

		strong {
			.icon {
				height: 1em;
				width: 1em;
				margin-right: .5em;
			}
		}
		.colors {
			column-gap: 2em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			align-items: center;
			margin-left: 1.5em;
			* {
				margin: 0;
				width: fit-content;
				:deep(.holder) {
					flex-wrap: nowrap;
				}
				:deep(label) {
					flex: 0;
				}
				:deep(.inputHolder) {
					width:50px;
				}
			}
		}
	}

	.platforms {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.platformsList {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;

			.platform {
				flex-direction: column;
				gap: .5em;
				:deep(.icon) {
					font-size: 4em;
				}
			}
		}
	}

	.ctas {
		text-align: center;
	}
}
</style>
