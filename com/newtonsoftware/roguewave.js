'use strict';

const puppeteer = require('puppeteer');

const Company = {
    name: 'Rogue Wave',
    hq: 'Lousville, CO',
    home_page: 'https://www.roguewave.com',
    jobs_page: 'https://www.roguewave.com/company/careers'
};

const getJobAttrs = (divs) => {
    const jobAttrs = [];

    divs.forEach(d => {
        let job = {};

        let a = d.querySelector('div.gnewtonCareerGroupJobTitleClass > a');
        let l = d.querySelector('div.gnewtonCareerGroupJobDescriptionClass');
        
        job['url'] = a.href;
        job['title'] = a.textContent.trim();
        job['location'] = l.textContent.trim();
        
        jobAttrs.push(job);
    });

    return jobAttrs;
};

const getJobDescr = async (page, job) => {
    await page.goto(job['url'])

    let frame = await page.frames().find(frame => frame.name() === 'gnewtonIframe');
    let table = await frame.waitFor('table#gnewtonJobDescription');
    
    job.description = await (await frame.evaluateHandle(table => table.innerText, table)).jsonValue();
};

const getJobs = async (page) => {
    await page.goto(Company.jobs_page);

    let iframe = await page.frames().find(frame => frame.name() === 'gnewtonIframe');    
    const jobs = await iframe.$$eval('div.gnewtonCareerGroupRowClass', getJobAttrs);
    
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
