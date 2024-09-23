const fs = require('node:fs/promises');
const fn = require('../../chart.js');
const pug = require('pug');

(async function main() {
	const html = await createHtml();
	console.log('Writing index.html');
	await fs.writeFile('index.html', html);
})();

async function createHtml() {
	const pugger = pug.compile(await fs.readFile('index.pug'), { filename: 'pug' });
	const scale = {
		xMargin: 2,
		priceMargin: 8,
		price: 40,
		date: 150
	};
	const chronosList = [
		[
			{ date: '01.09.2024', price: 150000 },
			{ date: '02.09.2024', price: 150000 },
			{ date: '03.09.2024', price: 160000 },
			{ date: '04.09.2024', price: 160000 },
		],
		[
			{ date: '21.09.2024', price: 195000 },
			{ date: '20.09.2024', price: 195000 },
			{ date: '18.09.2024', price: 195000 },
			{ date: '17.09.2024', price: 195000 },
			{ date: '16.09.2024', price: 195000 },
			{ date: '15.09.2024', price: 195000 },
			{ date: '14.09.2024', price: 195000 },
			{ date: '13.09.2024', price: 195000 },
			{ date: '12.09.2024', price: 195000 },
			{ date: '11.09.2024', price: 195000 },
			{ date: '10.09.2024', price: 208000 },
			{ date: '09.09.2024', price: 208000 },
			{ date: '08.09.2024', price: 208000 },
			{ date: '07.09.2024', price: 208000 },
			{ date: '06.09.2024', price: 208000 },
			{ date: '05.09.2024', price: 208000 },
			{ date: '04.09.2024', price: 208000 },
			{ date: '03.09.2024', price: 208000 },
			{ date: '02.09.2024', price: 208000 },
			{ date: '01.09.2024', price: 208000 },
			{ date: '30.08.2024', price: 208000 },
			{ date: '29.08.2024', price: 208000 },
			{ date: '28.08.2024', price: 208000 },
			{ date: '27.08.2024', price: 208000 },
			{ date: '26.08.2024', price: 208000 },
			{ date: '25.08.2024', price: 208000 },
			{ date: '24.08.2024', price: 208000 },
			{ date: '23.08.2024', price: 208000 },
			{ date: '22.08.2024', price: 208000 },
			{ date: '21.08.2024', price: 208000 },
			{ date: '20.08.2024', price: 208000 },
			{ date: '16.08.2024', price: 208000 },
			{ date: '15.08.2024', price: 208000 },
			{ date: '14.08.2024', price: 212000 },
			{ date: '13.08.2024', price: 212000 },
			{ date: '12.08.2024', price: 212000 },
			{ date: '11.08.2024', price: 212000 },
			{ date: '10.08.2024', price: 212000 },
			{ date: '09.08.2024', price: 212000 },
			{ date: '08.08.2024', price: 212000 },
			{ date: '07.08.2024', price: 212000 },
			{ date: '06.08.2024', price: 212000 },
			{ date: '05.08.2024', price: 212000 },
			{ date: '04.08.2024', price: 212000 },
			{ date: '03.08.2024', price: 212000 },
			{ date: '02.08.2024', price: 212000 },
			{ date: '01.08.2024', price: 212000 },
			{ date: '30.07.2024', price: 212000 },
			{ date: '29.07.2024', price: 212000 },
			{ date: '28.07.2024', price: 212000 },
			{ date: '27.07.2024', price: 212000 },
			{ date: '26.07.2024', price: 212000 },
			{ date: '25.07.2024', price: 212000 },
			{ date: '24.07.2024', price: 212000 },
			{ date: '23.07.2024', price: 212000 },
			{ date: '22.07.2024', price: 212000 },
			{ date: '21.07.2024', price: 212000 },
			{ date: '01.07.2024', price: 212000 },
		].toReversed(),
		[
			{ date: '21.09.2024', price: 219900 },
			{ date: '20.09.2024', price: 219900 },
			{ date: '19.09.2024', price: 219900 },
			{ date: '18.09.2024', price: 219900 },
			{ date: '17.09.2024', price: 219900 },
			{ date: '16.09.2024', price: 219900 },
			{ date: '15.09.2024', price: 219900 },
			{ date: '14.09.2024', price: 219900 },
			{ date: '13.09.2024', price: 219900 },
			{ date: '12.09.2024', price: 219900 },
			{ date: '11.09.2024', price: 219900 },
			{ date: '24.07.2024', price: 234500 },
			{ date: '23.07.2024', price: 234500 },
			{ date: '22.07.2024', price: 234500 },
			{ date: '21.07.2024', price: 234500 },
		].toReversed(),
		[
			{ date: '22.09.2024', price: 213000 }
		]
	];

	return pugger({ scale, chronosList, fn });
}





