'use strict';

const puppeteer = require('puppeteer');

const Company = {
    name: 'SAIT Polytechnic',
    hq: 'Calgary, Canada',
    home_page: 'http://www.sait.ca',
    jobs_page: 'https://sait.csod.com/ats/careersite/search.aspx?site=1&c=sait',
};

const getJobAttrs = (jobs) => {
    const jobAttrs = [];
    
    jobs.forEach(j => {
        let job = {};
        let tds = j.parentElement.parentElement.querySelectorAll('td');
        
        job['url'] = j.href;
        job['postingDate'] = tds[1].textContent.trim();

        jobAttrs.push(job);
    });

    return jobAttrs;
};

const getJobDescr = async (page, job) => {
    await page.goto(job['url'])

    let div = await page.waitFor('div.cs-atscs-jobdet-rtpane');
    
    job.description = await (await page.evaluateHandle(div => div.innerText, div)).jsonValue();
};

const getJobs = async (page) => {
    await page.goto(Company.jobs_page);

    const table = await page.waitFor('table#tableResults');
    const jobs = await table.$$eval('tr > td > a', getJobAttrs);
    
    for (const job of jobs) {
        await getJobDescr(page, job);
    }
    
    return jobs;
};

const main = async () => {
    //const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });
    const browser = await puppeteer.launch();    
    const [ page ] = await browser.pages();

    const jobs = await getJobs(page);

    await browser.close()
    return jobs;
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
