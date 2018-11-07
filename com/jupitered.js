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
//    const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });
    const browser = await puppeteer.launch({ headless: false, devtools: true });    
    const [ page ] = await browser.pages();

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

    /* 
     * Dropdown menu doesn't get populated until we click on the element 
     * and then it gets scrolled into view via timers within scrolltoview()
     */
    const state = await page.$('div#region1_label');
    await state.click();

    await page.waitFor(() => scrolltimer !== 0); /* scrolling starts */
    await page.waitFor(() => scrolltimer === 0); /* scrolling ends */
    
    const option = await page.waitForXPath(
        '//*[@id = "menulist_region1"]/div[text() = "Maryland"]',
        { visible: true }
    );
    await option.click();

    /* 
     * The input element for the state gets set dynamically within
     * clickmenu() using the setval() function-
     *
     *   <input name="region1" value="us_md"> 
     */
    await page.waitForXPath(
        '//input[@name="region1" and @value="us_md"]'
    );
    
    const loginBtn = await page.$('div#loginbtn');
    await loginBtn.click();

    /* Extract the To Do items */
    await page.waitFor('div#mainpage');
    const div = (await page.$x(
        '//div[@id="sidebar"]/div[@val="todo"]'
    ))[0];
    await div.click();

    await page.waitFor(() => {
        const div = document.evaluate(
            '//div[@id="sidebar"]/div[@val="todo"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue;
        const bgColor = window.getComputedStyle(div).getPropertyValue('background-color');
        return bgColor === 'rgb(51, 179, 204)';
    });

    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.min.js'}); // Inject jQuery
    const upcoming = await page.evaluate(() => {
        const assignments = [];
        $('tr[click^="goassign"]').each(function (i,tr) {
            debugger;
            assignments.push(tr.text().trim());
        });
        return assignments;
    });

    console.log(upcoming);
    await browser.close(); 
};

main().then(() => console.log('Done'));
