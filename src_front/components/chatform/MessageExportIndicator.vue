<template>
	<div class="messageexportindicator blured-background-window"
	@click="close()">
		<Icon class="loader" name="loader" v-if="state == 'progress'" v-tooltip="$t('global.messageExport.tooltip')" />
		<div class="message error" v-else-if="state == 'error'">{{ $t("global.messageExport.error") }}</div>
		<div class="message" v-else>
			<div v-if="state == 'complete_downloadOnly' || state == 'complete'">
				<Icon name="checkmark" />{{ $t("global.messageExport.complete_downloaded") }}
			</div>
			<div v-if="state == 'complete_downloadOnly' || state == 'discord'">
				<Icon name="checkmark" />{{ $t("global.messageExport.complete_discord") }}
			</div>
			<div v-if="state == 'complete_copyOnly' || state == 'complete'">
				<Icon name="checkmark" />{{ $t("global.messageExport.complete_copied") }}
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import { watch } from 'vue';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
export default class MessageExportIndicator extends Vue {

	private closeTimeout:number = -1;

	public get state() {
		return this.$store.main.messageExportState;
	}

	public close() {
		if(this.state == "progress") return;
		this.$store.main.messageExportState = null;
	}

	public mounted():void {
		watch(() => this.state, () => {
			//Auto close after success
			if(this.state == "complete"
			|| this.state == "discord"
			|| this.state == "complete_copyOnly"
			|| this.state == "complete_downloadOnly") {
				this.closeTimeout = setTimeout(() => {
					this.$store.main.messageExportState = null;
				}, 7000);
			}
		});
	}

	public beforeUnmount():void {
		clearTimeout(this.closeTimeout);
	}

}
</script>

<style scoped lang="less">
.messageexportindicator{
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
	cursor: pointer;
	white-space: pre-line;
	text-align: center;
	line-height: 1.5em;

	color: var(--color-text);

	.loader {
		height: 1.5em;
	}

	.message {
		gap: .5em;
		display: flex;
		flex-direction: column;
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}
}
</style>