<template>
	<div class="overlayinstaller">
		<template v-if="obsConnected && !showInput && !showSuccess">
			<Button class="createBt" icon="obs" primary
			@click="createBrowserSource()"
			v-tooltip="$t('overlay.1click_install_tt')"
			:disabled="disabled">{{ $t("overlay.1click_install") }}</Button>

			<span>{{$t("global.or")}}</span>
			
			<Button class="createBt" icon="edit" @click="showInput = true" small :disabled="disabled">{{ $t("overlay.manual_installBt") }}</Button>
		</template>
		
		<template v-else-if="showSuccess">
			<p class="card-item existing" v-if="isExistingSource" @click="isExistingSource=showSuccess=false">{{$t("overlay.install_success_exists")}}</p>
			<p class="card-item primary success" v-else @click="showSuccess=false"><Icon name="checkmark" /> {{$t("overlay.install_success")}}</p>
		</template>

		<div v-else class="field">
			<button class="backBt" @click="showInput = false" v-if="obsConnected"><Icon name="back" /></button>
			<input class="primary" type="text" v-model="localURL" v-click2Select readonly :disabled="disabled">
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Icon from '@/components/Icon.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button,
	},
	emits:[],
})
export default class OverlayInstaller extends Vue {

	@Prop()
	public id!:TwitchatDataTypes.OverlayTypes;

	@Prop({default:"", type:String})
	public url!:string;

	@Prop({default:false, type:Boolean})
	public disabled!:boolean;

	public showInput:boolean = false;
	public showSuccess:boolean = false;
	public isExistingSource:boolean = false;

	private successTO:number = -1;

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; };

	public get localURL():string { return this.url != ""? this.url : this.$overlayURL(this.id); };

	/**
	 * Creates an OBS browser source
	 */
	public async createBrowserSource():Promise<void> {
		clearTimeout(this.successTO);
		this.isExistingSource = await OBSWebsocket.instance.createBrowserSource(this.localURL, "Twitchat_"+this.id);
		this.showSuccess = true;
		if(!this.isExistingSource) {
			this.successTO = setTimeout(()=> {
				this.showSuccess = false;
			}, 5000);
		}
	}

}
</script>

<style scoped lang="less">
.overlayinstaller{
	gap: 1em;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	width: 100%;
	.createBt {
		display: flex;
	}

	.field{
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		width: 100%;
		.icon {
			display: block;
			height: 1em;
			color: var(--color-text);
			padding-right: .75em;
		}
		input {
			flex-grow: 1;
		}
	}

	.existing {
		cursor: pointer;
		text-align: center;
		white-space: pre-line;
		line-height: 1.25em;
	}

	.success {
		cursor: pointer;
		.icon {
			height: 1em;
			vertical-align: middle;
		}
	}
	
}
</style>