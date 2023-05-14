<template>
	<ToggleBlock :open="open" class="overlayparamscounter" :title="$t('overlay.counters.title')" :icons="['count']">
		
		
		<div class="holder" v-if="counters.length == 0 || true">
			<a class="item demoLink" href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiHJJ6Qdxe70WczZGXwOVCuD" target="_blank"><img src="@/assets/img/param_examples/counterVideo.jpg" class="demo"></a>

			<p>{{ $t("overlay.counters.head_empty") }}</p>
			<Button icon="add" @click="createCounter()">{{ $t('overlay.counters.createBt') }}</Button>
			<OverlayCounter class="counterExample" embed :staticCounterData="counterExample" />
			<OverlayCounter class="padding counterExample" embed :staticCounterData="progressExample" />
		</div>

		<div class="holder" v-if="counters.length > 0">
			<a class="item demoLink" href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiHJJ6Qdxe70WczZGXwOVCuD" target="_blank"><img src="@/assets/img/param_examples/counterVideo.jpg" class="demo"></a>

			<div>{{ $t("overlay.counters.head") }}</div>
			<ToggleBlock class="cssToggle" small :title="$t('overlay.css_customization')" :open="false">
				<div>{{ $t("overlay.counters.css") }}</div>
				<div class="head">{{$t('overlay.counters.css_example.simple')}}</div>
				<ul class="cssStructure">
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
				<ul class="cssStructure">
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
				
				<div class="head">{{$t('overlay.counters.css_example.leaderboard')}}</div>
				<ul class="cssStructure">
					<li>#holder { ... }</li>
					<li class="sublist">
						<ul>
							<li>.user { ... }</li>
							<li class="sublist">
								<ul>
									<li>.points { ... }</li>
									<li>.avatar { ... }</li>
									<li>.login { ... }</li>
								</ul>
							</li>
						</ul>
					</li>
				</ul>
			</ToggleBlock>

			<div class="counterList">
				<div class="card-item counter" v-for="c in counters" :key="c.id">
					<div class="title">{{ c.name }}</div>
					<input class="primary" type="text" :id="'input_'+c.id" :value="getOverlayUrl(c)" v-click2Select>
					<!-- <OverlayCounter class="counterExample" embed :staticCounterData="c" v-if="!c.perUser" /> -->
				</div>
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
		gap: 1em;
		display: flex;
		flex-direction: column;

		.demoLink {
			.demo {
				.emboss();
				margin:auto;
				display: block;
				max-height: 100px;
				aspect-ratio: 16 / 9;
				border-radius: .5em;
			}
		}

		.counterList {
			gap: 1em;
			display: flex;
			flex-direction: column;
			max-height: 400px;
			overflow-y: auto;
			.counter {
				flex-shrink: 0;
				gap: 1em;
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				align-items: center;
				flex-wrap: wrap;

				.title {
					font-weight: bold;
					flex-basis: 200px;
				}
	
				input {
					flex-grow: 1;
				}
			}
		}

		.head {
			margin: 1em 0 .5em 0;
			font-weight: bold;
		}

		.cssToggle {
			width: 100%;
		}

		.counterExample {
			font-size: .75em;
			align-self: center;
			color: var(--color-dark);
			&.padding {
				//Counters contain internal padding.
				//This negative padding compensate for it
				margin-top: -1em;
			}
		}
	}
}

</style>