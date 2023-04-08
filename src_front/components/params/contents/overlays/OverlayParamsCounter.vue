<template>
	<ToggleBlock :open="open" class="overlayparamscounter" :title="$t('overlay.counters.title')" :icons="['count_purple']">
		<div class="holder" v-if="counters.length == 0">
			<p>{{ $t("overlay.counters.head_empty") }}</p>
			<Button :title="$t('overlay.counters.createBt')" :icon="$image('icons/add.svg')" @click="createCounter()" />
			<OverlayCounter class="counterExample" embed :staticCounterData="counterExample" />
			<OverlayCounter class="counterExample" embed :staticCounterData="progressExample" />
		</div>

		<div class="holder" v-if="counters.length > 0">
			<div>{{ $t("overlay.counters.head") }}</div>
			<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
				<div>{{ $t("overlay.counters.css") }}</div>
				<div class="head">{{$t('overlay.counters.css_example.simple')}}</div>
				<ul>
					<li>#holder { ... }</li>
					<li class="sublist">
						<ul>
							<li>#name { ... }</li>
							<li>#spacer { ... }</li>
							<li>#value { ... }</li>
						</ul>
					</li>
				</ul>
				
				<div class="head">{{$t('overlay.counters.css_example.progress')}}</div>
				<ul>
					<li>#holder { ... }</li>
					<li class="sublist">
						<ul>
							<li>#fill { ... }</li>
							<li>#name { ... }</li>
							<li>#goal { ... }</li>
							<li class="sublist">
								<ul>
									<li>#min { ... }</li>
									<li>#value { ... }</li>
									<li>#max { ... }</li>
								</ul>
							</li>
						</ul>
					</li>
				</ul>
			</ToggleBlock>
			<div class="row counter" v-for="c in counters" :key="c.id">
				<input type="text" :id="'input_'+c.id" :value="getOverlayUrl(c)">
				<OverlayCounter class="counterExample" embed :staticCounterData="c" />
			</div>
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import OverlayCounter from '@/components/overlays/OverlayCounter.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
		OverlayCounter,
	},
	emits:[]
})
export default class OverlayParamsCounter extends Vue {
	
	@Prop({default:false})
	public open!:boolean;
	
	public counterExample:TwitchatDataTypes.CounterData = {
		id:Utils.getUUID(),
		placeholderKey:"",
		loop:false,
		perUser:false,
		value:50,
		name:"My awesome counter",
		min:false,
		max:false,
	}
	public progressExample:TwitchatDataTypes.CounterData = {
		id:Utils.getUUID(),
		placeholderKey:"",
		loop:false,
		perUser:false,
		value:50,
		name:"My awesome counter",
		min:0,
		max:75,
	}
	
	public get counters():TwitchatDataTypes.CounterData[] {
		// return [];
		return this.$store('counters').counterList;
	}

	public getOverlayUrl(counter:TwitchatDataTypes.CounterData):string { return this.$overlayURL("counter", [{k:"cid", v:counter.id}]); }

	public createCounter():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.COUNTERS);
	}

}
</script>

<style scoped lang="less">
.overlayparamscounter{
	.holder {
		display: flex;
		flex-direction: column;
		gap:1em;
		max-height: 400px;
		overflow-y: auto;
		.counter {
			display: flex;
			flex-direction: column;
			padding: .5em;
			background-color: fade(@mainColor_normal_extralight, 30%);
			border-radius: @border_radius;
			label {
				font-weight: bold;
			}
		}

		.head {
			margin: 1em 0 .5em 0;
			font-weight: bold;
		}

		.counterExample {
			width: auto;
			font-size: .75em;
			align-self: center;
		}
		
		ul {
			.cssStructure();
			margin-top: .5em;
		}
	}
}
</style>