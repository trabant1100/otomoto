const fs = require('node:fs/promises');
const format = require('date-format');

(async function main() {
	const config = JSON.parse(await fs.readFile('config.json'));
	const listingDir = config.listing.dir;
	const { dir: reportDir, banned_urls: bannedUrls, crashed_urls: crashedUrls, fav_urls: favUrls, dead_urls: deadUrls } = config.report;
	const today = format.asString('dd.MM.yyyy', new Date());

	const report = await generateReport(listingDir);
	console.log('Writing report json');
	await fs.writeFile(`${reportDir}/${today}.json`, JSON.stringify(report, null, 2));

	const html = createHtml(report, listingDir, { bannedUrls, crashedUrls, favUrls, deadUrls });
	console.log('Writing report html');
	await fs.writeFile(`${reportDir}/${today}.html`, html);
})();

async function generateReport(rootDir) {
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
		
		return date1.getTime() - date1.getTime();
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
					report[auction.id] = [];
				}
				report[auction.id].push(auction);
			}
		}
	}

	return report;
}

function createHtml(report, listingDir, { bannedUrls, crashedUrls, favUrls, deadUrls }) {
	const header = ['img', 'date', 'price', 'description', 'location', 'mileage'];
	const headerHtml = header.map(str => '<th>' + str + '</th>').join('');

	let rowsHtml = '';
	for (const auctionId in report) {
		const auctions = report[auctionId];
		let auctionClasses = [];
		if (bannedUrls.includes(auctions[0].url)) {
			auctionClasses.push('banned');
		}
		if (crashedUrls.includes(auctions[0].url)) {
			auctionClasses.push('crashed');
		}
		if (favUrls.includes(auctions[0].url)) {
			auctionClasses.push('fav');
		}
		if (deadUrls.includes(auctions[0].url)) {
			auctionClasses.push('dead');
		}
		rowsHtml += `
				<tr class="${auctionClasses.join(' ')}">
					<td rowspan="${auctions.length + 1}"><img src="${auctions[0].imgUrls[0]}" width="128"></td>
					<td colspan="${header.length - 1}">${auctions[0].description} <a href="${auctions[0].url}" target="_blank">otomoto</a></td>
				</tr>
			`;		
		for (const auction of auctions) {
			const cells = [auction.snapshotDate, auction.price, auction.description, auction.location, auction.mileage];
			cells[0] = `<a href="../${listingDir}/${auction.snapshotDate}/${auction.id}.html">` + cells[0] + '</a>';
			const cellsHtml = cells.map(str => `<td>` + str + '</td>').join('');
			rowsHtml += `<tr class="${auctionClasses.join(' ')}">${cellsHtml}</tr>`;
		}
	}

	const html = `
		<!doctype html>
		<html lang=pl>
		<head>
			<meta charset=utf-8>
			<style>
				table {
					border-collapse: collapse;
				}

				table th, 
				table td {
					border: solid 1px;
					padding: 0 1em;
				}

				.banned {
					display: none;
				}

				.crashed {
					display: none;
				}

				.fav {
					background-color: lightgreen;
				}

				.dead {
					background-color: lightgray;
				}
			</style>
		<title>Report</title>
		</head>
		<body>
			<table>
				<thead>
					<tr>
						${headerHtml}
					</tr>
				</thead>
				<tbody>
					${rowsHtml}
				</tbody>
			</table>
		</body>
		</html>
	`;

	return html;
}