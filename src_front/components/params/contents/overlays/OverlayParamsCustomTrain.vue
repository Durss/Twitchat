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

					<!-- <form class="card-item dark simulate" @submit.prevent="simulateAmount(entry.id)">
						<input type="number" step="any" v-model="simulatedAmount" />
						<TTButton icon="test" type="submit">{{ $t("donation_goals.simulate_bt") }}</TTButton>
					</form> -->

					<div class="card-item platforms">
						<strong>{{ $t("overlay.customTrain.param_platforms") }}</strong>
						<div class="platformsList">
							<TTButton class="platform" small
								:primary="entry.platforms.streamlabs"
								@click="entry.platforms.streamlabs = !entry.platforms.streamlabs"
								icon="streamlabs">Streamlabs</TTButton>
							<TTButton class="platform" small
								:primary="entry.platforms.streamelements"
								@click="entry.platforms.streamelements = !entry.platforms.streamelements"
								icon="streamelements">Streamelements</TTButton>
							<TTButton class="platform" small
								:primary="entry.platforms.tipeee"
								@click="entry.platforms.tipeee = !entry.platforms.tipeee"
								icon="tipeee">Tipeee</TTButton>
							<TTButton class="platform" small
								:primary="entry.platforms.kofi"
								@click="entry.platforms.kofi = !entry.platforms.kofi"
								icon="kofi">Ko-Fi</TTButton>
							<TTButton class="platform" small
								:primary="entry.platforms.patreon"
								@click="entry.platforms.patreon = !entry.platforms.patreon"
								icon="patreon">Patreon</TTButton>
							<TTButton class="platform" small
								:primary="entry.platforms.tiltify"
								@click="entry.platforms.tiltify = !entry.platforms.tiltify"
								icon="tiltify">Tiltify</TTButton>
							<TTButton class="platform" small
								:primary="entry.platforms.streamlabs_charity"
								@click="entry.platforms.streamlabs_charity = !entry.platforms.streamlabs_charity"
								icon="streamlabs">SL charity</TTButton>
							<TTButton class="platform" small
								:primary="entry.platforms.twitch_charity"
								@click="entry.platforms.twitch_charity = !entry.platforms.twitch_charity"
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
						<strong><Icon name="train" />{{ $t("overlay.customTrain.param_approaching") }}</strong>
						<OverlayCustomTrainRenderer class="train"
							:showApproaching="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:eventCount="param_triggerEventCount[entry.id].value"
							:eventDone="1"
							:approachingEmote="entry.approachingEmote"
							:successEmote="entry.successEmote"
							:failedEmote="entry.failedEmote"
							v-model:titleApproaching="entry.approachingLabel"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@selectEmote="($event:MouseEvent) => openEmoteSelector(entry, 'approaching', $event)"
							editable
							/>
						<ParamItem :paramData="param_triggerEventCount[entry.id]" v-model="entry.triggerEventCount" @change="onChange(entry)" :childLevel="1" noBackground/>
					</div>

					<div class="card-item trainRender">
						<strong><Icon name="train_boost" />{{ $t("overlay.customTrain.param_progress") }}</strong>
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
							editable
							/>
						<ParamItem :paramData="param_levelsDuration_ms[entry.id]" v-model="entry.levelsDuration_s" @change="onChange(entry)" :childLevel="1" noBackground/>

						<ParamItem :paramData="param_postLevelUpOnChat[entry.id]" v-model="entry.postLevelUpOnChat" @change="onChange(entry)" :childLevel="1" noBackground>
							<ParamItem :paramData="param_postLevelUpMessage[entry.id]" v-model="entry.postLevelUpChatMessage" @change="onChange(entry)" :childLevel="1" noBackground/>
						</ParamItem>
					</div>

					<div class="card-item trainRender">
						<strong><Icon name="sub" />{{ $t("overlay.customTrain.param_success") }}</strong>
						<OverlayCustomTrainRenderer class="train"
							:showSuccess="true"
							:size="entry.textSize"
							:fontFamily="entry.textFont"
							:colorText="entry.colorFill"
							:colorBg="entry.colorBg"
							:approachingEmote="entry.approachingEmote"
							:successEmote="entry.successEmote"
							:failedEmote="entry.failedEmote"
							v-model:titleSuccess="entry.successLabel"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
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
							:approachingEmote="entry.approachingEmote"
							:successEmote="entry.successEmote"
							:failedEmote="entry.failedEmote"
							v-model:titleFail="entry.failedLabel"
							v-model:title="entry.title"
							v-model:levelName="entry.levelName"
							@selectEmote="($event:MouseEvent) => openEmoteSelector(entry, 'failed', $event)"
							editable
							/>
					</div>

				</div>
			</ToggleBlock>
		</VueDraggable>
		<EmoteSelector class="emoteSelector" popoutMode v-if="showEmoteSelector" @select="onSelectEmote" ref="emoteSelector" />
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

	public simulatedAmount:number = 10;
	public showEmoteSelector:boolean = false;
	public emoteSelector_y:string = "0";
	public emoteSelector_x:string = "0";
	public param_colorFill:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_colorBg:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
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

	private emoteSelectorTarget:{entry:TwitchatDataTypes.CustomTrainData, step:"approaching"|"success"|"failed"}|null = null;
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
			this.param_textFont[id]				= {type:"font", value:"", labelKey:"overlay.customTrain.param_textFont", icon:"font"};
			this.param_textSize[id]				= {type:"slider", value:20, min:15, max:40, labelKey:"overlay.customTrain.param_textSize", icon:"fontSize"};
			this.param_currency[id]				= {type:"string", value:"", labelKey:"overlay.customTrain.param_currency", icon:"coin"};
			this.param_triggerEventCount[id]	= {type:"number", value:3, min:1, max:3, labelKey:"overlay.customTrain.param_triggerEventCount", icon:"notification"};
			this.param_cooldownDuration_ms[id]	= {type:"duration", value:0, min:30*60, max:24*3600, labelKey:"overlay.customTrain.param_cooldownDuration_ms", icon:"timer"};
			this.param_levelsDuration_ms[id]	= {type:"duration", value:5*6, min:30, max:30*60, labelKey:"overlay.customTrain.param_levelsDuration_ms", icon:"countdown"};
			this.param_postLevelUpOnChat[id]	= {type:"boolean", value:false, labelKey:"overlay.customTrain.param_postLevelUpOnChat", icon:"whispers"};
			this.param_postLevelUpMessage[id]	= {type:"string", value:"", longText:true, maxLength:400};
			this.param_postSuccessOnChat[id]	= {type:"boolean", value:false, labelKey:"overlay.customTrain.param_postSuccessOnChat", icon:"whispers"};
			this.param_postSuccessMessage[id]	= {type:"string", value:"", longText:true, maxLength:400};

			this.param_postLevelUpMessage[id].placeholderList = [
				{tag:"LEVEL", descKey:"triggers.placeholders.customTrain_level" },
				{tag:"AMOUNT", descKey:"triggers.placeholders.customTrain_amount_left" },
			];
			this.param_postSuccessMessage[id].placeholderList = this.param_postLevelUpMessage[id].placeholderList.concat();
		});
	}

	/**
	 * Saves data on change
	 * @param entry
	 */
	public onChange(entry:TwitchatDataTypes.CustomTrainData):void {
		//Make sure user doesn't hack this value
		entry.triggerEventCount = Math.max(Math.min(entry.triggerEventCount, 3), 0);

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
	public simulateAmount(overlayId:string):void {
		//TODO
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

		const bounds = (this.$refs["emoteSelector"] as Vue).$el.getBoundingClientRect();
		let x = event.clientX < window.innerWidth/2? event.clientX : event.clientX - bounds.width;
		let y = event.clientY < window.innerHeight/2? event.clientY : event.clientY - bounds.height;
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
		console.log(emote);
		switch(this.emoteSelectorTarget?.step) {
			case "approaching":
				this.emoteSelectorTarget.entry.approachingEmote = emote.images.url_4x || emote.images.url_2x || emote.images.url_1x;
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
		}

		strong {
			.icon {
				height: 1em;
				width: 1em;
				margin-right: .5em;
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
}
</style>
