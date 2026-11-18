<template>
	<component :is="tag" class="browserpermissionchecker">
		<template v-if="denied">
			<div class="message">
				<Icon name="alert" />
				{{ errorMessage }}
			</div>
			<div class="card-item alert error" v-if="isBraveBrowser">
				<Icon name="brave" /> {{ t("connexions.brave_shields") }}
			</div>
		</template>
		<slot v-else />
	</component>
</template>

<script setup lang="ts">
import { onBeforeMount, onMounted, ref } from "vue";
import Icon from "./Icon.vue";
import { useI18n } from "vue-i18n";

type AugmentedPermissionName = PermissionName | "local-network-access";

const { t } = useI18n();
const denied = ref(false);
const isBraveBrowser = ref<boolean>(false);

const props = withDefaults(
	defineProps<{
		tag?: string;
		errorMessage: string;
		permissionName: AugmentedPermissionName[] | AugmentedPermissionName;
	}>(),
	{
		tag: "div",
	},
);

onBeforeMount(async () => {
	isBraveBrowser.value = (navigator.brave && (await navigator.brave.isBrave())) || false;
});

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
