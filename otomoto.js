const fs = require('node:fs');
const format = require('date-format');
const axios = require('axios');
const cheerio = require('cheerio');

const config = JSON.parse(fs.readFileSync('config.json'));
const listingDir = config.listing.dir;
const listingUrl = config.listing.url;
const today = format.asString('dd.MM.yyyy', new Date());
const auctionsDir = listingDir + '/' + today;

fs.mkdirSync(auctionsDir, { recursive: true });

(async function main() {
	const { data } = await axios.get(listingUrl);
	const $ = cheerio.load(data);
	const articles = $('article').toArray();
	const auctions = [];

	for (const el of articles) {
		const jqSection = $(el).children('section');
		const jqDivs = jqSection.children('div');

		const thumbnailUrl = jqDivs.eq(0).find('img').attr('src');
		const url = jqDivs.eq(1).find('h1 a').attr('href');
		const mileage = jqDivs.eq(2).children('dl').eq(0).children('dd').eq(0).text();
		const location = jqDivs.eq(2).children('dl').eq(1).children('dd').eq(0).children('p').text();

		if (thumbnailUrl && url) {
			const details = await getAuctionDetails(url);
			const auction = { thumbnailUrl, url, mileage, location, ...details };
			console.log(auction);

			break;
		}

	}
})();

async function getAuctionDetails(url) {
	const { data } = await axios.get(url);
	
	return new Promise(resolve => {
		const $ = cheerio.load(data);

		const jqMainDiv = $('main > div');
		const jqAside = jqMainDiv.children('aside').eq(0);
		const jqAsideDiv = jqAside.children('div').children('div');

		const title = jqAsideDiv.children('h3').text();
		const description = jqAsideDiv.children('p').text();
		const price = jqAsideDiv.find('div > div > h3').text();

		const jqImgs = jqMainDiv.children('section').eq(1).find('img');
		const srcImgRegex = /image;s=\d+x\d+$/;
		const imgUrls = jqImgs.toArray()
			.map(img => $(img).attr('src'))
			.filter(url => srcImgRegex.test(url)) // image;s=148x110
			.map(url => url.replace(srcImgRegex, 'image'));

		resolve({ title, description, price, imgUrls });
	});
}

