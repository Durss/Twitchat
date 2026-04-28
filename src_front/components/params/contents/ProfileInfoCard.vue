<template>
	<div class="card-item profileinfocard">
		<Icon v-if="icon" class="icon" :name="icon" />
		<div class="info">
			<img v-if="avatar" class="avatar" :src="props.avatar" alt="Avatar" />
			<Icon v-else name="user" class="avatar" />
			<span v-if="props.name" class="name">{{ props.name }}</span>
			<span v-if="props.details" class="details">{{ props.details }}</span>
		</div>
		<slot></slot>
		<TTButton @click="emits('logout')" alert icon="offline">{{
			t("global.disconnect")
		}}</TTButton>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const emits = defineEmits<{ logout: [] }>();
const props = defineProps<{
	avatar?: string;
	name?: string;
	details?: string;
	icon?: string;
}>();
</script>

<style scoped lang="less">
.profileinfocard {
	margin: auto;
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	align-items: center;
	position: relative;

	.icon {
		width: 1em;
		height: 1em;
		top: 0.5em;
		right: 0.5em;
		position: absolute;
	}

	.info {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5em;
		padding: 0.25em 0.5em;
		.avatar {
			width: 3em;
			height: 3em;
			border-radius: 50%;
		}
		.name {
			font-weight: bold;
		}
		.details {
			margin-top: -0.7em;
			font-style: italic;
			font-size: 0.8em;
		}
	}
}
</style>
