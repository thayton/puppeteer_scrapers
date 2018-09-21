'use strict';

const url = require('url');
const jsdom = require('jsdom');
const fetch = require('node-fetch');
const normalizeDate = require('normalize-date');
const { JSDOM } = jsdom;

const Company = {
    name: 'https://www.nwfsc.edu',
    hq: 'Niceville, FL',
    home_page: 'https://www.nwfsc.edu',
    jobs_page: 'https://nwfsc.interviewexchange.com/static/clients/531NFM1/index.jsp?catid=1639'
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

const getJobDescriptions = async (jobs) => {
    for (const j of jobs) {
        const { $,html } = await http_get(j.url);
        j.description = $('table#printarea').html();
    }
};

const getJobLinks = async () => {
    const { $ } = await http_get(Company.jobs_page);
    const jobLinks = $('a[href^="/jobofferdetails.jsp"]').filter(function(i) {
        console.log($(this).attr('href'));
        
        return /jobofferdetails\.jsp[^?]+\?JOBID=\d+/.test(
            $(this).attr('href')
        );
    });
    
    const jobs = [];
    
    for (const a of jobLinks) {
        const j = {};
        
        j.title = $(a).text();
        j.url = url.resolve(Company.jobs_page, a.href).replace(
                /;jsessionid=([^&?]+)/, ''
        );
        jobs.push(j);
    }

    return jobs;
};

const main = async () => {
    const jobs = await getJobLinks();
    await getJobDescriptions(jobs);
    return jobs;
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
