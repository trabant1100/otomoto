const fs = require('node:fs/promises');
const format = require('date-format');
const pug = require('pug');
const today = process.argv[2] ?? format.asString('dd.MM.yyyy', new Date());

(async function main() {
	const config = JSON.parse(await fs.readFile('config.json'));
	const listingDir = config.listing.dir;
	const { dir: reportDir, banned_urls: bannedUrls, crashed_urls: crashedUrls, fav_urls: favUrls, dead_urls: deadUrls, vins } = config.report;

	const report = await generateReport(today, vins, listingDir);
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
		for (const snapshot of auction.snapshots) {
			snapshot.price = Number.parseInt(snapshot.price.replace(' ', ''));
		}
	}

	return normalized;
}

async function generateReport(today, vins, rootDir) {
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
		if (vins[snapshots[0].url] !== undefined) {
			auction.vin = vins[snapshots[0].url];
		}
	}

	return report;
}

async function createHtml(report, listingDir, { bannedUrls, crashedUrls, favUrls, deadUrls }) {
	/*const header = ['img', 'date', 'price', 'description', 'location', 'mileage'];
	const headerHtml = header.map(str => '<th>' + str + '</th>').join('');

	let rowsHtml = '';
	for (const auctionId in report) {
		const auction = report[auctionId];
		const snapshots = auction.snapshots;
		let auctionClasses = [];
		if (bannedUrls.includes(snapshots[0].url)) {
			auctionClasses.push('banned');
		}
		if (crashedUrls.includes(snapshots[0].url)) {
			auctionClasses.push('crashed');
		}
		if (favUrls.includes(snapshots[0].url)) {
			auctionClasses.push('fav');
		}
		if (deadUrls.includes(snapshots[0].url)) {
			auctionClasses.push('dead');
		}
		if (auction.ended) {
			auctionClasses.push('ended');
		}
		const vinHtml = auction.vin !== undefined 
			? `VIN: <a href="https://www.google.com/search?q=${auction.vin}" target="_blank">${auction.vin}</a>`
			: '';
		rowsHtml += `
				<tr class="${auctionClasses.join(' ')}">
					<td rowspan="${snapshots.length + 1}"><img src="${snapshots[0].imgUrls[0]}" width="128"></td>
					<td colspan="${header.length - 1}">
						${snapshots[0].description}
						<a href="${snapshots[0].url}" target="_blank">otomoto</a>
						${vinHtml}
					</td>
				</tr>
			`;		
		for (const auction of snapshots) {
			const cells = [auction.snapshotDate, auction.price, auction.description, auction.location, auction.mileage];
			cells[0] = `<a href="../${listingDir}/${auction.snapshotDate}/${auction.id}.html">` + cells[0] + '</a>';
			const cellsHtml = cells.map(str => `<td>` + str + '</td>').join('');
			rowsHtml += `<tr class="${auctionClasses.join(' ')}">${cellsHtml}</tr>`;
		}
	}*/

	const pugger = pug.compile(await fs.readFile('report.pug'));
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