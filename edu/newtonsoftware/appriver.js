'use strict';

const jsdom = require('jsdom');
const fetch = require('node-fetch');

const Company = {
    name: 'AppRiver',
    hq: 'Gulf Breeze, FL',
    home_page: 'https://www.appriver.com',
    jobs_page: 'https://newton.newtonsoftware.com/career/CareerHome.action?clientId=8a321814494f97cd01495ce058cd5c6f'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getJobLinks = async () => {
    const resp = await fetch(Company.jobs_page);
    const html = await resp.text();

    const { JSDOM } = jsdom;
    const dom = new JSDOM(html);
    const $ = (require('jquery'))(dom.window);

    const jobs = [];
    const rows = $('table#gnewtonCareerHome div.gnewtonCareerGroupRowClass');
    
    for (const r of rows) {
        let j = {};
        j.url = $(r).find('a').attr('href').trim();
        j.title = $(r).find('a').text().trim();
        j.location = $(r).prev('div.gnewtonCareerGroupHeaderClass').text().trim();

        jobs.push(j);
    }

    return jobs;
};

const getJobDescriptions = async (jobs) => {
    for (const j of jobs) {
        const resp = await fetch(j.url);
        const html = await resp.text();

        const { JSDOM } = jsdom;
        const dom = new JSDOM(html);
        const $ = (require('jquery'))(dom.window);

        j.description = $('table#gnewtonJobDescription').html();
        await sleep(2);
    }
};

const main = async () => {
    const jobs = await getJobLinks();
    await getJobDescriptions(jobs);

    return jobs;
};

main().then((jobs) => {
    console.log('Complete');
    jobs.forEach(j => console.log( JSON.stringify(j, null, 2) ));    
});
