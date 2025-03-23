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
						:sourceTransform="{width:900, height:350}" />
					</div>

					<form class="card-item dark simulate" @submit.prevent="simulateAmount(entry.id)">
						<input type="number" step="any" v-model="simulatedAmount" />
						<span class="currency" v-if="entry.currency">{{ entry.currency }}</span>
						<TTButton icon="test" type="submit">{{ $t("donation_goals.simulate_bt") }}</TTButton>
					</form>

					<ParamItem :paramData="param_textFont[entry.id]" v-model="entry.textFont" @change="onChange(entry)" />
					<ParamItem :paramData="param_textSize[entry.id]" v-model="entry.textSize" @change="onChange(entry)" />
					<ParamItem :paramData="param_colorBase[entry.id]" v-model="entry.color" @change="onChange(entry)" />
					<ParamItem :paramData="param_currency[entry.id]" v-model="entry.currency" @change="onChange(entry)"/>
					<ParamItem :paramData="param_triggerEventCount[entry.id]" v-model="entry.triggerEventCount" @change="onChange(entry)"/>
					<ParamItem :paramData="param_cooldownDuration_ms[entry.id]" v-model="entry.cooldownDuration_ms" @change="onChange(entry)"/>
					<ParamItem :paramData="param_levelsDuration_ms[entry.id]" v-model="entry.levelsDuration_ms" @change="onChange(entry)"/>
					<ParamItem :paramData="param_postLevelUpOnChat[entry.id]" v-model="entry.postLevelUpOnChat" @change="onChange(entry)"/>
					<ParamItem :paramData="param_postLevelUpMessage[entry.id]" v-model="entry.postLevelUpMessage" @change="onChange(entry)"/>
					<ParamItem :paramData="param_postSuccessOnChat[entry.id]" v-model="entry.postSuccessOnChat" @change="onChange(entry)"/>
					<ParamItem :paramData="param_postSuccessMessage[entry.id]" v-model="entry.postSuccessMessage" @change="onChange(entry)"/>
					<ParamItem :paramData="param_approachingLabel[entry.id]" v-model="entry.approachingLabel" @change="onChange(entry)"/>
					<ParamItem :paramData="param_approachingEmote[entry.id]" v-model="entry.approachingEmote" @change="onChange(entry)"/>
					<ParamItem :paramData="param_failedLabel[entry.id]" v-model="entry.failedLabel" @change="onChange(entry)"/>
					<ParamItem :paramData="param_failedEmote[entry.id]" v-model="entry.failedEmote" @change="onChange(entry)"/>
					<ParamItem :paramData="param_successLabel[entry.id]" v-model="entry.successLabel" @change="onChange(entry)"/>
					<ParamItem :paramData="param_successEmote[entry.id]" v-model="entry.successEmote" @change="onChange(entry)"/>
					<ParamItem :paramData="param_platforms[entry.id]" v-model="entry.platforms" @change="onChange(entry)"/>
				</div>
			</ToggleBlock>
		</VueDraggable>

	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ToggleBlock from '../../../ToggleBlock.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ParamItem from '../../ParamItem.vue';
import { VueDraggable } from 'vue-draggable-plus';
import TTButton from '../../../TTButton.vue';
import ToggleButton from '@/components/ToggleButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		ToggleBlock,
		VueDraggable,
		ToggleButton,
		OverlayInstaller,
	}
})
class OverlayParamsCustomTrain extends Vue {

	public simulatedAmount:number = 10;
	public param_colorBase:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
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
	public param_approachingLabel:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_approachingEmote:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_failedLabel:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_failedEmote:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_successLabel:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_successEmote:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_platforms:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};

	public beforeMount():void {
		this.initParams();
	}

	/**
	 * Create parameters for a bingo entry
	 * @param id
	 */
	private initParams():void {
		this.$store.customTrain.customTrainList.forEach(entry=> {
			const id = entry.id;
			if(this.param_colorBase[id]) return;
			this.param_colorBase[id]			= {type:"color", value:"", labelKey:"overlay.customTrain.param_colorTheme", icon:"color"};
			this.param_textFont[id]				= {type:"font", value:"", labelKey:"overlay.customTrain.param_textFont", icon:"font"};
			this.param_textSize[id]				= {type:"slider", value:20, min:15, max:30, labelKey:"overlay.customTrain.param_textSize", icon:"fontSize"};
			this.param_currency[id]				= {type:"string", value:"", labelKey:"overlay.customTrain.param_currency", icon:"color"};
			this.param_triggerEventCount[id]	= {type:"number", value:3, labelKey:"overlay.customTrain.param_triggerEventCount", icon:"color"};
			this.param_cooldownDuration_ms[id]	= {type:"duration", value:0, min:30*60000, max:24*360000, labelKey:"overlay.customTrain.param_cooldownDuration_ms", icon:"color"};
			this.param_levelsDuration_ms[id]	= {type:"duration", value:5*6000, min:30000, max:30*60000, labelKey:"overlay.customTrain.param_levelsDuration_ms", icon:"color"};
			this.param_postLevelUpOnChat[id]	= {type:"boolean", value:false, labelKey:"overlay.customTrain.param_postLevelUpOnChat", icon:"color"};
			this.param_postLevelUpMessage[id]	= {type:"string", value:"", labelKey:"overlay.customTrain.param_postLevelUpOnChat", icon:"color"};
			this.param_postSuccessOnChat[id]	= {type:"boolean", value:false, labelKey:"overlay.customTrain.param_postLevelUpOnChat", icon:"color"};
			this.param_postSuccessMessage[id]	= {type:"string", value:"", labelKey:"overlay.customTrain.param_postLevelUpOnChat", icon:"color"};
			this.param_approachingLabel[id]		= {type:"string", value:"", labelKey:"overlay.customTrain.param_approachingLabel", icon:"color"};
			this.param_approachingEmote[id]		= {type:"string", value:"", labelKey:"overlay.customTrain.param_approachingEmote", icon:"color"};
			this.param_failedLabel[id]			= {type:"string", value:"", labelKey:"overlay.customTrain.param_failedLabel", icon:"color"};
			this.param_failedEmote[id]			= {type:"string", value:"", labelKey:"overlay.customTrain.param_failedEmote", icon:"color"};
			this.param_successLabel[id]			= {type:"string", value:"", labelKey:"overlay.customTrain.param_successLabel", icon:"color"};
			this.param_successEmote[id]			= {type:"string", value:"", labelKey:"overlay.customTrain.param_successEmote", icon:"color"};
			this.param_platforms[id]			= {type:"string", value:"", labelKey:"overlay.customTrain.param_platforms", icon:"color"};
		});
	}

	/**
	 * Saves data on change
	 * @param entry
	 */
	public onChange(entry:TwitchatDataTypes.CustomTrainData):void {
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
}
export default toNative(OverlayParamsCustomTrain);
</script>

<style scoped lang="less">
.overlayparamscustomtrain{
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
}
</style>
