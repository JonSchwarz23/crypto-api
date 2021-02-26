const puppeteer = require("puppeteer");

const Coin = class {
	constructor(browser, id) {
		this.browser = browser;
		this.id = id;

		this.price = null;
		this.change = null;
	}

	async initialize() {
		this.page = await this.browser.newPage();
		await this.page.goto(
			`https://coinmarketcap.com/currencies/${this.id}/`
		);
		await this.loadData(0);
	}

	async getNumberResult(selector) {
		return await this.page.$eval(selector, (element) =>
			parseFloat(element.innerText.replaceAll(/\$|,/g, ""))
		);
	}

	async loadData(i) {
		try {
			if (i > 100) {
				console.log("Not updating; reloading the page for ", this.id);
				await this.reloadPage();
				i = 0;
			}

			let update = false;

			let result = await this.getNumberResult("[class^=priceValue]");
			if (result) {
				update |= this.price != result;
				this.price = result;
			}

			result = await this.getNumberResult(
				"tbody > tr:nth-child(2) > td > span"
			);
			if (result) {
				update |= this.change != result;
				this.change = result;
			}

			if (update) i = 0;
			else i++;
		} catch (error) {
			console.log("Error loading data from page", error, this.id);
			await this.reloadPage();
			//TODO don't spam reload
		} finally {
			setTimeout(this.loadData.bind(this), 3000, i);
		}
	}

	async reloadPage() {
		try {
			await page.reload({
				waitUntil: ["networkidle0", "domcontentloaded"],
			});
		} catch {
			console.log("Failed to reload page. This seems really bad.");
		}
	}
};

browser = null;
coins = {};

const createBrowser = async () => {
	browser = await puppeteer.launch({
		args: [
			// Required for Docker version of Puppeteer
			"--no-sandbox",
			"--disable-setuid-sandbox",
			// This will write shared memory files into /tmp instead of /dev/shm,
			// because Docker’s default for /dev/shm is 64MB
			"--disable-dev-shm-usage",
		],
	});
};

const addCoin = async (id) => {
	const coin = new Coin(browser, id);
	await coin.initialize();
	coins[id] = coin;
};

createBrowser();

//express

var express = require("express");
var cors = require("cors");
var app = express();

app.use(cors());

app.get("/:id/price", async (req, res) => {
	try {
		const coinId = req.params.id;
		if (!coins[coinId]) {
			console.log("Creating Coin: ", coinId);
			await addCoin(coinId);
		}
		res.send({ price: coins[coinId].price || "No price" });
	} catch (error) {
		res.status(500).send({ error });
	}
});

app.get("/:id/change", async (req, res) => {
	try {
		const coinId = req.params.id;
		if (!coins[coinId]) {
			console.log("Creating Coin: ", coinId);
			await addCoin(coinId);
		}
		res.send({ price: coins[coinId].change || "No change" });
	} catch (error) {
		res.status(500).send({ error });
	}
});

app.get("/test", (req, res) => {
	res.send("Success");
});

app.listen(5000, () => console.log("Listening on port 5000"));
