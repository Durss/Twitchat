<template>
	<div class="currencypatterninput card-item">
		<Icon name="coin" />
		<span class="label">{{ $t("global.currency_pattern") }}</span>
		<div class="form input-field">
			<contenteditable tag="div" class="input"
				v-model="prefix"
				:contenteditable="true"
				:no-nl="true"
				:no-html="true"
				@input="onChange" />

			<span class="label">42</span>

			<contenteditable tag="div" class="input"
				v-model="suffix"
				:contenteditable="true"
				:no-nl="true"
				:no-html="true"
				@input="onChange" />
		</div>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';
import Icon from './Icon.vue';
import contenteditable from 'vue-contenteditable';
import Utils from '@/utils/Utils';

@Component({
	components:{
		Icon,
		contenteditable,
	},
	emits:["update:modelValue", "change"],
})
class CurrencyPatternInput extends Vue {

	@Prop({type:String, default:''})
	public modelValue!: string;

	public prefix: string = '';
	public suffix: string = '';

	public mounted(){
		const match = this.modelValue.trim().match(new RegExp(`^(.*?)${Utils.CURRENCY_AMOUNT_TOKEN}(.*?)$`));
		if(match){
			this.prefix = match[1];
			this.suffix = match[2];
		}
	}

	public onChange(){
		const pattern = this.prefix + Utils.CURRENCY_AMOUNT_TOKEN + this.suffix;
		this.$emit('update:modelValue', pattern);
		this.$emit('change', pattern);
	}

}
export default toNative(CurrencyPatternInput);
</script>

<style scoped lang="less">
.currencypatterninput{
	gap: .5em;
	display: flex;
	flex-direction: row;
	align-items: center;

	.icon {
		width: 1em;
		height: 1em;
	}

	.label {
		white-space: pre-line;
		flex: 1;
	}

	.form {
		display: flex;
		flex-direction: row;
		align-items: center;
		.input {
			min-width: 20px;
			padding: 0 .25em;
			border-radius: var(--border-radius);
			background: none;
			border: 1px dashed var(--color-text);
			font-weight: bold;
			&:first-child {
				text-align: right;
			}
		}
	}
}
</style>
