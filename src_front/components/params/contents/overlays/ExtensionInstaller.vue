<template>
	<div class="extensioninstaller card-item primary">
		<icon class="logo" name="extension" />
		<div v-if="loading" class="content loader">
			<span class="text">
				{{ $t('extensions.installer.loading') }}
				<icon class="spinner" name="loader" />
			</span>
		</div>
		<div class="content" v-else-if="!installed">
			<span class="head">{{ $t('extensions.installer.install')}}</span>
			<TTButton light icon="twitch" type="link" :href="extensionUrl" target="_blank">{{ $t('extensions.installer.installBt')}}</TTButton>
		</div>
		<div class="content" v-else-if="!enabled">
			<span class="head">{{ $t('extensions.installer.enable')}}</span>
			<TTButton light icon="twitch" @click="enableExtension" :loading="enabling">{{ $t('extensions.installer.enableBt')}}</TTButton>
			<div class="card-item alert error" v-if="enableError"><icon name="alert" />{{ $t('extensions.installer.enableError') }}</div>
		</div>
		<div class="content complete" v-else>
			<span>
				<icon name="checkmark" />{{ $t('extensions.installer.ready')}}
			</span>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import Config from '@/utils/Config';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, toNative, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
	},
	emits:[],
})
class ExtensionInstaller extends Vue {

	public loading = true;
	public enabled = false;
	public enabling = false;
	public installed = false;
	public enableError = false;
	public extensionUrl:string = `https://dashboard.twitch.tv/extensions/${Config.instance.TWITCH_EXTENSION_ID}-${Config.instance.TWITCH_EXTENSION_VERSION}`;

	private checkinterval = -1;
	
	public mounted():void {
		this.loading = true;
		this.checkExtensionStatus();

		this.checkinterval = window.setInterval(async () => {
			if(this.enabled || this.loading) return;
			this.checkExtensionStatus();
		}, 3000);
	}

	public beforeUnmount():void {
		window.clearInterval(this.checkinterval);
	}

	public async enableExtension():Promise<void> {
		this.enabling = true;
		this.enableError = false;
		const success = await TwitchUtils.updateExtension(
			Config.instance.TWITCH_EXTENSION_ID,
			Config.instance.TWITCH_EXTENSION_VERSION,
			true,
			"1",
			"overlay"
		);
		if(success) {
			this.enabled = true;
		}else{
			this.enableError = true;
		}
		this.enabling = false;
	}

	private checkExtensionStatus():void {
		Promise.all([
			TwitchUtils.listExtensions(false).then(res => {
				if(!res) return;
				this.installed = res.findIndex(e => e.id == Config.instance.TWITCH_EXTENSION_ID) > -1;
			}),
			TwitchUtils.listExtensions(true).then(res => {
				if(!res) return;
				for (const key in res.overlay) {
					if (!Object.hasOwn(res.overlay, key)) continue;
					
					const element = res.overlay[key];
					if(element?.id == Config.instance.TWITCH_EXTENSION_ID) {
						this.installed = true;
						this.enabled = true;
					}
				}
			})
		]).then(([ , ]) => {
			this.loading = false;
		});
	}
}
export default toNative(ExtensionInstaller);
</script>

<style scoped lang="less">
.extensioninstaller{
	gap: 1em;
	display: flex;
	flex-direction: row;
	line-height: 1.25em;

	.logo {
		width: 2em;
		height: auto;
	}

	.content {
		gap: .5em;
		flex: 1;
		display: flex;
		flex-direction: column;

		.icon {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}

		&.loader {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
		}

	}
	
	.error {
		align-self: center;
	}

	.button {
		align-self: center;
	}
}
</style>