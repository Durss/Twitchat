<template>
	<div class="componentlist">
		<Splitter>Message parsing</Splitter>
		<div class="card-item section message">
			<ChatMessageChunksParser :chunks="messageChunks" v-if="messageChunks" channel="29961813" platform="twitch" />
		</div>

		<Splitter>Buttons</Splitter>

		<div class="card-item section buttons">
			<div class="actions">
				<Checkbox v-model="loading">loading mode</Checkbox>
				<Checkbox v-model="type" :values="['link', 'button']">&lt;a&gt; mode</Checkbox>
				<Checkbox v-model="selected">selected mode</Checkbox>
				<Checkbox v-model="disabled">disabled</Checkbox>
			</div>

			<div class="list">
				<Button href="https://twitchat.fr" target="_blank" :type="type" big :disabled="disabled" :loading="loading" :selected="selected">Normal big</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" primary big :disabled="disabled" :loading="loading" :selected="selected">Primary big</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" secondary big :disabled="disabled" :loading="loading" :selected="selected">Secondary big</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" alert big :disabled="disabled" :loading="loading" :selected="selected">Alert big</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" premium big :disabled="disabled" :loading="loading" :selected="selected">Alert big</Button>

				<Button href="https://twitchat.fr" target="_blank" :type="type" :disabled="disabled" :loading="loading" :selected="selected">Normal</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" primary :disabled="disabled" :loading="loading" :selected="selected">Primary</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" secondary :disabled="disabled" :loading="loading" :selected="selected">Secondary</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" alert :disabled="disabled" :loading="loading" :selected="selected">Alert</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" premium :disabled="disabled" :loading="loading" :selected="selected">Alert</Button>

				<Button href="https://twitchat.fr" target="_blank" :type="type" small :disabled="disabled" :loading="loading" :selected="selected">Normal small</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" primary small :disabled="disabled" :loading="loading" :selected="selected">Primary small</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" secondary small :disabled="disabled" :loading="loading" :selected="selected">Secondary small</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" alert small :disabled="disabled" :loading="loading" :selected="selected">Alert small</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" premium small :disabled="disabled" :loading="loading" :selected="selected">Alert small</Button>

				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" big :disabled="disabled" :loading="loading" :selected="selected">Normal big icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary big :disabled="disabled" :loading="loading" :selected="selected">Primary big icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary big :disabled="disabled" :loading="loading" :selected="selected">Secondary big icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert big :disabled="disabled" :loading="loading" :selected="selected">Alert big icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" premium big :disabled="disabled" :loading="loading" :selected="selected">Alert big icon</Button>

				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" :disabled="disabled" :loading="loading" :selected="selected">Normal icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary :disabled="disabled" :loading="loading" :selected="selected">Primary icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary :disabled="disabled" :loading="loading" :selected="selected">Secondary icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert :disabled="disabled" :loading="loading" :selected="selected">Alert icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" premium :disabled="disabled" :loading="loading" :selected="selected">Alert icon</Button>

				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" small :disabled="disabled" :loading="loading" :selected="selected">Normal small icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary small :disabled="disabled" :loading="loading" :selected="selected">Primary small icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary small :disabled="disabled" :loading="loading" :selected="selected">Secondary small icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert small :disabled="disabled" :loading="loading" :selected="selected">Alert small icon</Button>
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" premium small :disabled="disabled" :loading="loading" :selected="selected">Alert small icon</Button>

				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" big :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary big :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary big :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert big :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" premium big :disabled="disabled" :loading="loading" :selected="selected" />

				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" premium :disabled="disabled" :loading="loading" :selected="selected" />

				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" small :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" primary small :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" secondary small :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" alert small :disabled="disabled" :loading="loading" :selected="selected" />
				<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" premium small :disabled="disabled" :loading="loading" :selected="selected" />
			</div>

			<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" big :disabled="disabled" :loading="loading" :selected="selected">Full width button</Button>
			<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" :disabled="disabled" :loading="loading" :selected="selected">Full width button</Button>
			<Button href="https://twitchat.fr" target="_blank" :type="type" icon="twitchat" small :disabled="disabled" :loading="loading" :selected="selected">Full width button</Button>
		</div>

		<Splitter>Switch buttons</Splitter>

		<div class="card-item section switches">
			<SwitchButton :labels="['Big', 'Big']" big />
			<SwitchButton :labels="['Big secondary', 'Big secondary']" big secondary />
			<SwitchButton :labels="['Big alert', 'Big alert']" big alert />

			<SwitchButton :labels="['Normal', 'Normal']" />
			<SwitchButton :labels="['Secondary', 'Secondary']" secondary />
			<SwitchButton :labels="['Alert', 'Alert']" alert />

			<SwitchButton :labels="['Small', 'Small']" small />
			<SwitchButton :labels="['Small secondary', 'Small secondary']" small secondary />
			<SwitchButton :labels="['Small alert', 'Small alert']" small alert />
		</div>

		<Splitter>Toggle buttons</Splitter>

		<div class="card-item section toggles">
			<ToggleButton big />
			<ToggleButton big secondary />
			<ToggleButton big alert />

			<ToggleButton />
			<ToggleButton secondary />
			<ToggleButton alert />

			<ToggleButton small />
			<ToggleButton small secondary />
			<ToggleButton small alert />
		</div>

		<Splitter>Toggle blocks</Splitter>

		<div class="card-item section toggleBlocks">
			<ToggleBlock title="Title" subtitle="subtitle" key="toggle1">
				<template #left_actions>
					<Icon name="dragZone" class="icon" />
				</template>
				<template #right_actions>
					<Icon name="cross" class="icon" />
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Medium box" medium key="toggle2">
				<template #left_actions>
					<Icon name="dragZone" class="icon" />
				</template>
				<template #right_actions>
					<Icon name="cross" class="icon" />
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Small box" subtitle="subtitle" small key="toggle3">
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Title" primary subtitle="subtitle" key="toggle4">
				<template #left_actions>
					<Icon name="dragZone" class="icon" />
				</template>
				<template #right_actions>
					<Icon name="cross" class="icon" />
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Medium box" primary medium key="toggle5">
				<template #left_actions>
					<Icon name="dragZone" class="icon" />
				</template>
				<template #right_actions>
					<Icon name="cross" class="icon" />
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Small box" small medium primary key="toggle6">
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Title" secondary subtitle="subtitle" key="toggle7">
				<template #left_actions>
					<Icon name="dragZone" class="icon" />
				</template>
				<template #right_actions>
					<Icon name="cross" class="icon" />
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Medium box" secondary medium key="toggle8">
				<template #left_actions>
					<Icon name="dragZone" class="icon" />
				</template>
				<template #right_actions>
					<Icon name="cross" class="icon" />
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Small box" small medium secondary key="toggle9">
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Title" premium subtitle="subtitle" key="toggle10">
				<template #left_actions>
					<Icon name="dragZone" class="icon" />
				</template>
				<template #right_actions>
					<Icon name="cross" class="icon" />
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Medium box" premium medium key="toggle11">
				<template #left_actions>
					<Icon name="dragZone" class="icon" />
				</template>
				<template #right_actions>
					<Icon name="cross" class="icon" />
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Small box" small medium premium key="toggle12">
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="No title color" noTitleColor small key="toggle13">
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>

			<ToggleBlock title="Error" error key="toggle14">
				<template #left_actions>
					<Icon name="dragZone" class="icon" />
				</template>
				<template #right_actions>
					<Icon name="cross" class="icon" />
				</template>
				<div>Laboris tempor velit incididunt velit enim. Lorem laboris nisi nostrud cupidatat mollit nostrud excepteur pariatur deserunt veniam ipsum minim ut. Reprehenderit ipsum voluptate tempor anim duis laborum veniam sint consectetur. Laboris Lorem laboris eu labore sit elit veniam in dolor velit sit sunt sint id. Ipsum sunt magna cupidatat reprehenderit.</div>
			</ToggleBlock>
		</div>

		<Splitter>Progress bar</Splitter>

		<div class="card-item section progressbars">
			<ProgressBar :percent="progresses[0]" :duration="100 * 60 * 1000" />
			<ProgressBar :percent="progresses[1]" :duration="100 * 60 * 1000" secondary />
			<ProgressBar :percent="progresses[2]" :duration="100 * 60 * 1000" alert />
			<ProgressBar :percent="progresses[2]" :duration="100 * 60 * 1000" premium />
			<ProgressBar :percent="progresses[3]" :duration="100 * 60 * 1000" />
			<Button class="restartBt" @click="resetProgressbars()" icon="refresh">Restart</Button>
		</div>

		<Splitter>Sliders</Splitter>

		<div class="card-item section sliders">
			<Slider :modelValue="8" />
			<Slider :modelValue="12" secondary />
			<Slider :modelValue="2" alert />
			<Slider :modelValue="6" premium />
			<Slider :modelValue="5" disabled />
		</div>

		<Splitter>Tab menu</Splitter>

		<div class="card-item section tabmenus">
			<div>
				<TabMenu big :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu big primary :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu big secondary :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu big alert :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu big premium :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
			</div>
			<div>
				<TabMenu :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu primary :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu secondary :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu alert :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu premium :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
			</div>
			<div>
				<TabMenu small :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu small primary :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu small secondary :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu small alert :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
				<TabMenu small premium :values="[0,1,2]" :labels="['item 1', 'item 2', 'item 3']" :icons="[null, 'twitchat', 'spotify']" />
			</div>
		</div>

		<Splitter>Parameters</Splitter>

		<div class="card-item section params">
			<ParamItem :paramData="param_bool" />
			<ParamItem :paramData="param_color" />
			<ParamItem :paramData="param_slider" />
			<ParamItem :paramData="param_text" />
			<ParamItem :paramData="param_text" error />
			<ParamItem :paramData="param_textLong" />
			<ParamItem :paramData="param_textLong" error />
			<ParamItem :paramData="param_number" />
			<ParamItem :paramData="param_list" />
			<ParamItem :paramData="param_list" error />
			<ParamItem :paramData="param_listEdit" />
			<ParamItem :paramData="param_listEdit" error />
			<ParamItem :paramData="param_duration" />
			<ParamItem :paramData="param_duration" error />
		</div>

		<Splitter>Icons</Splitter>

		<div class="card-item section icons">
			<!-- Voluntary wrong icon name to show error state -->
			<Icon name="voluntary_error" class="icon" />

			<Icon v-for="(icon, index) in iconList"
				class="icon"
				:key="icon"
				:name="icon"
				@click="reloadIcon(index)"
				@mouseover="openTooltip($event, icon)" />
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import Checkbox from '@/components/Checkbox.vue';
import Icon from '@/components/Icon.vue';
import ProgressBar from '@/components/ProgressBar.vue';
import Slider from '@/components/Slider.vue';
import Splitter from '@/components/Splitter.vue';
import SwitchButton from '@/components/SwitchButton.vue';
import TabMenu from '@/components/TabMenu.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ChatMessageChunksParser from '@/components/messages/components/ChatMessageChunksParser.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TwitchDataTypes } from '@/types//twitch/TwitchDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import staticEmotes from '@/utils/twitch/staticEmoteList.json';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import { useTippy } from 'vue-tippy';
import ToggleButton from '@/components/ToggleButton.vue';
import DurationForm from '@/components/DurationForm.vue';

