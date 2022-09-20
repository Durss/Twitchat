import {TwitchatDataTypes} from "@/types/TwitchatDataTypes";
import Config from "./Config";

export const TriggerTypes = {
	FIRST_ALL_TIME:"1",
	FIRST_TODAY:"2",
	POLL_RESULT:"3",
	PREDICTION_RESULT:"4",
	RAFFLE_RESULT:"5",
	BINGO_RESULT:"6",
	CHAT_COMMAND:"7",
	SUB:"8",
	SUBGIFT:"9",
	BITS:"10",
	FOLLOW:"11",
	RAID:"12",
	REWARD_REDEEM:"13",
	STREAM_INFO_UPDATE:"19",
	TRACK_ADDED_TO_QUEUE:"14",
	MUSIC_START:"24",
	MUSIC_STOP:"25",
	TIMER_START:"15",
	TIMER_STOP:"16",
	COUNTDOWN_START:"17",
	COUNTDOWN_STOP:"18",
	EMERGENCY_MODE_START:"20",
	EMERGENCY_MODE_STOP:"21",
	HIGHLIGHT_CHAT_MESSAGE:"22",
	CHAT_ALERT:"23",
	HYPE_TRAIN_APPROACH:"26",
	HYPE_TRAIN_START:"27",
	HYPE_TRAIN_PROGRESS:"28",
	HYPE_TRAIN_END:"29",
	HYPE_TRAIN_CANCELED:"32",
	RETURNING_USER:"30",
	VOICEMOD:"31",
	SHOUTOUT:"33",
	TIMEOUT:"34",
	BAN:"35",
	UNBAN:"36",
	VIP:"37",
	UNVIP:"38",
	MOD:"39",
	UNMOD:"40",
	SCHEDULE:"41",
	ANY_MESSAGE:"42",
	COMMUNITY_CHALLENGE_PROGRESS:"43",
	COMMUNITY_CHALLENGE_COMPLETE:"44",

	TWITCHAT_AD:"ad",
} as const;
export type TriggerTypesValue = typeof TriggerTypes[keyof typeof TriggerTypes];

export interface ITriggerActionHelper {
	tag:string;
	desc:string;
	pointer:string;
}

