'use strict';

const url = require('url');
const axios = require('axios');
const jsdom = require('jsdom');
const normalizeDate = require('normalize-date');
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

/*
  ASPX page uses this for CSRF protection and we need to emulate it...

     $(function() {
         $('<input name="__RequestVerificationToken" type="hidden" value="AWJV4CS..." />').appendTo("body");
     });
     
     $(document).ajaxSend(function (event, xhr, options) {
         if (['GET', 'HEAD'].indexOf(options.type) === -1) {
             xhr.setRequestHeader('X-RequestVerificationToken', $('input[name="__RequestVerificationToken"]').val());
         }
     });
*/
const getJobLinks = async () => {
    let postUrl = 'https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/JobBoardView/LoadOpportunities';
    let payload = {
        "opportunitySearch":{
            "Top": 50,
            "Skip": 0,
            "QueryString": "",
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
    
    while (true) {
        const resp = await axios.post(postUrl, {
            data: JSON.stringify(payload)
        });

        resp.data.opportunities.forEach(o => {
            let j = {};
            let l = o.PhysicalLocations[0];
            
            j.title = o.Title;
            j.id = o.Id;
            j.location = l.City + ', ' + l.StateName;
            
            jobs.push(j);
        });
        
        if (jobs.length >= resp.data.totalCount) {
            break;
        }
        
        payload.opportunitySearch.Skip += jobs.length;
        
        const resp = await axios.post(postUrl, {
            data: JSON.stringify(payload)
        });
    }

    return jobs;
};

const main = async () => {
    const jobs = await getJobLinks();
};

main().then((jobs) => {
    jobs.forEach(
        j => console.log(JSON.stringify(j, null, 2))
    );
});