@Component({
	components:{
		Icon,
		Button: TTButton,
		Slider,
		TabMenu,
		Checkbox,
		Splitter,
		ParamItem,
		ToggleBlock,
		ProgressBar,
		SwitchButton,
		ToggleButton,
		DurationForm,
		ChatMessageChunksParser,
	},
	emits:[],
})
class ComponentList extends Vue {

	public type:"button"|"link" = "button";
	public time:number = 0;
	public disposed:boolean = false;
	public loading:boolean = false;
	public selected:boolean = false;
	public disabled:boolean = false;
	public progresses:number[] = [];
	public iconList:string[] = [];
	public messageChunks:TwitchatDataTypes.ParseMessageChunk[] = [];

	public param_bool:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"global.enabled"};
	public param_color:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"#ff0000", label:"Color"};
	public param_slider:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:0, label:"Slider", min:0, max:10};
	public param_text:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", label:"Text", placeholder:"value..."};
	public param_textLong:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, label:"Text", placeholder:"value..."};
	public param_number:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, label:"Count"};
	public param_list:TwitchatDataTypes.ParameterData<string, string> = {type:"list", value:"", listValues:[{value:"item1",label:"Item 1"}, {value:"item2",label:"Item 2"},{value:"item1",label:"Item 3"}], label:"List"};
	public param_listEdit:TwitchatDataTypes.ParameterData<string[], string> = {type:"editablelist", value:["Item 2"], maxLength:10, max:2, options:["Item 1", "Item 2", "Item 3"], label:"Editable List"};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {type:"duration", value:10*60, label:"Duration ({VALUE}s)"};

	private tooltipCreated:{[key:string]:boolean} = {};

	public async mounted():Promise<void> {
		this.resetProgressbars();
		this.renderFrame();
		let iconList = import.meta.glob("@/assets/icons/*.svg");
		const keys = Object.keys(iconList).map(v=>v.replace(/.*\/(.*?).svg/, "$1"));
		this.iconList = keys;
		const emotes = staticEmotes as TwitchDataTypes.Emote[];
		TwitchUtils.loadEmoteSets("", emotes).then(()=> {
			this.messageChunks = TwitchUtils.parseMessageToChunks("Lorem ipsum @durss 2.54 sit amet LUL hehe durss consectetur google.fr DinoDance", undefined, true);
			TwitchUtils.highlightChunks(this.messageChunks, ["@durss"]);
			// this.messageChunks = TwitchUtils.parseMessageToChunks("/announcepurple Are you a Twitch streamer? I'm using GivePLZ twitchat.fr TakeNRG, a full featured chat alternative for streamers. Take a look at it if you wish KomodoHype", undefined, true);
		})
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	public resetProgressbars():void {
		this.progresses = [.25,.25,.25,.95];
	}

	public async reloadIcon(index:number):Promise<void> {
		let prevName = this.iconList[index]!;
		this.iconList[index] = "";
		await this.$nextTick();
		this.iconList[index]! = prevName;
	}

	/**
	 * Create tooltip only when hovering the image.
	 * This avoids huge lag on build if creating tooltip on every items
	 * at once.
	 *
	 * @param event
	 * @param iconName
	 */
	public openTooltip(event:MouseEvent, iconName:string):void {
		if(this.tooltipCreated[iconName] === true) return;
		this.tooltipCreated[iconName] = true;
		useTippy(event.currentTarget as HTMLImageElement, {
			content: iconName,
		});
	}


	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());
		for (let i = 0; i < this.progresses.length; i++) {
			this.progresses[i]! += .00003;
		}
	}

}
export default toNative(ComponentList);
</script>

