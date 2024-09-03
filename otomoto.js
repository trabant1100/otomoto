const fs = require('node:fs/promises');
const qs = require('querystring');
const format = require('date-format');
const axios = require('axios');
const cheerio = require('cheerio');
const api_key = process.env.API_KEY;

(async function main() {
	const config = JSON.parse(await fs.readFile('config.json'));
	const listingDir = config.listing.dir;
	const listingUrls = config.listing.urls;
	const today = format.asString('dd.MM.yyyy', new Date());
	const auctionsDir = listingDir + '/' + today;
	const imagesDir = './images';

	await fs.mkdir(auctionsDir, { recursive: true });
	await fs.mkdir(imagesDir, { recursive: true });

	for (const {url, year} of listingUrls) {
		console.log(`Listing year ${year}`);
		console.log('Getting list of auctions');
		let data = {};
		try {
			data = (await axios.get(getScrapeUrl(url))).data;
		} catch(e) {
			console.log(e.response.data);
		}
		const $ = cheerio.load(data);
		const articles = $('article').toArray();
		const auctions = [];

		let auctionIdx = 0;
		for (const el of articles) {
			const jqSection = $(el).children('section');
			const jqDivs = jqSection.children('div');

			const thumbnailUrl = jqDivs.eq(0).find('img').attr('src');
			const url = jqDivs.eq(1).find('h1 a').attr('href');
			const mileage = jqDivs.eq(2).children('dl').eq(0).children('dd').eq(0).text();
			const location = jqDivs.eq(2).children('dl').eq(1).children('dd').eq(0).children('p').text();

			if (thumbnailUrl && url) {
				console.log(`Getting details of auction #${auctionIdx + 1}`);
				const details = await getAuctionDetails(url);
				const auction = { thumbnailUrl, url, mileage, location, year, ...details };
				auctions.push(auction);
				auctionIdx++;
			}
		}

		for (const [idx, auction] of auctions.entries()) {
			const auctionJson = JSON.stringify(auction, null, 2);
			await fs.writeFile(`${auctionsDir}/${auction.id}.json`, auctionJson);
			console.log(`Saving images auction ${idx + 1}/${auctions.length}`);
			await saveImagesFromAuction(imagesDir, auction);
		}
	}
})();

function getScrapeUrl(url) {
	const proxyParams = { api_key: api_key, url: url };
	const proxyUrl = 'https://proxy.scrapeops.io/v1/?' + qs.stringify(proxyParams);
	return proxyUrl;
}

async function getAuctionDetails(url) {
	let data = {};
	try {
		data = (await axios.get(getScrapeUrl(url))).data;
	} catch(e) {
		console.log(e.response.data);
	}
	
	return new Promise(resolve => {
		const $ = cheerio.load(data);

		const jqMainDiv = $('main > div');
		const jqAside = jqMainDiv.children('aside').eq(0);
		const jqAsideDiv = jqAside.children('div').children('div');

		const title = jqAsideDiv.children('h1').text();
		const description = jqAsideDiv.children('p').text();
		const price = jqAsideDiv.find('div > div > h3').text();

		const jqImgs = jqMainDiv.children('section').eq(1).find('img');
		const srcImgRegex = /image;s=\d+x\d+$/;
		const imgUrls = jqImgs.toArray()
			.map(img => $(img).attr('src'))
			.filter(url => srcImgRegex.test(url)) // image;s=148x110
			.map(url => url.replace(srcImgRegex, 'image'));

		const jqSectionDiv = jqMainDiv.children('section').eq(1).children('div').eq(0);
		const date = jqSectionDiv.children('div').eq(0).children('p').text();
		const id = jqSectionDiv.children('div').eq(1).children('p').text().replace(/^ID\s*:\s*/, '');

		const fullDescription = jqMainDiv.children('section').eq(1).children('div[data-testid=content-description-section]')
			.find('p')
			.toArray()
			.map(p => $(p).text())
			.join('\n');

		resolve({ title, description, fullDescription, price, date, id, imgUrls });
	});
}

function saveImagesFromAuction(dir, auction) {
	const { id, imgUrls } = auction;
	const results = [];
	for (const [idx, imgUrl] of imgUrls.entries()) {
		results.push(saveImage(imgUrl, `${dir}/${id}_${idx + 1}.webp`));
	}
	return Promise.all(results);
}

async function saveImage(url, filename) {
	try {
		const { data } = await axios.get(url, { responseType: 'arraybuffer' });
		return fs.writeFile(filename, data);
	} catch(e) {
		console.error(e);
	}
}
