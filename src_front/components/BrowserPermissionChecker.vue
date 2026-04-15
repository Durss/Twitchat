<template>
	<div class="browserpermissionchecker">
		<div v-if="denied" class="message">
			<Icon name="alert" />
			{{ errorMessage }}
		</div>
		<slot v-else />
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import Icon from "./Icon.vue";

type AugmentedPermissionName = PermissionName | "local-network-access";

const denied = ref(false);

const props = defineProps<{
	errorMessage: string;
	permissionName: AugmentedPermissionName[] | AugmentedPermissionName;
}>();

function check() {
	const permissions = Array.isArray(props.permissionName)
		? props.permissionName
		: [props.permissionName];
	for (const permission of permissions) {
		navigator.permissions
			.query({ name: permission as PermissionName })
			.then((result) => {
				if (result.state === "denied") {
					denied.value = true;
				}
			})
			.catch((error) => {
				/* Ignore */
			});
	}
}

onMounted(() => {
	check();
});
</script>

<style scoped lang="less">
.browserpermissionchecker {
	.message {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		.icon {
			height: 2em;
		}
	}
}
</style>
