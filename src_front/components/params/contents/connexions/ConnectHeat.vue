<template>
	<div class="paramsheat parameterContent">
		<Icon name="heat" alt="heat icon" class="icon" />

		<div class="head">
			<p>{{ $t("heat.header") }}</p>
			<TTButton class="installBt" :href="$config.HEAT_EXTENSION"
				type="link" primary
				icon="newtab"
				target="_blank">{{ $t("heat.install") }}</TTButton>
		</div>

		<ParamItem class="item enableBt" :paramData="param_enabled" v-model="param_enabled.value" @change="toggleState()" />

		<Icon name="loader" v-if="connecting" />
		<ParamItem :paramData="param_debugChan" v-model="param_debugChan.value" v-if="debugMode" @change="changeChannel" />

		<div class="fadeHolder" :style="holderStyles">
			<HeatOverlayClick />
			<HeatScreenList :open="subContent == 'heatAreas'" :class="subContent == 'heatAreas'? 'selected' : ''" />
			<HeatDebug />
		</div>

		<div class="card-item infos">
			<Icon name="info"/>
			<span>{{ $t("heat.anonymous_info") }}</span>
			<img v-if="$i18n.locale == 'fr'" src="@/assets/img/heat_anonymous_fr.gif" alt="anonymous heat tutorial">
			<img v-else src="@/assets/img/heat_anonymous_en.gif" alt="anonymous heat tutorial">
		</div>

		<div class="youtubeLinks">
			<a href="https://www.youtube.com/watch?v=TR_uUFjXrvc" target="_blank">
				<img src="@/assets/img/youtube_heat1.jpg" alt="youtube example" class="youtubeBt">
			</a>
			<a href="https://www.youtube.com/watch?v=ukhBTmS2pWM" target="_blank">
				<img src="@/assets/img/youtube_heat2.jpg" alt="youtube example" class="youtubeBt">
			</a>
		</div>

		<a href="https://ko-fi.com/scottmadethis" target="_blank" class="donate">{{ $t("heat.donate") }}</a>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import HeatSocket from '@/utils/twitch/HeatSocket';
import type { CSSProperties } from 'vue';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import HeatDebug from './../heat/HeatDebug.vue';
import HeatOverlayClick from './../heat/HeatOverlayClick.vue';
import HeatScreenList from './../heat/HeatScreenList.vue';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		HeatDebug,
		HeatScreenList,
		HeatOverlayClick,
	},
	emits:[],
})
class ConnectHeat extends Vue {

	public param_debugChan:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", label:"Channel ID", icon:"debug"};
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enable"};
	public debugMode:boolean = false;
	public connecting:boolean = false;

	private debouncer:number = -1;
	private keyupHandler!:(e:KeyboardEvent) => void;

	public get subContent() { return this.$store.params.currentPageSubContent; }

	public get holderStyles():CSSProperties {
		return {
			opacity:this.param_enabled.value === true? 1 : .5,
			pointerEvents:this.param_enabled.value === true? "all" : "none",
		};
	}

	public beforeMount():void {
		if(DataStore.get(DataStore.HEAT_ENABLED) === "true") {
			this.param_enabled.value = true;
		}
		this.param_debugChan.value = this.$store.auth.twitch.user.id;

		this.keyupHandler = (e:KeyboardEvent) => this.onKeyUp(e);
		document.addEventListener("keyup", this.keyupHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("keyup", this.keyupHandler);
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Called when debug channel ID is updated
	 */
	public changeChannel():void {
		clearTimeout(this.debouncer);
		this.debouncer = window.setTimeout(async ()=> {
			this.connecting = true;
			await HeatSocket.instance.connect(this.param_debugChan.value);
			this.connecting = false;
		}, 500);
	}

	/**
	 * Called when toggling the "enabled" state
	 */
	public toggleState():void {
		if(this.param_enabled.value) {
			HeatSocket.instance.connect( this.$store.auth.twitch.user.id );
		}else{
			HeatSocket.instance.disconnect();
		}
		DataStore.set(DataStore.HEAT_ENABLED, this.param_enabled.value);
	}

	/**
	 * Show a debug field on CTRL+ALT+D
	 * @param e
	 */
	public onKeyUp(e:KeyboardEvent):void {
		if(e.key.toUpperCase() == "D" && e.ctrlKey && e.altKey) {
			this.debugMode = !this.debugMode;
			e.preventDefault();
		}
	}

}
export default toNative(ConnectHeat);
</script>

<style scoped lang="less">
.paramsheat{
	.installBt {
		margin-top: .5em;
	}

	.youtubeLinks {
		gap: 1em;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		justify-content: center;
		.youtubeBt {
			.emboss();
			width: 200px;
			border-radius: var(--border-radius);
		}
	}

	.fadeHolder {
		gap: 1em;
		display: flex;
		flex-direction: column;


		.selected {
			border: 5px solid transparent;
			border-radius: 1em;
			animation: blink .5s 3 forwards;
			animation-delay: 1s;
			@keyframes blink {
				0% {
					border-color: var(--color-secondary);
				}
				50% {
					border-color: transparent;
				}
				100% {
					border-color: var(--color-secondary);
				}
			}
		}
	}

	.donate {
		text-align: center;
		font-style: italic;
		text-decoration: none;
	}

	.infos {
		background-color: var(--color-secondary-fader);
		.icon {
			height: 1em;
			margin-right: .5em;
		}
		img {
			display: block;
			margin: auto;
			margin-top: 1em
		}
	}
}
</style>