export function TriggerActionHelpers(key:string):ITriggerActionHelper[] {
	const map:{[key:string]:ITriggerActionHelper[]} = {}
	map[TriggerTypes.ANY_MESSAGE] = 
	map[TriggerTypes.FIRST_TODAY] = 
	map[TriggerTypes.FIRST_ALL_TIME] = 
	map[TriggerTypes.RETURNING_USER] = 
	map[TriggerTypes.CHAT_COMMAND] = [
		{tag:"USER", desc:"User name", pointer:"tags.display-name"},
		{tag:"MESSAGE", desc:"Chat message content", pointer:"message"},
	];
	
	map[TriggerTypes.POLL_RESULT] = [
		{tag:"TITLE", desc:"Poll title", pointer:"data.title"},
		{tag:"WIN", desc:"Winning choice title", pointer:"winner"},
		// {tag:"PERCENT", desc:"Votes percent of the winning choice", pointer:""},
	];
	
	map[TriggerTypes.PREDICTION_RESULT] = [
		{tag:"TITLE", desc:"Prediction title", pointer:"data.title"},
		{tag:"WIN", desc:"Winning choice title", pointer:"winner"},
	];
	
	map[TriggerTypes.BINGO_RESULT] = [
		{tag:"WINNER", desc:"Winner name", pointer:"winner"},
	];
	
	map[TriggerTypes.RAFFLE_RESULT] = [
		{tag:"WINNER", desc:"Winner name", pointer:"winner.label"},
	];
	
	map[TriggerTypes.SUB] = [
		{tag:"USER", desc:"User name", pointer:"tags.display-name"},
		{tag:"SUB_TIER", desc:"Sub tier 1, 2 or 3", pointer:"methods.plan"},
		{tag:"MESSAGE", desc:"Message of the user", pointer:"message"},
	];
	
	map[TriggerTypes.SUBGIFT] = [
		{tag:"USER", desc:"User name of the sub gifter", pointer:"tags.display-name"},
		{tag:"RECIPIENT", desc:"Recipient user name", pointer:"recipient"},
		{tag:"SUB_TIER", desc:"Sub tier 1, 2 or 3", pointer:"methods.plan"},
	];
	
	map[TriggerTypes.BITS] = [
		{tag:"USER", desc:"User name", pointer:"tags.display-name"},
		{tag:"BITS", desc:"Number of bits", pointer:"tags.bits"},
		{tag:"MESSAGE", desc:"Message of the user", pointer:"message"},
	];
	
	map[TriggerTypes.FOLLOW] = [
		{tag:"USER", desc:"User name of the new follower", pointer:"tags.username"},
	];
	
	map[TriggerTypes.RAID] = [
		{tag:"USER", desc:"User name of the new follower", pointer:"username"},
		{tag:"VIEWERS", desc:"Number of viewers", pointer:"viewers"},
	];
	
	map[TriggerTypes.REWARD_REDEEM] = [
		{tag:"USER", desc:"User name", pointer:"tags.display-name"},
		{tag:"TITLE", desc:"Reward title", pointer:"reward.redemption.reward.title"},
		{tag:"DESCRIPTION", desc:"Reward description", pointer:"reward.redemption.reward.prompt"},
		{tag:"COST", desc:"Reward cost", pointer:"reward.redemption.reward.cost"},
		{tag:"MESSAGE", desc:"User message if any", pointer:"reward.redemption.user_input"},
	];
	
	map[TriggerTypes.TRACK_ADDED_TO_QUEUE] = [
		{tag:"CURRENT_TRACK_ARTIST", desc:"Current track artist name", pointer:"artist"},
		{tag:"CURRENT_TRACK_TITLE", desc:"Current track's title", pointer:"title"},
		{tag:"CURRENT_TRACK_ALBUM", desc:"Current track's album name", pointer:"album"},
		{tag:"CURRENT_TRACK_COVER", desc:"Current track's cover", pointer:"cover"},
		{tag:"CURRENT_TRACK_URL", desc:"Current track URL", pointer:"url"},
	];
	
	map[TriggerTypes.MUSIC_START] = [
		{tag:"CURRENT_TRACK_ARTIST", desc:"Current track artist name", pointer:"music.artist"},
		{tag:"CURRENT_TRACK_TITLE", desc:"Current track's title", pointer:"music.title"},
		{tag:"CURRENT_TRACK_ALBUM", desc:"Current track's album name", pointer:"music.album"},
		{tag:"CURRENT_TRACK_COVER", desc:"Current track's cover", pointer:"music.cover"},
		{tag:"CURRENT_TRACK_URL", desc:"Current track URL", pointer:"music.url"},
	];
	
	map[TriggerTypes.STREAM_INFO_UPDATE] = [
		{tag:"TITLE", desc:"Stream title", pointer:"title"},
		{tag:"CATEGORY", desc:"Stream category", pointer:"category"},
	];
	
	map[TriggerTypes.TIMER_START] = 
	map[TriggerTypes.TIMER_STOP] = [
		{tag:"DURATION", desc:"Timer's final duration formated", pointer:"duration"},
		{tag:"DURATION_MS", desc:"Timer's final duration in milliseconds", pointer:"duration_ms"},
	];

	map[TriggerTypes.COUNTDOWN_START] = 
	map[TriggerTypes.COUNTDOWN_STOP] = [
		{tag:"START_AT", desc:"Start date fromated", pointer:"start"},
		{tag:"START_AT_MS", desc:"Start date in milliseconds", pointer:"start_ms"},
		{tag:"DURATION", desc:"Countdown's duration formated", pointer:"duration"},
		{tag:"DURATION_MS", desc:"Countdown's duration in milliseconds", pointer:"duration_ms"},
	];
	
	map[TriggerTypes.HIGHLIGHT_CHAT_MESSAGE] = [
		{tag:"AVATAR", desc:"User's avatar", pointer:"user.profile_image_url"},
		{tag:"USER", desc:"User's name", pointer:"user.display_name"},
		{tag:"MESSAGE", desc:"Message without emotes", pointer:"message"},
	];
	
	map[TriggerTypes.CHAT_ALERT] = [
		{tag:"USER", desc:"User's name", pointer:"message.tags.username"},
		{tag:"ALERT", desc:"User's message without emotes", pointer:"message.message"},
	];
	
	map[TriggerTypes.HYPE_TRAIN_START] = 
	map[TriggerTypes.HYPE_TRAIN_PROGRESS] = [
		{tag:"LEVEL", desc:"Current level", pointer:"level"},
		{tag:"PERCENT", desc:"Current level progression (0 -> 100)", pointer:"percent"},
	];

	map[TriggerTypes.HYPE_TRAIN_END] = [
		{tag:"LEVEL", desc:"Level reached", pointer:"level"},
		{tag:"PERCENT", desc:"Percent reached", pointer:"percent"},
	];

	map[TriggerTypes.VOICEMOD] = [
		{tag:"VOICE_ID", desc:"Contains the voice's ID", pointer:"voiceID"},
	];

	map[TriggerTypes.TIMEOUT] = [
		{tag:"USER", desc:"User name", pointer:"user"},
		{tag:"DURATION", desc:"Timeout duraiton", pointer:"duration"},
	];

	map[TriggerTypes.VIP] = 
	map[TriggerTypes.UNVIP] = 
	map[TriggerTypes.MOD] = 
	map[TriggerTypes.UNMOD] = 
	map[TriggerTypes.UNBAN] = 
	map[TriggerTypes.BAN] = [
		{tag:"USER", desc:"User name", pointer:"user"},
	];

	map[TriggerTypes.SHOUTOUT] = [
		{tag:"USER", desc:"User's name", pointer:"user.display_name"},
		{tag:"AVATAR", desc:"User's avatar", pointer:"user.profile_image_url"},
		{tag:"TITLE", desc:"Stream title", pointer:"stream.title"},
		{tag:"CATEGORY", desc:"Stream category", pointer:"stream.game_name"},
	];

	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS] = [
		{tag:"USER", desc:"User's name", pointer:"contribution.user.display_name"},
		{tag:"CONTRIBUTION", desc:"User's contribution", pointer:"contribution.amount"},
		{tag:"CONTRIBUTION_TOTAL", desc:"User's total contribution", pointer:"contribution.total_contribution"},
		{tag:"TITLE", desc:"Challenge title", pointer:"contribution.goal.title"},
		{tag:"DESCRIPTION", desc:"Challenge description", pointer:"contribution.goal.description"},
		{tag:"GOAL", desc:"Challenge goal", pointer:"contribution.goal.goal_amount"},
		{tag:"CURRENT", desc:"Challenge current progress", pointer:"contribution.goal.points_contributed"},
	];
	map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE] = [
		{tag:"TITLE", desc:"Challenge title", pointer:"contribution.goal.title"},
		{tag:"DESCRIPTION", desc:"Challenge description", pointer:"contribution.goal.description"},
		{tag:"GOAL", desc:"Challenge goal", pointer:"contribution.goal.goal_amount"},
		{tag:"CURRENT", desc:"Challenge current progress", pointer:"contribution.goal.points_contributed"},
	];

	//If requesting chat command helpers and there is a music
	//service available, concat the music service helpers
	if(key == TriggerTypes.CHAT_COMMAND
	&& Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED) {
		map[key] = map[key].concat(map[TriggerTypes.TRACK_ADDED_TO_QUEUE]);
	}

	return map[key];
}

