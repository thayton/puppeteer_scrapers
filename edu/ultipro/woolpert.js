'use strict';

const url = require('url');
const axios = require('axios');
const jsdom = require('jsdom');
const fetch = require('node-fetch');
const { JSDOM } = jsdom;

const Company = {
    name: 'Woolpert',
    hq: 'Dayton, OH',
    home_page: 'https://woolpert.com',
    jobs_page: 'https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/?q=&o=postedDateDesc'
}

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
    let postUrl = 'https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/JobBoardView/LoadOpportunities';
    let payload = {
        "opportunitySearch":{
            "Top": 50,
            "Skip": 0,
            "QueryString": "",
            "OrderBy":[{"Value":"postedDateDesc","PropertyName":"PostedDate","Ascending":false}],
            "Filters":[
                {
                    "t":"TermsSearchFilterDto",
                    "fieldName":4,
                    "extra":null,
                    "values":[]
                },
                {
                    "t":"TermsSearchFilterDto",
                    "fieldName":5,
                    "extra":null,
                    "values":[]
                },
                {
                    "t":"TermsSearchFilterDto",
                    "fieldName":6,
                    "extra":null,
                    "values":[]
                }
            ]
        },
        "matchCriteria": {
            "PreferredJobs": [],
            "Educations": [],
            "LicenseAndCertifications": [],
            "Skills": [],
            "hasNoLicenses": false,
            "SkippedSkills": []
        }
    };

    /* 
     * resp.data - { opportunities: Array(20), totalCount: 66 }
     */
    const jobs = [];
    const urlParts = url.parse(
        'https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/OpportunityDetail?opportunityId=xxx'
        , true /* parseQueryString */
    );
    
    urlParts.search = null; /* so that query will be used by url.format() instead */

    let resp;
    
    do {
        resp = await axios.post(postUrl, payload);
        
        resp.data.opportunities.forEach(o => {
            let j = {};
            let l = o.Locations[0].Address;

            urlParts.query.opportunityId = o.Id;
            
            j.title = o.Title;
            j.url = url.format(urlParts);
            j.location = l.City + ', ' + l.State.Name;
            
            jobs.push(j);
        });

        payload.opportunitySearch.Skip += jobs.length;
        
    } while (jobs.length < resp.data.totalCount);

    return jobs;
};

/*
var opportunity = new US.Opportunity.CandidateOpportunityDetail({"Id":"349c438f-b88c-4676
*/
const getJobDescriptions = async (jobs) => {
    for (const j of jobs) {
        const { html } = await http_get(j.url);

        /* Extract the JSON argument passed to CandidateOpportunityDetail() */
        const oppStr = html.match(/new US\.Opportunity.CandidateOpportunityDetail\((.*)\);\n/)[1]
        const opp = JSON.parse(oppStr);
        
        j.description = opp.Description;
        
        await sleep(2);        
    }

    return jobs;
};

const main = async () => {
    const jobs = await getJobLinks();
    await getJobDescriptions(jobs);
    
    return jobs;
};

main().then((jobs) => {
    jobs.forEach(
        j => console.log(JSON.stringify(j, null, 2))
    );
});
