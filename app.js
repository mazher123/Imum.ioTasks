const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const request = require('request-promise');

// Initial URL
const initialUrl = 'https://www.otomoto.pl/ciezarowe/uzytkowe/mercedes-benz/od-2014/q-actros?search%5Bfilter_enum_damaged%5D=0&search%5Border%5D=created_at%3Adesc';

// Function to get the next page URL
const getNextPageUrl = async (html) => {
  const $ = cheerio.load(html);
  const nextPageUrl = $('a[title="Następna strona"]').attr('href');
  return nextPageUrl ? `https://www.otomoto.pl${nextPageUrl}` : null;
};

// Function to add items from a list page
const addItems = async (html) => {
  const $ = cheerio.load(html);
  const items = [];
  $('article[data-ad-id]').each((index, element) => {
    const itemId = $(element).data('ad-id');
    const itemUrl = $(element).find('a[data-analytics-click-value]').attr('href');
    items.push({ itemId, itemUrl });
  });
  return items;
};

// Function to get total ads count
const getTotalAdsCount = async () => {
  const html = await request(initialUrl);
  const $ = cheerio.load(html);
  const adsCount = $('h1[data-analytics-click-value="search_title"]').text().match(/\d+/)[0];
  return parseInt(adsCount);
};

// Function to scrape a truck item
const scrapeTruckItem = async (itemId, itemUrl) => {
  const html = await request(itemUrl);
  const $ = cheerio.load(html);

  const title = $('h1[data-analytics-click-value="ad_title"]').text().trim();
  const price = $('span[data-analytics-interaction-value="price"]').text().replace(/\s+/g, '');
  const registrationDate = $('li:contains("Pierwsza rejestracja") > span').text().trim();
  const productionDate = $('li:contains("Rok produkcji") > span').text().trim();
  const mileage = $('li:contains("Przebieg") > span').text().trim();
  const power = $('li:contains("Moc") > span').text().trim();

  return { itemId, title, price, registrationDate, productionDate, mileage, power };
};

// Function to scrape all pages and all ads
const scrapeAll = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  let currentPageUrl = initialUrl;
  let totalItems = [];

  while (currentPageUrl) {
    console.log(`Scraping page: ${currentPageUrl}`);
    const html = await request(currentPageUrl);
    const items = await addItems(html);

    for (const item of items) {
      console.log(`Scraping item: ${item.itemId}`);
      const itemData = await scrapeTruckItem(item.itemId, item.itemUrl);
      totalItems.push(itemData);
    }

    currentPageUrl = await getNextPageUrl(html);
  }

  await browser.close();

  console.log(`Scraped ${totalItems.length} items:`);
  console.log(totalItems);
};

scrapeAll();