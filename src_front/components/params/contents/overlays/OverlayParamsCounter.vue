<template>
	<div class="overlayparamscounter overlayParamsSection">
		
		<a href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiHJJ6Qdxe70WczZGXwOVCuD" target="_blank" class="youtubeTutorialBt">
			<Icon name="youtube" theme="light" />
			<span>{{ $t('overlay.youtube_demo_tt') }}</span>
			<Icon name="newtab" theme="light" />
		</a>
		
		<template v-if="counters.length == 0">
			<div class="header">{{ $t("overlay.counters.head_empty") }}</div>
			<Button class="center" icon="add" @click="createCounter()">{{ $t('overlay.counters.createBt') }}</Button>
			<OverlayCounter class="counterExample" embed :staticCounterData="counterExample" />
			<OverlayCounter class="padding counterExample" embed :staticCounterData="progressExample" />
		</template>

		<template v-else>
			<div class="header">{{ $t("overlay.counters.head") }}</div>

			<div class="counterList">
				<div class="card-item counter" v-for="c in counters" :key="c.id">
					<div class="title">{{ c.name }}</div>
					<OverlayInstaller type="counter" :id="c.id" :sourceSuffix="c.name" :queryParams="{cid:c.id}" :sourceTransform="getOverlayTransform(c)" />
				</div>
			</div>

			<ToggleBlock class="shrink" small :title="$t('overlay.css_customization')" :open="false">
				<div class="cssHead">{{ $t("overlay.counters.css") }}</div>
				<div class="cssCategory">{{$t('overlay.counters.css_example.simple')}}</div>
				<ul class="cssStructure">
					<li>#holder { ... }</li>
					<li class="sublist">
						<ul>
							<li>#name { ... }</li>
							<li>#spacer { ... }</li>
							<li>#value { ... }</li>
							<li>#value.decimal0 { ... }</li>
							<li>#value.decimal1 { ... }</li>
							<li>#value.decimal2 { ... }</li>
							<li>#value.decimal3 { ... }</li>
						</ul>
					</li>
				</ul>
				
				<div class="cssCategory">{{$t('overlay.counters.css_example.progress')}}</div>
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
									<li>#value.decimal0 { ... }</li>
									<li>#value.decimal1 { ... }</li>
									<li>#value.decimal2 { ... }</li>
									<li>#value.decimal3 { ... }</li>
									<li>#max { ... }</li>
								</ul>
							</li>
						</ul>
					</li>
				</ul>
				
				<div class="cssCategory">{{$t('overlay.counters.css_example.leaderboard')}}</div>
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
		</template>

	</div>
</template>

<script lang="ts">
import OverlayCounter from '@/components/overlays/OverlayCounter.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TTButton from '../../../TTButton.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import type { SourceTransform } from '@/utils/OBSWebSocket';

@Component({
	components:{
		Button: TTButton,
		ToggleBlock,
		OverlayCounter,
		OverlayInstaller,
	},
	emits:[]
})
class OverlayParamsCounter extends Vue {
	
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
		return this.$store.counters.counterList;
	}

	public getOverlayTransform(counter:TwitchatDataTypes.CounterData):Partial<SourceTransform> {
		if(counter.perUser == true) {
			return  {width: 600};
		}else{
			return  {width: 600, height:200};
		}
	}

	public createCounter():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.COUNTERS);
	}

}
export default toNative(OverlayParamsCounter);
</script>

<style scoped lang="less">
.overlayparamscounter{
	.counterList {
		gap: .5em;
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

		}
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

</style>