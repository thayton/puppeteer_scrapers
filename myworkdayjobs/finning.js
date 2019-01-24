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

/*
 * Extract a list of job links by right clicking each link. If 
 * you right click each job link a popup menu lets you copy the 
 * job URL. Then within the menu we look for a div like the 
 * following:
 *
 *   <div data-automation-id="copyUrl" title="Copy URL" data-clipboard-text="<url-to-extract>"
 */
const extractJobs = async (page) => {
    const jobElements = await page.$$('div.gwt-Label.WOTO.WISO');
    const jobs = [];

    for (const e of jobElements) {
        let title = await page.evaluate(e => e.innerText, e);
        
        await e.click({ button: 'right' });

        /* Wait for popup menu to appear underneath our element */
        const menu = await page.waitFor('div.WET.wd-popup-content');
        
        const [ div ] = await menu.$x('//div[@data-automation-id="copyUrl"]');
        const url = await page.evaluate(e => e.getAttribute('data-clipboard-text'), div);

        /* 
         * Send ESC to make the popup menu disappear and wait for the menu 
         * to disappear 
         */
        await page.keyboard.down('Escape');
        await page.waitFor(() => !document.querySelector('div.WET.wd-popup-content'));
        
        console.log(url);
        
        jobs.push({ title, url });
    }

    return jobs;
};

const scroll = async (page) => {
    let totalJobsStr = await page.evaluate(
        id => document.querySelector(`span#${id}`).innerText,
        'wd-FacetedSearchResultList-PaginationText-facetSearchResultList\\.newFacetSearch\\.Report_Entry'
    );

    let totalNumJobs = parseInt(
            /(\d+)\s+Results/.exec(totalJobsStr)[1]
    );

    /* Scroll until scrolling no longer triggers any more job fetches */    
    console.log(`Scrolling until we get ${totalNumJobs} jobs`);
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
                        console.log('Response received');
                        resolve();
                    }
                })
        );
    
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await xhrSent;
        await xhrResp;
        await page.waitForFunction(`document.querySelectorAll('div.gwt-Label.WOTO.WISO').length > ${numJobs}`);

        numJobs = await page.evaluate("document.querySelectorAll('div.gwt-Label.WOTO.WISO').length");
        console.log(`numJobs = ${numJobs}`);
        break; // XXX
    }
};

const getJobLinks = async (page) => {
    await page.goto(Company.jobs_page);
    await page.waitFor(
        id => document.querySelector(`span#${id}`),
        {}, /* opts */
        'wd-FacetedSearchResultList-PaginationText-facetSearchResultList\\.newFacetSearch\\.Report_Entry'
    );
    
    await scroll(page);
    
    let jobs = await extractJobs(page);
    return jobs;
};

const main = async () => {
    const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });
    //const browser = await puppeteer.launch();    
    const [ page ] = await browser.pages();
    page.on('console', msg => console.log('> ', msg.text()));
    
    const jobs = await getJobLinks(page);

    await browser.close()
    return jobs;
};

main().then((jobs) => {
    console.log(`# jobs = ${jobs.length}`);
    console.log(JSON.stringify(jobs, null, 2));
});
