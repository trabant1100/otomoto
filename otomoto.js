const fs = require('node:fs/promises');
const qs = require('querystring');
const { DateTime } = require('luxon');
const DATE_FORMAT = 'dd.MM.yyyy';
const axios = require('axios');
const cheerio = require('cheerio');
const api_key = process.env.API_KEY;

(async function main() {
	const config = JSON.parse(await fs.readFile('config.json'));
	const listingDir = config.listing.dir;
	const listingUrls = config.listing.urls;
	const today = DateTime.now().toFormat(DATE_FORMAT);
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
			throw e.response.data;
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
				try {
				  const details = await getAuctionDetails(url);
				  const auction = { thumbnailUrl, url, mileage, location, year, ...details };
				  auctions.push(auction);
				} catch (e) {
				  console.error(`Error auction #${auctionIdx + 1}: ${e}`);
				}
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
})().catch(e => console.error(e));

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
		throw e.response.data;
	}
	
	return new Promise(resolve => {
		const $ = cheerio.load(data);
		const advert = JSON.parse($('#__NEXT_DATA__').eq(0).text()).props.pageProps.advert;

		const title = advert.title;
		const description = '';
		const fullDescription = advert.description;
		const price = advert.price.value;
		const date = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeStyle: 'short' })
			.format(new Date(advert.createdAt));
		const id = advert.id;
		const imgUrls = advert.images.photos.map(p => p.url);

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
