import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { PermissionsBitField, REST, Routes, SlashCommandAssertions, SlashCommandBuilder, WebhookClient } from "discord.js";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Config from "../utils/Config";
import AbstractController from "./AbstractController";
import Logger from "../utils/Logger";
import TwitchUtils from "../utils/TwitchUtils";

/**
* Created : 23/02/2024 
*/
export default class SSEController extends AbstractController {

	private _webhookClient!:WebhookClient;
	private _rest!:REST;

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
				let data = json as SlashCommandPayload;
				const channel = data.data.options.find(v=>v.name == "channel")?.value;
				if(!channel) {
					response.status(200);
					response.send({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
						content: "Invalid twitch user name",
						},
					});
				}else{
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
						response.status(200);
						response.send({
							type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
							data: {
							  content: "Twitch user `"+channel+"` configured successfuly. Use command `/send hello world` to send a message to that user on their Twitchat.",
							},
						});
					}
				}
				break;
			}
		}
	}

	private async createCommands():Promise<void> {
		this._webhookClient = new WebhookClient({
			id:Config.credentials.discord_app_id,
			token:Config.credentials.discord_bot_token,
		});

		const perms = PermissionsBitField.Flags.Administrator
					& PermissionsBitField.Flags.ManageGuild
					& PermissionsBitField.Flags.ModerateMembers;
			
		const REGISTER_CMD = new SlashCommandBuilder();
		REGISTER_CMD.setName("twitch")
		.setDescription("Define the twitchat channel to send messages to")
		.addStringOption(option =>
			option.setName("channel")
			.setDescription("twitch channel to send message to on Twitchat")
			.setRequired(true)
		).setDefaultMemberPermissions(perms);

		const SEND_CMD = new SlashCommandBuilder();
		SEND_CMD.setName("send")
		.setDescription("Send a message to the streamer on Twitchat")
		.addStringOption(option =>
			option.setName("message")
			.setDescription("message to send")
			.setRequired(true)
		).setDefaultMemberPermissions(perms);

		const createCmds:SlashCommandBuilder[] = [REGISTER_CMD, SEND_CMD];
		const debugGuildID:string = "960695714483167252";

		this._rest = new REST().setToken(Config.credentials.discord_bot_token);
		// const existingCmds:SlashCommandDefinition[] = await this._rest.get(Routes.applicationCommands(Config.credentials.discord_app_id)) as SlashCommandDefinition[];
		const existingCmds:SlashCommandDefinition[] = await this._rest.get(Routes.applicationGuildCommands(Config.credentials.discord_app_id, debugGuildID)) as SlashCommandDefinition[];
		const missingCmds:SlashCommandBuilder[] = [];
		const removedCmds:SlashCommandDefinition[] = [];
		//Check which commands should be removed
		for (let i = 0; i < existingCmds.length; i++) {
			const cmd = existingCmds[i];
			if(createCmds.findIndex(v => v.name == cmd.name && v.options.length == cmd.options.length) == -1) {
				removedCmds.push(cmd);
			}
		}
		//Define which commands are missing
		for (let i = 0; i < createCmds.length; i++) {
			const cmd = createCmds[i];
			if(existingCmds.findIndex(v => v.name == cmd.name && v.options.length == cmd.options.length) == -1) {
				missingCmds.push(cmd);
			}
		}
		if(removedCmds.length > 0) {
			Logger.warn("Removing commands "+removedCmds.map(v=>v.name).join(", "));
			removedCmds.forEach(v=> {
				this._rest.delete(Routes.applicationGuildCommand(Config.credentials.discord_app_id, debugGuildID, v.id));
				// this._rest.delete(Routes.applicationCommand(Config.credentials.discord_app_id, v.id));
			})
		}
		if(missingCmds.length > 0) {
			Logger.warn("Creating commands "+missingCmds.map(v=>v.name).join(", "));
			await this._rest.put(Routes.applicationGuildCommands(Config.credentials.discord_app_id, debugGuildID), {body:missingCmds});
			// await this._rest.put(Routes.applicationCommands(Config.credentials.discord_app_id), {body:missingCmds});
		}
	}
}

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
		name: string;
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