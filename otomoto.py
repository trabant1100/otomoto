import requests
from bs4 import BeautifulSoup
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from io import BytesIO
from PIL import Image as PILImage
from datetime import date


output = date.today().strftime("%d.%m.%Y") + ".xlsx"
results = []
URL = "https://www.otomoto.pl/osobowe/ford/explorer/od-2020?search%5Bfilter_float_year%3Ato%5D=2020&search%5Badvanced_search_expanded%5D=false"
page = requests.get(URL)

soap = BeautifulSoup(page.content, "html.parser")
articles = soap.find_all("article")

for article in articles:
	result = {}
	if article.section:
		for div in article.section.children:
			img = div.find("img", recursive=False)
			h1 = div.find("h1", recursive=False)
			p = div.find("p", recursive=False)
			dls = div.find_all("dl", recursive=False)
			if img:
				result["thumbnail"] = img["src"]
			if h1:
				result["title"] = h1.a.string
				result["url"] = h1.a["href"]
			if p:
				result["description"] = p.string
			if dls:
				result["mileage"] = "".join(dls[0].dd.strings)
				result["location"] = dls[1].dd.p.string
			if div.h3:
				result["price"] = div.h3.string

	if result:
		results.append(result)
		
for idx, item in enumerate(results):
	print(idx, item.get("thumbnail"), item.get("title"), item.get("url"), item.get("description"), item.get("location"), item.get("mileage"), item.get("price"))	


def calculate_resized_dimensions(original_width, original_height, max_width, max_height):
    ratio = min(max_width / original_width, max_height / original_height)
    return int(original_width * ratio), int(original_height * ratio)

# Create a workbook and a sheet
wb = Workbook()
ws = wb.active
ws.title = "otomoto"

# Add some data
ws.append(['thumbnail', 'title', 'url', "description", "location", "mileage", "price"])
for idx, item in enumerate(results):
	ws.append(list(item.values()))
	response = requests.get(item.get("thumbnail"))
	image_data = BytesIO(response.content)
	img_pil = PILImage.open(image_data)

	max_width = 400  # Maximum width
	max_height = 300  # Maximum height
	resized_width, resized_height = calculate_resized_dimensions(img_pil.width, img_pil.height, max_width, max_height)

	img_pil = img_pil.resize((resized_width, resized_height), PILImage.LANCZOS)
	img_bytes = BytesIO()
	img_pil.save(img_bytes, format='PNG')
	img_xl = XLImage(img_bytes)
	cell = ws.cell(row=(idx+2), column=1)
	ws.add_image(img_xl, cell.coordinate)
	if idx > 0:
		ws.row_dimensions[idx+1].height = 250
		ws.column_dimensions["A"].width = 400 / 7


# Save the workbook to a file
wb.save(output)	