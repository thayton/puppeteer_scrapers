'use strict';

const url = require('url');
const jsdom = require('jsdom');
const fetch = require('node-fetch');
const normalizeDate = require('normalize-date');
const { JSDOM } = jsdom;

const Company = {
    name: 'Gulf Coast State College',
    hq: 'Panama City, FL',
    home_page: 'https://www.gulfcoast.edu',
    jobs_page: 'https://gulfcoast.peopleadmin.com/postings/search'
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

    const jobDivs = $('div#search_results div.job-item-posting');
    for (const div of jobDivs) {
        let j = {};
        let a = $(div).find('h3 > a');

        console.log(a.href);

        j.title = $(a).text().trim();
        j.url = url.resolve(Company.jobs_page, a.attr('href'));
        j.location = Company.hq;
        
        jobs.push(j);
    }

    return jobs;
};

const getJobDescriptions = async (jobs) => {
    for (const j of jobs) {
        const { $ } = await http_get(j.url);
        j.description = $('div#content_inner').html();
    }

    await sleep(2);
};

const main = async () => {
    const jobs = await getJobLinks();
    await getJobDescriptions(jobs);
    return jobs;
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
