<template>
	<div class="inputplaceholder">
		<ParamItem class="parameter" :paramData="paramData" ref="paramItem" />
		
		<PlaceholderSelector class="placeholders" v-if="placeholderTarget && placeholders"
			:target="placeholderTarget"
			:placeholders="placeholders"
			v-model="paramData.value"
			@change="saveParams()"
		/>
	</div>
</template>

<script lang="ts">
import type { ParameterData, PlaceholderEntry } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';
import PlaceholderSelector from './PlaceholderSelector.vue';
import ParamItem from './ParamItem.vue';

@Options({
	props:{
		paramData:Object,
		placeholders:{
			type:Object,
			default:[],
		},
	},
	components:{
		ParamItem,
		PlaceholderSelector,
	}
})
/**
 * Links a ParamItem to a PlaceholderSelector
 * Makes it easier to to add placeholders to a ParamItem without having
 * to manually get the input's ref and give it back to the PlaceholderSelector
 * 
 * ParamItem must have a "text" type
 */
export default class InputPLaceHolder extends Vue {

	public paramData!:ParameterData;
	public placeholders!:PlaceholderEntry[];

	public placeholderTarget:HTMLTextAreaElement|HTMLInputElement|null = null;

	public async mounted():Promise<void> {
		if(this.paramData.type != "text") {
			throw new Error("paramData type must be \"text\"");
		}
		// await this.$nextTick();
		this.placeholderTarget = (this.$refs.paramItem as ParamItem).$el.querySelector("textarea,input");
		console.log(this.placeholderTarget);
	}

	public saveParams():void {
		console.log("okfdokf");
	}

}
</script>

<style scoped lang="less">
.inputplaceholder{
	
}
</style>