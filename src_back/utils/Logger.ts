import Config from "./Config";
/**
 * Created by Durss on 16/03/2017
 */
export default class Logger  {

	constructor() {
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/



	/******************
	 * PUBLIC METHODS *
	 ******************/
	public static log(message:any, ...more):void {
		if(!Config.LOGS_ENABLED) return;

		let chunks:string[] = [message];
		chunks = chunks.concat(more);

		this.doLog(chunks.join(" "));
	}

	public static simpleLog(message:any, ...more):void {
		if(!Config.LOGS_ENABLED) return;

		let chunks:string[] = [message];
		chunks = chunks.concat(more);
		console.log("                            "+LogStyle.Reset+chunks.join(" ")+LogStyle.Reset);
	}

	public static info(message:any, ...more):void {
		if(!Config.LOGS_ENABLED) return;

		let chunks:string[] = [message];
		chunks = chunks.concat(more);

		this.doLog(LogStyle.Italic+LogStyle.FgCyan+chunks.join(" "));
	}

	public static warn(message:any, ...more):void {
		let chunks:string[] = [message];
		chunks = chunks.concat(more);

		this.doLog(LogStyle.FgYellow+chunks.join(" "));
	}

	public static error(message:any, ...more):void {
		let chunks:string[] = [message];
		chunks = chunks.concat(more);

		this.doLog(LogStyle.Bold+LogStyle.FgRed+chunks.join(" "));
	}

	public static success(message:any, ...more):void {
		let chunks:string[] = [message];
		chunks = chunks.concat(more);

		this.doLog(LogStyle.FgGreen+chunks.join(" "));
	}

	public static grey(message:any, ...more):void {
		let chunks:string[] = [message];
		chunks = chunks.concat(more);

		this.doLog(LogStyle.FgGrey+chunks.join(" "));
	}

	public static highlight(message:any, ...more):void {
		let chunks:string[] = [message];
		chunks = chunks.concat(more);

		this.doLog(LogStyle.BgBlue+LogStyle.FgWhite+chunks.join(" "));
	}
	public static rgb(color:string, message:any, ...more):void {
		if(!Config.LOGS_ENABLED) return;

		let chunks:string[] = [message];
		chunks = chunks.concat(more);

		let c = parseInt(color.replace(/[^a-z0-9]/gi, ""), 16);
		let r = (c >> 16) & 0xff;
		let g = (c >> 8) & 0xff;
		let b = c & 0xff;
		
		let style = "\x1B[38;2;"+r+";"+g+";"+b+"m";

		this.doLog(style+chunks.join(" "));
	}



	/*******************
	 * PRIVATE METHODS *
	 *******************/
	private static convertDate(inputFormat:Date):string {
		function pad(s) { return (s < 10) ? '0' + s : s; }
		function pad2(s) { return (s < 10) ? '00' + s : (s < 100) ? '0' + s : s; }
		let d = new Date(inputFormat);
		return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('/')+ " " + [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':')+":"+pad2(d.getMilliseconds());
	}

	private static doLog(mess:string):void {
		console.log(LogStyle.Underscore+LogStyle.FgBlack+LogStyle.BgWhite+"["+this.convertDate(new Date())+"]"+LogStyle.Reset+" : "+mess+LogStyle.Reset);
	}
}

export class LogStyle {
	static Reset = "\x1b[0m";
	static Bright = "\x1b[1m";
	static Dim = "\x1b[2m";
	static Underscore = "\x1b[4m";
	static Blink = "\x1b[5m";
	static Reverse = "\x1b[7m";
	static Hidden = "\x1b[8m";

	static FgBlack = "\x1b[30m";
	static FgRed = "\x1b[31m";
	static FgGreen = "\x1b[32m";
	static FgYellow = "\x1b[33m";
	static FgBlue = "\x1b[34m";
	static FgMagenta = "\x1b[35m";
	static FgCyan = "\x1b[36m";
	static FgWhite = "\x1b[37m";
	static FgGrey = "\x1B[38;2;100;100;100m";

	static BgBlack = "\x1b[40m";
	static BgRed = "\x1b[41m";
	static BgGreen = "\x1b[42m";
	static BgYellow = "\x1b[43m";
	static BgBlue = "\x1b[44m";
	static BgMagenta = "\x1b[45m";
	static BgCyan = "\x1b[46m";
	static BgWhite = "\x1b[47m";
	
	static Bold = "\x1B[1m";
	static Italic = "\x1B[3m";
	static Underline = "\x1B[4m";
	static Strikethrough = "\x1B[9m";
}