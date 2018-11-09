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

const getJobLinks = async (page) => {
    await page.goto(Company.jobs_page);
    await page.waitFor(
        () => document.querySelector('span#currentPageInfo').innerText !== ''
    );

    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.min.js'}); // Inject jQuery
    await page.evaluate(() => {
        const jobs = [];
        
        $('tr[id^="job"]').each(function (i, tr) {
            debugger;
            const j = {};
            
            j.title = $(tr).find('a').contents()[0];
            j.url = $(tr).find('a').attr('href')
            j.location = $($(tr).find('td')[1]).text();
            j.postingDate = $($(tr).find('td')[2]).text()
            j.jobNumber = $($(tr).find('td')[3]).text()
            
            jobs.push(j);
        });
    });
};

const main = async () => {
    const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });
    const [ page ] = await browser.pages();
    const jobs = await getJobLinks(page);
    
    page.on('console', msg => console.log('> ', msg.text()));

    await browser.close()

    return jobs;
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
