<template>
	<div class="overlayinstaller">
		<template v-if="obsConnected && !showInput && !showSuccess">
			<TTButton class="createBt" icon="obs" primary
			@click="createBrowserSource()"
			v-tooltip="$t('overlay.1click_install_tt')"
			:disabled="disabled">{{ $t("overlay.1click_install") }}</TTButton>

			<span>{{$t("global.or")}}</span>
			
			<TTButton class="createBt" icon="edit" @click="showInput = true" small :disabled="disabled">{{ $t("overlay.manual_installBt") }}</TTButton>
		</template>
		
		<template v-else-if="showSuccess">
			<p class="card-item primary existing" v-if="isExistingSource" @click="isExistingSource=showSuccess=false">{{$t("overlay.install_success_exists")}}</p>
			<p class="card-item primary success" v-else @click="showSuccess=false"><Icon name="checkmark" /> {{$t("overlay.install_success")}}</p>
		</template>

		<div v-else class="field">
			<button class="backBt" @click="showInput = false" v-if="obsConnected"><Icon name="back" /></button>
			<input class="primary" type="text" v-model="localURL" v-click2Select readonly :disabled="disabled">
		</div>

		<div class="card-item instructions" v-if="showInput && $slots.default">
			<slot></slot>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import Icon from '@/components/Icon.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket, { type SourceTransform } from '@/utils/OBSWebsocket';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
	},
	emits:["obsSourceCreated"],
})
export default class OverlayInstaller extends Vue {

	@Prop({type:String, default:""})
	public id!:string;

	@Prop({type:String, default:""})
	public css!:string;

	@Prop()
	public type!:TwitchatDataTypes.OverlayTypes;

	@Prop({default:"", type:String})
	public url!:string;

	@Prop({default:{}, type:Object})
	public sourceTransform!:Partial<SourceTransform>;

	@Prop({default:false, type:Boolean})
	public disabled!:boolean;

	@Prop({default:"", type:String})
	public sourceSuffix!:string;

	@Prop({default:"", type:String})
	public sceneName!:string;

	@Prop({default:{}, type:Object})
	public queryParams!:any;

	@Prop({default:false, type:Boolean})
	public orderToBottom!:boolean;

	public showInput:boolean = false;
	public showSuccess:boolean = false;
	public isExistingSource:boolean = false;

	private successTO:number = -1;

	public get obsConnected():boolean { return OBSWebsocket.instance.connected; };

	public get localURL():string {
		const url = new URL(this.url != "" ? this.url : this.$overlayURL(this.type));
		if(this.id != "") url.searchParams.append("twitchat_overlay_id", this.id);
		if(this.queryParams) {
			for (const key in this.queryParams) {
				url.searchParams.append(key, this.queryParams[key]);
			}
		}
		return url.href;
	};

	/**
	 * Creates an OBS browser source
	 */
	public async createBrowserSource():Promise<void> {
		clearTimeout(this.successTO);
		let name = "Twitchat_"+this.type;
		if(this.sourceSuffix) name += this.sourceSuffix;
		this.isExistingSource = await OBSWebsocket.instance.createBrowserSource(this.localURL, name, this.sourceTransform, this.sceneName, this.orderToBottom !== false, this.css);
		this.showSuccess = true;
		if(!this.isExistingSource) {
			this.successTO = setTimeout(()=> {
				this.showSuccess = false;
			}, 5000);
		}
		this.$emit("obsSourceCreated", {sourceName:name});
	}

}
</script>

<style scoped lang="less">
.overlayinstaller{
	gap: 1em;
	row-gap: .5em;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	width: 100%;
	.createBt {
		display: flex;
	}

	.instructions {
		.bevel();
		background-color: var(--color-dark-fader);
		flex-basis: 100%;
		white-space: pre-line;
		line-height: 1.25em;
		font-size: .85em;
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