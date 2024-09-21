const fs = require('node:fs/promises');
const format = require('date-format');
const pug = require('pug');
const today = process.argv[2] ?? format.asString('dd.MM.yyyy', new Date());

(async function main() {
	const config = JSON.parse(await fs.readFile('config.json'));
	const listingDir = config.listing.dir;
	const { dir: reportDir, banned_urls: bannedUrls, crashed_urls: crashedUrls, fav_urls: favUrls, dead_urls: deadUrls, 
		relisted_urls: relistedUrls, vins, notes } = config.report;

	const report = await generateReport(today, relistedUrls, vins, normalizeNotes(notes), listingDir);
	console.log('Writing report json');
	await fs.mkdir(reportDir, { recursive: true });
	await fs.writeFile(`${reportDir}/${today}.json`, JSON.stringify(report, null, 2));

	const html = await createHtml(normalizeReport(report), listingDir, { bannedUrls, crashedUrls, favUrls, deadUrls });
	console.log('Writing report html');
	await fs.writeFile(`${reportDir}/${today}.html`, html);

	console.log('Writing redirect html');
	await fs.writeFile('index.html', createRedirectHtml(reportDir, today));
})();

function normalizeReport(report) {
	const normalized = JSON.parse(JSON.stringify(report));

	for (const [auctionId, auction] of Object.entries(normalized)) {
		auction.year = auction.snapshots.at(-1).year ?? 2020;
		for (const snapshot of auction.snapshots) {
			snapshot.price = Number.parseInt(snapshot.price.replace(' ', ''));
		}
	}

	const groupedByYear = [];
	for (const [auctionId, auction] of Object.entries(normalized)) {
		groupedByYear[auction.year] = groupedByYear[auction.year] ?? {};
		groupedByYear[auction.year][auctionId] = auction;
	}

	return groupedByYear
		.reduce((acc, group) => {
			acc = { ...acc, ...group };
			return acc;
	}, {});
}

function normalizeNotes(notes) {
	const normalized = JSON.parse(JSON.stringify(notes));

	for (const [url, note] of Object.entries(normalized)) {
		if (note.price) {
			for (const [currency, price] of Object.entries(note.price)) {
				let normalizedPrice = {};
				if (typeof price == 'number') {
					normalizedPrice = { date: undefined, value: price };
				} else {
					normalizedPrice = { date: price.date, value: price.value };
				}
				note.price[currency] = normalizedPrice;
			}
		}
	}

	return normalized;
}

async function generateReport(today, relistedUrls, vins, notes, rootDir) {
	const listingDirs = [];
	for (const filename of await fs.readdir(rootDir)) {
		const fullFilename = `${rootDir}/${filename}`;
		const stat = await fs.stat(fullFilename);
		if (stat.isDirectory() && /\d\d.\d\d.\d{4}/.test(filename)) {
			console.log(`Found listing ${filename}`);
			listingDirs.push(filename);
		}
	}
	listingDirs.sort((fname1, fname2) => {
		const date1 = format.parse('dd.MM.yyyy', fname1);
		const date2 = format.parse('dd.MM.yyyy', fname2);
		
		return date1.getTime() - date2.getTime();
	});

	const report = {};

	for (const listingDir of listingDirs) {
		const fullListingDir = `${rootDir}/${listingDir}`;
		for (const filename of await fs.readdir(fullListingDir)) {
			const fullFilename = `${rootDir}/${listingDir}/${filename}`;
			const stat = await fs.stat(fullFilename);
			if (stat.isFile() && filename.endsWith('.json')) {
				console.log(`Found auction file ${fullFilename}`);
				const auction = JSON.parse(await fs.readFile(fullFilename));
				auction.snapshotDate = listingDir;
				if (report[auction.id] === undefined) {
					report[auction.id] = { snapshots: [] };
				}
				report[auction.id].snapshots.push(auction);
			}
		}
	}

	for (const auctionId in report) {
		const auction = report[auctionId];
		const snapshots = auction.snapshots;
		if (snapshots.at(-1).snapshotDate != today) {
			auction.ended = true;
		}
		if (snapshots.length == 1 && snapshots[0].snapshotDate == today) {
			auction.new = true;
		}
		for (const url of snapshots.map(s => s.url)) {
			if (vins[url] !== undefined) {
				auction.vin = vins[url];
			}
			if (notes[url] !== undefined) {
				auction.notes = notes[url];
			}
		}
	}

	const relistedAuctions = [];
	for (const [auctionId, auction] of Object.entries(report)) {
		const lastSnapshot = auction.snapshots.at(-1);
		const url = lastSnapshot.url;
		for (const [i, urls] of Object.entries(relistedUrls)) {
			if (urls.includes(url)) {
				const auction = getAuctionByUrl(url);
				if (relistedAuctions[i] === undefined) {
					relistedAuctions[i] = [];
				}
				relistedAuctions[i].push(auction);
			}
		}
	}

	for (const auctions of relistedAuctions) {
		auctions.sort((auction1, auction2) => {
			const date1 = format.parse('dd.MM.yyyy', auction1.snapshots.at(-1).snapshotDate);
			const date2 = format.parse('dd.MM.yyyy', auction2.snapshots.at(-1).snapshotDate);
			
			return date1.getTime() - date2.getTime();
		});
		const lastAuction = auctions.at(-1);
		report[lastAuction.snapshots.at(-1).id].snapshots = auctions.flatMap(auction => auction.snapshots);
	}

	function getAuctionByUrl(url) {
		return Object.values(report).find(auction => auction.snapshots.at(-1).url == url);
	}

	return report;
}

async function createHtml(report, listingDir, { bannedUrls, crashedUrls, favUrls, deadUrls }) {
	const pugger = pug.compile(await fs.readFile('report.pug'), { filename: 'pug' });
	const fn = {
		parseDate(str) {
			return format.parse('dd.MM.yyyy', str);
		}
	};

	return pugger( { report, bannedUrls, crashedUrls, favUrls, deadUrls, fn } );
}

function createRedirectHtml(reportDir, today) {
	return `
		<!doctype html>
		<html lang=pl>
			<head>
				<meta charset=utf-8>
				<meta http-equiv="refresh" content="0; url=./${reportDir}/${today}.html">
				<title>Report</title>
			</head>
			<body>
			</body>
		</html>
	`;
}