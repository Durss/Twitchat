<template>
	<div class="triggeractioncommandargumentparams">
		<div class="form">
			<div class="inputHolder">
				<Icon name="placeholder" class="icon" />
				<label for="chatcmdparam" v-tooltip="$t('triggers.slash_cmd.param_cmd_params_tt')">{{ $t("triggers.slash_cmd.param_cmd_params") }}</label>
				<div class="input-field">
					<PlaceholderField class="inputField"
					v-model="newTag"
					:placeholder="$t('triggers.slash_cmd.param_cmd_params_placeholder')"
					@keyup.enter="createItem()"
					@blur="createItem()" />
				</div>
			</div>
			<div class="tags" v-if="triggerData.chatCommandParams && triggerData.chatCommandParams.length > 0">
				<div class="tag" v-for="item, index in triggerData.chatCommandParams" :key="item.tag">
					<button class="deleteBt" @click="triggerData.chatCommandParams!.splice(index, 1)">
						<Icon name="cross" alt="delete" class="deleteIcon" theme="light" />
					</button>
					<span v-click2Select @click="copy($event, item)" class="label">{{ "{" }}{{ item.tag }}{{ "}" }}</span>
					<!-- <select class="typeSelector" v-model="item.type" v-tooltip="$t('triggers.slash_cmd.param_cmd_params_type_tt')">
						<option value="TEXT">Text</option>
						<option value="USER">User</option>
					</select> -->
				</div>
			</div>
		</div>
		<!-- <div class="usage" v-if="triggerData.chatCommandParams && triggerData.chatCommandParams.length > 0">
			<div class="example">
				<div class="label">● {{ $t("triggers.slash_cmd.param_cmd_params_example") }}</div>
				<input type="text" v-model="usage">
			</div>
			<div class="result">
				<div class="label">● {{ $t("triggers.slash_cmd.param_cmd_params_example_result") }}</div>
				<div class="values">
					<template v-for="(p, index) in triggerData.chatCommandParams">
						<mark @click="copy($event, p)" v-click2Select>{{ "{" }}{{ p.tag.toUpperCase() }}{{ "}" }}</mark>
						<Icon name="right" class="arrow" />
						<span>"{{ usage.replace(/\s+/gi, ' ').split(" ")[index+1] }}"</span>
					</template>
				</div>
			</div>
		</div> -->
	</div>
</template>

<script lang="ts">
import type { TriggerChatCommandParam, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import PlaceholderField from '@/components/PlaceholderField.vue';

@Component({
	components:{
		ParamItem,
		PlaceholderField,
	},
	emits:[],
})
class TriggerActionCommandArgumentParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public usage:string = "";
	public newTag:string = "";
	public params:TriggerChatCommandParam[] = [];
	public param_cmdParams:TwitchatDataTypes.ParameterData<string[]> = { type:"editablelist", value:[], icon:"placeholder", labelKey:"triggers.slash_cmd.param_cmd_params", placeholderKey:"triggers.slash_cmd.param_cmd_params_placeholder", tooltipKey:"triggers.slash_cmd.param_cmd_params_tt", max:30, maxLength:50 };

	public mounted():void {
		this.updateUsage();
	}

	public createItem():void {
		if(this.newTag.length == 0) return;
		if(!this.triggerData.chatCommandParams) this.triggerData.chatCommandParams = [];
		this.triggerData.chatCommandParams.push({
			tag:this.newTag,
			type:"TEXT",
		});
		this.newTag = "";
		this.updateUsage();
	}

	public updateUsage():void {
		let cmd = this.triggerData.chatCommand ?? "";
		//If usage field content is long enough, no need to do anything
		const availableItems = this.usage.replace(cmd, "").replace(/\s+/gi, ' ').trim().split(" ").filter(v=>v.length > 0);
		if(this.triggerData.chatCommandParams && availableItems.length > this.triggerData.chatCommandParams.length-1) return;

		//Generate a fake message
		const words = "Lorem ipsum dolore Enim nisi labore adipisicing irure aliquip anim dolor consequat fugiat exercitation veniam minim velit ullamco consectetur duis aute tempor".trim();
		this.usage = cmd + " " + words.split(" ").splice(0, Math.max(5, this.param_cmdParams.value.length)).join(" ");
	}

	public filterChars(event:KeyboardEvent):void {
		if(!/[a-z-0-9_-]/gi.test(event.key)) event.preventDefault();
	}

	public copy(event:MouseEvent, item:TriggerChatCommandParam):void {
		Utils.copyToClipboard("{"+item.tag+"}");
		gsap.fromTo(event.currentTarget, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

}
export default toNative(TriggerActionCommandArgumentParams);
</script>

<style scoped lang="less">
.triggeractioncommandargumentparams{
	.form {
		flex-grow: 1;
		width: 100%;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		gap: .5em;
		.inputHolder  {
			display: flex;
			flex-direction: row;
			align-items: center;

			flex-grow: 1;
			label {
				flex-grow: 1;
			}
		}
		.icon {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: .5em;
			vertical-align: bottom;
		}
		&>*:not(:first-child) {
			margin-left: 1.5em;
		}
		.tags {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			gap: .5em;
			color: var(--color-text-light);
			.tag {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: .25em;
				padding: .25em;
				border-radius: .5em;
				background-color: var(--color-primary);
				.label {
					text-transform: uppercase;
					text-align: right;
					font-weight: bold;
					cursor: pointer !important;
				}
				.typeSelector {
					padding: 0 .5em !important;
				}
				.deleteBt {
					display: flex;
					//Using negative margin compasated by inverse margin on .deleteIcon
					//so the close button starts at the very sides of the item
					margin: -.25em;
					align-self: stretch;
					transition: transform .2s;
					.deleteIcon {
						height: 1em;
						margin: .25em;
						vertical-align: middle;
					}
					&:hover {
						transform: scale(1.1);
					}
				}
			}
		}
	}
	.usage {
		margin-top: 1em;
		background-color: var(--color-primary-fadest);
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
		mark {
			cursor: pointer !important;
		}
	}
}
</style>