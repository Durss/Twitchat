<template>
	<div class="triggeractionanymessageparams">
		<ToggleBlock
			class="block permissions"
			:open="false"
			:title="$t('triggers.actions.chat.allowed_users')"
			:icons="['user']"
			medium
			primary
		>
			<PermissionsForm v-model="triggerData.permissions!" />
		</ToggleBlock>
	</div>
</template>

<script setup lang="ts">
import PermissionsForm from "@/components/PermissionsForm.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import type { TriggerData } from "@/types/TriggerActionDataTypes";
import Utils from "@/utils/Utils";
import { onBeforeMount } from "vue";

const props = defineProps<{
	triggerData: TriggerData;
}>();

onBeforeMount(() => {
	if (!props.triggerData.permissions) {
		props.triggerData.permissions = Utils.getDefaultPermissions();
	}
});
</script>

<style scoped lang="less">
.triggeractionanymessageparams {
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	align-items: center;
}
</style>
