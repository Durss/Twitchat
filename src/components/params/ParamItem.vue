<template>
	<div class="paramitem">
		<div v-if="paramData.type == 'toggle'" class="toggle">
			<label :for="'toggle'+key" v-html="label" @click="paramData.value = !paramData.value"></label>
			<ToggleButton :id="'toggle'+key" v-model="paramData.value" @update:modelValue="onChange()" />
		</div>
		
		<div v-if="paramData.type == 'number'" class="number">
			<label :for="'number'+key" v-html="label"></label>
			<input :id="'number'+key" type="number" v-model.number="paramData.value" :min="paramData.min" :max="paramData.max" :step="paramData.step">
		</div>
		
		<div v-if="paramData.type == 'list'" class="list">
			<label :for="'list'+key" v-html="label"></label>
			<input :id="'list'+key" type="text" v-model="paramData.value" :placeholder="paramData.placeholder">
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
	},
	emits: ["change"]
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

	public onChange():void {
		this.$emit("change");
	}
}
</script>

<style scoped lang="less">
.paramitem{
	.toggle, .number {
		display: flex;
		flex-direction: row;
		label {
			flex-grow: 1;
			// text-align: right;
			margin-right: 20px;
			cursor: pointer;
		}
	}
	:deep(.small) {
		// display: block;
		font-size: .9em;
		font-style: italic;
	}
	.slider, .list {
		display: flex;
		flex-direction: column;
		&:not(.list)>label {
			text-align: center;
		}
	}
}
</style>