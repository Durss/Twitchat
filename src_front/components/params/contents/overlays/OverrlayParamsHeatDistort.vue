<template>
	<ToggleBlock class="overrlayparamsheatdistort" :title="$t('overlay.heatDistort.title')" :icons="['heat']">
		<div class="holder">
			<div class="item">
				<div class="info">
					<i18n-t scope="global" tag="div" keypath="overlay.heatDistort.description">
						<template #LINK>
							<a href="https://ulule.com" target="_blank">{{ $t("overlay.ulule.description_link") }}</a>
						</template>
					</i18n-t>
				</div>
			</div>

			<div class="card-item item info">
				<Icon name="alert" />
				<i18n-t scope="global" tag="span" keypath="overlay.heatDistort.install">
					<template #HEAT>
						<a @click="openHeat()">{{ $t("overlay.heatDistort.install_heat_link") }}</a>
					</template>
					<template #SHADER>
						<a href="https://www.shadertastic.com" target="_blank">{{ $t("overlay.heatDistort.install_shader_link") }}</a>
					</template>
				</i18n-t>
			</div>

			<Button class="item center" icon="add" primary>{{ $t("overlay.heatDistort.add_overlay") }}</Button>
		</div>
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Icon from '@/components/Icon.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		Button,
		ToggleBlock,
	},
	emits:[],
})
export default class OverrlayParamsHeatDistort extends Vue {

	public distortionList:any[] = [];

	public openHeat():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.HEAT);
	}

}
</script>

<style scoped lang="less">
.overrlayparamsheatdistort{
	.holder{
		display: flex;
		flex-direction: column;
		gap: .5em;

		.icon {
			height: 1em;
			margin-right: .5em;
		}

		.info {
			a {
				font-weight: bold;
			}
		}

		.item {
			&.center {
				margin: auto;
			}
		}
	}
}
</style>