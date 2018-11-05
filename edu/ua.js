'use strict';

const qs = require('qs');
const url = require('url');
const jsdom = require('jsdom');
const axios = require('axios');
const { JSDOM } = jsdom;

const Company = {
    name: 'University of Alabama',
    hq: 'Tuscaloosa, AL',
    home_page: 'https://www.ua.edu/',
    jobs_page: 'http://staffjobs.ua.edu/cw/en-us/listing/'
};

const toJquery = (html) => {
    const { window } = new JSDOM(html);
    return (require('jquery'))(window);
};

const timestamp = () => Math.round( new Date().getTime() / 1000 );

const getJobDescriptions = async (jobs) => {
    for (const j of jobs) {
        const resp = await axios.get(j.url);
        const $ = toJquery(resp.data);

        j.description = $('div#job').html().trim();
        j.location = $('span.location').text().trim();
    }
};

const getJobLinks = async () => {
    const params = {
        'page': 1,
        'page-items': 20,
        'ts': timestamp()
    };
    
    const jobs = [];
    let   resp;
    
    do {
        resp = await axios({
            method: 'post',
            url: Company.jobs_page,
            params: params,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        let $ = toJquery(resp.data.results);

        $('a.job-link').each(function (i,k) {
            let j = {};
            
            j.title = $(k).text();
            j.url = url.resolve(Company.jobs_page, $(k).attr('href'));
        
            jobs.push(j);
        });

        params.page++;
    } while (resp.data.results.length > 0);
    
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
