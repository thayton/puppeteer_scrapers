'use strict';

const puppeteer = require('puppeteer');

const Company = {
    name: 'North American Construction Group',
    hq: 'Acheson, Canada',
    home_page: 'http://www.nacg.ca',
    jobs_page: 'https://careers-nacg.icims.com/jobs/search'
};

const getJobAttrs = (jobs) => {
    const jobAttrs = [];
    
    jobs.forEach(j => {
        let job = {};
        job['url'] = j.href;
        
        dlList = j.parentElement.parentElement.querySelectorAll('dl');
        
        let f = s => s.toLowerCase().replace(' ', '-');
        
        for (const dl of dlList) {
            let dt = dl.querySelector('dt');
            let dd = dt.nextElementSibling;

            job[f(dt.textContent.trim())] = f(dd.textContent.trim());
        }

        jobAttrs.push(job);
    });

    return jobAttrs;
};

const getJobDescr = async (page, job) => {
    await page.goto(job['url'])

    console.log(job['url']);
    
    const iframe = await page.frames().find(frame => frame.name() === 'icims_content_iframe');
    const div = await iframe.waitFor('div.iCIMS_JobContent');
    
    job.description = await (await iframe.evaluateHandle(div => div.innerText, div)).jsonValue();
};

const getJobs = async (page) => {
    await page.goto(Company.jobs_page);

    const iframe = await page.frames().find(frame => frame.name() === 'icims_content_iframe');
    await iframe.waitFor('ul.iCIMS_JobsTable');

    const jobs = await iframe.$$eval('a.iCIMS_Anchor', getJobAttrs);
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
