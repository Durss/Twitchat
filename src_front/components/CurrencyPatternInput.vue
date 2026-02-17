<template>
	<div class="currencypatterninput card-item">
		<Icon name="coin" />
		<span class="label">{{ $t("global.currency_pattern") }}</span>
		<div class="form input-field">
			<ContentEditable tag="div" class="input"
				v-model="prefix"
				:contenteditable="true"
				:no-nl="true"
				:no-html="true"
				:maxLength="10"
				@input="onChange" />

			<span class="label">42</span>

			<ContentEditable tag="div" class="input"
				v-model="suffix"
				:contenteditable="true"
				:no-nl="true"
				:no-html="true"
				:maxLength="10"
				@input="onChange" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Icon from './Icon.vue';
import Utils from '@/utils/Utils';
import ContentEditable from '@/components/ContentEditable.vue';

const props = withDefaults(defineProps<{
	modelValue?: string;
}>(), {
	modelValue: '',
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	'change': [value: string];
}>();

const prefix = ref('');
const suffix = ref('');

function onChange() {
	const pattern = prefix.value + Utils.CURRENCY_AMOUNT_TOKEN + suffix.value;
	emit('update:modelValue', pattern);
	emit('change', pattern);
}

onMounted(() => {
	const match = props.modelValue.trim().match(new RegExp(`^(.*?)${Utils.CURRENCY_AMOUNT_TOKEN}(.*?)$`));
	if(match) {
		prefix.value = match[1]!;
		suffix.value = match[2]!;
	}
});
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
