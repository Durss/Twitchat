import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { PermissionsBitField, REST, Routes, SlashCommandBuilder } from "discord.js";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import Config from "../utils/Config";
import Logger from "../utils/Logger";
import TwitchUtils from "../utils/TwitchUtils";
import AbstractController from "./AbstractController";
import SSEController, { SSECode } from "./SSEController";

/**
* Created : 23/02/2024 
*/
export default class DiscordController extends AbstractController {

	private _rest!:REST;
	private _guildId2Twitch:{[key:string]:string} = {};

	constructor(public server:FastifyInstance) {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():void {
		this.server.post('/api/discord/interaction', async (request, response) => await this.postInteraction(request, response));

		this.initChannels();
		this.createCommands();
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Init an SSE connection
	 * 
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async postInteraction(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const json = request.body as InstallPaypload | SlashCommandPayload;

		const signature = request.headers["x-signature-ed25519"] as string;
		const timestamp = request.headers["x-signature-timestamp"] as string;
		const body = request.rawBody as string;
		
		const verified = verifyKey(body, signature, timestamp, Config.credentials.discord_public_key);
		if (!verified) {
			return response.status(401).send('Bad request signature');
		}
		
		switch(json.type) {
			case InteractionType.PING: {
				response.status(200);
				response.send({type:InteractionResponseType.PONG});
				break;
			}
			case InteractionType.APPLICATION_COMMAND: {
				let command = json as SlashCommandPayload;
				console.log(command.member.user.username+" executes command "+command.data.name);
				switch(command.data.name) {
					case "twitch":{
						this.configureTwitchChannel(request, response, command);
						break;
					}
					case "send":{
						this.sendMessageToTwitchat(request, response, command);
						break;
					}
				}
				break;
			}
		}
	}

	/**
	 * initializes data
	 */
	private initChannels():void {
		let json = {};
		if(!fs.existsSync(Config.discord2Twitch)) {
			fs.writeFileSync(Config.discord2Twitch, JSON.stringify(json), "utf-8");
		}else{
			try {
				json = JSON.parse(fs.readFileSync(Config.discord2Twitch, "utf-8"));
			}catch(error) {
				//File content is broken. make a backup, drop it and restart init
				const d = new Date();
				const suffix = "_"+d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate()+"_backup";
				fs.copyFileSync(Config.discord2Twitch, Config.discord2Twitch.replace(".json", suffix+".json"));
				fs.unlinkSync(Config.discord2Twitch);
				this.initChannels();
				return;
			}
		}

		this._guildId2Twitch = json;
	}

	/**
	 * Creates bot commands
	 */
	private async createCommands():Promise<void> {
		
		const debugGuildID:string = "960695714483167252";

		this._rest = new REST().setToken(Config.credentials.discord_bot_token);
		// const existingCmds:SlashCommandDefinition[] = await this._rest.get(Routes.applicationCommands(Config.credentials.discord_app_id)) as SlashCommandDefinition[];
		const existingCmds:SlashCommandDefinition[] = await this._rest.get(Routes.applicationGuildCommands(Config.credentials.discord_app_id, debugGuildID)) as SlashCommandDefinition[];
		const missingCmds:SlashCommandBuilder[] = [];
		const removedCmds:SlashCommandDefinition[] = [];
		//Check which commands should be removed
		for (let i = 0; i < existingCmds.length; i++) {
			const cmd = existingCmds[i];
			if(COMMAND_LIST.findIndex(v => v.name == cmd.name && v.options.length == cmd.options.length) == -1) {
				removedCmds.push(cmd);
			}
		}
		//Define which commands are missing
		for (let i = 0; i < COMMAND_LIST.length; i++) {
			const cmd = COMMAND_LIST[i];
			if(existingCmds.findIndex(v => v.name == cmd.name && v.options.length == cmd.options.length) == -1) {
				missingCmds.push(cmd);
			}
		}
		if(removedCmds.length > 0) {
			Logger.warn("Removing commands "+removedCmds.map(v=>v.name).join(", "));
			for (let i = 0; i < removedCmds.length; i++) {
				const cmd = removedCmds[i];
				await this._rest.delete(Routes.applicationGuildCommand(Config.credentials.discord_app_id, debugGuildID, cmd.id));
				// this._rest.delete(Routes.applicationCommand(Config.credentials.discord_app_id, cmd.id));
			}
		}
		if(missingCmds.length > 0) {
			Logger.warn("Creating commands "+missingCmds.map(v=>v.name).join(", "));
			await this._rest.put(Routes.applicationGuildCommands(Config.credentials.discord_app_id, debugGuildID), {body:missingCmds});
			// await this._rest.put(Routes.applicationCommands(Config.credentials.discord_app_id), {body:missingCmds});
		}
	}

	/**
	 * Called when someone uses the /twitch command on discord to associate a discord to a twitch channel
	 * @param request 
	 * @param response 
	 * @param command 
	 */
	private async configureTwitchChannel(request:FastifyRequest, response:FastifyReply, command:SlashCommandPayload):Promise<void> {
		const channel = command.data.options.find(v=>v.name == "channel")!.value;
		const users = await TwitchUtils.loadUsers([channel]);
		if(users == false) {
			response.status(200);
			response.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
				content: "No twitch user found with name `"+channel+"`",
				},
			});
		}else{
			this._guildId2Twitch[command.guild_id] = users[0].id;
			response.status(200);
			response.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: "Twitch user `"+channel+"` configured successfuly. Use command `/send hello world` to send a message to that user on their Twitchat.",
				},
			});
			fs.writeFileSync(Config.discord2Twitch, JSON.stringify(this._guildId2Twitch), "utf-8");
		}
	}

	/**
	 * Send a message to the configured twitch user
	 * @param request 
	 * @param response 
	 * @param command 
	 */
	private async sendMessageToTwitchat(request:FastifyRequest, response:FastifyReply, command:SlashCommandPayload):Promise<void> {
		const uid = this._guildId2Twitch[command.guild_id];
		if(!uid) {
			response.status(200);
			response.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
				content: "No twitch user has been linked to this discord. Please use /twitch command to link your twitch channel with this discord.",
				},
			});
		}else{
			const message = command.data.options.find(v=>v.name == "message")!.value;
			const style = command.data.options.find(v=>v.name == "style")?.value || "message";
			SSEController.sendToUser(uid, SSECode.MESSAGE, {message, style, username:command.member.user.username});
			response.status(200);
			response.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: "Message sent to Twitchat: `"+message+"`",
				},
			});

		}
	}
}
const perms = PermissionsBitField.Flags.Administrator
			& PermissionsBitField.Flags.ManageGuild
			& PermissionsBitField.Flags.ModerateMembers;
