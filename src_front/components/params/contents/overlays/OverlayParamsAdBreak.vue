<template>
	<ToggleBlock class="overlayparamsadbreak" :title="$t('overlay.adBreak.title')" :icons="['ad']">
		<div class="holder">
			<div class="item">
				<div class="info">{{ $t("overlay.adBreak.description") }}</div>
			</div>
			
			<input class="primary" type="text" id="highlight_overlay_url" v-model="overlayUrl" v-click2Select>
			<ToggleBlock class="cssToggle" small :title="$t('overlay.css_customization')" :open="false">
				<div class="head">{{ $t("overlay.adBreak.css") }}</div>
				<ul class="cssStructure">
					<li>#todo { ... }</li>
				</ul>
			</ToggleBlock>

			<ParamItem :paramData="param_showApproaching">
				<div class="placement">
					<div class="holder">
						<p><Icon name="move" class="icon" />{{ $t("overlay.adBreak.param_placement") }}</p>
						<PlacementSelector v-model="placement" />
					</div>
				</div>
			</ParamItem>

			<ParamItem :paramData="param_showRunning">
				<div class="placement">
					<div class="holder">
						<p><Icon name="move" class="icon" />{{ $t("overlay.adBreak.param_placement") }}</p>
						<PlacementSelector v-model="placement" />
					</div>
				</div>
			</ParamItem>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import PlacementSelector from '@/components/PlacementSelector.vue';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		ParamItem,
		ToggleBlock,
		PlacementSelector,
	},
	emits:[],
})
export default class OverlayParamsAdBreak extends Vue {

	public placement = "tr"

	public param_showApproaching:TwitchatDataTypes.ParameterData<boolean>	= {type:"boolean", value:false, icon:"timer", labelKey:"overlay.adBreak.param_showApproaching"}
	public param_showRunning:TwitchatDataTypes.ParameterData<boolean>		= {type:"boolean", value:false, icon:"play", labelKey:"overlay.adBreak.param_showRunning"}
	public param_approachingDelay:TwitchatDataTypes.ParameterData<number>	= {type:"time", value:30, icon:"timer", labelKey:"overlay.adBreak.param_approachingDelay"}
	public param_approachingStyle:TwitchatDataTypes.ParameterData<string>	= {type:"list", value:"bar", listValues:[], icon:"overlay", labelKey:"overlay.adBreak.param_style"}
	public param_runningStyle:TwitchatDataTypes.ParameterData<string>		= {type:"list", value:"bar", listValues:[], icon:"overlay", labelKey:"overlay.adBreak.param_style"}
	public param_approachingSize:TwitchatDataTypes.ParameterData<number>	= {type:"number", value:10, min:10, max:100, icon:"font", labelKey:"overlay.adBreak.param_size"}
	public param_runningSize:TwitchatDataTypes.ParameterData<number>		= {type:"number", value:10, min:10, max:100, icon:"font", labelKey:"overlay.adBreak.param_size"}
	public param_approachingThickness:TwitchatDataTypes.ParameterData<number>= {type:"number", value:1, min:10, max:100, icon:"minus", labelKey:"overlay.adBreak.param_thickness"}
	public param_runningThickness:TwitchatDataTypes.ParameterData<number>	= {type:"number", value:1, min:10, max:100, icon:"minus", labelKey:"overlay.adBreak.param_thickness"}
	
	public get overlayUrl():string { return this.$overlayURL("adbreak"); }

	public beforeMount():void {
		this.param_runningStyle.listValues		=
		this.param_approachingStyle.listValues	= [{value:"bar", labelKey:"overlay.adBreak.param_styles.bar"}, {value:"text", labelKey:"overlay.adBreak.param_styles.text"}]
		
		this.param_showApproaching.children	= [this.param_approachingStyle, this.param_approachingDelay, this.param_approachingSize, this.param_approachingThickness];
		this.param_showRunning.children	= [this.param_runningStyle, this.param_runningSize, this.param_runningThickness];
	}

}
</script>

<style scoped lang="less">
.overlayparamsadbreak{
	
	.holder {
		display: flex;
		flex-direction: column;
		gap: .5em;

		input {
			width: 100%;
		}
		.placement {
			&::before {
				position: absolute;
				left: -1em;
				top: .1em;
				font-size: 1em;
				content: "⤷";
				display: block;
			}
			.holder {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				.icon {
					height: 1em;
					margin-right: .5em;
				}
				&:hover::before {
					opacity: 1;
				}

				&::before {
					content: "";
					opacity: 0;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					position: absolute;
					filter: blur(5px);
					pointer-events: none;
					background-color: var(--background-color-fadest);
					background: linear-gradient(170deg, var(--background-color-fadest) 0%, transparent 100%);
				}
			}

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
</style>