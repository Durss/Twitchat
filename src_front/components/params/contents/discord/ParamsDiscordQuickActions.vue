<template>
	<div class="paramsdiscordquickactions">
		<i>...coming soon...</i>
		<!-- <TTButton icon="add">{{ $t("discord.quick_actions_addBt") }}</TTButton> -->
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
	},
	emits:[],
})
export default class ParamsDiscordQuickActions extends Vue {

}
</script>

<style scoped lang="less">
.paramsdiscordquickactions{
	gap: .5em;
	display: flex;
	flex-direction: column;
	align-items: center;
}
</style>