export const TriggerEvents:TwitchatDataTypes.TriggerEventTypes[] = [
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GLOBAL, icon:"whispers", label:"Chat command", value:TriggerTypes.CHAT_COMMAND, isCategory:true, description:"Execute actions when sending a command on your chat", jsonTest:{"type":"message","message":"!test","tags":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000004","tmi-sent-ts":"1650938130680", "user-id":"29961813"},"channel":"#durss","self":true}, noToggle:true},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GLOBAL, icon:"whispers", label:"Any message", value:TriggerTypes.ANY_MESSAGE, isCategory:false, description:"Execute actions everytime a message is received on chat", jsonTest:{"type":"message","message":"!test","tags":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000004","tmi-sent-ts":"1650938130680", "user-id":"29961813"},"channel":"#durss","self":true}, noToggle:true},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:"Channel point reward", value:TriggerTypes.REWARD_REDEEM, isCategory:true, description:"Execute an action when the following channel point reward is redeemed<br><mark>{SUB_ITEM_NAME}</mark>", jsonTest:{"reward":{"timestamp":"2022-04-25T22:54:53.897356718Z","redemption":{"user":{"id":"29961813","login":"durss","display_name":"Durss"},"reward":{"id":"TEST_ID","channel_id":"29961813","title":"Text reward","prompt":"This is a reward description","cost":1000},"status":"UNFULFILLED","user_input":"Lorem ipsum dolor sit amet"}},"tags":{"username":"Durss","display-name":"Durss","id":"bdeddedd-6184-4b26-a74e-87a5ff99a1be","user-id":"29961813","tmi-sent-ts":"1650927293897","message-type":"chat","room-id":"29961813"},"type":"highlight"}, noToggle:true},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:"Community challenge progress", value:TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS, isCategory:false, description:"Execute an action when a user contributes to a community challenge", jsonTest:{"contribution":{"channel_id":"29961813","goal":{"id":"b34f2f91-89d7-4342-b221-b1cbc4e0d5c6","channel_id":"29961813","title":"My awesome challenge","description":"This is the channel point challenge description","goal_type":"CREATOR","is_in_stock":true,"goal_amount":100000,"points_contributed":100000,"small_contribution":250,"per_stream_maximum_user_contribution":2000,"status":"COMPLETED","duration_days":30,"started_at":"2022-09-16T17:00:49.967911644Z","ended_at":"2022-10-16T17:00:49.967911644Z","background_color":"#FF38DB","default_image":{"url_1x":"https://static-cdn.jtvnw.net/community-goal-images/default-1.png","url_2x":"https://static-cdn.jtvnw.net/community-goal-images/default-2.png","url_4x":"https://static-cdn.jtvnw.net/community-goal-images/default-4.png"},"image":{"url_1x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-1.png","url_2x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-2.png","url_4x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-4.png"}},"user":{"id":"29961813","login":"durss","display_name":"durss"},"amount":800,"stream_contribution":800,"total_contribution":800},"channel":"#durss","tags":{"username":"durss","display-name":"durss","user-id":"29961813","tmi-sent-ts":"1663689944582","message-type":"chat","room-id":"29961813","id":"00000000-0000-0000-0000-000000000003"},"type":"highlight"}, noToggle:true},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:"Community challenge complete", value:TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE, isCategory:false, description:"Execute an action when a community challenge completes", jsonTest:{"contribution":{"channel_id":"29961813","goal":{"id":"b34f2f91-89d7-4342-b221-b1cbc4e0d5c6","channel_id":"29961813","title":"My awesome challenge","description":"This is the channel point challenge description","goal_type":"CREATOR","is_in_stock":true,"goal_amount":100000,"points_contributed":10800,"small_contribution":250,"per_stream_maximum_user_contribution":2000,"status":"STARTED","duration_days":30,"started_at":"2022-09-16T17:00:49.967911644Z","ended_at":"2022-10-16T17:00:49.967911644Z","background_color":"#FF38DB","default_image":{"url_1x":"https://static-cdn.jtvnw.net/community-goal-images/default-1.png","url_2x":"https://static-cdn.jtvnw.net/community-goal-images/default-2.png","url_4x":"https://static-cdn.jtvnw.net/community-goal-images/default-4.png"},"image":{"url_1x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-1.png","url_2x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-2.png","url_4x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-4.png"}},"user":{"id":"29961813","login":"durss","display_name":"durss"},"amount":800,"stream_contribution":800,"total_contribution":800},"channel":"#durss","tags":{"username":"durss","display-name":"durss","user-id":"29961813","tmi-sent-ts":"1663689944582","message-type":"chat","room-id":"29961813","id":"00000000-0000-0000-0000-000000000003"},"type":"highlight"}, noToggle:true},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GLOBAL, icon:"info", label:"Stream info update", value:TriggerTypes.STREAM_INFO_UPDATE, description:"Execute an action when the stream info are updated", jsonTest:{"type":"streamInfoUpdate","title":"Building a wooden secret box https://box.durss.ninja","category":"Makers & Crafting"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.USER, icon:"firstTime", label:"First message of a user all time", value:TriggerTypes.FIRST_ALL_TIME, description:"Execute an action when a user sends a message for the first time on your channel", jsonTest:{"type":"message","message":"This is my first message here !","tags":{"badges":{"premium":"1"},"client-nonce":"004c878edd9adf5b36717d6454db1b7c","color":"#9ACD32","display-name":"Durss","emote-only":true,"emotes":{},"first-msg":true,"flags":null,"id":"c5c54086-d0b5-4809-976a-254f4d206248","mod":false,"room-id":"121652526","subscriber":false,"tmi-sent-ts":"1642377332605","turbo":false,"user-id":"92203285","user-type":null,"emotes-raw":"","badge-info-raw":null,"badges-raw":"premium/1","username":"durss","message-type":"chat"},"channel":"#durss","self":false,}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.USER, icon:"firstTime", label:"First message of a user today", value:TriggerTypes.FIRST_TODAY, description:"Execute an action when a user sends a message for the first time today", jsonTest:{"type":"message","message":"This is my first message for today!","tags":{"badges":{"premium":"1"},"client-nonce":"004c878edd9adf5b36717d6454db1b7c","color":"#9ACD32","display-name":"Durss","emote-only":true,"emotes":{},"first-msg":false,"flags":null,"id":"c5c54086-d0b5-4809-976a-254f4d206248","mod":false,"room-id":"121652526","subscriber":false,"tmi-sent-ts":"1642377332605","turbo":false,"user-id":"92203285","user-type":null,"emotes-raw":"","badge-info-raw":null,"badges-raw":"premium/1","username":"durss","message-type":"chat"},"channel":"#durss","self":false, firstMessage:true}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.USER, icon:"returning", label:"Returning user", value:TriggerTypes.RETURNING_USER, description:"Execute an action when a user comes back after chatting at least twice in the last 30 days.", jsonTest:{"type":"message","message":"Hey it's been a while !","tags":{"badges":{"premium":"1"},"client-nonce":"004c878edd9adf5b36717d6454db1b7c","color":"#9ACD32","display-name":"Durss","emote-only":true,"emotes":{},"first-msg":false,"returning-chatter":false,"flags":null,"id":"c5c54086-d0b5-4809-976a-254f4d206248","mod":false,"room-id":"121652526","subscriber":false,"tmi-sent-ts":"1642377332605","turbo":false,"user-id":"92203285","user-type":null,"emotes-raw":"","badge-info-raw":null,"badges-raw":"premium/1","username":"durss","message-type":"chat"},"channel":"#durss","self":false}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.USER, icon:"follow", label:"Follow", value:TriggerTypes.FOLLOW, description:"Execute an action when someone follows the channel", jsonTest:{"channel":"#durss","tags":{"username":"Durss","user-id":"29961813","tmi-sent-ts":"1644088397887","id":"00000000-0000-0000-0001-000000000000","msg-id":"follow"},"username":"Durss","type":"highlight"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.USER, icon:"raid", label:"Raid", value:TriggerTypes.RAID, description:"Execute an action when someone raids the channel", jsonTest:{"type":"highlight","channel":"#durss","tags":{"info":"this tags prop is a fake one to make things easier for my code","id":"16423778121330.0751974390273129","tmi-sent-ts":"1642377812133","msg-id":"raid"},"username":"Durss","viewers":727}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GAMES, icon:"poll", label:"Poll result", value:TriggerTypes.POLL_RESULT, description:"Execute an action when a poll completes", jsonTest:{"tags":{"id":"00000000-0000-0000-0001-000000000034"},"type":"poll","data":{"id":"3c96966e-9141-4d0d-98fe-8e417301144c","broadcaster_id":"29961813","broadcaster_name":"durss","broadcaster_login":"durss","title":"Which option is the best?","choices":[{"id":"b2dc37a4-6469-41f3-9d09-57644cc813b3","title":"This one","votes":2,"channel_points_votes":450,"bits_votes":0},{"id":"a1b43c9c-b52a-4885-9d4e-2c2c0d99218b","title":"That one","votes":5,"channel_points_votes":250,"bits_votes":0}],"bits_voting_enabled":false,"bits_per_vote":0,"channel_points_voting_enabled":false,"channel_points_per_vote":0,"status":"COMPLETED","duration":60,"started_at":"2022-02-16T17:59:57.589127933Z","ended_at":"2022-02-16T18:00:57.589127933Z"}}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GAMES, icon:"prediction", label:"Prediction result", value:TriggerTypes.PREDICTION_RESULT, description:"Execute an action when a prediction completes", jsonTest:{"tags":{"id":"00000000-0000-0000-0001-000000000017"},"type":"prediction","data":{"id":"09ced600-a679-45c5-ad50-4979090f6db1","broadcaster_id":"29961813","broadcaster_name":"Durss","broadcaster_login":"durss","title":"Is Twitchat amazing?","winning_outcome_id":"a9753995-f25d-40d1-81cd-a9b7605b58d7","outcomes":[{"id":"a9753995-f25d-40d1-81cd-a9b7605b58d7","title":"OMG YES","users":1,"channel_points":80,"top_predictors":[{"user_id":"647389082","user_login":"durssbot","user_name":"DurssBot","channel_points_used":80,"channel_points_won":0}],"color":"BLUE"},{"id":"7a483df8-3ec8-4e15-8e9a-da64fc574ad9","title":"it's ok","users":1,"channel_points":188,"top_predictors":[{"user_id":"29961813","user_login":"durss","user_name":"Durss","channel_points_used":188,"channel_points_won":0}],"color":"PINK"}],"prediction_window":30,"status":"RESOLVED","created_at":"2022-02-17T19:10:55.130396565Z","ended_at":"2022-02-17T19:11:30.109908422Z","locked_at":"2022-02-17T19:11:24.804100656Z"}}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GAMES, icon:"ticket", label:"Raffle result", value:TriggerTypes.RAFFLE_RESULT, description:"Execute an action when a raffle compltes", jsonTest:{"type":"raffle","data":{"command":"!raffle","duration":10,"maxUsers":0,"created_at":1650674437311,"users":[{"score":1,"user":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000002","tmi-sent-ts":"1650674440278"}}],"followRatio":0,"vipRatio":0,"subRatio":0,"subgitRatio":0,"winners":[{"score":1,"user":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000002","tmi-sent-ts":"1650674440278"}}]},"tags":{"id":"00000000-0000-0000-0000-000000000003","tmi-sent-ts":"1650674447187"},"winner":{"score":1,"user":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000002","tmi-sent-ts":"1650674440278"}}}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.GAMES, icon:"bingo", label:"Bingo result", value:TriggerTypes.BINGO_RESULT, description:"Execute an action when a bingo completes", jsonTest:{"type":"bingo","data":{"guessNumber":true,"guessEmote":false,"numberValue":6,"opened":true,"winners":[{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000005","tmi-sent-ts":"1650674495186"}]},"tags":{"id":"00000000-0000-0000-0000-000000000006","tmi-sent-ts":"1650674495236"},"winner":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000005","tmi-sent-ts":"1650674495186"}}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.SUBITS, icon:"sub", label:"Sub", value:TriggerTypes.SUB, description:"Execute an action when someone subscribes to the channel", jsonTest:{"type":"highlight","channel":"#durss","username":"Durss","methods":{"prime":true,"plan":"Prime","planName":"Be a Little Whale !"},"tags":{"badge-info":{"subscriber":"0"},"badges":{"subscriber":"0","premium":"1"},"color":"#9ACD32","display-name":"Durss","emotes":null,"flags":null,"id":"639779e0-37b0-4e31-9045-2ee8f21f0b34","login":"durss","mod":false,"msg-id":"sub","msg-param-cumulative-months":true,"msg-param-months":false,"msg-param-multimonth-duration":false,"msg-param-multimonth-tenure":false,"msg-param-should-share-streak":false,"msg-param-sub-plan-name":"Be a Little Whale !","msg-param-sub-plan":"Prime","msg-param-was-gifted":"false","room-id":"121652526","subscriber":true,"system-msg":"durss subscribed with Prime.","tmi-sent-ts":"1642377377050","user-id":"29961813","user-type":null,"emotes-raw":null,"badge-info-raw":"subscriber/0","badges-raw":"subscriber/0,premium/1","message-type":"sub"},"message":"Woop wooooooop !"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.SUBITS, icon:"gift", label:"Subgift", value:TriggerTypes.SUBGIFT, description:"Execute an action when someones subgifts someone else", jsonTest:{"type":"highlight","channel":"#durss","username":"Durss","methods":{"prime":false,"plan":"3000","planName":"SUBSCRIBER"},"months":0,"tags":{"badge-info":{"subscriber":"12"},"badges":{"subscriber":"3012","sub-gifter":"5"},"color":"#9ACD32","display-name":"Durss","emotes":null,"flags":null,"id":"51e48d26-836b-409c-ac7f-708e84ccc5b1","login":"durss","mod":false,"msg-id":"subgift","msg-param-gift-months":true,"msg-param-months":true,"msg-param-origin-id":"cf 8a 7f a4 b1 9f ac e4 9f bc ac c8 c2 30 b3 5d 0c 84 c7 b1","msg-param-recipient-display-name":"Durssbot","msg-param-recipient-id":"452550058","msg-param-recipient-user-name":"Durssbot","msg-param-sender-count":false,"msg-param-sub-plan-name":"SUBSCRIBER","msg-param-sub-plan":"1000","room-id":"29961813","subscriber":true,"system-msg":"durss gifted a Tier 1 sub to Durssbot!","tmi-sent-ts":"1642377361661","user-id":"156668532","user-type":null,"emotes-raw":null,"badge-info-raw":"subscriber/12","badges-raw":"subscriber/3012,sub-gifter/5","message-type":"subgift"},"recipient":"Durssbot",}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.SUBITS, icon:"bits", label:"Bits", value:TriggerTypes.BITS, description:"Execute an action when someone sends bits", jsonTest:{"type":"highlight","channel":"#durss","tags":{"badge-info":{"subscriber":"1"},"badges":{"subscriber":"0"},"bits":"51275","color":"#9ACD32","display-name":"Durss","emotes":{},"first-msg":false,"flags":null,"id":"2a1279df-d092-4f87-a2bc-a9123d64f39c","mod":false,"room-id":"29961813","subscriber":true,"tmi-sent-ts":"1642379087259","turbo":false,"user-id":"29961813","user-type":null,"emotes-raw":"","badge-info-raw":"subscriber/1","badges-raw":"subscriber/0","username":"durss","message-type":"chat"},"message":"Here are 51275 bits for you! Cheer1050 Cheer25 Corgo50000 Anon100 Muxy100"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train approach", value:TriggerTypes.HYPE_TRAIN_APPROACH, description:"Execute an action when a hype train approaches", jsonTest:{type:"hypeTrainApproach", level:0, percent:0}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train start", value:TriggerTypes.HYPE_TRAIN_START, description:"Execute an action when a hype train starts", jsonTest:{type:"hypeTrainStart", level:1, percent:30}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train progress", value:TriggerTypes.HYPE_TRAIN_PROGRESS, description:"Execute an action when a hype train progresses", jsonTest:{type:"hypeTrainProgress", level:2, percent:83}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train end", value:TriggerTypes.HYPE_TRAIN_END, description:"Execute an action when a hype train ends", jsonTest:{type:"hypeTrainEnd", level:3, percent:10}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train canceled", value:TriggerTypes.HYPE_TRAIN_CANCELED, description:"Execute an action when a hype train ends", jsonTest:{type:"hypeTrainEnd", level:3, percent:10}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MOD, icon:"timeout", label:"User timed out", value:TriggerTypes.TIMEOUT, description:"Execute an action when a user is <mark>/timeout</mark>", jsonTest:{ type:"timeout", duration:60, user:"Durss"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MOD, icon:"ban", label:"User banned", value:TriggerTypes.BAN, description:"Execute an action when a user is <mark>/ban</mark>", jsonTest:{ type:"ban", user:"Durss"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MOD, icon:"unban", label:"User unbanned", value:TriggerTypes.UNBAN, description:"Execute an action when a user is <mark>/unban</mark>", jsonTest:{ type:"unban", user:"Durss"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MOD, icon:"vip", label:"User /vip", value:TriggerTypes.VIP, description:"Execute an action when a user is added to your VIPs", jsonTest:{ type:"vip", user:"Durss"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MOD, icon:"unvip", label:"User /unvip", value:TriggerTypes.UNVIP, description:"Execute an action when a user is removed from your VIPs <i>(only works when using <mark>/unvip</mark> command from twitchat</i>", jsonTest:{ type:"unvip", user:"Durss"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MOD, icon:"mod", label:"User /mod", value:TriggerTypes.MOD, description:"Execute an action when a user is added to your mods", jsonTest:{ type:"mod", user:"Durss"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MOD, icon:"unmod", label:"User /unmod", value:TriggerTypes.UNMOD, description:"Execute an action when a user is removed from your mods <i>(only works when using <mark>/unmod</mark> command from twitchat</i>", jsonTest:{ type:"unmod", user:"Durss"}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MUSIC, icon:"music", label:"Track added to queue", value:TriggerTypes.TRACK_ADDED_TO_QUEUE, description:"Execute an action when a music is added to the queue"},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MUSIC, icon:"music", label:"Music starts playing", value:TriggerTypes.MUSIC_START, description:"Execute an action when a music starts playing", jsonTest:{"type":"musicEvent","start":true, music:{ "title": "Mitchiri neko march", "artist": "Mitchiri neko fanfare", "album": "Mitchiri neko march", "cover": "https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722", "duration": 192469 }}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MUSIC, icon:"music", label:"Music stops playing", value:TriggerTypes.MUSIC_STOP, description:"Execute an action when a music stops playing", jsonTest:{"type":"musicEvent","start":false}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TIMER, icon:"date", label:"Scheduled actions", value:TriggerTypes.SCHEDULE, isCategory:true, description:"Execute actions regularly or at specific date/time", noToggle:true},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TIMER, icon:"timer", label:"Timer start", value:TriggerTypes.TIMER_START, description:"Execute an action when a timer is started with the command <mark>/timerStart</mark>", jsonTest:{"type":"timer","started":true,"markedAsRead":false,"data":{"startAt":1661865327865,"duration":0},"duration":"00","duration_ms":0}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TIMER, icon:"timer", label:"Timer stop", value:TriggerTypes.TIMER_STOP, description:"Execute an action when a timer is stoped with the command <mark>/timerStop</mark>", jsonTest:{"type":"timer","started":false,"markedAsRead":false,"data":{"startAt":1661865327865,"duration":0},"duration":"00","duration_ms":0}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TIMER, icon:"countdown", label:"Countdown start", value:TriggerTypes.COUNTDOWN_START, description:"Execute an action when a countdown is started with the command <mark>/countdown</mark>", jsonTest:{"type":"countdown","started":true,"data":{"timeoutRef":182,"startAt":1661864989574,"duration":600000},"tags":{"id":"00000000-0000-0000-0000-000000000003","tmi-sent-ts":"1661864989574"},"start":"30/08/2022 15h09","start_ms":1661864989574,"duration":"10:00","duration_ms":600000}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TIMER, icon:"countdown", label:"Countdown stop", value:TriggerTypes.COUNTDOWN_STOP, description:"Execute an action when a countdown completes or is stoped", jsonTest:{"type":"countdown","started":false,"data":{"timeoutRef":182,"startAt":1661864989574,"duration":600000},"tags":{"id":"00000000-0000-0000-0000-000000000003","tmi-sent-ts":"1661864989574"},"start":"30/08/2022 15h09","start_ms":1661864989574,"duration":"10:00","duration_ms":600000}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TWITCHAT, icon:"shoutout", label:"Shoutout", value:TriggerTypes.SHOUTOUT, description:"Execute an action when doing a shoutout via <mark>/so</mark> command or shoutout button", jsonTest:{"type":"shoutout","user":{"id":"29961813","login":"durss","display_name":"Durss","type":"","broadcaster_type":"affiliate","description":"Je conçois et fabrique des casse-têtes en bois plus ou moins stylés et je code des applications/outils plus ou moins stupides ou utiles. Si tu stream sur Twitch, j'ai entièrement recodé le tchat officiel pour ajouter plein de features, ça devrait t'intéresser:https://twitchat.fr","profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/1835e681-7306-49b8-a1e2-2775a17424ae-profile_image-300x300.png","offline_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/c43305dd-d577-4369-b60b-df0a4acdb7d8-channel_offline_image-1920x1080.jpeg","view_count":15289,"created_at":"2012-04-21T23:01:18Z"},"stream":{"broadcaster_id":"29961813","broadcaster_login":"durss","broadcaster_name":"Durss","broadcaster_language":"fr","game_id":"509673","game_name":"Makers & Crafting","title":"test","delay":0}}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TWITCHAT, icon:"emergency", label:"Emergency start", value:TriggerTypes.EMERGENCY_MODE_START, description:"Execute an action when enabling the emergency mode", jsonTest:{ type: "emergencyMode", enabled: true}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TWITCHAT, icon:"emergency", label:"Emergency stop", value:TriggerTypes.EMERGENCY_MODE_STOP, description:"Execute an action when stopping the emergency mode", jsonTest:{ type: "emergencyMode", enabled: false}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TWITCHAT, icon:"highlight", label:"Highlighted message", value:TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, description:"Execute an action when requesting to highlight a message", jsonTest:{"type":"chatOverlayHighlight","message":"This is a test message for the chat highlight feature !","user":{"id":"29961813","login":"durss","display_name":"Durss","type":"","broadcaster_type":"affiliate","description":"Blablabla","profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/1835e681-7306-49b8-a1e2-2775a17424ae-profile_image-300x300.png","offline_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/c43305dd-d577-4369-b60b-df0a4acdb7d8-channel_offline_image-1920x1080.jpeg","view_count":15289,"created_at":"2012-04-21T23:01:18Z"},"id":"d97d6594-6cc4-4400-b4f4-e3b688263fa2","params":{"position":"bl"}}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TWITCHAT, icon:"alert", label:"Chat alert", value:TriggerTypes.CHAT_ALERT, description:"Execute an action when the Chat Alert feature is triggered <i>(Parameters => Features => Enable chat alert)</i>", jsonTest:{"type":"chatAlert", message:{"type":"message","message":"ItsBoshyTime Read your chat !!! ItsBoshyTime","tags":{"badge-info":{"subscriber":"16"},"badges":{"broadcaster":"1","subscriber":"12"},"client-nonce":"f90438208ff604cfba00470d60f1bb5b","color":"#9ACD32","display-name":"Durss","emotes":{"133468":["0-11","32-43"]},"first-msg":false,"flags":null,"id":"00000000-0000-0000-0000-000000000002","mod":false,"returning-chatter":false,"room-id":"29961813","subscriber":true,"tmi-sent-ts":"1658344567683","turbo":false,"user-id":"29961813","user-type":null,"emotes-raw":"133468:0-11,32-43","badge-info-raw":"subscriber/16","badges-raw":"broadcaster/1,subscriber/12","username":"durss","message-type":"chat"},"channel":"#durss","self":false}}},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TWITCHAT, icon:"voicemod", label:"Voicemod - voice changed", value:TriggerTypes.VOICEMOD, description:"Execute an action when changing the voice effect on voicemod", jsonTest:{ type:"voicemod", voiceID: "nofx" }},
]

export const TriggerMusicTypes = {
	ADD_TRACK_TO_QUEUE:"1",
	NEXT_TRACK:"2",
	PAUSE_PLAYBACK:"3",
	RESUME_PLAYBACK:"4",
	GET_CURRENT_TRACK:"5",
	START_PLAYLIST:"6",
} as const;
export type TriggerMusicTypesValue = typeof TriggerMusicTypes[keyof typeof TriggerMusicTypes];

export const MusicTriggerEvents:TwitchatDataTypes.TriggerEventTypes[] = [
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MUSIC, icon:"music", label:"Add a track to the queue", value:TriggerMusicTypes.ADD_TRACK_TO_QUEUE},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MUSIC, icon:"music", label:"Play next track", value:TriggerMusicTypes.NEXT_TRACK},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MUSIC, icon:"music", label:"Pause playback", value:TriggerMusicTypes.PAUSE_PLAYBACK},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MUSIC, icon:"music", label:"Resume playback", value:TriggerMusicTypes.RESUME_PLAYBACK},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.MUSIC, icon:"music", label:"Start playlist", value:TriggerMusicTypes.START_PLAYLIST},
]

export const TriggerScheduleTypes = {
	REGULAR_REPEAT:"1",
	SPECIFIC_DATES:"2",
} as const;

export const ScheduleTriggerEvents:TwitchatDataTypes.TriggerEventTypes[] = [
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TWITCHAT, icon:"date", label:"Regular repeat", value:TriggerScheduleTypes.REGULAR_REPEAT},
	{category:TwitchatDataTypes.TriggerEventTypeCategories.TWITCHAT, icon:"date", label:"Specific dates", value:TriggerScheduleTypes.SPECIFIC_DATES},
]