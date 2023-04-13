<template>
	<div class="triggeractioncommandargumentparams">
		<ParamItem :paramData="param_cmdParams" v-model="triggerData.chatCommandParams" @change="updateUsage()" />
		<div class="usage" v-if="triggerData.chatCommandParams && triggerData.chatCommandParams.length > 0">
			<div class="example">
				<div class="label">● {{ $t("triggers.slash_cmd.param_cmd_params_example") }}</div>
				<input type="text" v-model="usage">
			</div>
			<div class="result">
				<div class="label">● {{ $t("triggers.slash_cmd.param_cmd_params_example_result") }}</div>
				<div class="values">
					<template v-for="(p, index) in triggerData.chatCommandParams">
						<mark v-click2Select>{{ "{" }}{{ p.toUpperCase() }}{{ "}" }}</mark>
						<img src="@/assets/icons/right_purple.svg" class="arrow">
						<span>"{{ usage.replace(/\s+/gi, ' ').split(" ")[index+1] }}"</span>
					</template>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		ParamItem,
	},
	emits:[],
})
export default class TriggerActionCommandArgumentParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public usage:string = "";

	public param_cmdParams:TwitchatDataTypes.ParameterData<string[]> = { type:"editablelist", value:[], icon:"placeholder_purple.svg", labelKey:"triggers.slash_cmd.param_cmd_params", placeholderKey:"triggers.slash_cmd.param_cmd_params_placeholder", tooltipKey:"triggers.slash_cmd.param_cmd_params_tt", maxLength:30 };

	public mounted():void {
		this.updateUsage();
	}

	public updateUsage():void {
		let cmd = this.triggerData.chatCommand ?? "";
		//If usage field content is long enough, no need to do anything
		const availableItems = this.usage.replace(cmd, "").replace(/\s+/gi, ' ').trim().split(" ").filter(v=>v.length > 0);
		if(availableItems.length > this.param_cmdParams.value.length-1) return;

		//Generate a fake message
		const words = "Lorem ipsum dolore Enim nisi labore adipisicing irure aliquip anim dolor consequat fugiat exercitation veniam minim velit ullamco consectetur duis aute tempor".trim();
		this.usage = cmd + " " + words.split(" ").splice(0, Math.max(5, this.param_cmdParams.value.length)).join(" ");
	}

}
</script>

<style scoped lang="less">
.triggeractioncommandargumentparams{
	.usage {
		background-color: fade(@mainColor_normal, 10%);
		padding: .5em;
		border-radius: .5em;
		margin-left: 1.5em;
		display: flex;
		flex-direction: column;
		gap: .5em;
		.example {
			input {
				width: 100%;
			}
		}
		.label {
			margin-bottom: .25em;
		}
		.arrow {
			height: .75em;
			margin: 0 .5em;
		}
		.values {
			display: grid;
			grid-template-columns: auto auto 1fr;
			align-items: center;
			gap: .25em;
		}
	}
}
</style>