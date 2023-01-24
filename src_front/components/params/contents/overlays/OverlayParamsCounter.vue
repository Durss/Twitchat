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
			<div class="row counter" v-for="c in counters" :key="c.id">
				<label :for="'input_'+c.id">{{ c.name }}</label>
				<input type="text" :id="'input_'+c.id" :value="getOverlayUrl(c)">
				<OverlayCounter class="counterExample" embed :staticCounterData="c" />
			</div>
			<ToggleBlock small :title="$t('overlay.css_customization')" :open="false">
				<div>{{ $t("overlay.counters.css") }}</div>
				<div class="head">{{$t('overlay.counters.css_example.simple')}}</div>
				<ul>
					<li>#holder { ... }</li>
					<li>
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
					<li>
						<ul>
							<li>#fill { ... }</li>
							<li>#goal { ... }</li>
							<li>
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
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import OverlayCounter from '@/components/overlays/OverlayCounter.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
		OverlayCounter,
	},
	emits:["setContent"]
})
export default class OverlayParamsCounter extends Vue {
	
	public open = false;
	public counterExample:TwitchatDataTypes.CounterData = {
		id:Utils.getUUID(),
		loop:false,
		perUser:false,
		value:50,
		name:"My awesome counter",
		min:false,
		max:false,
	}
	public progressExample:TwitchatDataTypes.CounterData = {
		id:Utils.getUUID(),
		loop:false,
		perUser:false,
		value:50,
		name:"My awesome counter",
		min:0,
		max:75,
	}
	
	public get counters():TwitchatDataTypes.CounterData[] {
		// return [];
		return this.$store('counters').data;
	}

	public getOverlayUrl(counter:TwitchatDataTypes.CounterData):string { return this.$overlayURL("counter", [{k:"cid", v:counter.id}]); }

	public createCounter():void {
		this.$emit("setContent", TwitchatDataTypes.ParamsCategories.COUNTERS);
	}

}
</script>

<style scoped lang="less">
.overlayparamscounter{
	.holder {
		display: flex;
		flex-direction: column;
		gap:1em;
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
			margin-bottom: .5em;
			li {
				list-style-type: disc;
				list-style-position: inside;
				margin-bottom: .25em;
				&:has(ul) {
					list-style-type: none;
				}
				ul {
					margin-top: 0;
					display: inline;
					list-style-type: none;
					li {
						margin-left: 1em;
					}
				}
			}
		}
	}
}
</style>