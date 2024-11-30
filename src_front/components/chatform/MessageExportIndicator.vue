<template>
	<div class="messageexportindicator blured-background-window"
	:class="classes"
	@click="close()">
		<Icon class="loader" name="loader" v-if="state.id == 'progress'" v-tooltip="$t('global.messageExport.tooltip')" />
		<div class="message error" v-else-if="state.id == 'error'">{{ $t("global.messageExport.error", state.params) }}</div>
		<div class="message error" v-else-if="state.id == 'error_discord_access'">{{ $t("error.discord.MISSING_ACCESS", state.params) }}</div>
		<div class="message" v-else>
			<div v-if="state.id == 'complete_downloadOnly' || state.id == 'complete'">
				<Icon name="checkmark" />{{ $t("global.messageExport.complete_downloaded", state.params) }}
			</div>
			<div v-if="state.id == 'complete_downloadOnly' || state.id == 'discord'">
				<Icon name="checkmark" />{{ $t("global.messageExport.complete_discord", state.params) }}
			</div>
			<div v-if="state.id == 'complete_copyOnly' || state.id == 'complete'">
				<Icon name="checkmark" />{{ $t("global.messageExport.complete_copied", state.params) }}
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import { watch } from 'vue';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
class MessageExportIndicator extends Vue {

	private closeTimeout:number = -1;

	public get state() {
		return this.$store.main.messageExportState!;
	}

	public get classes():string[] {
		const res:string[] = [];
		if(this.state.id == "error"
		|| this.state.id == "error_discord_access") res.push("error");
		return res;
	}

	public close() {
		if(this.state.id == "progress") return;
		this.$store.main.messageExportState = null;
	}

	public mounted():void {
		watch(() => this.state, () => {
			//Auto close after success
			if(this.state.id == "complete"
			|| this.state.id == "discord"
			|| this.state.id == "complete_copyOnly"
			|| this.state.id == "complete_downloadOnly") {
				this.closeTimeout = window.setTimeout(() => {
					this.$store.main.messageExportState = null;
				}, 7000);
			}
		});
	}

	public beforeUnmount():void {
		clearTimeout(this.closeTimeout);
	}

}
export default toNative(MessageExportIndicator);
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

	&.error {
		background-color: red;
	}
}
</style>