'use strict';

const puppeteer = require('puppeteer');

const Company = {
    name: '',
    hq: 'Portland, ME',
    home_page: 'https://www.wexinc.com/',
    jobs_page: 'https://wex.taleo.net/careersection/wex_wexinc/jobsearch.ftl?iniurl.src=JB-10060'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const waitForJobsToLoad = async (page, oldText) => {
    console.log('Waiting for jobs table to load');

    /* 
     * The text inside the reload message span will change once the next
     * page of jobs have been loaded:
     *
     *   "The list of jobs has reloaded. 1 – 25 of 1107. Page 1"
     *
     * So we can wait for the span's text to change in order to verify the 
     * next page of jobs have been loaded into the jobs table
     */
    await page.waitForFunction(
        oldText => oldText !== document.querySelector('span#reloadMessage').innerText,
        {}, oldText
    );

    let reloadMessage = await page.$eval('span#reloadMessage', e => e.innerText);
    return reloadMessage;
}

const getJobLinks = async (page) => {
    const jobs = [];
    
    await page.goto(Company.jobs_page);
    let jobsText = await waitForJobsToLoad(page, '');

    return jobs;
};

const main = async () => {
    //const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });    
    const browser = await puppeteer.launch();
    
    const page = await browser.newPage();
    const jobs = await getJobLinks(page);

    await browser.close();    
    return jobs;
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
