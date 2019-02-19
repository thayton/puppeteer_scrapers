'use strict';

const puppeteer = require('puppeteer');

const Company = {
    name: 'Finning',
    hq: 'Vancouver, Canada',
    home_page: 'https://www.finning.com',
    jobs_page: 'https://finning.wd3.myworkdayjobs.com/External'
};

/*
 * Extract a list of job links by right clicking each link. If 
 * you right click each job link a popup menu lets you copy the 
 * job URL. Then within the menu we look for a div like the 
 * following:
 *
 *   <div data-automation-id="copyUrl" title="Copy URL" data-clipboard-text="<url-to-extract>"
 */
const extractJobs = async (page) => {
    const jobElements = await page.$$('div[id^="promptOption-gwt-uid-"]');
    const jobs = [];

    for (const e of jobElements) {
        let title = await page.evaluate(e => e.innerText, e);
        
        await e.click({ button: 'right' });

        /* Wait for popup menu to appear underneath our element */
        const menu = await page.waitFor('div.WET.wd-popup-content');
        
        const [ div ] = await menu.$x('//div[@data-automation-id="copyUrl"]');
        const url = await page.evaluate(e => e.getAttribute('data-clipboard-text'), div);

        /* Click in on the item makes the popup menu disappear */
        await div.click()
        await page.waitFor(() => !document.querySelector('div.WET.wd-popup-content'));
        
        jobs.push({ title, url });
    }

    return jobs;
};

/* Return the total number of jobs in the system */
const getTotalNumJobs = async (page) => {
    let totalJobsStr = await page.evaluate(
        id => document.querySelector(`span#${id}`).innerText,
        'wd-FacetedSearchResultList-PaginationText-facetSearchResultList\\.newFacetSearch\\.Report_Entry'
    );

    return parseInt(
            /(\d+)\s+Results/.exec(totalJobsStr)[1]
    );
};

/* Return the number of jobs currently listed on the page */
const getNumJobsListed = () => {
    return Array.from(document.querySelectorAll('div[id^="promptOption-gwt-uid-"]')).length;
};

/* Scroll until we reach the end of the jobs list */    
const scrollToEnd = async (page) => {
    let totalNumJobs = await getTotalNumJobs(page);
    let numJobs = await page.evaluate(getNumJobsListed);
    let scrollHeight = await page.evaluate('document.documentElement.scrollHeight');

    while (numJobs < totalNumJobs) {
        console.log(`# jobs = ${numJobs}`);
        
        await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
        await page.waitForFunction(`document.documentElement.scrollHeight > ${scrollHeight}`);
        
        scrollHeight = await page.evaluate('document.body.scrollHeight');
        numJobs = await page.evaluate(getNumJobsListed);
    }

    console.log(`# jobs = ${numJobs}`); 
};

/*
 * Scroll the page until all of the jobs are listed and then extract
 * and return the list of job titles and links
 */
const getJobLinks = async (page) => {
    await page.goto(Company.jobs_page);
    await page.waitFor(
        id => document.querySelector(`span#${id}`),
        {}, /* opts */
        'wd-FacetedSearchResultList-PaginationText-facetSearchResultList\\.newFacetSearch\\.Report_Entry'
    );

    await scrollToEnd(page);
    
    let jobs = await extractJobs(page);
    return jobs;
};

const main = async () => {
    //const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });
    const browser = await puppeteer.launch();    
    const [ page ] = await browser.pages();

    /* Log when the requests gets sent out */
    page.on('request', request => {
        if (request.resourceType() === "xhr" &&
            request.url().includes('External')) { 
            console.log('Request sent ' + request.url());
        }
    });

    /* Log when the responses comes back */
    page.on('response', response => {
        if (response.request().resourceType() === "xhr" &&
            response.request().url().includes('External')) {
            console.log('Response received');
        }
    });
    
    const jobs = await getJobLinks(page);

    await browser.close()
    return jobs;
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
