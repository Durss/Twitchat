<template>
	<div class="overlayinstaller">
		<template v-if="obsConnected && !showInput && !showSuccess">
			<TTButton class="createBt" icon="obs" primary
			@click="createBrowserSource()"
			v-tooltip="$t('overlay.1click_install_tt')"
			:light="light != false"
			:secondary="secondary != false"
			:disabled="disabled">{{ $t("overlay.1click_install") }}</TTButton>

			<span>{{$t("global.or")}}</span>

			<TTButton class="createBt" icon="edit" @click="showInput = true" small :light="light != false" :secondary="secondary != false" :disabled="disabled">{{ $t("overlay.manual_installBt") }}</TTButton>
		</template>

		<template v-else-if="showSuccess">
			<p class="card-item primary existing" v-if="isExistingSource" @click="isExistingSource=showSuccess=false">{{$t("overlay.install_success_exists")}}</p>
			<p class="card-item primary success" v-else @click="showSuccess=false"><Icon name="checkmark" /> {{$t("overlay.install_success")}}</p>
		</template>

		<div v-else class="field">
			<button class="backBt" v-if="obsConnected" @click="showInput = false"><Icon name="back" /></button>
			<TTButton class="draggable" draggable="true" type="link" :href="localURLOBS" :light="light != false" :secondary="secondary != false" @click.prevent @dragstart="onDragButtonStart($event)">{{$t("overlay.drag_installBt")}}</TTButton>
			<span>{{$t("global.or")}}</span>
			<input :class="{primary: !secondary, secondary: secondary, light: light}" type="text" name="url" v-model="localURL" v-click2Select readonly :disabled="disabled">
			<TTButton class="copyBt" :copy="localURL" icon="copy" transparent :secondary="secondary" />
		</div>

		<div v-if="error" class="card-item alert error" @click="error=''">{{ $t("overlay.install_error", {ERROR:error}) }}</div>

		<div class="card-item instructions" v-if="(!obsConnected || showInput) && $slots.default">
			<slot></slot>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket, { type SourceTransform } from '@/utils/OBSWebsocket';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		TTButton,
	},
	emits:["obsSourceCreated"],
})
class OverlayInstaller extends Vue {

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
	public customSourceName!:string;

	@Prop({default:"", type:String})
	public sceneName!:string;

	@Prop({default:{}, type:Object})
	public queryParams!:any;

	@Prop({default:false, type:Boolean})
	public orderToBottom!:boolean;

	@Prop({default:false, type:Boolean})
	public light!:boolean;

	@Prop({default:false, type:Boolean})
	public secondary!:boolean;

	public error:string = "";
	public showInput:boolean = false;
	public showSuccess:boolean = false;
	public isExistingSource:boolean = false;

	private successTO:number = -1;

	public get obsConnected():boolean { return OBSWebsocket.instance.connected.value; };
	public get obsSourceName():string {
		if(this.customSourceName) return this.customSourceName
		let name = "Twitchat_"+this.type;
		if(this.sourceSuffix) name += this.sourceSuffix;
		return name;
	};

	public get localURLOBS():string {
		let url = new URL(this.localURL);
		url.searchParams.set("layer-name", this.obsSourceName);
		if(this.sourceTransform?.width) {
			url.searchParams.set("layer-width", this.sourceTransform.width.toString());
		}
		if(this.sourceTransform?.height) {
			url.searchParams.set("layer-height", this.sourceTransform.height.toString());
		}
		return url.href;
	}

	public get localURL():string {
		const url = new URL(this.url != "" ? this.url : this.$overlayURL(this.type));
		if(this.id != "") url.searchParams.set("twitchat_overlay_id", this.id);
		if(this.queryParams) {
			for (const key in this.queryParams) {
				url.searchParams.set(key, this.queryParams[key]);
			}
		}
		return url.href;
	};

	/**
	 * Creates an OBS browser source
	 */
	public async createBrowserSource():Promise<void> {
		this.showSuccess = false;
		this.error = "";
		clearTimeout(this.successTO);
		try {
			this.isExistingSource = await OBSWebsocket.instance.createBrowserSource(this.localURL, this.obsSourceName, this.sourceTransform, this.sceneName, this.orderToBottom !== false, this.css);
			this.showSuccess = true;
		}catch(error:any) {
			console.log(error);
			this.error = error.message;
			return;
		}
		console.log(this.isExistingSource);
		if(!this.isExistingSource) {
			this.successTO = window.setTimeout(()=> {
				this.showSuccess = false;
			}, 5000);
		}
		this.$emit("obsSourceCreated", {sourceName:this.obsSourceName});
	}

	public onDragButtonStart(event:DragEvent):void {
		if(!event.dataTransfer) return;
		event.dataTransfer.setDragImage(document.querySelector('#logoForDraggableItems') as HTMLImageElement, 50, 50);
		event.dataTransfer.setData("text/uri-list", (event.target as HTMLAnchorElement).href);
	}

}
export default toNative(OverlayInstaller);
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
		&:empty {
			display: none;
		}
	}

	.field{
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		width: 100%;
		.copyBt {
			margin-left: -1.85em;
			padding: 0;
		}
		.icon {
			display: block;
			height: 1em;
			color: var(--color-text);
		}
		input {
			padding-right: 1.75em;
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

	.error {
		flex: 1 1 100%;
		text-align: center;
		white-space: pre-line;
		line-height: 1.25em;
	}

	.draggable {
		user-select: none;
		cursor: move;
	}

}
</style>
