'use strict';

const puppeteer = require('puppeteer');

const Company = {
    name: 'Jacobs JSEG',
    hq: 'Huntsville, AL',
    home_page: 'http://jacobs.com/',
    jobs_page: 'https://jacobs.taleo.net/careersection/ex/jobsearch.ftl?iniurl.src=INTINTSEO'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const getPageJobLinks = async (page) => {
    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.min.js'}); // Inject jQuery
    const jobs = await page.evaluate(() => {
        const jobs = [];
        
        $('tr[id^="job"]').each(function (i, tr) {
            const j = {};
            const a = $(tr).find('a');
            
            j.title = a.contents()[0].textContent.trim();
            j.url = a[0].href;
            j.location = $($(tr).find('td')[1]).text();
            j.postingDate = $($(tr).find('td')[2]).text();
            j.jobNumber = $($(tr).find('td')[3]).text();
            
            jobs.push(j);
        });

        return jobs;
    });

    return jobs;
};

const getWaitForJobsToLoad = (page) => {
    let prevText = '';
    
    return async () => {
        await page.waitFor(
            prevText => document.querySelector('span#currentPageInfo').innerText !== prevText,
            prevText
        );
        
        prevText = await page.evaluate(
            () => document.querySelector('span#currentPageInfo').innerText
        );
    };
};

const getJobLinks = async (page) => {
    let waitForJobsToLoad = getWaitForJobsToLoad(page);
    
    await page.goto(Company.jobs_page);
    await waitForJobsToLoad();

    /* Limit it to the JSEG jobs in Huntsville */
    const input = await page.$('input#KEYWORD');
    await input.type('jseg');
    
    await page.click('input#search');
    await page.waitFor(i => i.value === 'jseg', {}, input);

    let jobs = [];
    
    while (true) {
        jobs = jobs.concat( await getPageJobLinks(page) );
        
        const nextPage = await page.$('a#next');
        const disabled = await page.evaluate((e, a) => e.getAttribute(a), nextPage, 'aria-disabled');

        if (disabled === 'true') {
            break;
        }

        await nextPage.click();
        await waitForJobsToLoad();        
    }
    
    return jobs;
};

const getJobDescriptions = async (page, jobs) => {
    for (const j of jobs) {
        await page.goto(j.url);
        await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.min.js'}); // Inject jQuery

        j.description = await page.evaluate(() => $('div[class^="mastercontentpanel"] table.tablelist').html());
    }
};

const main = async () => {
    const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });
    const [ page ] = await browser.pages();

    const jobs = await getJobLinks(page);
    await getJobDescriptions(page, jobs);
    
    page.on('console', msg => console.log('> ', msg.text()));

    await browser.close()

    return jobs;
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
