'use strict';

const url = require('url');
const jsdom = require('jsdom');
const fetch = require('node-fetch');
const { JSDOM } = jsdom;

const Company = {
    name: 'SJP Network Solutions',
    hq: 'Fort Walton Beach, FL',
    home_page: 'https://www.sjpnetwork.com',
    jobs_page: 'https://www.sjpnetwork.com/employment/'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const http_get = async (url) => {
    const data = {};
    const resp = await fetch(url);
    
    data.html = await resp.text();
    
    const dom = new JSDOM(data.html);
    data.$ = (require('jquery'))(dom.window);

    return data;
};

const getJobLinks = async () => {
    const { $ } = await http_get(Company.jobs_page);
    const jobs = [];
    const jobLinks = $('div.job-content > h5 > a');
        
    for (const a of jobLinks) {
        let j = {};
        let location = $(a).parents('div.job-content')
            .children('div.job-additional-information').text();
        
        j.title = $(a).text().trim();
        j.location = location;
        j.url = url.resolve(Company.jobs_page, a.href);
        jobs.push(j);
    }

    return jobs;
};

const getJobDescriptions = async (jobs) => {
    for (const j of jobs) {
        const { $ } = await http_get(j.url);
        j.description = $('div.job-content').html();
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
