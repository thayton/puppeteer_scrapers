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

/**
 * The text inside the reload message span will change once the next
 * page of jobs have been loaded:
 *
 *   "The list of jobs has reloaded. 1 – 25 of 1107. Page 1"
 *
 * So we can wait for the span's text to change in order to verify the 
 * next page of jobs have been loaded into the jobs table
 *
 * @return {string} reloadMessage
 */
const waitForJobsToLoad = async (page, oldText) => {
    console.log('Waiting for jobs table to load');

    await page.waitForFunction(
        oldText => oldText !== document.querySelector('span#reloadMessage').innerText,
        {}, oldText
    );

    let reloadMsg = await page.$eval('span#reloadMessage', e => e.innerText);
    return reloadMsg;
}

const getJobLinks = async (page) => {
    const jobs = await page.evaluate(() => {
        const jobs = [];
        const trs = $('tr[id^="job"]')
              .filter((i, tr) => /^job\d+$/.test(tr.id))
              .each((i, tr) => {
                  const j = {};
                  
                  j.url = $(tr).find('th span > a')[0].href;
                  j.title = $(tr).find('th span > a').text();
                  j.location = $(tr).find('td:eq(1)').text();
                  
                  jobs.push(j);
              });
        
        return jobs;
    });

    return jobs;
};

/**
 * Returns array of job links
 * @param {} page
 */
const getJobs = async (page) => {
    let reloadMsg = '';
    let jobs = [];

    while (true) {
        reloadMsg = await waitForJobsToLoad(page, reloadMsg);        
        jobs = jobs.concat(await getJobLinks(page));        

        let nextPage = await page.$('a#next');
        let nextPageDisabled = await page.evaluate(a => a.getAttribute('aria-disabled'), nextPage);
        
        if (nextPageDisabled !== 'false')
            break;

        await nextPage.click();
    }
    
    return jobs;
};

const main = async () => {
    const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });    
    //const browser = await puppeteer.launch();
    
    const [ page ] = await browser.pages();
    
    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.min.js'}); // Inject jQuery
    await page.goto(Company.jobs_page);
    
    page.on('console', msg => console.log('> ', msg.text()));

    const jobs = await getJobs(page);

    await browser.close();    
    return jobs;
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
