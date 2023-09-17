export interface TenorGif {
	id: string;
	title: string;
	media_formats: MediaFormats;
	created: number;
	content_description: string;
	itemurl: string;
	url: string;
	tags: string[];
	flags: any[];
	hasaudio: boolean;
}

export interface MediaFormats {
	gifpreview: TenorMediaData;
	nanowebm: TenorMediaData;
	webm: TenorMediaData;
	tinywebm: TenorMediaData;
	mediumgif: TenorMediaData;
	tinygif: TenorMediaData;
	tinymp4: TenorMediaData;
	nanogif: TenorMediaData;
	tinygifpreview: TenorMediaData;
	mp4: TenorMediaData;
	gif: TenorMediaData;
	nanomp4: TenorMediaData;
	nanogifpreview: TenorMediaData;
	loopedmp4: TenorMediaData;
}

export interface TenorMediaData {
	url: string;
	duration: number;
	preview: string;
	dims: [x:number, y:number];
	size: number;
}
