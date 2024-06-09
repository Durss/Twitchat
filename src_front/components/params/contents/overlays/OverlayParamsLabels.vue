<template>
	<div class="overlayparamslabels overlayParamsSection">

		<div class="header">{{ $t("overlay.labels.head") }}</div>

		<div class="createForm">

			<TTButton class="addBt"
			v-if="$store.auth.isPremium || $store.labels.labelList.length < $config.MAX_LABELS"
			@click="addLabel()" icon="add">{{ $t("overlay.labels.addBt") }}</TTButton>
	
			<div class="card-item secondary" v-else-if="$store.auth.isPremium && $store.labels.labelList.length < $config.MAX_LABELS_PREMIUM">{{ $t("overlay.labels.premium_limit") }}</div>
			
			<div class="premium" v-else>
				<div>{{ $t("overlay.labels.non_premium_limit", {MAX:$config.MAX_BINGO_GRIDS_PREMIUM}) }}</div>
				<TTButton icon="premium" @click="openPremium()" light premium>{{$t('premium.become_premiumBt')}}</TTButton>
			</div>
		</div>


		<VueDraggable class="labelList"
		v-model="$store.labels.labelList"
		:group="{name:'labels'}"
		handle=".header"
		animation="250">
			<ToggleBlock v-for="label in $store.labels.labelList"
			editableTitle
			v-model:title="label.title"
			:titleDefault="$t('overlay.labels.default_title')"
			:titleMaxLengh="30"
			:open="false"
			:key="label.id"
			@update:title="save(label)">

				<template #left_actions>
					<div class="leftActions">
						<ToggleButton v-model="label.enabled" @click.native.stop @change="save(label)" v-if="$store.auth.isPremium || label.enabled || $store.labels.labelList.filter(v=>v.enabled).length < $config.MAX_LABELS" />
					</div>
				</template>

				<template #right_actions>
					<div class="rightActions">
						<TTButton @click.stop="$store.labels.removeLabel(label.id)" icon="trash" alert />
					</div>
				</template>

				<div class="form">
					<div class="card-item install">
						<label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
						<OverlayInstaller type="label" :sourceSuffix="label.title" :id="label.id" :queryParams="{bid:label.id}" :sourceTransform="{width:300, height:100}" />
					</div>
					
					<ParamItem :paramData="param_labelValue[label.id]" v-model="label.value" @change="save(label)"></ParamItem>
				</div>
			</ToggleBlock>
		</VueDraggable>
	</div>
</template>

<script lang="ts">
import { TTButton } from '@/components/TTButton.vue';
import { ToggleBlock } from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { VueDraggable } from 'vue-draggable-plus';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { ParamItem } from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
		ToggleBlock,
		ToggleButton,
		VueDraggable,
		OverlayInstaller,
	},
	emits:[],
})
class OverlayParamsLabels extends Vue {

	public param_labelValue:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};

	public beforeMount():void {
		this.initParams();
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
	public addLabel():void {
		this.$store.labels.addLabel()
		this.initParams();
	}

	/**
	 * Saves given label
	 */
	public save(label:TwitchatDataTypes.LabelItemData):void {
		this.$store.labels.saveData(label.id);
	}

	/**
	 * Create parameters for a bingo entry
	 * @param id
	 */
	private initParams():void {
		this.$store.labels.labelList.forEach(entry=> {
			const id = entry.id;
			if(this.param_labelValue[id]) return;
			this.param_labelValue[id] = {type:"string", value:"", labelKey:"overlay.labels.param_labelValue", icon:"font"};
		});
	}

}
export default toNative(OverlayParamsLabels);
</script>

<style scoped lang="less">
.overlayparamslabels{
	.createForm {
		text-align: center;
		.premium {
			background-color: var(--color-premium);
			border-radius: var(--border-radius);
			padding: .5em;
			white-space: pre-line;
			.button {
				margin-top: .5em;
			}
		}
	}

	.leftActions {
		align-self: stretch;
	}

	.rightActions, .leftActions {
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

	.labelList {
		gap: .5em;
		display: flex;
		flex-direction: column;
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
}
</style>