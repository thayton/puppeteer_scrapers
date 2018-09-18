'use strict';

const jsdom = require('jsdom');
const fetch = require('node-fetch');
const url = 'https://newton.newtonsoftware.com/career/CareerHomeSearch.action?clientId=8a78858b5ea24795015ea61343603556';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getJobLinks = async () => {
    const resp = await fetch(url);
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
        j.location = $(r).children('div.gnewtonCareerGroupJobDescriptionClass').text().trim();

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
