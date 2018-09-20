'use strict';

const url = require('url');
const jsdom = require('jsdom');
const fetch = require('node-fetch');
const { JSDOM } = jsdom;

const Company = {
    name: 'Bit Wizards',
    hq: 'Fort Walton Beach, FL',
    home_page: 'https://bitwizards.com',
    jobs_page: 'https://bitwizards.com/company/careers/opportunities'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getJobLinks = async () => {
    const resp = await fetch(Company.jobs_page);
    const jobs = [];
    const html = await resp.text();
    const dom = new JSDOM(html);
    const $ = (require('jquery'))(dom.window);

    let h3 = $('h3').filter(function(i) {
        return $(this).text().trim() === 'Current Openings'
    });
    let d = $(h3).parent('div');
    
    const jobLinks = $(d).children('a[href^="/Company"]');
        
    for (const a of jobLinks) {
        let j = {};
        
        j.title = $(a).text().trim();
        j.url = url.resolve(Company.jobs_page, a.href);
        jobs.push(j);
    }

    return jobs;
};

const http_get = async (url) => {
    const data = {};
    const resp = await fetch(url);
    
    data.html = await resp.text();
    
    const dom = new JSDOM(data.html);
    data.$ = (require('jquery'))(dom.window);

    return data;
};

const getJobDescriptions = async (jobs) => {
    for (const j of jobs) {
        const resp = await http_get(j.url);
        j.description = resp.$('div#content-sidebar').html();
        await sleep(2);        
    }    
};

const main = async () => {
    const jobs = await getJobLinks();
    await getJobDescriptions(jobs);
    return jobs;
};

main().then((jobs) => {
    jobs.forEach(j => console.log( JSON.stringify(j, null, 2) ));    
});
