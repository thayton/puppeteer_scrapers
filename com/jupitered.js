'use strict';

const puppeteer = require('puppeteer');
const assert = require('assert');

const url = 'https://login.jupitered.com/login/index.php';

const username = process.env.username;
const password = process.env.password;
const city = process.env.city;
const state = process.env.state;
const school = process.env.school;

assert.notEqual(username, undefined, 'username must be defined');
assert.notEqual(password, undefined, 'password must be defined');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const main = async () => {
    const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });
    const [ page ] = await browser.pages();

    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.min.js'}); // Inject jQuery
    await page.goto(url);

    const tab = await page.waitFor('div#tab_parent')
    await tab.click();

    /* Wait until the tab selector is over the parent tab */
    await page.waitFor(() => {
        const tabSelector = document.querySelector('div#tabselector');
        return tabSelector.offsetLeft === 66;
    });
    
    await page.type('div#text_studid1', username);
    await page.type('input#text_password1', password);
    await page.type('div#text_school1', school);
    await page.type('div#text_city1', city);

    /* Dropdown menu doesn't get populated until we click on the element */
    const state = await page.$('div#region1_label');
    await state.click();
    
    await page.waitFor('div#menulist_region1');
    const option = (await page.$x(
        '//*[@id = "menulist_region1"]/div[text() = "Maryland"]'
    ))[0];
    await option.click();
    
    const loginBtn = await page.$('div#loginbtn');
    await loginBtn.click();

    await page.waitFor('div#mainpage');
    
    await browser.close(); 
};

main().then(() => console.log('Done'));
