'use strict';

const puppeteer = require('puppeteer');
const url = require('url');
const jsdom = require('jsdom');
const fetch = require('node-fetch');
const normalizeDate = require('normalize-date');
const { JSDOM } = jsdom;

const Company = {
    name: 'Finning',
    hq: 'Vancouver, Canada',
    home_page: 'https://www.finning.com',
    jobs_page: 'https://finning.wd3.myworkdayjobs.com/External'
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

const extractJobs = async (page) => {
    const jobElements = await page.$$('div.gwt-Label.WOTO.WISO');
    const jobs = [];

    /*
     * If you right click each job link a popup menu lets you copy
     * the job URL. Then within the menu we look for a div like the
     * following:
     *
     *   <div data-automation-id="copyUrl" title="Copy URL" data-clipboard-text="<url-to-extract>"
     */
    for (const e of jobElements) {
        await e.click({ button: 'right' });
        
        const menu = await page.waitFor('div.WET.wd-popup-content'); /* wait for popup menu to appear */
        const [ div ] = await menu.$x('//div[@data-automation-id="copyUrl"]');
        const url = await page.evaluate(e => e.getAttribute('data-clipboard-text', div));
        
        console.log(url);
        
        jobs.push(url);
    }

    return jobs;
};

const getJobLinks = async (page) => {
    let jobs = [];
    
    await page.goto(Company.jobs_page);
    await page.waitFor(
        id => document.querySelector(`span#${id}`),
        {}, /* opts */
        'wd-FacetedSearchResultList-PaginationText-facetSearchResultList\\.newFacetSearch\\.Report_Entry'
    );
    
    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.min.js'}); // Inject jQuery

    let totalJobsStr = await page.evaluate(
        id => document.querySelector(`span#${id}`).innerText,
        'wd-FacetedSearchResultList-PaginationText-facetSearchResultList\\.newFacetSearch\\.Report_Entry'
    );

    let totalNumJobs = parseInt( /(\d+)\s+Results/.exec(totalJobsStr)[1] );
    
    console.log(`Scrolling until we get ${totalNumJobs} jobs`);

    /* Scroll until scrolling no longer triggers any more job fetches */
    await page.setRequestInterception(true);
    let numJobs = await page.evaluate("document.querySelectorAll('div.gwt-Label.WOTO.WISO').length");
    
    while (numJobs < totalNumJobs) {
        /* Log when the request gets sent out */
        const xhrSent = new Promise(
            resolve =>
                page.on('request', request => {
                    if (request.resourceType() === "xhr") {
                        console.log(request.url());
                        resolve();
                    }
                    request.continue();
                })
        );

        /* Wait until we get the next page of results */
        const xhrResp = new Promise(
            resolve =>
                page.on('response', response => {
                    if (response.request().resourceType() === "xhr" &&
                        response.request().url().includes('searchPagination')) {
                        resolve();
                    }
                })
        );
    
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await xhrSent;
        await xhrResp;

        jobs = await extractJobs(page);
    }

    jobs = await extractJobs(page);
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
    //const browser = await puppeteer.launch();    
    const [ page ] = await browser.pages();

    const jobs = await getJobLinks(page);
    //await getJobDescriptions(page, jobs);
    
    page.on('console', msg => console.log('> ', msg.text()));

    await browser.close()

    return jobs;
};

main().then((jobs) => {
    console.log(`# jobs = ${jobs.length}`);
    console.log(JSON.stringify(jobs, null, 2));
});