type COMMAND_NAME = "twitch" | "send";

let cmd:COMMAND_NAME = "twitch";
const REGISTER_CMD = new SlashCommandBuilder()
.setName(cmd)
.setDescription("Define the twitchat channel to send messages to")
.addStringOption(option =>
	option.setName("channel")
	.setDescription("twitch channel to send message to on Twitchat")
	.setRequired(true)
).setDefaultMemberPermissions(perms);


cmd = "send";
const SEND_CMD = new SlashCommandBuilder()
.setName(cmd)
.setDescription("Send a message to the streamer on Twitchat")
.addStringOption(option =>
	option.setName("message")
	.setDescription("message to send")
	.setRequired(true)
)
.addStringOption(option =>
	option.setName("style")
	.setDescription("message to send")
	.addChoices({name:"important", value:"error"})
	.addChoices({name:"highlight", value:"highlight"})
	.addChoices({name:"normal", value:"message"})
	.setRequired(false)
).setDefaultMemberPermissions(perms);

const COMMAND_LIST:SlashCommandBuilder[] = [REGISTER_CMD, SEND_CMD];


type InteractionTypeValues  = keyof typeof InteractionType;
type AllInteractionTypes = {
	[K in InteractionTypeValues]: InteractionType;
}[InteractionTypeValues];
interface InstallPaypload {
	app_permissions: string;
	application_id: string;
	entitlements: any[];
	id: string;
	token: string;
	type: AllInteractionTypes;
	user: User;
	version: number;
}


interface User {
	avatar: string;
	avatar_decoration_data?: any;
	bot: boolean;
	discriminator: string;
	global_name: string;
	id: string;
	public_flags: number;
	system: boolean;
	username: string;
}

interface Member {
	user: {
		id: string;
		username: string;
		avatar: string;
		discriminator: string;
		public_flags: number;
	};
	roles: string[];
	premium_since?: any;
	permissions: string;
	pending: boolean;
	nick?: any;
	mute: boolean;
	joined_at: string;
	is_pending: boolean;
	deaf: boolean;
}


interface SlashCommandPayload {
	type: number;
	token: string;
	member: Member;
	id: string;
	guild_id: string;
	app_permissions: string;
	guild_locale: string;
	locale: string;
	data: {
		options: {
			type: number;
			name: string;
			value: string;
		}[];
		type: number;
		name: COMMAND_NAME;
		id: string;
	};
	channel_id: string;
}

interface SlashCommandDefinition {
	id: string;
	application_id: string;
	version: string;
	default_member_permissions: number;
	type: number;
	name: string;
	description: string;
	dm_permission: true;
	contexts: unknown;
	integration_types: number[];
	options: any[];
	nsfw: boolean;
}