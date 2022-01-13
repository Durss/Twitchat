<template>
	<div class="paramitem">
		<div v-if="paramData.type == 'toggle'" class="toggle">
			<label :for="'toggle'+key" v-html="label"></label>
			<ToggleButton :id="'toggle'+key" v-model="paramData.value" />
		</div>
		
		<div v-if="paramData.type == 'slider'" class="slider">
			<label :for="'slider'+key">
				<img :src="paramData.icon" v-if="paramData.icon">
				{{paramData.label}} <span>({{paramData.value}})</span>
			</label>
			<input type="range" :min="paramData.min" :max="paramData.max" :step="paramData.step" :id="'slider'+key" v-model.number="paramData.value">
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterData } from '@/store';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';

@Options({
	props:{
		paramData:Object
	},
	components:{
		Button,
		ToggleButton,
	}
})
export default class ParamItem extends Vue {
	public paramData!:ParameterData;
	public key:string = Math.random().toString();

	public get label():string {
		return this.paramData.label.replace(/(\([^)]+\))/gi, "<span class='small'>$1</span>");
	}

	public mounted():void {
		watch(() => this.paramData.value, () => {
			store.dispatch('updateParams');
		});
	}
}
</script>

<style scoped lang="less">
.paramitem{
	.toggle {
		display: flex;
		flex-direction: row;
		label {
			flex-grow: 1;
			// text-align: right;
			margin-right: 20px;
			:deep(.small) {
				display: block;
				font-size: .9em;
				font-style: italic;
			}
		}
	}
	.slider {
		display: flex;
		flex-direction: column;
		label {
			text-align: center;
		}
	}
}
</style>