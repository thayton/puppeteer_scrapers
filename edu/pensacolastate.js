'use strict';

const url = require('url');
const jsdom = require('jsdom');
const fetch = require('node-fetch');
const normalizeDate = require('normalize-date');
const { JSDOM } = jsdom;

const Company = {
    name: 'Pensacola State College',
    hq: 'Pensacola, FL',
    home_page: 'http://www.pensacolastate.edu',
    jobs_page: 'http://www.pensacolastate.edu/employment-full-time-positions/'
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
    const { $, html } = await http_get(Company.jobs_page);
    const jobs = [];

    const jobLinks = $('div.s-resultCt').nextAll('li').filter(function(i) {
        return $('a[href^="#"]', this).length === 1;
    });
    
    for (const li of jobLinks) {
        let j = {};
        let a = $(li).find('a');
        let id = $(a).attr('href').substring(1);
        
        j.title = $(a).text().trim();
        j.url = url.resolve(Company.jobs_page, a.attr('href'));
        j.description = $(`div#${id}`).html();
        
        jobs.push(j);
    }

    return jobs;
};

const getJobDescriptions = async (jobs) => {
    return;
};

const main = async () => {
    const jobs = await getJobLinks();
    await getJobDescriptions(jobs);
    return jobs;
};

main().then((jobs) => {
    jobs.forEach(j => console.log( JSON.stringify(j, null, 2) ));
});

