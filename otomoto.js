const fs = require('node:fs/promises');
const format = require('date-format');
const axios = require('axios');
const cheerio = require('cheerio');

(async function main() {
	const config = JSON.parse(await fs.readFile('config.json'));
	const listingDir = config.listing.dir;
	const listingUrl = config.listing.url;
	const today = format.asString('dd.MM.yyyy', new Date());
	const auctionsDir = listingDir + '/' + today;
	const imagesDir = auctionsDir + '/images';

	await fs.mkdir(auctionsDir, { recursive: true });
	await fs.mkdir(imagesDir, { recursive: true });

	console.log('Getting list of auctions');
	const { data } = await axios.get(listingUrl);
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
			const auction = { thumbnailUrl, url, mileage, location, ...details };
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

		const jqSectionDiv = jqMainDiv.children('section').eq(1).children('div').eq(0);
		const date = jqSectionDiv.children('div').eq(0).children('p').text();
		const id = jqSectionDiv.children('div').eq(1).children('p').text().replace(/^ID\s*:\s*/, '');

		resolve({ title, description, price, date, id, imgUrls });
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
	const { data } = await axios.get(url, { responseType: 'arraybuffer' });
	return fs.writeFile(filename, data);
}
