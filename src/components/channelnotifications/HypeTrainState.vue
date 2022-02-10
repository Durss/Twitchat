<template>
	<div class="hypetrainstate">
		<img src="@/assets/icons/train.svg" alt="train" class="icon">
		<h1>Hype train level {{trainData.level}}</h1>
	</div>
</template>

<script lang="ts">
import store, { HypeTrainStateData } from '@/store';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class HypeTrainState extends Vue {

	public get trainData():HypeTrainStateData {
		return store.state.hypeTrain as HypeTrainStateData;
	}

}
</script>

<style scoped lang="less">
.hypetrainstate{
	color: @mainColor_light;
	padding: 10px;
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;
	background-color: darken(@mainColor_normal, 20%);
	text-align: center;
	display: flex;
	flex-direction: row;
	justify-content: center;
	
	.icon {
		height: 25px;
		vertical-align: middle;
		margin-right: 10px;
	}

	.timer {
		margin-left: 10px;
		font-style: italic;
		font-size: .8em;
	}

	.cancelBt {
		margin-top: 10px;
	}
	
}
</style>