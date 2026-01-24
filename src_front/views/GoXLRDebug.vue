<template>
	<div class="goxlrdebug">

		<form @submit.prevent="connect()" class="content sidePanel" v-if="!connected">
			<h1>Connect with GoXLR-Utility</h1>
			<ParamItem :paramData="param_ip" />
			<ParamItem :paramData="param_port" />
			<Button type="submit" :loading="connecting">Connect</Button>
			<div class="card-item alert error" v-if="error" @click="error = false">Connection failed</div>
		</form>

		<div class="content sidePanel" v-else>
			<div class="card-item">
				<ParamItem noBackground :paramData="param_genderStyle" @change="setGenderStyle" />
				<ParamItem noBackground :paramData="param_genderAmount" @change="setGenderAmount" />
			</div>
			<div class="card-item">
				<ParamItem noBackground :paramData="param_echoStyle" @change="setEchoStyle" />
				<ParamItem noBackground :paramData="param_echoAmount" @change="setEchoAmount" />
			</div>

			<div class="card-item">
				<div>Enable preset</div>
				<div class="presets">
					<Button v-for="i in 6" @click="setActivePreset(i-1)" :selected="selectedPresetIndex == i-1">{{ i }}</Button>
				</div>
				<Button @click="toggleFX()" :selected="fxEnabled">Toggle FX</Button>
			</div>
		</div>

	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import { watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
	},
	emits:[],
})
class GoXLRDebug extends Vue {

	public error:boolean = false;
	public fxEnabled:boolean = false;
	public connecting:boolean = false;
	public selectedPresetIndex:number = 0;
	public param_ip:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"127.0.0.1", label:"IP"};
	public param_port:TwitchatDataTypes.ParameterData<number> = {type:"number", value:14564, label:"Port"};
	
	public param_genderStyle:TwitchatDataTypes.ParameterData<"Narrow"|"Medium"|"Wide"> = {type:"list", listValues:["Narrow", "Medium", "Wide"].map(v=>{ return {label:v, value:v}; }), value:"Narrow", label:"Gender style"};
	public param_genderAmount:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:0, min:-12, max:12, step:1, label:"Gender amount {VALUE}"};
	
	public param_echoStyle:TwitchatDataTypes.ParameterData<"Quarter"|"Eighth"|"MultiTap"|"Triplet"|"PingPong"|"ClassicSlap"> = {type:"list", listValues:["Quarter","Eighth","MultiTap","Triplet","PingPong","ClassicSlap"].map(v=>{ return {label:v, value:v}; }), value:"Quarter", label:"Echo style"};
	public param_echoAmount:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:0, min:0, max:100, step:1, label:"Echo amount {VALUE}"};

	public get connected():boolean { return GoXLRSocket.instance.connected.value; }

	public mounted():void {
		watch(()=>this.param_genderStyle.value, ()=> {
			const limit = {Narrow: 12, Medium: 25, Wide: 50}[this.param_genderStyle.value];
			this.param_genderAmount.min = -limit!;
			this.param_genderAmount.max = limit;
		})
	}

	public async connect():Promise<void> {
		this.error = false;
		this.connecting = true;
		try {
			await GoXLRSocket.instance.connect(this.param_ip.value, this.param_port.value);
		}catch(error) {
			console.log(error);
			this.error = true;
		}
		const state = GoXLRSocket.instance.status.value;
		if(state) {
			this.fxEnabled = state.effects.is_enabled;
			this.selectedPresetIndex = parseInt(state.effects.active_preset.replace(/\D/gi, ""));
		}
		this.connecting = false;
	}

	public setGenderStyle():void {
		GoXLRSocket.instance.setGenderStyle(this.param_genderStyle.value);
	}

	public setGenderAmount():void {
		GoXLRSocket.instance.setEncoderPercentValue("gender", this.param_genderAmount.value);
	}

	public setEchoStyle():void {
		GoXLRSocket.instance.setEchoStyle(this.param_echoStyle.value);
	}

	public setEchoAmount():void {
		GoXLRSocket.instance.setEncoderPercentValue("echo", this.param_echoAmount.value);
	}

	public setActivePreset(index:number):void {
		this.selectedPresetIndex = index;
		GoXLRSocket.instance.activeEffectPreset = index;
	}

	public toggleFX():void {
		this.fxEnabled = !this.fxEnabled;
		GoXLRSocket.instance.setFXEnabled(this.fxEnabled);
	}

}
export default toNative(GoXLRDebug);
</script>

<style scoped lang="less">
.goxlrdebug{
	
	form {
		max-width: 400px;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		h1 {
			text-align: center;
		}
		.error {
			text-align: center;
		}
	}

	.content {
		gap: .5em;
		display: flex;
		flex-direction: column;
		padding: 1em;
		margin: auto;
		margin-top: 1em;
		max-width: 800px;
	}

	.card-item {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}
}
</style>