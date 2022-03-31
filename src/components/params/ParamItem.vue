<template class="cffdfdf">
	<div :class="classes">
		<div class="content">
			<img :src="require('@/assets/icons/'+paramData.icon)" v-if="paramData.icon" class="icon">

			<div v-if="paramData.type == 'toggle'" class="holder toggle">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'toggle'+key" v-if="label" v-html="label" @click="paramData.value = !paramData.value;"></label>
				<ToggleButton :id="'toggle'+key" v-model="paramData.value" />
			</div>
			
			<div v-if="paramData.type == 'number'" class="holder number">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'number'+key" v-if="label" v-html="label"></label>
				<input :id="'number'+key" type="number" v-model.number="paramData.value" :min="paramData.min" :max="paramData.max" :step="paramData.step">
			</div>
			
			<div v-if="paramData.type == 'text' || paramData.type == 'password'" class="holder text">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'text'+key" v-if="label" v-html="label"></label>
				<textarea v-if="paramData.longText===true" :id="'text'+key" v-model="paramData.value" :placeholder="paramData.placeholder" rows="2"></textarea>
				<input v-if="paramData.longText!==true" :id="'text'+key" :type="paramData.type" v-model="paramData.value" :placeholder="paramData.placeholder">
			</div>
			
			<div v-if="paramData.type == 'slider'" class="holder slider">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'slider'+key">
					{{paramData.label}} <span>({{paramData.value}})</span>
				</label>
				<input type="range" :min="paramData.min" :max="paramData.max" :step="paramData.step" :id="'slider'+key" v-model.number="paramData.value">
			</div>
			
			<div v-if="paramData.type == 'list'" class="holder list">
				<Button v-if="paramData.example"
					:icon="require('@/assets/icons/help_purple.svg')"
					:data-tooltip="'<img src='+require('@/assets/img/param_examples/'+paramData.example)+'>'"
					class="helpBt"
				/>
				<label :for="'list'+key">{{paramData.label}}</label>
				<select v-model="paramData.value" :id="'list'+key">
					<option v-for="a in paramData.listValues" :key="a" :value="a">{{a}}</option>
				</select>
			</div>
		</div>

		
		<transition-group name="fade"
			tag="div"
			ref="messageList"
			class="messageList"
		>
			<ParamItem v-for="c in children" :key="c.id" :paramData="c" class="child" :childLevel="childLevel+1" />
		</transition-group>
	</div>
</template>

<script lang="ts">
import store, { ParameterCategory, ParameterData } from '@/store';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ToggleButton from '../ToggleButton.vue';

@Options({
	name:"ParamItem",//This is needed so recursion works properly
	props:{
		paramData:Object,
		childLevel:{
			type:Number,
			default:0,
		},
	},
	components:{
		Button,
		ToggleButton,
	},
	emits: ["change"]
})
export default class ParamItem extends Vue {
	
	public paramData!:ParameterData;
	public childLevel!:number;
	public key:string = Math.random().toString();

	public get children():ParameterData[] {
		if(this.paramData.value as boolean === false) return [];

		const list = store.state.params;
		const children:ParameterData[] = [];
		for (const key in list) {
			const params = list[key as ParameterCategory];
			for (const key2 in params) {
				if(params[key2].parent != undefined && params[key2].parent == this.paramData.id) {
					children.push(params[key2]);
				}
			}
		}
		return children;
	}

	public get classes():string[] {
		const res = ["paramitem"];
		if(this.paramData.longText) res.push("longText");
		res.push("level_"+this.childLevel);
		return res;
	}

	public get label():string {
		return this.paramData.label.replace(/(\([^)]+\))/gi, "<span class='small'>$1</span>");
	}

	public mounted():void {
		watch(() => this.paramData.value, () => {
			store.dispatch('updateParams');
			this.$emit("change");
		});
	}
}
</script>

<style scoped lang="less">
.paramitem{
	&.longText {
		.content {
			.text {
				flex-grow: 1;
				display: flex;
				flex-direction: column;
			}
		}
		}

	.content {
		display: flex;
		flex-direction: row;
		transition: background-color .1s;

		&:hover {
			background-color: fade(@mainColor_normal, 10%);
		}

		.icon {
			width: 1em;
			height: 1em;
			object-fit: contain;
			margin-right: 10px;
		}
		

		.helpBt {
			background: none;
			@size: 20px;
			width: @size;
			min-width: @size;
			height: @size;
			min-height: @size;
			padding: 0;
			margin: 0;
			margin-right: 10px;
			:deep(.icon) {
				width: 100%;
				height: 100%;
				max-width: 100%;
				max-height: 100%;
			}
		}
		
		.toggle, .number, .text, .list {
			flex-grow: 1;
			display: flex;
			flex-direction: row;
			label {
				flex-grow: 1;
				// text-align: right;
				margin: 0;
				margin-right: 20px;
				cursor: pointer;
			}
		}
		:deep(.small) {
			// display: block;
			font-size: .75em;
			font-style: italic;
		}
		.slider {
			flex-grow: 1;
			display: flex;
			flex-direction: column;
			&:not(.text)>label {
				text-align: center;
			}
		}

		textarea {
			// max-width: 100%;
			resize: vertical;
		}
	}

	&.level_1,
	&.level_2,
	&.level_3,
	&.level_4 {
		.child {
			@padding:15px;
			width: calc(100% - @padding);
		}
	}

	.child {
		margin-left: auto;
		margin-right: 0;
		margin-top: 5px;
		@padding:10%;
		width: calc(100% - @padding);
		position: relative;
		:deep(.holder) {
			&::before {
				position: absolute;
				left: -15px;
				content: "⤷";
				display: inline-block;
				margin-right: 5px;
			}
			label {
				font-size: .9em;
			}
		}
	}
	
	/* Enter and leave animations can use different */
	/* durations and timing functions.              */
	.fade-enter-active {
		transition: all 0.2s;
	}

	.fade-leave-active {
		transition: all 0.2s;
	}

	.fade-enter-from,
	.fade-leave-to {
		opacity: 0;
		transform: translateY(-10px);
	}
}
</style>