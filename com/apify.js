'use strict';

const url = require('url');
const jsdom = require('jsdom');
const axios = require('axios');
const { JSDOM } = jsdom;

const Company = {
    name: 'Apify',
    hq: 'Prague, Czech Republic',
    home_page: 'https://www.apify.com',
    jobs_page: 'https://www.apify.com/jobs'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getJobLinks = async () => {
    const jobs = [];
    const resp = await axios.get(Company.jobs_page);
    const dom = new JSDOM(resp.data);
    const $ = (require('jquery'))(dom.window);
    
    $('div#openings').find('h3.harmonica-head').each(function (i, e) {
        let j = {};
        
        j.title = $(this).contents().get(0).nodeValue.trim();
        j.url = Company.jobs_url;
        j.description = $(this).next('div.harmonica-detail').text().trim();
        
        jobs.push(j);
    });

    return jobs;
};

const main = async () => {
    const jobs = await getJobLinks();
    return jobs;
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
