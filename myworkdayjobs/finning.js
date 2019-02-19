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
const getNumJobs = () => {
    return Array.from(document.querySelectorAll('div[id^="promptOption-gwt-uid-"]')).length;
};

/* Scroll until scrolling no longer triggers any more job fetches */    
const scroll = async (page) => {
    let totalNumJobs = await getTotalNumJobs(page);
    let numJobs = await (await page.$$('div[id^="promptOption-gwt-uid-"]')).length;

    while (numJobs < totalNumJobs) {
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForFunction(
            `document.querySelectorAll('div[id^="promptOption-gwt-uid-"').length > ${numJobs}`
        );
        
        numJobs = await (await page.$$('div[id^="promptOption-gwt-uid-"]')).length;
        console.log(`numJobs = ${numJobs}`);        
    }
};

const getJobLinks = async (page) => {
    await page.goto(Company.jobs_page);
    await page.waitFor(
        id => document.querySelector(`span#${id}`),
        {}, /* opts */
        'wd-FacetedSearchResultList-PaginationText-facetSearchResultList\\.newFacetSearch\\.Report_Entry'
    );

    /* Log when the requests gets sent out */
    page.on('request', request => {
        if (request.resourceType() === "xhr" &&
            request.url().includes('searchPagination')) { 
            console.log('Request sent ' + request.url());
        }
    });

    /* Log when the responses comes back */
    page.on('response', response => {
        if (response.request().resourceType() === "xhr" &&
            response.request().url().includes('searchPagination')) {
            console.log('Response received');
        }
    });
    
    await scroll(page);
    
    let jobs = await extractJobs(page);
    return jobs;
};

const main = async () => {
    //const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });
    const browser = await puppeteer.launch();    
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
