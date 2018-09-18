'use strict';

const url = require('url');
const jsdom = require('jsdom');
const fetch = require('node-fetch');
const normalizeDate = require('normalize-date');
const { JSDOM } = jsdom;

const Company = {
    name: 'University of West Florida',
    hq: 'Pensacola, FL',
    home_page: 'https://uwf.edu/',
    jobs_page: 'https://jobs.uwf.edu/postings/search'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getJobLinks = async () => {
    let   resp = await fetch(Company.jobs_page);
    const jobs = [];
    
    for (let pageno = 2; true; pageno++) {
        let html = await resp.text();
        let dom = new JSDOM(html);
        let $ = (require('jquery'))(dom.window);

        const jobLinks = $('div#search_results h3 > a[href^="/postings/"]');
        
        for (const a of jobLinks) {
            let j = {};
            let p = $(a).parents('div.row');
            let c = $(p).find('div.tbody-cell');
        
            j.title = $(a).text().trim();
            j.url = url.resolve(Company.jobs_page, a.href);
            j.postingNumber = $(c[0]).text().trim();
            j.department = $(c[1]).text().trim();
            j.positionType = $(c[2]).text().trim();
            j.unPostingDate = normalizeDate( $(c[3]).text().trim() );

            jobs.push(j);
        }

        let nextPage = $('a[rel="next"]').filter(function(i) {
            return $(this).text().trim() === `${pageno}`;
        });

        if (nextPage.length > 0) {
            let nextPageUrl = url.resolve(Company.jobs_page, nextPage[0].href);
            resp = await fetch(nextPageUrl);
        } else {
            break;
        }
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

        const c = $('caption:contains("Position Information")');
        const p = c.parents('div[id^="form_container_"]');
        
        j.description = $(p).html().trim();
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

