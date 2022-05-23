<template>
	<div class="postonchatparam">

		<ParamItem class="parameter" :paramData="enabledParam" ref="paramItem" />
		
		<PlaceholderSelector class="placeholders" v-if="placeholderTarget && placeholders && enabledParam.value===true"
			:target="placeholderTarget"
			:placeholders="placeholders"
			v-model="textParam.value"
			@change="saveParams()"
		/>
	</div>
</template>

<script lang="ts">
import store, { BotMessageField, ParameterData } from '@/store';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import ParamItem from './ParamItem.vue';
import PlaceholderSelector, { PlaceholderEntry } from './PlaceholderSelector.vue';

@Options({
	props:{
		title:{
			type:String,
			default:"Post winner on chat",
		},
		botMessageKey:String,
		placeholders:Object,
		icon:String,
		noToggle:{
			type:Boolean,
			default:false,
		},
	},
	components:{
		ParamItem,
		PlaceholderSelector,
	}
})
export default class PostOnChatParam extends Vue {
	
	public icon!:string;
	public title!:string;
	public noToggle!:boolean;
	public botMessageKey!:BotMessageField;
	public placeholders!:PlaceholderEntry[];

	public enabledParam:ParameterData = { label:"", value:false, type:"toggle", noInput:this.noToggle};
	public textParam:ParameterData = { label:"", value:"", type:"text", longText:true};

	public placeholderTarget:HTMLTextAreaElement|null = null;

	public async mounted():Promise<void> {
		const data					= store.state.botMessages[ this.botMessageKey ];
		this.textParam.value		= data.message;
		this.enabledParam.label		= this.title;
		this.enabledParam.value		= data.enabled;
		this.enabledParam.children	= [this.textParam];
		if(this.icon) {
			this.enabledParam.icon	= this.icon;
		}

		watch(()=>this.textParam.value, ()=> this.saveParams())
		watch(()=>this.enabledParam.value, ()=> this.saveParams())

		await this.$nextTick();
		this.saveParams();
	}

	public async saveParams():Promise<void> {
		store.dispatch("updateBotMessage", {key:this.botMessageKey,
											enabled:this.enabledParam.value,
											message:this.textParam.value});

		if(this.enabledParam.value) {
			await this.$nextTick();
			this.placeholderTarget = (this.$refs.paramItem as ParamItem).$el.getElementsByTagName("textarea")[0];
		}
	}
}
</script>

<style scoped lang="less">
.postonchatparam{
	.placeholders {
		margin-top: .5em;
	}
}
</style>