<style scoped lang="less">
.componentlist{
	gap: 1em;
	display: flex;
	flex-direction: column;
	margin: 2em 0;
	color: var(--color-text);

	.section {
		margin: 0 2em;
	}

	.icons {
		gap: 5px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		color:var(--color-text);
		.icon {
			width: 4em;
			height: 4em;
			:deep(svg) {
				object-fit: cover;
			}
		}
	}

	.message {
		color: var(--color-text);
	}

	.buttons {
		gap: 1em;
		display: flex;
		flex-direction: column;
		.actions {
			align-self: center;
			gap: 1em;
			display: flex;
			flex-direction: row;
		}
		.list {
			display: grid;
			gap: .5em;
			grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
			justify-items: flex-start;
			align-items: flex-start;
		}
	}

	.switches {
		display: grid;
		gap: 2em;
		grid-template-columns: 1fr 1fr 1fr;
		justify-items: stretch;
		align-items: stretch;
	}

	.toggles {
		display: grid;
		gap: .5em;
		grid-template-columns: 1fr 1fr 1fr;
		justify-items: center;
		align-items: stretch;
	}

	.toggleBlocks {
		padding: .5em;
		@itemWidth: 400px;
		display: grid;
		gap: 1em;
		grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
	}

	.tabmenus {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1em;
		justify-items: flex-start;
		align-items: flex-start;
		&>div{
			display: flex;
			flex-direction: column;
			gap: .5em;
		}
	}

	.progressbars {
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		gap: 1em;
		&> div {
			// flex-basis: 300px;
			margin-bottom: 1em;
		}
		.restartBt {
			align-self: center;
		}
	}

	.sliders {
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	.params{
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
		color: var(--color-text);
		&>* {
			width: 600px;
		}
	}
}
</style>
