const express = require('express');
const envConfig = require('dotenv');
const port = process.env.PORT || 5000;
const hostname =  process.env.HOSTNAME || 'localhost';
const puppeteer = require("puppeteer");
envConfig.config();

const app = express();
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.get('/', async (req, res, next) => { 
    try {
        res.status(200).json("Functioning");
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


app.get('/apple/', async (req, res, next) => { 
    var data = [];
    console.log(req.query);
    const APPLE_USER_ID = req.query.username;
    const APPLE_PW = req.query.password;
    let url = "https://podcastsconnect.apple.com";
    let browser = await puppeteer.launch({ 
        args: [
            '--no-sandbox',
            '--window-size=1920,1080'
        ],                                                                                                                                                                                                                 
        headless: false,
        defaultViewport: null 
    });
    try {
        let page = await browser.newPage(url + "/login");
        await page.goto(url).then(() => console.log("/login REACHED"));
        await page.waitForSelector("iframe").then(() => console.log("IFRAME LOADED"));
        let frameHandle = await page.$("iframe");
        const frame = await frameHandle.contentFrame();
        await frame.waitForSelector('#account_name_text_field').then(() => console.log('account_name_text_field is present'));
        await frame.type('#account_name_text_field', APPLE_USER_ID).then(() => console.log('account_name_text_field is entered'));
        await page.keyboard.press('Enter', {delay: 2000});
        await frame.waitForSelector('#password_text_field').then(() => console.log('password_text_field is present'));
        //await frame.evaluate((text) => { (document.getElementById('password_text_field')).value = text; }, APPLE_PW);
        await frame.click('#password_text_field', {delay: 2000});
        for (var i=0; i<APPLE_PW.length; i++) {
            await page.keyboard.press(APPLE_PW.charAt(i));
        }
        await page.keyboard.press('Enter', { delay: 2000});
        await page.waitForNavigation({delay: 2000}).then(() => console.log(`PAGE LOADED`));
        await page.goto(url + "/analytics/shows").then(() => console.log("/analytics/shows REACHED"));
        await page.waitForSelector("table", {delay: 3000}).then(() => console.log("TABLE LOADED"));
        //console.log(htmlShowData);
        //await page.goto(url + "/analytics/meet-cute/1491088065/episodes").then(() => console.log("https://podcastsconnect.apple.com/analytics/meet-cute/1491088065/episodes" + " REACHED"));
        //await page.waitForSelector("table", {delay: 3000}).then(() => console.log("TABLE LOADED"));
        const podcastHrefs = await page.evaluate(() => Array.from(
                document.querySelectorAll('tbody tr[class="Table__TR-sc-15luk7c-4 iPfmka"] td[class="Table__TD-sc-15luk7c-5 eNheln"] a[href]'),
                a => a.getAttribute('href')
            )
        );
        for (var i = 0; i < podcastHrefs.length; i++) {
            await page.goto(url + podcastHrefs[i] + "/episodes").then(() => console.log(podcastHrefs[i] + " REACHED"));
            await page.waitForSelector("table", {delay: 3000}).then(() => console.log("TABLE LOADED"));
            if ( i == 0) {
                console.log("HEADERS ADDED " + i);
                const podcastEpisodeHeaders = await page.evaluate(() => {
                    const tds = Array.from(document.querySelectorAll(`table thead tr th:not(.gxmHXK)`))
                    return tds.map(td => td.innerText)
                });
                console.log(podcastEpisodeHeaders);
                data.push(podcastEpisodeHeaders);
            }
            const podcastEpisodeData = await page.evaluate(() => {
                const rows = document.querySelectorAll('table tbody tr');
                return Array.from(rows, row => {
                    const columns = row.querySelectorAll('td');
                    return Array.from(columns, column => column.innerText);
                });
            });
            for (var j = 0; j < podcastEpisodeData.length; j++) {
                data.push(podcastEpisodeData[j]);
            }
        }
        await browser.close();
        res.status(200).json(data);
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        await browser.close();
        next(err);
    }
});

app.listen(port, hostname, function(){
    console.log(`HTTP Server running at http://${hostname}:${process.env.PORT || 5000}/`);
});
