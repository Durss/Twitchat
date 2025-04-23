<template>
	<div class="triggeractionanymessageparams">
		<ToggleBlock class="block permissions" :open="false"
		:title="$t('triggers.actions.chat.allowed_users')" :icons="['user']" medium primary>
			<PermissionsForm v-model="triggerData.permissions" />
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import PermissionsForm from '@/components/PermissionsForm.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ToggleBlock,
		PermissionsForm,
	},
	emits:[],
})
class TriggerActionAnyMessageParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public beforeMount():void {
		if(!this.triggerData.permissions) {
			this.triggerData.permissions = Utils.getDefaultPermissions()
		}
	}

}
export default toNative(TriggerActionAnyMessageParams);
</script>

<style scoped lang="less">
.triggeractionanymessageparams{
	display: flex;
	flex-direction: column;
	gap: .5em;
	align-items: center;

}
</style>
